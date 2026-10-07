import { EventEmitter } from 'node:events';
import type { ChatCompletionMessageFunctionToolCall } from 'openai/resources/chat/completions';
import {
  addUsage,
  emptyUsage,
  type AssistantMessage,
  type Message,
  type Provider,
  type Reasoning,
  type ToolMessage,
  type ToolSpec,
  type Usage,
} from './provider.ts';
import type { Submodel } from './models.ts';
import { toProvider, type ApiClient } from './providers/index.ts';
import { ToolInputError, type Tool, type Toolset } from './tool.ts';
import { REPEAT_NOTE } from './tools/shell.ts';

export type { AssistantMessage, Message, Usage } from './provider.ts';

export interface EndState {
  /** Assistant message produced by the latest turn. */
  message: AssistantMessage;
  /** Full conversation so far, including `message`. */
  messages: readonly Message[];
  /** 1-based number of the turn that just finished. */
  turn: number;
}

/** Return true to stop the loop. Checked after each assistant turn. */
export type EndCriteria = (state: EndState) => boolean | Promise<boolean>;

export const noToolCalls: EndCriteria = ({ message }) => !message.tool_calls?.length;

/** Starts each event message: what tools' background work reports, so the model can tell it from the user. */
export const EVENT_PREFIX = '[Event, not from the user]';

/**
 * Said, as the user, after a command's output repeats one before it: a small model
 * gets the note in the tool result, and runs the same thing again anyway. An
 * instruction from the user, at the moment it's stuck, is harder to pass over.
 */
export const REPEAT_NUDGE =
  "You've run this before and got the same result: it isn't working. Before your next command, say what you expected, what you got, and what you'll do differently.";

export interface LoopOptions {
  endCriteria?: EndCriteria;
  /** Run every tool call in the model's order, one at a time. Off by default. */
  sequentialTools?: boolean;
  /**
   * Lets tools set up other models as the loop's model refers to them
   * (`ToolContext.submodel`), e.g. a subagent's own: the model's `submodel`.
   */
  submodel?: Submodel;
}

export interface RunOptions {
  model: string;
  input: Message[];
  /** Overrides the toolset given to the constructor for this run. */
  toolset?: Toolset;
  endCriteria?: EndCriteria;
  signal?: AbortSignal;
  /** Overrides the provider's configured reasoning for this run's turns. */
  reasoning?: Reasoning;
  /** Extra provider-specific request fields (temperature, llama.cpp sampling params, ...). */
  request?: Record<string, unknown>;
  /** Provider for this run instead of the constructor's, e.g. after switching to another provider's model. */
  api?: ApiClient;
  /** For this run instead of the constructor's, e.g. the `submodel` of the model switched to. */
  submodel?: Submodel;
}

export interface RunResult {
  /** Final assistant message. */
  message: AssistantMessage;
  /** Full conversation, starting with the input. */
  messages: Message[];
  /** Tokens used by the run, including inference done by tools. */
  usage: Usage;
}

export interface ToolCallEvent {
  id: string;
  name: string;
  arguments: unknown;
  /**
   * Absent for this loop's own calls. Set for calls made inside one of them, such
   * as a subagent's: the id of that enclosing call (see `ToolContext.relay`).
   * Listeners that count or audit the model's own calls should skip these.
   */
  parent?: string;
}

export interface ToolResultEvent extends ToolCallEvent {
  result: string;
  isError: boolean;
}

export interface UsageEvent extends Usage {
  model: string;
  /** 1-based turn the call happened in. */
  turn: number;
  /** A model turn, or inference a tool ran itself (e.g. compaction). */
  source: 'turn' | 'tool';
  /** Name of the tool, for `source: 'tool'`. */
  tool?: string;
}

export interface LoopEvents {
  /** A request to the model is about to be made. */
  turn: [turn: number];
  /** Streamed reasoning/thinking delta. */
  reasoning: [delta: string];
  /** Streamed content delta. */
  content: [delta: string];
  /** A tool is about to be invoked. */
  tool_call: [call: ToolCallEvent];
  tool_result: [result: ToolResultEvent];
  /** Tokens used by one model call. */
  usage: [usage: UsageEvent];
  /** A message was appended to the conversation (assistant, tool, or queued). */
  message: [message: Message];
  /** The model is done, but background work isn't: the run waits for its events, or a queued message. */
  waiting: [count: number];
  /** End criteria were met, or the model refused. */
  end: [result: RunResult];
}

export class AgentLoop extends EventEmitter<LoopEvents> {
  readonly api: Provider;
  readonly toolset: Toolset;
  readonly endCriteria: EndCriteria;
  readonly sequentialTools: boolean;
  readonly submodel: Submodel | undefined;
  #pending: Message[] = [];
  #running = false;
  /** Background work from tools (`ToolContext.background`) that hasn't reported yet. */
  #background = new Set<Promise<void>>();
  /** Ends a wait for an event or a queued message. */
  #wake: (() => void) | undefined;

