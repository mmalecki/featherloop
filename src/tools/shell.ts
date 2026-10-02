import { spawn } from 'node:child_process';
import { defineTool } from '../tool.ts';

export interface ShellParams {
  command: string;
  /** Working directory. Defaults to the process cwd at call time. */
  cwd: string | undefined;
  timeoutMs: number;
  /** Output beyond this many characters keeps its start and end. */
  maxChars: number;
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
    maxChars: {
      schema: { type: 'integer', minimum: 1 },
      default: 20_000,
      expose: false,
    },
    shell: {
      schema: { type: 'string' },
      default: '/bin/sh',
      expose: false,
    },
  },

  invoke({ command, cwd, timeoutMs, maxChars, shell }, { signal }) {
    return new Promise((resolve, reject) => {
      // Own process group, so a timeout or abort also stops whatever the command spawned.
      const child = spawn(shell, ['-c', command], {
        cwd: cwd ?? process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });

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

      child.on('error', (err) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(err);
      });
      child.on('close', (code, sig) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        if (signal?.aborted) return reject(signal.reason);

        const status = stopped ? `[${stopped}]` : code !== null ? `[exit code ${code}]` : `[killed by ${sig}]`;
        const body = truncate(output.trimEnd(), maxChars);
        resolve(body ? `${body}\n${status}` : status);
      });
    });
  },
});

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const half = Math.floor(max / 2);
  return `${text.slice(0, half)}\n[… ${text.length - 2 * half} characters omitted …]\n${text.slice(-half)}`;
}
