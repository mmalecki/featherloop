import { appendFileSync, writeFileSync } from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import https from 'node:https';
import type { AddressInfo } from 'node:net';

/**
 * A metering reverse proxy between the harnesses and the model server. Every
 * harness talks to it instead of the server, so all of them are measured the same
 * way, from the wire, whatever they report about themselves. Each run gets its own
 * prefix, `/<run>/v1/...`, forwarded to the upstream's `/v1/...`.
 *
 * Upstream requests go through `node:http`, which follows `HTTP_PROXY` under
 * `--use-env-proxy` and, unlike `fetch`, has no header or body timeouts: a long
 * prefill or a non-streaming request queued behind busy slots is the harness's to
 * time out, not ours.
 *
 * A request the harness doesn't stream is streamed upstream anyway, and answered
 * with the response assembled as the server would have sent it whole: a long
 * non-streaming request sends nothing until it's done, and proxies on the way cut
 * it off (squid's `read_timeout` is 15 minutes). Only the transport changes.
 *
 * With `thinking: false`, every request asks the chat template for no thinking
 * (`chat_template_kwargs.enable_thinking: false`, which llama.cpp honours over a
 * request's `reasoning_effort` or `thinking`): one switch for every harness, however
 * they would set it themselves, or not.
 */

export interface ProxyOptions {
  /** False to turn the model's thinking off on every request. */
  thinking?: boolean;
  /**
   * The upstream's API key, sent as `x-api-key` in place of whatever the harness
   * sends: keys stay with the bench, never in a harness's environment or config.
   */
  apiKey?: string;
  /**
   * Fold system messages that come mid-conversation into the user turn before
   * them. For llama.cpp, whose chat templates (Qwen's among them) refuse a system
   * message anywhere but first; Claude Code sends one after the first user message.
   */
  foldSystemMessages?: boolean;
}

/** Token counts for one request. `prompt` is all of it, cached or not: the context the model saw. */
export interface Tokens {
  prompt: number;
  cached: number;
  completion: number;
  /** Prompt tokens written to a cache, where the API bills them apart (Anthropic). Part of `prompt`. */
  cacheWrite?: number;
}

/** What one model request did, as one line of a run's `requests.jsonl`. */
export interface RequestRecord {
  seq: number;
  /** Epoch ms when the request arrived. */
  start: number;
  /** Until the last byte of the response: model time, including any queueing at the server. */
  ms: number;
  path: string;
  dialect: 'openai' | 'anthropic' | 'other';
  status: number;
  /** Network failure, or the client hanging up mid-response. */
  error?: string;
  stream: boolean;
  /** Not streamed by the harness, so streamed upstream and answered whole: see `MeteringProxy`. */
  restreamed: boolean;
  /** What the proxy changed in the request, beyond streaming, e.g. `enable_thinking=false`. */
  overrides?: string[];
  messages: number;
  tools: number;
  requestBytes: number;
  /** Sampling and length fields the harness sent, e.g. `temperature`, `max_tokens`. */
  params: Record<string, unknown>;
  tokens: Tokens | null;
  /**
   * Streamed chunks carrying output: for a response cut off before it reported its
   * tokens, a lower bound on what it generated (llama.cpp sends some tokens together).
   */
  chunks: number;
  /** Where `tokens` came from: the API's `usage`, or llama.cpp's `timings` when streams carry no usage. */
  tokenSource?: 'usage' | 'timings';
  /** Server-side model time, from llama.cpp's `timings`. */
  serverMs?: { prompt: number; predicted: number };
  /** Names of the tools the model called, in order. */
  toolCalls: string[];
  /** Calls to tools the request didn't offer: hallucinated names. */
  unknownTools: string[];
  finish: string | null;
  contentChars: number;
  reasoningChars: number;
  /** Tool-call markup left in the text: a call the server couldn't parse, so the harness never saw it. */
  unparsedToolCall: boolean;
}

/** One run's view of the proxy: its base URL, and what passed through. */
export interface Meter {
  /** Includes `/v1`, as harness configs expect. */
  baseURL: string;
  records: RequestRecord[];
}