  constructor(api: ApiClient, toolset: Toolset = {}, options: LoopOptions = {}) {
    super();
    this.api = toProvider(api);
    this.toolset = toolset;
    this.endCriteria = options.endCriteria ?? noToolCalls;
    this.sequentialTools = options.sequentialTools ?? false;
    this.submodel = options.submodel;
  }

  get running(): boolean {
    return this.#running;
  }

  /**
   * Queues a message to be sent with the next request. While a run is in
   * progress, a queued message also keeps the loop from ending. Messages queued
   * between runs are sent after the next run's input.
   */
  queue(message: Message | string): void {
    this.#pending.push(typeof message === 'string' ? { role: 'user', content: message } : message);
    this.#wake?.();
  }

  /** Background work from tools that hasn't reported yet. */
  get backgroundCount(): number {
    return this.#background.size;
  }

  async run(options: RunOptions): Promise<RunResult> {
    if (this.#running) throw new Error('AgentLoop is already running');
    this.#running = true;
    try {
      return await this.#run(options);
    } finally {
      this.#running = false;
    }
  }

  async #run({ model, input, toolset = this.toolset, endCriteria = this.endCriteria, signal, reasoning, request, api: client, submodel = this.submodel }: RunOptions): Promise<RunResult> {
    const api = client ? toProvider(client) : this.api;
    const messages: Message[] = [...input];
    const tools = toolSpecs(toolset);
    // Looked up by the names the model sends, so a Map: `constructor` isn't a tool.
    const byName: ReadonlyMap<string, Tool> = new Map(Object.entries(toolset));
    let usage = emptyUsage();
    let turn = 0;
    const track: Track = (used, info) => {
      usage = addUsage(usage, used);
      this.emit('usage', { ...used, ...info, turn });
    };

    for (turn = 1; ; turn++) {
      this.#drainQueue(messages);
      signal?.throwIfAborted();
      this.emit('turn', turn);

      const message = await api.turn(
        { model, messages, tools, signal, reasoning, request },
        {
          reasoning: (delta) => this.emit('reasoning', delta),
          content: (delta) => this.emit('content', delta),
          usage: (used) => track(used, { model, source: 'turn' }),
        },
      );
      // SDKs may end an aborted stream quietly; don't act on a cut-off message.
      signal?.throwIfAborted();
      messages.push(message);
      this.emit('message', message);

      if (message.tool_calls?.length) {
        // A refused or truncated turn's tool calls may be incomplete; answer them without running.
        const skip = message.stop === 'refusal' || message.stop === 'max_tokens' ? message.stop : undefined;
        const results = skip
          ? message.tool_calls.map((call) => this.#skip(call, skip))
          : await this.#invokeAll(message.tool_calls, byName, { api, model, submodel, signal, track, messages });
        for (const result of results) {
          messages.push(result);
          this.emit('message', result);
        }
        if (results.some((result) => typeof result.content === 'string' && REPEAT_NOTE.test(result.content))) this.queue(REPEAT_NUDGE);
      }

      const done = message.stop === 'refusal' || (await endCriteria({ message, messages, turn }));
      if (done && (this.#pending.length === 0 || message.stop === 'refusal')) {
        // Done, but for background work: its events, or a message queued meanwhile, start the next turn.
        if (this.#background.size && message.stop !== 'refusal') {
          this.emit('waiting', this.#background.size);
          await this.#nextMessage(signal);
          continue;
        }
        const result = { message, messages, usage };
        this.emit('end', result);
        return result;
      }
    }
  }

  /** Resolves when a message is queued, or rejects when the run is aborted. */
  #nextMessage(signal: AbortSignal | undefined): Promise<void> {
    if (this.#pending.length) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(signal!.reason);
      };
      const cleanup = () => {
        this.#wake = undefined;
        signal?.removeEventListener('abort', onAbort);
      };
      this.#wake = () => {
        cleanup();
        resolve();
      };
      if (signal?.aborted) return onAbort();
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * Tracks a tool's background work; what it settles with is queued as an event.
   * Not after an abort: the run that wanted it is over, and the work was stopped with it.
   */
  #track(work: Promise<string>, signal: AbortSignal | undefined): void {
    const task: Promise<void> = work
      .catch((err: unknown) => `Background work failed: ${err instanceof Error ? err.message : String(err)}`)
      .then((text) => {
        this.#background.delete(task);
        if (!signal?.aborted) this.queue({ role: 'user', content: `${EVENT_PREFIX} ${text}` });
      });
    this.#background.add(task);
  }

  #drainQueue(messages: Message[]): void {
    for (const message of this.#pending.splice(0)) {
      messages.push(message);
      this.emit('message', message);
    }
  }

