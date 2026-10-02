import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '../tool.ts';

export interface ShellParams {
  command: string;
  /** Working directory. Defaults to the process cwd at call time. */
  cwd: string | undefined;
  timeoutMs: number;
  /** Longer output keeps only its end; the full output goes to a temporary file. */
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
    const { output, status } = await run(command, { cwd: cwd ?? process.cwd(), timeoutMs, shell, signal });
    const body = await fit(output.trimEnd(), maxLength);
    return body ? `${body}\n${status}` : status;
  },
});

interface RunOptions {
  cwd: string;
  timeoutMs: number;
  shell: string;
  signal: AbortSignal | undefined;
}

function run(command: string, { cwd, timeoutMs, shell, signal }: RunOptions): Promise<{ output: string; status: string }> {
  return new Promise((resolve, reject) => {
    // Own process group, so a timeout or abort also stops whatever the command spawned.
    const child = spawn(shell, ['-c', command], { cwd, stdio: ['ignore', 'pipe', 'pipe'], detached: true });

    let output = '';
    const collect = (chunk: Buffer) => (output += chunk.toString('utf8'));
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    let stopped: string | undefined;
    const stop = (reason: string) => {
      stopped ??= reason;
      try {
        if (child.pid) process.kill(-child.pid, 'SIGKILL');
      } catch {
        // Already gone.
      }
    };
    const timer = setTimeout(() => stop(`timed out after ${timeoutMs / 1000}s`), timeoutMs);
    const onAbort = () => stop('aborted');
    signal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };

    child.on('error', (err) => {
      cleanup();
      reject(err);
    });
    child.on('close', (code, sig) => {
      cleanup();
      if (signal?.aborted) return reject(signal.reason);
      const status = stopped ? `[${stopped}]` : code !== null ? `[exit code ${code}]` : `[killed by ${sig}]`;
      resolve({ output, status });
    });
  });
}

/**
 * Output over `max` keeps only its end inline, where errors and summaries
 * usually are; the whole of it is saved to a temporary file.
 */
async function fit(output: string, max: number): Promise<string> {
  if (output.length <= max) return output;

  // Owner-only: command output can contain secrets, and the temp directory is shared.
  const file = join(tmpdir(), `featherslop-shell-${randomUUID()}.log`);
  await writeFile(file, output, { encoding: 'utf8', mode: 0o600 });

  if (max === 0) return `[Output (${output.length} characters) saved to ${file}]`;
  let tail = output.slice(-max);
  // Start at a whole line, unless that would drop everything.
  const newline = tail.indexOf('\n');
  if (newline !== -1 && newline < tail.length - 1 && output[output.length - max - 1] !== '\n') tail = tail.slice(newline + 1);
  return `[… ${output.length - tail.length} characters omitted; full output saved to ${file} …]\n${tail}`;
}