interface Sink {
  meter: Meter;
  /** Each record is appended here as it completes. */
  file: string;
  /** The last request and its assembled response: the whole conversation, for reading what happened. */
  transcript: string;
  seq: number;
  /** Responses still being proxied, to abort if the run ends first. */
  live: Set<() => void>;
}

const PARAMS = [
  'temperature',
  'top_p',
  'top_k',
  'min_p',
  'presence_penalty',
  'frequency_penalty',
  'repeat_penalty',
  'max_tokens',
  'max_completion_tokens',
  'reasoning_effort',
  'thinking',
  'chat_template_kwargs',
  'reasoning_budget_tokens',
  'parallel_tool_calls',
  'tool_choice',
];

/** Qwen's own tool-call syntax, and the generic tags small models fall back to. */
const TOOL_MARKUP = /<tool_call>|<function=|<\|tool_call|"name"\s*:\s*"[^"]+"\s*,\s*"arguments"/;

export class MeteringProxy {
  readonly upstream: URL;
  readonly options: ProxyOptions;
  #server: http.Server;
  #runs = new Map<string, Sink>();
  #port = 0;

  private constructor(upstream: string, options: ProxyOptions) {
    this.options = options;
    // Trailing slash, so `new URL('chat/completions', upstream)` appends rather than replaces.
    this.upstream = new URL(upstream.endsWith('/') ? upstream : `${upstream}/`);
    this.#server = http.createServer((req, res) => void this.#handle(req, res));
    // Requests last as long as the model takes; the harness owns the timeouts.
    this.#server.requestTimeout = 0;
    this.#server.headersTimeout = 0;
    this.#server.keepAliveTimeout = 60_000;
  }

  /** Listens on a free port on 127.0.0.1; `upstream` includes `/v1`. */
  static async start(upstream: string, options: ProxyOptions = {}): Promise<MeteringProxy> {
    const proxy = new MeteringProxy(upstream, options);
    await new Promise<void>((resolve) => proxy.#server.listen(0, '127.0.0.1', resolve));
    proxy.#port = (proxy.#server.address() as AddressInfo).port;
    return proxy;
  }

  /** Starts metering a run; `file` gets a line per request, `transcript` the last exchange. */
  open(run: string, file: string, transcript: string): Meter {
    if (!/^[\w.-]+$/.test(run)) throw new Error(`Bad run id: ${run}`);
    const meter: Meter = { baseURL: `http://127.0.0.1:${this.#port}/${run}/v1`, records: [] };
    writeFileSync(file, '');
    this.#runs.set(run, { meter, file, transcript, seq: 0, live: new Set() });
    return meter;
  }

  /** Stops metering a run, aborting its requests still in flight so they free their server slots. */
  close(run: string): void {
    const sink = this.#runs.get(run);
    if (!sink) return;
    for (const abort of sink.live) abort();
    this.#runs.delete(run);
  }

  async stop(): Promise<void> {
    for (const run of [...this.#runs.keys()]) this.close(run);
    this.#server.closeAllConnections();
    await new Promise<void>((resolve) => this.#server.close(() => resolve()));
  }

  async #handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const match = /^\/([^/]+)\/v1\/(.*)$/.exec(req.url ?? '');
    const sink = match ? this.#runs.get(match[1]!) : undefined;
    if (!match || !sink) {
      res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: `Unknown run: ${req.url}` } }));
      return;
    }
    const path = match[2]!;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    const { record, offered, json } = describeRequest(++sink.seq, path, body);
    record.restreamed = !record.stream && record.dialect !== 'other' && json !== undefined;
    // `params` keeps what the harness asked for; this is what the model gets.
    const forced: Json = {};
    if (this.options.thinking === false && record.dialect !== 'other' && json !== undefined) {
      forced.chat_template_kwargs = { ...(json.chat_template_kwargs as Json | undefined), enable_thinking: false };
      record.overrides = ['enable_thinking=false'];
    }
    if (this.options.foldSystemMessages && record.dialect !== 'other' && Array.isArray(json?.messages)) {
      const folded = foldSystem(json.messages as Json[], record.dialect);
      if (folded) {
        forced.messages = folded;
        record.overrides = [...(record.overrides ?? []), 'system-message-folded'];
      }
    }
    const sent =
      record.restreamed || record.overrides
        ? Buffer.from(
            JSON.stringify({
              ...json,
              ...forced,
              ...(record.restreamed ? { stream: true, ...(record.dialect === 'openai' ? { stream_options: { include_usage: true } } : {}) } : {}),
            }),
          )
        : body;
    const response = new ResponseParser(record, offered);
    const target = new URL(path, this.upstream);

