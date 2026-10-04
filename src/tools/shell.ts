import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, rm, type FileHandle } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { defineTool, ToolInputError, type Tool, type ToolOptions } from '../tool.ts';
import { spawnGroup, type GroupResult } from './shared/process.ts';

export interface ShellParams {
  command: string;
  /** Run in the background, reporting back with an event message when it exits. */
  bg: boolean;
  /** Working directory. Defaults to the process cwd at call time. */
  cwd: string | undefined;
  timeoutMs: number;
  /** The timeout in the background, where waiting costs nothing. */
  bgTimeoutMs: number;
  /** Longer output keeps only its end; the full output stays in a temporary file. */
  maxLength: number;
  /** How many earlier runs to compare output with, to note repeats. 0 turns that off. */
  repeatWindow: number;
  shell: string;
}

/**
 * Runs a shell command with full access to the machine, as the current user.
 * There is no sandbox: only give it to agents you'd let use your terminal.
 *
 * When a command's output is the same as an earlier run's, the result says so:
 * small models don't notice they're going in circles, but follow a signal.
 */
export function ShellTool(options?: ToolOptions<ShellParams>): Tool {
  // Per instance: each loop and subagent builds its own tools, so they don't share history.
  const repeats = new Repeats();
  return defineTool<ShellParams>({
    description: 'Run a shell command and return its combined output and exit code.',
    sequential: true,
    params: {
      command: {
        schema: { type: 'string', description: 'Command to run' },
        required: true,
      },
      bg: {
        schema: { type: 'boolean', description: 'Run in the background: return at once, and get a message when it exits' },
        default: false,
      },
      cwd: {
        schema: { type: 'string' },
        expose: false,
      },
      timeoutMs: {
        schema: { type: 'integer', minimum: 1 },
        default: 120_000,
        expose: false,
      },
      bgTimeoutMs: {
        schema: { type: 'integer', minimum: 1 },
        default: 30 * 60_000,
        expose: false,
      },
      maxLength: {
        schema: {
          type: 'integer',
          minimum: 0,
          description:
            'Max characters of output to return. Longer output keeps its end, and the full output is saved to a file. ' +
            'Use 0 to only save it to a file, then read or search the file.',
        },
        default: 20_000,
        expose: false,
      },
      repeatWindow: {
        schema: { type: 'integer', minimum: 0 },
        default: 20,
        expose: false,
      },
      shell: {
        schema: { type: 'string' },
        default: '/bin/sh',
        expose: false,
      },
    },

    async invoke({ command, bg, cwd, timeoutMs, bgTimeoutMs, maxLength, repeatWindow, shell }, { signal, background }) {
      if (bg) {
        if (!background) throw new ToolInputError('bg needs an agent loop to report back to');
        const check = (file: string, size: number, result: GroupResult) => repeats.check(file, size, result, repeatWindow);
        return startBackground(command, { cwd: cwd ?? process.cwd(), timeoutMs: bgTimeoutMs, shell, signal }, maxLength, check, background);
      }
      // stdout and stderr both go to this file, so the kernel keeps their writes in
      // order, whatever the shell, and long output never has to fit in memory.
      // Owner-only and created afresh: command output can contain secrets, and the
      // temp directory is shared. There's no size limit yet: unlike a pipe, a file
      // never makes the command wait, so runaway output fills the disk.
      const file = join(tmpdir(), `featherloop-shell-${randomUUID()}.log`);
      const handle = await open(file, 'ax+', 0o600);
      let keep = false;
      try {
        const result = await run(command, handle.fd, { cwd: cwd ?? process.cwd(), timeoutMs, shell, signal });
        const { size } = await handle.stat();
        const out: string[] = [];
        if (size > 0 && maxLength === 0) {
          keep = true;
          out.push(`[Output (${size} bytes) saved to ${file}]`);
        } else if (size > 0) {
          const { text, omitted } = await tail(handle, size, maxLength);
          keep = omitted > 0;
          if (omitted) out.push(`[… ${omitted} bytes omitted; full output saved to ${file} …]`);
          if (text) out.push(text);
        }
        out.push(statusOf(result));
        const repeat = await repeats.check(file, size, result, repeatWindow);
        if (repeat) out.push(repeat);
        if (result.lingering) {
          keep = true;
          out.push(`[Processes it started are still running; their output goes to ${file}]`);
        }
        return out.join('\n');
      } finally {
        await handle.close();
        if (!keep) await rm(file, { force: true });
      }
    },
  })(options);
}

