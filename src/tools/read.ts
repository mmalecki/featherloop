import { readFile } from 'node:fs/promises';
import { defineTool, ToolInputError } from '../tool.ts';
import { fsError, resolvePath } from './fs.ts';

export interface ReadParams {
  path: string;
  /** 1-based line to start reading from. */
  offset: number;
  /** Maximum number of lines to return. */
  limit: number;
  /** Prefix each line with its number. */
  lineNumbers: boolean;
  /** Directory relative paths are resolved against. Defaults to the process cwd at call time. */
  cwd: string | undefined;
}

export const ReadTool = defineTool<ReadParams>({
  description: 'Read a text file.',
  params: {
    path: {
      schema: { type: 'string', description: 'File path' },
      required: true,
    },
    offset: {
      schema: { type: 'integer', minimum: 1, description: 'First line (1-based)' },
      default: 1,
    },
    limit: {
      schema: { type: 'integer', minimum: 1, description: 'Max lines' },
      default: 2000,
    },
    lineNumbers: {
      schema: { type: 'boolean', description: 'Prefix lines with line numbers' },
      default: false,
      expose: false,
    },
    cwd: {
      schema: { type: 'string' },
      expose: false,
    },
  },

  async invoke({ path, offset, limit, lineNumbers, cwd }, { signal }) {
    if (offset < 1) throw new ToolInputError('offset must be >= 1');
    if (limit < 1) throw new ToolInputError('limit must be >= 1');

    let text: string;
    try {
      text = await readFile(resolvePath(path, cwd), { encoding: 'utf8', signal });
    } catch (err) {
      throw fsError(err, path);
    }

    const lines = text.split(/\r?\n/);
    if (lines.at(-1) === '') lines.pop();

    const start = offset - 1;
    if (start >= lines.length && lines.length > 0) {
      throw new ToolInputError(`offset ${offset} is past the end of the file (${lines.length} lines)`);
    }

    const slice = lines.slice(start, start + limit);
    const body = lineNumbers
      ? slice.map((line, i) => `${start + i + 1}\t${line}`).join('\n')
      : slice.join('\n');

    const remaining = lines.length - (start + slice.length);
    return remaining > 0
      ? `${body}\n[${remaining} more lines; continue with offset=${start + slice.length + 1}]`
      : body;
  },
});