    const headers: Record<string, string> = {};
    for (const name of ['content-type', 'authorization', 'x-api-key', 'anthropic-version', 'anthropic-beta', 'accept']) {
      const value = req.headers[name];
      if (typeof value === 'string') headers[name] = value;
    }
    if (this.options.apiKey) {
      delete headers.authorization;
      headers['x-api-key'] = this.options.apiKey;
      headers['anthropic-version'] ??= '2023-06-01';
    }
    headers['content-length'] = String(sent.length);

    let finished = false;
    const finish = (error?: string) => {
      if (finished) return;
      finished = true;
      sink.live.delete(abort);
      if (error) record.error = error;
      record.ms = Date.now() - record.start;
      response.end();
      sink.meter.records.push(record);
      appendFileSync(sink.file, `${JSON.stringify(record)}\n`);
      writeFileSync(sink.transcript, `${JSON.stringify({ request: tryParse(body), response: response.assembled() }, null, 1)}\n`);
    };

    const client = target.protocol === 'https:' ? https : http;
    const upstream = client.request(target, { method: req.method, headers }, (up) => {
      record.status = up.statusCode ?? 0;
      // Errors come back whole either way, and pass through as they are.
      const assemble = record.restreamed && record.status === 200;
      const out: Record<string, string | string[]> = {};
      for (const [name, value] of Object.entries(up.headers)) {
        if (value !== undefined && !['connection', 'keep-alive', 'transfer-encoding', 'content-length'].includes(name)) out[name] = value;
      }
      if (!assemble) res.writeHead(record.status, out);
      // An error's body says why: keep its start.
      let errorBody = '';
      up.on('data', (chunk: Buffer) => {
        response.write(chunk);
        if (!assemble) res.write(chunk);
        if (record.status >= 400 && errorBody.length < 500) errorBody += chunk.toString().slice(0, 500 - errorBody.length);
      });
      up.on('end', () => {
        if (errorBody) record.error = `HTTP ${record.status}: ${errorBody.trim()}`;
      });
      up.on('end', () => {
        response.end();
        if (assemble) res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(response.assembled()));
        else res.end();
        finish();
      });
      up.on('error', (err) => {
        res.destroy();
        finish(err.message);
      });
    });
    const abort = () => {
      upstream.destroy();
      finish('aborted: run ended');
    };
    sink.live.add(abort);
    upstream.on('error', (err) => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: err.message } }));
      else res.destroy();
      finish(err.message);
    });
    // The harness gave up on this request (its own timeout, or it was killed): free the slot.
    res.on('close', () => {
      if (!res.writableFinished) {
        upstream.destroy();
        finish('aborted: client disconnected');
      }
    });
    upstream.end(sent);
  }
}

