import { randomUUID } from 'node:crypto';
import { chmod, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { ToolInputError } from '../../tool.ts';

/** Resolves a model-given path; `cwd` defaults to the process cwd at call time. */
export function resolvePath(path: string, cwd: string | undefined): string {
  return resolve(cwd ?? process.cwd(), path);
}

/**
 * Replaces a file's content all at once: writes a temporary file beside it and
 * renames it over, so an interruption leaves the old content or the new, never
 * half of it. Follows symlinks and keeps the file's permission bits; hard links
 * to the old file keep the old content.
 */
export async function replaceFile(file: string, content: string): Promise<void> {
  // A new file has no real path yet.
  const target = await realpath(file).catch(() => file);
  const mode = await stat(target).then(({ mode }) => mode & 0o7777, () => undefined);
  const temp = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, content, { encoding: 'utf8', flag: 'wx' });
    if (mode !== undefined) await chmod(temp, mode);
    await rename(temp, target);
  } catch (err) {
    await rm(temp, { force: true });
    throw err;
  }
}

/** Turns common filesystem errors into messages the model can act on. */
export function fsError(err: unknown, path: string): unknown {
  switch ((err as NodeJS.ErrnoException).code) {
    case 'ENOENT':
      return new ToolInputError(`No such file: ${path}`);
    case 'EISDIR':
      return new ToolInputError(`Is a directory: ${path}`);
    case 'ENOTDIR':
      return new ToolInputError(`Not a directory: ${path}`);
    case 'EACCES':
    case 'EPERM':
      return new ToolInputError(`Permission denied: ${path}`);
    default:
      return err;
  }
}
