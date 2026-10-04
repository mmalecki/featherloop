import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, rm, type FileHandle } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineTool, ToolInputError } from '../tool.ts';
import { spawnGroup } from './shared/process.ts';

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
  shell: string;
}

/**
 * Runs a shell command with full access to the machine, as the current user.
 * There is no sandbox: only give it to agents you'd let use your terminal.
 */
export const ShellTool = defineTool<ShellParams>({
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
    shell: {
      schema: { type: 'string' },
      default: '/bin/sh',
      expose: false,
    },
  },

  async invoke({ command, bg, cwd, timeoutMs, bgTimeoutMs, maxLength, shell }, { signal, background }) {
    if (bg) {
      if (!background) throw new ToolInputError('bg needs an agent loop to report back to');
      return startBackground(command, { cwd: cwd ?? process.cwd(), timeoutMs: bgTimeoutMs, shell, signal }, maxLength, background);
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
      const { status, lingering } = await run(command, handle.fd, { cwd: cwd ?? process.cwd(), timeoutMs, shell, signal });
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
      out.push(status);
      if (lingering) {
        keep = true;
        out.push(`[Processes it started are still running; their output goes to ${file}]`);
      }
      return out.join('\n');
    } finally {
      await handle.close();
      if (!keep) await rm(file, { force: true });
    }
  },
});

/**
 * Starts a command and returns at once; `background` gets its report for when it
 * exits. A success reports where its output is, not the output: the model reads
 * it if it needs to. A failure brings the end of its output along.
 */
async function startBackground(
  command: string,
  options: RunOptions,
  maxLength: number,
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
        const { code, exitSignal, stopped, lingering } = await done;
        const status = stopped ? `[${stopped}]` : code !== null ? `[exit code ${code}]` : `[killed by ${exitSignal}]`;
        const after = `after ${Math.round((Date.now() - started) / 1000)}s ${status}`;
        const { size } = await handle.stat();
        const still = lingering ? `\n[Processes it started are still running; their output goes to ${file}]` : '';
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

interface RunResult {
  status: string;
  /** Whether processes the command started, e.g. with `&`, outlived it. */
  lingering: boolean;
}

async function run(command: string, output: number, { cwd, timeoutMs, shell, signal }: RunOptions): Promise<RunResult> {
  // 'exit', not 'close': there are no pipes to drain, and processes the command
  // left running in the background don't hold the tool up.
  const { done } = spawnGroup(shell, ['-c', command], { cwd, stdio: ['ignore', output, output], timeoutMs, signal, until: 'exit' });
  const { code, exitSignal, stopped, lingering } = await done;
  const status = stopped ? `[${stopped}]` : code !== null ? `[exit code ${code}]` : `[killed by ${exitSignal}]`;
  return { status, lingering };
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