/**
 * Starts a command and returns at once; `background` gets its report for when it
 * exits. A success reports where its output is, not the output: the model reads
 * it if it needs to. A failure brings the end of its output along.
 */
async function startBackground(
  command: string,
  options: RunOptions,
  maxLength: number,
  check: (file: string, size: number, result: GroupResult) => Promise<string | undefined>,
  background: (work: Promise<string>) => void,
): Promise<string> {
  const file = join(tmpdir(), `featherloop-shell-${randomUUID()}.log`);
  const handle = await open(file, 'ax+', 0o600);
  const started = Date.now();
  let spawned: ReturnType<typeof spawnGroup>;
  try {
    spawned = spawnGroup(options.shell, ['-c', command], { ...options, stdio: ['ignore', handle.fd, handle.fd], until: 'exit' });
  } catch (err) {
    await handle.close();
    await rm(file, { force: true });
    throw err;
  }
  const { child, done } = spawned;
  const name = `\`${preview(command)}\``;
  background(
    (async () => {
      try {
        const result = await done;
        const { code, lingering } = result;
        const after = `after ${Math.round((Date.now() - started) / 1000)}s ${statusOf(result)}`;
        const { size } = await handle.stat();
        const repeat = await check(file, size, result);
        const still = (repeat ? `\n${repeat}` : '') + (lingering ? `\n[Processes it started are still running; their output goes to ${file}]` : '');
        if (size === 0 && !lingering) {
          await rm(file, { force: true });
          return `Background command ${name} ${code === 0 ? 'finished' : 'failed'} ${after}, with no output`;
        }
        const output = `output: ${await countLines(file)} lines in ${file}`;
        // 0 keeps output out of results altogether.
        if (code === 0 || maxLength === 0) return `Background command ${name} ${code === 0 ? 'finished' : 'failed'} ${after}; ${output}${still}`;
        const { text } = await tail(handle, size, maxLength);
        return `Background command ${name} failed ${after}; ${output}, ending:\n${text}${still}`;
      } finally {
        await handle.close();
      }
    })(),
  );
  // Not the log's path: the report has it when it's useful, and a small model given a
  // path at the start may write its own files there.
  return `Started in the background as process group ${child.pid}. A message will report when it exits.`;
}

/** A command's first line, shortened: enough to tell it apart in a report. */
function preview(command: string): string {
  const line = command.trim().split('\n')[0]!;
  return line.length > 80 || command.trim().includes('\n') ? `${line.slice(0, 80)}…` : line;
}

/** Lines in a file, read in chunks: logs can be large. A last line without a newline counts too. */
async function countLines(file: string): Promise<number> {
  let lines = 0;
  let last = 0x0a;
  for await (const chunk of createReadStream(file) as AsyncIterable<Buffer>) {
    for (const byte of chunk) if (byte === 0x0a) lines++;
    last = chunk[chunk.length - 1] ?? last;
  }
  return last === 0x0a ? lines : lines + 1;
}

interface RunOptions {
  cwd: string;
  timeoutMs: number;
  shell: string;
  signal: AbortSignal | undefined;
}

async function run(command: string, output: number, { cwd, timeoutMs, shell, signal }: RunOptions): Promise<GroupResult> {
  // 'exit', not 'close': there are no pipes to drain, and processes the command
  // left running in the background don't hold the tool up.
  const { done } = spawnGroup(shell, ['-c', command], { cwd, stdio: ['ignore', output, output], timeoutMs, signal, until: 'exit' });
  return done;
}

function statusOf({ code, exitSignal, stopped }: GroupResult): string {
  return stopped ? `[${stopped}]` : code !== null ? `[exit code ${code}]` : `[killed by ${exitSignal}]`;
}

/**
 * Remembers recent runs by a hash of their output and how they ended, never the
 * output itself, to tell the model when a run repeats an earlier one.
 */
class Repeats {
  #runs: string[] = [];