  /**
   * Runs a turn's calls concurrently, except sequential ones, which wait for
   * everything before them and run alone. Results keep the model's order.
   */
  async #invokeAll(calls: ChatCompletionMessageFunctionToolCall[], toolset: ReadonlyMap<string, Tool>, context: InvokeContext): Promise<ToolMessage[]> {
    const results: ToolMessage[] = [];
    let batch: Promise<ToolMessage>[] = [];
    for (const call of calls) {
      if (this.sequentialTools || toolset.get(call.function.name)?.sequential) {
        results.push(...(await Promise.all(batch)));
        batch = [];
        results.push(await this.#invoke(call, toolset, context));
      } else {
        batch.push(this.#invoke(call, toolset, context));
      }
    }
    results.push(...(await Promise.all(batch)));
    return results;
  }

  async #invoke(
    call: ChatCompletionMessageFunctionToolCall,
    toolset: ReadonlyMap<string, Tool>,
    { api, model, submodel, signal, track, messages }: InvokeContext,
  ): Promise<ToolMessage> {
    const { id } = call;
    const { name, arguments: raw } = call.function;
    const args = parseArguments(raw);
    this.emit('tool_call', { id, name, arguments: args ?? raw });

    let result: string;
    let isError = false;
    try {
      const tool = toolset.get(name);
      if (!tool) throw new ToolInputError(`Unknown tool "${name}"`);
      if (!args) throw new ToolInputError('Arguments must be a JSON object');
      result = await tool.invoke(args, {
        api: attributed(api, name, track),
        model,
        signal,
        messages,
        relay: this.#relay(id),
        background: (work) => this.#track(work, signal),
        ...(submodel ? { submodel: attributedSubmodel(submodel, name, track) } : {}),
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      // Any failure goes back to the model as the tool result; it may be able to recover.
      isError = true;
      result = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }

    this.emit('tool_result', { id, name, arguments: args, result, isError });
    return { role: 'tool', tool_call_id: id, content: result, ...(isError ? { is_error: true } : {}) };
  }

  /**
   * Re-emits a nested loop's tool calls and results as this loop's, under the call
   * `id`. Only those two events: nested usage is already counted, via `attributed()`.
   */
  #relay(id: string): (child: AgentLoop) => void {
    return (child) => {
      child.on('tool_call', (call) => this.emit('tool_call', { ...call, parent: call.parent ?? id }));
      child.on('tool_result', (result) => this.emit('tool_result', { ...result, parent: result.parent ?? id }));
    };
  }

  #skip(call: ChatCompletionMessageFunctionToolCall, reason: 'refusal' | 'max_tokens'): ToolMessage {
    const { id } = call;
    const { name, arguments: raw } = call.function;
    const result =
      reason === 'max_tokens'
        ? 'Error: not run; the response hit the output token limit, so the arguments may be incomplete'
        : 'Error: not run; the response was declined';
    this.emit('tool_call', { id, name, arguments: parseArguments(raw) ?? raw });
    this.emit('tool_result', { id, name, arguments: parseArguments(raw), result, isError: true });
    return { role: 'tool', tool_call_id: id, content: result, is_error: true };
  }
}

/** `Loop(api, toolset)` from the spec; equivalent to `new AgentLoop(...)`. */
export function Loop(api: ApiClient, toolset: Toolset = {}, options: LoopOptions = {}): AgentLoop {
  return new AgentLoop(api, toolset, options);
}

interface InvokeContext {
  api: Provider;
  model: string;
  submodel: Submodel | undefined;
  signal: AbortSignal | undefined;
  track: Track;
  /** Tool results are added only after the whole turn's calls finish, so this doesn't change during them. */
  messages: readonly Message[];
}

type Track = (usage: Usage, info: Pick<UsageEvent, 'model' | 'source' | 'tool'>) => void;

/** The provider as a tool sees it: its own inference is reported as the tool's usage. */
function attributed(api: Provider, tool: string, track: Track): Provider {
  return {
    name: api.name,
    turn: (request, on) =>
      api.turn(request, {
        ...on,
        usage: (used) => {
          on.usage?.(used);
          track(used, { model: request.model, source: 'tool', tool });
        },
      }),
    complete: (request) =>
      api.complete({
        ...request,
        onUsage: (used) => {
          request.onUsage?.(used);
          track(used, { model: request.model, source: 'tool', tool });
        },
      }),
  };
}

/** Models a tool sets up, with their usage reported as the tool's too; so are their own submodels', e.g. a subagent's subagent's. */
function attributedSubmodel(submodel: Submodel, tool: string, track: Track): Submodel {
  return async (ref, variant) => {
    const resolved = await submodel(ref, variant);
    if (!resolved) return undefined;
    return {
      ...resolved,
      api: attributed(resolved.api, tool, track),
      ...(resolved.submodel ? { submodel: attributedSubmodel(resolved.submodel, tool, track) } : {}),
    };
  };
}

function parseArguments(raw: string): Record<string, unknown> | undefined {
  if (!raw.trim()) return {};
  try {
    const args: unknown = JSON.parse(raw);
    return typeof args === 'object' && args !== null && !Array.isArray(args)
      ? (args as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function toolSpecs(toolset: Toolset): ToolSpec[] {
  return Object.entries(toolset).map(([name, tool]) => ({ name, ...tool.schema() }));
}
