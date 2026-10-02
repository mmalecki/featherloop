import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { defineTool, ToolInputError } from '../tool.ts';
import { fsError, replaceFile, resolvePath } from './shared/fs.ts';

export interface WriteParams {
  path: string;
  content: string;
  /** Directory relative paths are resolved against. Defaults to the process cwd at call time. */
  cwd: string | undefined;
}

export const WriteTool = defineTool<WriteParams>({
  description: 'Write a text file, replacing it if it exists.',
  sequential: true,
  params: {
    path: {
      schema: { type: 'string', description: 'File path' },
      required: true,
    },
    content: {
      schema: { type: 'string', description: 'Full file content' },
      required: true,
    },
    cwd: {
      schema: { type: 'string' },
      expose: false,
    },
  },

  async invoke({ path, content, cwd }, { signal }) {
    if (typeof content !== 'string') throw new ToolInputError('content must be a string');
    const file = resolvePath(path, cwd);

    // Stop before writing, never during: an interrupted write would leave half a file.
    signal?.throwIfAborted();
    try {
      await mkdir(dirname(file), { recursive: true });
      await replaceFile(file, content);
    } catch (err) {
      throw fsError(err, path);
    }

    const lines = content ? content.split('\n').length - (content.endsWith('\n') ? 1 : 0) : 0;
    return `Wrote ${lines} ${lines === 1 ? 'line' : 'lines'} to ${path}`;
  },
});
