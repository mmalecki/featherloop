import { resolve } from 'node:path';
import { ToolInputError } from '../tool.ts';

/** Resolves a model-given path; `cwd` defaults to the process cwd at call time. */
export function resolvePath(path: string, cwd: string | undefined): string {
  return resolve(cwd ?? process.cwd(), path);
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