function describeRequest(seq: number, path: string, body: Buffer): { record: RequestRecord; offered: Set<string>; json: Json | undefined } {
  const json = tryParse(body) as Record<string, any> | undefined;
  // Model requests only: `messages/count_tokens` and the like are 'other', passed through as they are.
  const dialect = /^chat\/completions(\?|$)/.test(path) ? 'openai' : /^messages(\?|$)/.test(path) ? 'anthropic' : 'other';
  const params: Record<string, unknown> = {};
  for (const key of PARAMS) if (json && Object.hasOwn(json, key)) params[key] = json[key];
  const tools: Json[] = Array.isArray(json?.tools) ? json.tools : [];
  // OpenAI nests the name under function; Anthropic doesn't.
  const offered = new Set(tools.map((tool) => String(tool.function?.name ?? tool.name)));
  const record: RequestRecord = {
    seq,
    start: Date.now(),
    ms: 0,
    path,
    dialect,
    status: 0,
    stream: json?.stream === true,
    restreamed: false,
    messages: Array.isArray(json?.messages) ? json.messages.length : 0,
    tools: tools.length,
    requestBytes: body.length,
    params,
    tokens: null,
    chunks: 0,
    toolCalls: [],
    unknownTools: [],
    finish: null,
    contentChars: 0,
    reasoningChars: 0,
    unparsedToolCall: false,
  };
  return { record, offered, json };
}

/**
 * Messages with any system message past the first folded into the user turn
 * before it (or made a user turn, with none before it); undefined when there's
 * nothing to fold. OpenAI requests keep a leading system message where it is.
 */
function foldSystem(messages: Json[], dialect: 'openai' | 'anthropic'): Json[] | undefined {
  const blocks = (content: unknown): Json[] => (typeof content === 'string' ? [{ type: 'text', text: content }] : ((content as Json[]) ?? []));
  const out: Json[] = [];
  let changed = false;
  messages.forEach((message, i) => {
    if (message.role !== 'system' || (dialect === 'openai' && i === 0)) return void out.push(message);
    changed = true;
    const previous = out.at(-1);
    if (previous?.role === 'user') {
      out[out.length - 1] = { ...previous, content: [...blocks(previous.content), ...blocks(message.content)] };
    } else {
      out.push({ role: 'user', content: blocks(message.content) });
    }
  });
  return changed ? out : undefined;
}

function tryParse(text: Buffer | string): unknown {
  try {
    return JSON.parse(text.toString());
  } catch {
    return undefined;
  }
}

type Json = Record<string, any>;

/**
 * Reads a response as it streams past: OpenAI Chat Completions (streamed or not)
 * and Anthropic Messages (streamed or not), filling in the request's record.
 */
class ResponseParser {
  #record: RequestRecord;
  #offered: Set<string>;
  #ended = false;
  #raw: Buffer[] = [];
  #pending = '';
  #content = '';
  #reasoning = '';
  /** Streamed tool calls by index: the name comes in the first delta, the arguments in pieces. */
  #calls = new Map<number, { id?: string; name: string; arguments: string }>();
  /** A whole response, as it came. */
  #message: unknown;
  /** From a stream, to assemble the whole response: OpenAI's chunk fields, usage and timings. */
  #openai: Json = {};
  /** From a stream, to assemble the whole response: Anthropic's message and its content blocks. */
  #anthropic: { message?: Json; blocks: Json[]; partial: Map<number, string> } = { blocks: [], partial: new Map() };

  constructor(record: RequestRecord, offered: Set<string>) {
    this.#record = record;
    this.#offered = offered;
  }

