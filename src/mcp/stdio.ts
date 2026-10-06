import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import type { LocalMcpConfig } from '../config.ts';
import { deadline, settle, type Incoming, type RequestOptions, type Transport } from './transport.ts';

/** How much of the server's stderr is kept, to explain its failures. */
const STDERR_CHARS = 2_000;
/** How long `close()` waits for the server at each step: closed stdin, SIGTERM, SIGKILL. */
const CLOSE_GRACE_MS = 2_000;

/**
 * Starts the server on the first request, and again on the next one if it dies:
 * the protocol is stateless, so nothing is lost but the calls it was running.
 * It runs in its own process group, so Ctrl-C at the terminal doesn't reach it.
 */
export class StdioTransport implements Transport {
  readonly #config: LocalMcpConfig;
  #child: ChildProcessWithoutNullStreams | undefined;
  #pending = new Map<number, { resolve(message: Incoming): void; reject(err: unknown): void }>();
  #nextId = 1;
  #stderr = '';

  constructor(config: LocalMcpConfig) {
    this.#config = config;
  }

  async request(method: string, params: Record<string, unknown>, options: RequestOptions): Promise<Record<string, unknown>> {
    const { signal, reason } = deadline(method, options);
    if (signal.aborted) throw reason();
    const child = this.#spawn();
    const id = this.#nextId++;
    let onAbort = () => {};
    const reply = new Promise<Incoming>((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      onAbort = () => {
        if (!this.#pending.delete(id)) return;
        this.#send(child, { method: 'notifications/cancelled', params: { requestId: id } });
        reject(reason());
      };
    });
    signal.addEventListener('abort', onAbort, { once: true });
    this.#send(child, { id, method, params });
    try {
      return settle(await reply);
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }

  async close(): Promise<void> {
    const child = this.#child;
    if (!child) return;
    const exited = new Promise<boolean>((resolve) => child.once('exit', () => resolve(true)));
    // The spec's shutdown: close its stdin, then signal it if it doesn't exit.
    child.stdin.end();
    for (const signal of ['SIGTERM', 'SIGKILL'] as const) {
      if (await Promise.race([exited, delay(CLOSE_GRACE_MS, false, { ref: false })])) return;
      try {
        process.kill(-child.pid!, signal);
      } catch {
        // Already gone.
      }
    }
    await exited;
  }

  #spawn(): ChildProcessWithoutNullStreams {
    if (this.#child) return this.#child;
    const { command: [command, ...args], cwd, environment } = this.#config;
    const child = spawn(command!, args, { cwd, env: { ...process.env, ...environment }, stdio: 'pipe', detached: true });
    this.#child = child;
    this.#stderr = '';

    let buffer = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      buffer += chunk;
      for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 1);
        if (line) this.#receive(line);
      }
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => (this.#stderr = (this.#stderr + chunk).slice(-STDERR_CHARS)));
    // Writes to a server that's gone fail with EPIPE; its exit already says so.
    child.stdin.on('error', () => {});

    const gone = (why: string) => {
      if (this.#child !== child) return;
      this.#child = undefined;
      const stderr = this.#stderr.trim();
      const error = new Error(stderr ? `${why}: ${stderr}` : why);
      for (const { reject } of this.#pending.values()) reject(error);
      this.#pending.clear();
    };
    child.on('error', (err) => gone(`Couldn't start ${command}: ${err.message}`));
    child.on('exit', (code, signal) => gone(`The server exited (${signal ?? `code ${code}`})`));
    return child;
  }

  #receive(line: string): void {
    let message: Incoming;
    try {
      message = JSON.parse(line) as Incoming;
    } catch {
      return;
    }
    // Responses only: notifications are about calls' progress, which nothing shows.
    if (typeof message.id !== 'number' || !('result' in message || 'error' in message)) return;
    const pending = this.#pending.get(message.id);
    this.#pending.delete(message.id);
    pending?.resolve(message);
  }

  #send(child: ChildProcessWithoutNullStreams, message: object): void {
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
  }
}
