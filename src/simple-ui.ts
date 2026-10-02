import { createInterface, type Interface } from 'node:readline';
import { styleText } from 'node:util';
import type { AgentLoop, Message, RunOptions, ToolCallEvent, ToolResultEvent, UsageEvent } from './loop.ts';
import type { ModelResolver, ResolvedModel } from './models.ts';
import { addUsage, emptyUsage, type Provider, type Usage } from './provider.ts';

type Style = Parameters<typeof styleText>[0];

/** Builds a fresh agent, e.g. so `/c` also resets tool state. */
export type AgentFactory = () => AgentLoop;

/** The model runs use; without `api`, the loop's own provider runs it. */
type CurrentModel = Pick<ResolvedModel, 'ref' | 'alias' | 'model' | 'variant'> & { api?: Provider };

export interface SimpleUIOptions {
  /**
   * Initial model: an id for the loop's provider, or a resolved model, which
   * brings its own. `/model` switches it.
   */
  model: string | ResolvedModel;
  /**
   * Resolves `/model <ref> [variant]`, e.g. with a `ModelRegistry`, so the
   * session can switch providers too. Without it, `/model` only changes the id.
   */
  resolveModel?: ModelResolver;
  /** System prompt prepended to the conversation. */
  system?: string;
  /** Shown in the header. */
  title?: string;
  /** Stream the model's reasoning, dimmed. On by default. */
  showReasoning?: boolean;
  /** Print token usage after each run. On by default. */
  showUsage?: boolean;
  /** Extra request fields passed to every run. */
  request?: RunOptions['request'];
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WriteStream;
}

const HELP = '/c clear · /model [name [variant]] · /usage · /q quit · Ctrl-C interrupt';

/**
 * Minimal terminal chat. Takes a ready-made loop, or a factory that `/c` uses
 * to start over with fresh tool state. Lines typed while the agent is working
 * are queued into the running loop.
 */
export class SimpleUI {
  readonly options: SimpleUIOptions;
  #factory: AgentFactory | undefined;
  #loop: AgentLoop;
  #model: CurrentModel;
  /** Pending model switches, in order; runs wait for them. */
  #switching: Promise<unknown> = Promise.resolve();
  #out: NodeJS.WriteStream;
  #rl: Interface | undefined;
  #history: Message[] = [];
  #abort: AbortController | undefined;
  /** Block currently being streamed. */
  #block: 'text' | 'reasoning' | undefined;
  /** Unfinished line of text, held back so markdown spans aren't split. */
  #line = '';
  #atLineStart = false;
  #blankLines = 0;
  #lastCall: string | undefined;
  #calls = new Map<string, ToolCallEvent>();
  /** The call whose nested calls would follow the last tool line without naming it. */
  #context: string | undefined;
  #runUsage = emptyUsage();
  #sessionUsage = emptyUsage();

  constructor(agent: AgentLoop | AgentFactory, options: SimpleUIOptions) {
    this.options = options;
    this.#out = options.output ?? process.stdout;
    this.#model = typeof options.model === 'string' ? { ref: options.model, model: options.model } : options.model;
    if (typeof agent === 'function') this.#factory = agent;
    this.#loop = this.#attach(typeof agent === 'function' ? agent() : agent);
    this.#reset();
  }

  get loop(): AgentLoop {
    return this.#loop;
  }

  /** The model id runs use. */
  get model(): string {
    return this.#model.model;
  }

  /**
   * Switches models for the following runs, keeping the conversation and tool
   * state. Takes a reference for `resolveModel`, or a model id without it.
   * Switches happen in order, and runs started meanwhile wait for them.
   */
  async switchModel(ref: string, variant?: string): Promise<void> {
    await this.#switch(ref, variant);
  }

