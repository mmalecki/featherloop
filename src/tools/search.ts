// Helpers shared by the grep and glob tools: finding a backend, running it, and
// formatting its results the same way whichever backend ran.
import { execFile, spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { ToolInputError } from '../tool.ts';
import { fsError } from './fs.ts';

/** Output beyond this is not collected; the search stops and says its results are incomplete. */
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

const probes = new Map<string, Promise<boolean>>();

/** Runs a command once per process, and caches whether `ok` accepts its exit code and output. */
export function probe(command: string, args: string[], ok: (code: number, stdout: string) => boolean): Promise<boolean> {
  const key = [command, ...args].join('\0');
  let result = probes.get(key);
  if (!result) {
    result = new Promise((resolve) => {
      execFile(command, args, { timeout: 5_000 }, (err, stdout) => {
        // A missing command has a string code, such as ENOENT; exit codes are numbers.
        const code = err ? err.code : 0;
        resolve(typeof code === 'number' && ok(code, stdout));
      });
    });
    probes.set(key, result);
  }
  return result;
}

/**
 * Resolves model-given paths against `cwd`, defaulting to `cwd` itself. Each must
 * exist, so a typo is an error rather than "No matches". Returns them relative to
 * `cwd`, with "./" before any that would otherwise start with "-".
 */
export async function searchPaths(paths: string[] | undefined, cwd: string, dirsOnly: boolean): Promise<string[]> {
  const given = paths?.length ? paths : ['.'];
  return Promise.all(
    given.map(async (path) => {
      if (typeof path !== 'string' || !path) throw new ToolInputError('paths must be non-empty strings');
      const full = resolve(cwd, path);
      let isDirectory: boolean;
      try {
        isDirectory = (await stat(full)).isDirectory();
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new ToolInputError(`No such ${dirsOnly ? 'directory' : 'file or directory'}: ${path}`);
        }
        throw fsError(err, path);
      }
      if (dirsOnly && !isDirectory) throw new ToolInputError(`Not a directory: ${path}`);
      const rel = relative(cwd, full) || '.';
      return rel.startsWith('-') ? `./${rel}` : rel;
    }),
  );
}

/** A path as the backend printed it, made relative to `cwd`. */
export function relativePath(cwd: string, printed: string): string {
  return relative(cwd, resolve(cwd, printed)) || '.';
}

export interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
  /** Why the search was cut short, if it was: a timeout or too much output. */
  stopped?: string;
}

interface RunOptions {
  cwd: string;
  timeoutMs: number;
  signal: AbortSignal | undefined;
}

/** Only the start of stderr is kept: it's summarized into a note or an error message. */
const MAX_STDERR_BYTES = 4_000;

/**
 * Runs a command without a shell; a timeout, abort or too much output kills it.
 * stdout and stderr stay separate: stdout is parsed into results, which get sorted,
 * and stderr only becomes a note, so the order between them never matters.
 */
export function run(command: string, args: string[], { cwd, timeoutMs, signal }: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    // Own process group, so a timeout or abort also stops whatever the command spawned.
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], detached: true });

    const chunks: Buffer[] = [];
    let size = 0;
    // Buffers, decoded once at the end, so a character split across chunks survives.
    const errors: Buffer[] = [];
    let errorSize = 0;
    let stopped: string | undefined;
    child.stdout.on('data', (chunk: Buffer) => {
      if (stopped) return;
      chunks.push(chunk);
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) stop(`stopped after ${MAX_OUTPUT_BYTES / 1024 / 1024} MiB of output`);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (errorSize >= MAX_STDERR_BYTES) return;
      errors.push(chunk);
      errorSize += chunk.length;
    });

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
    child.on('close', (code) => {
      cleanup();
      if (signal?.aborted) return reject(signal.reason);
      const stdout = Buffer.concat(chunks).toString('utf8');
      const stderr = Buffer.concat(errors).toString('utf8');
      resolve({ stdout, stderr, code, ...(stopped ? { stopped } : {}) });
    });
  });
}

/** Splits output into complete records; a search that was stopped may end with a partial one. */
export function lines({ stdout, stopped }: RunResult, separator: string): string[] {
  const records = stdout.split(separator);
  if (stopped || records.at(-1) === '') records.pop();
  return records;
}

/** Drops adjacent duplicates from a sorted list, e.g. from overlapping paths. */
export function dedupe(sorted: string[]): string[] {
  return sorted.filter((line, i) => line !== sorted[i - 1]);
}

/**
 * How a backend's errors affect the search: `fatal` makes it an error; with `some`,
 * whatever was found is returned with a note.
 */
export type SearchErrors = 'none' | 'some' | 'fatal';

/** Formats search results: their head within `maxLength` characters, then notes on what was cut. */
export function report(results: string[], result: RunResult, errors: SearchErrors, maxLength: number, noun: string): string {
  const { stderr, stopped, code } = result;
  const error =
    stderr
      .trim()
      .split('\n')
      .map((line) => line.replace(/^(\[fd error\]|rg|grep|fdfind|fd|find): /, ''))
      .slice(0, 10)
      .join('\n') || `exit code ${code}`;
  if (errors === 'fatal') throw new Error(`Search failed: ${error}`);
  if (stopped && !results.length) throw new Error(`Search ${stopped}; narrow the search or paths`);

  let length = 0;
  let count = 0;
  for (const line of results) {
    const next = length + line.length + (count ? 1 : 0);
    if (next > maxLength) break;
    length = next;
    count++;
  }

  const out = results.length ? results.slice(0, count) : ['No matches'];
  if (count < results.length) {
    out.push(`[… ${results.length - count} more ${noun} omitted; use a more specific pattern or narrower paths …]`);
  }
  if (stopped) out.push(`[Search ${stopped}; results are incomplete]`);
  if (errors === 'some') out.push(`[Some files could not be searched: ${error.split('\n')[0]}]`);
  return out.join('\n');
}