  write(chunk: Buffer): void {
    if (!this.#record.stream && !this.#record.restreamed) {
      this.#raw.push(chunk);
      return;
    }
    this.#pending += chunk.toString();
    let newline: number;
    while ((newline = this.#pending.indexOf('\n')) >= 0) {
      const line = this.#pending.slice(0, newline).trim();
      this.#pending = this.#pending.slice(newline + 1);
      if (line.startsWith('data:')) this.#event(line.slice(5).trim());
    }
  }

  end(): void {
    if (this.#ended) return;
    this.#ended = true;
    if (this.#record.stream || this.#record.restreamed) {
      if (this.#pending.trim().startsWith('data:')) this.#event(this.#pending.trim().slice(5).trim());
      this.#pending = '';
    } else {
      const json = tryParse(Buffer.concat(this.#raw)) as Json | undefined;
      this.#raw = [];
      if (json) this.#whole(json);
    }
    const record = this.#record;
    record.toolCalls = [...this.#calls.values()].map((call) => call.name);
    record.unknownTools = record.toolCalls.filter((name) => !this.#offered.has(name));
    record.contentChars = this.#content.length;
    record.reasoningChars = this.#reasoning.length;
    record.unparsedToolCall = TOOL_MARKUP.test(this.#content);
  }

  /**
   * The response as one message, whichever way it came; from a stream, as the
   * server sends it whole (that's what a restreamed request's harness gets).
   */
  assembled(): unknown {
    if (this.#message !== undefined) return this.#message;
    if (this.#record.dialect === 'openai') {
      const { meta = {}, usage, timings } = this.#openai;
      const message: Json = { role: 'assistant', content: this.#content };
      if (this.#reasoning) message.reasoning_content = this.#reasoning;
      if (this.#calls.size) {
        message.tool_calls = [...this.#calls.values()].map((call) => ({
          type: 'function',
          function: { name: call.name, arguments: call.arguments },
          ...(call.id ? { id: call.id } : {}),
        }));
      }
      return {
        choices: [{ finish_reason: this.#record.finish, index: 0, message }],
        ...meta,
        object: 'chat.completion',
        ...(usage ? { usage } : {}),
        ...(timings ? { timings } : {}),
      };
    }
    if (this.#record.dialect === 'anthropic' && this.#anthropic.message) {
      return { ...this.#anthropic.message, content: this.#anthropic.blocks.filter(Boolean) };
    }
    return {
      reasoning: this.#reasoning || undefined,
      content: this.#content,
      tool_calls: [...this.#calls.values()],
      finish: this.#record.finish,
    };
  }

  #event(data: string): void {
    if (data === '[DONE]') return;
    const json = tryParse(data) as Json | undefined;
    if (!json) return;
    if (this.#record.dialect === 'anthropic') this.#anthropicEvent(json);
    else this.#openaiChunk(json);
  }

  #openaiChunk(chunk: Json): void {
    this.#usage(chunk.usage, chunk.timings);
    const { id, created, model, system_fingerprint } = chunk;
    this.#openai.meta ??= { created, model, system_fingerprint, id };
    if (chunk.usage) this.#openai.usage = chunk.usage;
    if (chunk.timings) this.#openai.timings = chunk.timings;
    const choice = chunk.choices?.[0];
    if (!choice) return;
    if (choice.finish_reason) this.#record.finish = choice.finish_reason;
    const delta = choice.delta ?? {};
    if (delta.content || delta.reasoning_content || delta.reasoning || delta.tool_calls?.length) this.#record.chunks++;
    if (typeof delta.content === 'string') this.#content += delta.content;
    const reasoning = delta.reasoning_content ?? delta.reasoning;
    if (typeof reasoning === 'string') this.#reasoning += reasoning;
    for (const call of delta.tool_calls ?? []) {
      const index = typeof call.index === 'number' ? call.index : this.#calls.size;
      const known = this.#calls.get(index) ?? { name: '', arguments: '' };
      if (call.id) known.id = call.id;
      if (call.function?.name) known.name += call.function.name;
      if (call.function?.arguments) known.arguments += call.function.arguments;
      this.#calls.set(index, known);
    }
  }

  #anthropicEvent(event: Json): void {
    const whole = this.#anthropic;
    const block = whole.blocks[event.index];
    switch (event.type) {
      case 'message_start':
        this.#usage(event.message?.usage);
        whole.message = { ...event.message };
        break;
      case 'content_block_start':
        if (event.content_block?.type === 'tool_use') this.#calls.set(event.index, { name: event.content_block.name, arguments: '' });
        whole.blocks[event.index] = { ...event.content_block };
        break;
      case 'content_block_delta': {
        this.#record.chunks++;
        const delta = event.delta ?? {};
        if (delta.type === 'text_delta') {
          this.#content += delta.text;
          if (block) block.text = (block.text ?? '') + delta.text;
        } else if (delta.type === 'thinking_delta') {
          this.#reasoning += delta.thinking;
          if (block) block.thinking = (block.thinking ?? '') + delta.thinking;
        } else if (delta.type === 'signature_delta') {
          if (block) block.signature = (block.signature ?? '') + delta.signature;
        } else if (delta.type === 'input_json_delta') {
          const call = this.#calls.get(event.index);
          if (call) call.arguments += delta.partial_json;
          whole.partial.set(event.index, (whole.partial.get(event.index) ?? '') + delta.partial_json);
        }
        break;
      }
      case 'content_block_stop':
        // Whole, a tool call's input is an object, not the JSON text it streams as.
        if (block?.type === 'tool_use') block.input = (tryParse(whole.partial.get(event.index) ?? '') as Json | undefined) ?? {};
        break;
      case 'message_delta':
        if (event.delta?.stop_reason) this.#record.finish = event.delta.stop_reason;
        this.#usage(event.usage);
        if (whole.message) {
          Object.assign(whole.message, event.delta ?? {});
          whole.message.usage = { ...whole.message.usage, ...event.usage };
        }
        break;
    }
  }

  #whole(json: Json): void {
    this.#message = json;
    if (this.#record.dialect === 'anthropic') {
      this.#record.finish = json.stop_reason ?? null;
      for (const block of json.content ?? []) {
        if (block.type === 'text') this.#content += block.text;
        else if (block.type === 'thinking') this.#reasoning += block.thinking;
        else if (block.type === 'tool_use') this.#calls.set(this.#calls.size, { name: block.name, arguments: JSON.stringify(block.input) });
      }
      this.#usage(json.usage, json.timings);
      return;
    }
    const choice = json.choices?.[0];
    this.#record.finish = choice?.finish_reason ?? null;
    const message = choice?.message ?? {};
    if (typeof message.content === 'string') this.#content += message.content;
    const reasoning = message.reasoning_content ?? message.reasoning;
    if (typeof reasoning === 'string') this.#reasoning += reasoning;
    for (const call of message.tool_calls ?? []) {
      this.#calls.set(this.#calls.size, { name: call.function?.name ?? '', arguments: call.function?.arguments ?? '' });
    }
    this.#usage(json.usage, json.timings);
  }

  /**
   * Both APIs' usage, and llama.cpp's timings, which every response carries, so
   * streams that didn't ask for usage are still counted. Usage wins when both are there.
   */
  #usage(usage: Json | undefined, timings?: Json): void {
    const record = this.#record;
    if (timings && typeof timings.prompt_n === 'number') {
      record.serverMs = { prompt: timings.prompt_ms ?? 0, predicted: timings.predicted_ms ?? 0 };
      if (record.tokenSource !== 'usage') {
        const cached = timings.cache_n ?? 0;
        record.tokens = { prompt: timings.prompt_n + cached, cached, completion: timings.predicted_n ?? 0 };
        record.tokenSource = 'timings';
      }
    }
    if (!usage) return;
    if (typeof usage.prompt_tokens === 'number') {
      // OpenAI: prompt_tokens includes the cached ones.
      const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
      record.tokens = { prompt: usage.prompt_tokens, cached, completion: usage.completion_tokens ?? 0 };
      record.tokenSource = 'usage';
    } else if (typeof usage.input_tokens === 'number' || typeof usage.output_tokens === 'number') {
      // Anthropic: input_tokens excludes cache reads; streams send input in message_start and output in message_delta.
      const previous = record.tokenSource === 'usage' ? record.tokens : null;
      const cached = usage.cache_read_input_tokens ?? previous?.cached ?? 0;
      const cacheWrite = usage.cache_creation_input_tokens ?? previous?.cacheWrite ?? 0;
      const input = usage.input_tokens ?? (previous ? previous.prompt - previous.cached - (previous.cacheWrite ?? 0) : 0);
      record.tokens = {
        prompt: input + cached + cacheWrite,
        cached,
        completion: usage.output_tokens ?? previous?.completion ?? 0,
        ...(cacheWrite ? { cacheWrite } : {}),
      };
      record.tokenSource = 'usage';
    }
  }
}