  /** Queues a switch, or with no reference just waits for earlier ones; resolves to the model's label after it. */
  #switch(ref: string | undefined, variant?: string): Promise<string> {
    const switched = this.#switching.then(async () => {
      if (ref !== undefined) this.#model = await this.#resolve(ref, variant);
      return this.#modelLabel();
    });
    this.#switching = switched.catch(() => {});
    return switched;
  }

  async #resolve(ref: string, variant: string | undefined): Promise<CurrentModel> {
    const { resolveModel } = this.options;
    if (resolveModel) return resolveModel(ref, variant);
    if (variant !== undefined) throw new Error('Variants need a model resolver');
    return { ref, model: ref };
  }

  /** The model as shown: its alias if any, its reference, and its variant if any. */
  #modelLabel(): string {
    const { ref, alias, variant } = this.#model;
    const label = variant === undefined ? ref : `${ref} (${variant})`;
    return alias === undefined ? label : `${alias}: ${label}`;
  }

  /** Runs the REPL; resolves when the user quits. */
  start(): Promise<void> {
    const { title = 'featherslop' } = this.options;
    this.#print(`${this.#style('bold', title)} | ${this.#style('dim', `${this.#modelLabel()} | ${process.cwd()}`)}`);
    this.#print(`${this.#style('dim', HELP)}\n`);

    const rl = (this.#rl = createInterface({ input: this.options.input ?? process.stdin, output: this.#out }));
    rl.setPrompt(`${this.#style(['bold', 'blue'], '❯')} `);

    return new Promise((resolve) => {
      rl.on('close', () => {
        this.#rl = undefined;
        this.#abort?.abort();
        resolve();
      });
      rl.on('SIGINT', () => (this.#abort ? this.#abort.abort() : rl.close()));
      rl.on('line', (line) => void this.#onLine(line.trim()));
      this.#prompt();
    });
  }

  async #onLine(line: string): Promise<void> {
    if (line === '/q' || line === 'exit') return void this.#rl?.close();
    if (this.#abort) {
      if (line.startsWith('/')) {
        this.#print(this.#style('dim', '  ↳ commands run once the agent is idle (Ctrl-C to interrupt)'));
      } else if (line) {
        this.#loop.queue(line);
        this.#print(this.#style('dim', `  ↳ queued: ${preview(line, 60)}`));
      }
      return;
    }
    if (!line) return this.#prompt();
    if (line.startsWith('/')) {
      await this.#command(line);
      return this.#prompt();
    }

    this.#print(this.#separator());
    await this.ask(line);
    if (!this.#rl) return;
    this.#print('');
    this.#prompt();
  }

  /**
   * Sends one prompt and renders the run, without the REPL. Resolves when the
   * run ends; failures are rendered, not thrown.
   */
  async ask(prompt: string): Promise<void> {
    if (this.#abort) throw new Error('SimpleUI is already running');
    const abort = (this.#abort = new AbortController());
    this.#runUsage = emptyUsage();
    try {
      await this.#switching;
      const { messages } = await this.#loop.run({
        model: this.model,
        ...(this.#model.api ? { api: this.#model.api } : {}),
        input: [...this.#history, { role: 'user', content: prompt }],
        signal: abort.signal,
        ...(this.options.request ? { request: this.options.request } : {}),
      });
      this.#history = messages;
    } catch (err) {
      this.#endBlock();
      this.#print(
        abort.signal.aborted
          ? this.#style('yellow', '⏺ Interrupted')
          : this.#style('red', `⏺ Error: ${err instanceof Error ? err.message : String(err)}`),
      );
    } finally {
      this.#endBlock();
      this.#abort = undefined;
    }
    if (this.options.showUsage !== false && hasUsage(this.#runUsage)) {
      this.#print(this.#style('dim', `  ↳ ${formatUsage(this.#runUsage)}`));
    }
  }

  async #command(line: string): Promise<void> {
    const [command, ...args] = line.split(/\s+/);
    switch (command) {
      case '/c':
        if (this.#factory) {
          this.#detach(this.#loop);
          this.#loop = this.#attach(this.#factory());
        }
        this.#reset();
        this.#print(this.#style('green', '⏺ Cleared conversation'));
        break;
      case '/model':
        // Resolving may take a moment (e.g. loading an SDK); lines typed meanwhile come after.
        try {
          this.#print(`${this.#style('green', '⏺ Model:')} ${await this.#switch(args[0], args[1])}`);
        } catch (err) {
          this.#print(this.#style('red', `⏺ ${err instanceof Error ? err.message : String(err)}`));
        }
        break;
      case '/usage':
        this.#print(`${this.#style('green', '⏺ Session usage:')} ${formatUsage(this.#sessionUsage)}`);
        break;
      default:
        this.#print(this.#style('yellow', `⏺ Unknown command ${command}`) + this.#style('dim', ` (${HELP})`));
    }
  }

  // Bound once so they can be removed when a fresh loop replaces the old one.
  #onTurn = () => this.#endBlock();
  #onReasoning = (delta: string) => this.#reasoning(delta);
  #onContent = (delta: string) => this.#content(delta);
  #onToolCall = (call: ToolCallEvent) => this.#toolCall(call);
  #onToolResult = (result: ToolResultEvent) => this.#toolResult(result);
  #onUsage = (usage: UsageEvent) => {
    this.#runUsage = addUsage(this.#runUsage, usage);
    this.#sessionUsage = addUsage(this.#sessionUsage, usage);
  };
  #onMessage = (message: Message) => {
    if (message.role === 'user' && this.#abort) this.#print(this.#style('dim', `  ↳ sent: ${preview(text(message.content), 60)}`));
  };

  #attach(loop: AgentLoop): AgentLoop {
    return loop
      .on('turn', this.#onTurn)
      .on('reasoning', this.#onReasoning)
      .on('content', this.#onContent)
      .on('tool_call', this.#onToolCall)
      .on('tool_result', this.#onToolResult)
      .on('usage', this.#onUsage)
      .on('message', this.#onMessage);
  }

  #detach(loop: AgentLoop): void {
    loop
      .off('turn', this.#onTurn)
      .off('reasoning', this.#onReasoning)
      .off('content', this.#onContent)
      .off('tool_call', this.#onToolCall)
      .off('tool_result', this.#onToolResult)
      .off('usage', this.#onUsage)
      .off('message', this.#onMessage);
  }

  #reasoning(delta: string): void {
    if (this.options.showReasoning === false) return;
    if (this.#block !== 'reasoning') {
      this.#begin('reasoning', this.#style('dim', '✻'));
      delta = delta.trimStart();
    }
    this.#stream(delta, (part) => this.#style(['dim', 'italic'], part));
  }

  #content(delta: string): void {
    if (this.#block !== 'text') {
      this.#begin('text', this.#style('cyan', '⏺'));
      delta = delta.trimStart();
    }
    this.#line += delta;
    let newline: number;
    while ((newline = this.#line.indexOf('\n')) !== -1) {
      this.#textLine(this.#line.slice(0, newline));
      this.#line = this.#line.slice(newline + 1);
    }
  }

  #begin(block: 'text' | 'reasoning', marker: string): void {
    this.#endBlock();
    this.#block = block;
    this.#write(`\n${marker} `);
    this.#atLineStart = false;
    this.#blankLines = 0;
  }

  /** Writes a complete line of text; blank lines are held until more text follows. */
  #textLine(line: string): void {
    if (!line.trim()) {
      this.#blankLines++;
      return;
    }
    this.#write('\n'.repeat(this.#blankLines));
    this.#blankLines = 0;
    this.#stream(`${this.#markdown(line)}\n`, (part) => part);
  }

  /** Writes streamed output, indenting continuation lines under the block marker. */
  #stream(value: string, style: (part: string) => string): void {
    value.split('\n').forEach((part, i) => {
      if (i > 0) {
        this.#write('\n');
        this.#atLineStart = true;
      }
      if (!part) return;
      if (this.#atLineStart) this.#write('  ');
      this.#write(style(part));
      this.#atLineStart = false;
    });
  }

  #toolCall(call: ToolCallEvent): void {
    this.#endBlock();
    const key = callKey(call);
    this.#calls.set(key, call);
    // Calls made inside another call (a subagent's) sit under it, without a blank line.
    // Parallel subagents interleave, so name the enclosing call when it changes.
    const depth = this.#depth(call);
    const parent = call.parent === undefined ? undefined : this.#find(call.parent);
    const tag = parent && call.parent !== this.#context ? this.#style('dim', ` · in ${label(parent)}`) : '';
    const line = `${this.#style('green', `⏺ ${capitalize(call.name)}`)}(${this.#style('dim', argPreview(call.arguments))})${tag}`;
    this.#print(depth ? `${'  '.repeat(depth)}${line}` : `\n${line}`);
    this.#lastCall = key;
    this.#context = call.parent ?? call.id;
  }

  #toolResult(event: ToolResultEvent): void {
    const { result, isError } = event;
    const lines = result.trimEnd().split('\n');
    let summary = preview(lines[0] ?? '', 60);
    if (lines.length > 1) summary += ` … +${lines.length - 1} lines`;

    // Parallel calls finish out of order, and a subagent's calls come between its
    // call and its result; label results that don't follow their call.
    const key = callKey(event);
    const call = this.#calls.get(key);
    const name = key !== this.#lastCall && call ? `${label(call)} ` : '';
    const indent = '  '.repeat(this.#depth(event) + 1);
    this.#print(`${indent}${this.#style('dim', `⎿  ${name}`)}${this.#style(isError ? 'red' : 'dim', summary)}`);
    this.#calls.delete(key);
    this.#lastCall = undefined;
    this.#context = event.parent;
  }

  /** How many calls `call` runs inside: 0 for the loop's own calls. */
  #depth(call: ToolCallEvent): number {
    let depth = 0;
    for (let parent = call.parent; parent !== undefined; depth++) parent = this.#find(parent)?.parent;
    return depth;
  }

  /** A pending call that others run inside, by its id: one of the loop's own first, since ids repeat across levels. */
  #find(id: string): ToolCallEvent | undefined {
    const own = this.#calls.get(id);
    if (own) return own;
    for (const call of this.#calls.values()) if (call.id === id) return call;
    return undefined;
  }

  /** Finishes whatever block (text or reasoning) is being streamed. */
  #endBlock(): void {
    if (this.#block === 'text' && this.#line.trim()) this.#textLine(this.#line);
    if (this.#block && !this.#atLineStart) this.#write('\n');
    this.#block = undefined;
    this.#line = '';
  }

  #reset(): void {
    this.#history = this.options.system ? [{ role: 'system', content: this.options.system }] : [];
  }

  #prompt(): void {
    this.#print(this.#separator());
    this.#rl?.prompt();
  }

  #separator(): string {
    return this.#style('dim', '─'.repeat(Math.min(this.#out.columns || 80, 80)));
  }

  #markdown(line: string): string {
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) return this.#style('bold', heading[1] ?? '');
    return line
      .replace(/\*\*(.+?)\*\*/g, (_m, s: string) => this.#style('bold', s))
      .replace(/`([^`]+)`/g, (_m, s: string) => this.#style('cyan', s));
  }

  #style(format: Style, value: string): string {
    return styleText(format, value, { stream: this.#out });
  }

  #write(value: string): void {
    this.#out.write(value);
  }

  #print(value: string): void {
    this.#out.write(`${value}\n`);
  }
}

/** A call as results and nested calls refer to it, e.g. "Read(main.js)". */
function label(call: ToolCallEvent): string {
  return `${capitalize(call.name)}(${preview(argPreview(call.arguments), 30)})`;
}

/** Ids are unique within a loop, not across the loops nested in it. */
function callKey({ id, parent }: ToolCallEvent): string {
  return parent === undefined ? id : `${parent}/${id}`;
}

function hasUsage(usage: Usage): boolean {
  return usage.input + usage.output + usage.cacheRead + usage.cacheWrite > 0;
}

/** e.g. `12.3k in · 9.1k cache read · 450 out (300 reasoning)` */
export function formatUsage(usage: Usage): string {
  const parts = [`${tokens(usage.input)} in`];
  if (usage.cacheRead) parts.push(`${tokens(usage.cacheRead)} cache read`);
  if (usage.cacheWrite) parts.push(`${tokens(usage.cacheWrite)} cache write`);
  parts.push(`${tokens(usage.output)} out${usage.reasoning ? ` (${tokens(usage.reasoning)} reasoning)` : ''}`);
  return parts.join(' · ');
}

function tokens(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

function argPreview(args: unknown): string {
  if (typeof args !== 'object' || args === null) return preview(String(args), 50);
  const first = Object.values(args)[0];
  return preview(Array.isArray(first) ? first.join(', ') : String(first ?? ''), 50);
}

function preview(value: string, max: number): string {
  const line = value.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function text(content: Message['content']): string {
  if (typeof content === 'string') return content;
  return (content ?? []).map((part) => ('text' in part ? part.text : '')).join(' ');
}