  /** Records a run, and returns a note if one of the last `window` runs had the same output. */
  async check(file: string, size: number, result: GroupResult, window: number): Promise<string | undefined> {
    if (window === 0) return undefined;
    // Timed out and killed alike: no "after 120s", which differs between bg and not.
    const ended = result.stopped ? 'stopped' : statusOf(result);
    let fingerprinted: { hash: string; empty: boolean };
    try {
      fingerprinted = await fingerprint(file, size, ended);
    } catch {
      // Only a note: a missed one costs little, but the command's result must still get through.
      return undefined;
    }
    const { hash, empty } = fingerprinted;
    const at = this.#runs.lastIndexOf(hash);
    const ago = this.#runs.length - at;
    this.#runs.push(hash);
    this.#runs = this.#runs.slice(-window);
    // A repeated `mkdir` or `touch` is harmless.
    if (empty || at === -1) return undefined;
    return ago === 1 ? '[Same output as the previous run]' : `[Same output as ${ago} runs ago]`;
  }
}

/**
 * Hashes a run's whole output, from its file, with what changes between identical
 * runs normalised away. Line by line, so long output never has to fit in memory.
 * Only its first `size` bytes, what the result was made from: processes the command
 * left running may still be writing to it.
 */
async function fingerprint(file: string, size: number, ended: string): Promise<{ hash: string; empty: boolean }> {
  const hash = createHash('sha256').update(`${ended}\n`);
  let empty = true;
  let blank = 0;
  // `end` is inclusive, and there's no stream to read for an empty file.
  const lines = size > 0 ? createInterface({ input: createReadStream(file, { end: size - 1 }), crlfDelay: Infinity }) : [];
  for await (const raw of lines) {
    const line = normalise(raw);
    // Blank lines count only once something follows them: trailing ones are dropped.
    if (!line) {
      blank++;
      continue;
    }
    hash.update(`${'\n'.repeat(blank)}${line}\n`);
    blank = 0;
    empty = false;
  }
  return { hash: hash.digest('hex'), empty };
}

// Conservative: a missed repeat costs little, a false one tells a model making
// progress that it's stuck. So only escape codes, timings and object addresses, never
// digits at large: `6 passed, 4 failed` must still count.
const ansi = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const seconds = String.raw`\d+(?:\.\d+)? ?(?:ms|s)\b`;
const durations = [
  // pytest's `in 0.05s (0:00:00)`, unittest's `Ran 3 tests in 0.001s`.
  new RegExp(String.raw`\bin ${seconds}(?: \(\d+:\d\d:\d\d\))?`, 'g'),
  // jest's `Time: 1.234 s, estimated 2 s`.
  new RegExp(String.raw`\bTime: +${seconds}(?:, estimated ${seconds})?`, 'g'),
  // Per test: jest's `(12 ms)`, mocha's `(12ms)`, go's `(0.00s)`.
  new RegExp(String.raw`\(${seconds}\)`, 'g'),
  new RegExp(String.raw`\btook ${seconds}`, 'g'),
];
// Python's reprs in test failures, new each run: `<pov.Tree object at 0x7ef16deab1d0>`.
const addresses = /\bat 0x[0-9a-f]+\b/g;

function normalise(line: string): string {
  line = line.replace(ansi, '');
  for (const duration of durations) line = line.replace(duration, (match) => match.replace(/\d+(?:\.\d+)?/g, 'N'));
  line = line.replace(addresses, 'at 0xN');
  return line.trimEnd();
}

/**
 * Output over `max` characters keeps only its end inline, where errors and
 * summaries usually are. Reads no more of the file than that end, so what's
 * omitted is counted in bytes: the rest is never decoded.
 */
async function tail(handle: FileHandle, size: number, max: number): Promise<{ text: string; omitted: number }> {
  // A character is at most 4 bytes in UTF-8, so the last `max` are within the last 4 * max bytes.
  const start = Math.max(0, size - max * 4);
  const bytes = Buffer.alloc(size - start);
  await handle.read(bytes, 0, bytes.length, start);
  // Skip a character cut in half by `start`: its continuation bytes look like 10xxxxxx.
  let from = 0;
  while (start > 0 && from < bytes.length && (bytes[from]! & 0xc0) === 0x80) from++;
  const text = bytes.subarray(from).toString('utf8').trimEnd();
  if (start === 0 && text.length <= max) return { text, omitted: 0 };

  let kept = text.slice(-max);
  // Start at a whole line, unless that would drop everything.
  const newline = kept.indexOf('\n');
  if (newline !== -1 && newline < kept.length - 1 && text[text.length - kept.length - 1] !== '\n') {
    kept = kept.slice(newline + 1);
  }
  const omitted = start + from + Buffer.byteLength(text) - Buffer.byteLength(kept);
  return { text: kept, omitted };
}
