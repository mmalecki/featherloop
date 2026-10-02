// Running a command in its own process group, shared by the shell and search tools.
import { spawn, type ChildProcess, type StdioOptions } from 'node:child_process';

export interface GroupOptions {
  cwd: string;
  stdio: StdioOptions;
  timeoutMs: number;
  signal: AbortSignal | undefined;
  /**
   * `close` also waits for the command's pipes to drain. `exit` only waits for the
   * command itself, so processes it left running in the background don't hold it up.
   */
  until: 'close' | 'exit';
}

export interface GroupResult {
  code: number | null;
  /** The signal that ended the command, if one did. */
  exitSignal: NodeJS.Signals | null;
  /** Why the command was killed early, if it was: a timeout, or a reason given to `stop()`. */
  stopped?: string;
  /** Whether processes the command started, e.g. with `&`, outlived it. */
  lingering: boolean;
}

/**
 * Runs a command without a shell, in its own process group, so a timeout or abort
 * also stops whatever it started. `done` rejects with the abort reason on abort.
 */
export function spawnGroup(
  command: string,
  args: string[],
  { cwd, stdio, timeoutMs, signal, until }: GroupOptions,
): { child: ChildProcess; stop(reason: string): void; done: Promise<GroupResult> } {
  const child = spawn(command, args, { cwd, stdio, detached: true });

  let stopped: string | undefined;
  const stop = (reason: string) => {
    stopped ??= reason;
    try {
      if (child.pid) process.kill(-child.pid, 'SIGKILL');
    } catch {
      // Already gone.
    }
  };

  const done = new Promise<GroupResult>((resolve, reject) => {
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
    const end = (code: number | null, exitSignal: NodeJS.Signals | null) => {
      cleanup();
      if (signal?.aborted) return reject(signal.reason);
      const lingering = !stopped && child.pid !== undefined && groupAlive(child.pid);
      resolve({ code, exitSignal, lingering, ...(stopped ? { stopped } : {}) });
    };
    if (until === 'exit') child.on('exit', end);
    else child.on('close', end);
  });

  return { child, stop, done };
}

/** Whether any process is left in a process group. */
function groupAlive(pgid: number): boolean {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch {
    return false;
  }
}
