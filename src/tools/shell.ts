import { randomUUID } from 'node:crypto';
import { open, rm, type FileHandle } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '../tool.ts';
import { spawnGroup } from './shared/process.ts';

export interface ShellParams {
  command: string;
  /** Working directory. Defaults to the process cwd at call time. */
  cwd: string | undefined;
  timeoutMs: number;
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
    cwd: {
      schema: { type: 'string' },
      expose: false,
    },
    timeoutMs: {
      schema: { type: 'integer', minimum: 1 },
      default: 120_000,
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

  async invoke({ command, cwd, timeoutMs, maxLength, shell }, { signal }) {
    // stdout and stderr both go to this file, so the kernel keeps their writes in
    // order, whatever the shell, and long output never has to fit in memory.
    // Owner-only and created afresh: command output can contain secrets, and the
    // temp directory is shared. There's no size limit yet: unlike a pipe, a file
    // never makes the command wait, so runaway output fills the disk.
    const file = join(tmpdir(), `featherslop-shell-${randomUUID()}.log`);
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
