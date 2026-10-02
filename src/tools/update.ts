import { readFile, writeFile } from 'node:fs/promises';
import { defineTool, ToolInputError } from '../tool.ts';
import { fsError, resolvePath } from './fs.ts';

export interface UpdateParams {
  path: string;
  old: string;
  new: string;
  all: boolean;
  /** Directory relative paths are resolved against. Defaults to the process cwd at call time. */
  cwd: string | undefined;
}

export const UpdateTool = defineTool<UpdateParams>({
  description: 'Replace exact text in a file. `old` must match exactly once unless all=true.',
  sequential: true,
  params: {
    path: {
      schema: { type: 'string', description: 'File path' },
      required: true,
    },
    old: {
      schema: { type: 'string', description: 'Exact text to replace' },
      required: true,
    },
    new: {
      schema: { type: 'string', description: 'Replacement text' },
      required: true,
    },
    all: {
      schema: { type: 'boolean', description: 'Replace every occurrence' },
      default: false,
    },
    cwd: {
      schema: { type: 'string' },
      expose: false,
    },
  },

  async invoke({ path, old, new: replacement, all, cwd }, { signal }) {
    if (typeof old !== 'string' || typeof replacement !== 'string') {
      throw new ToolInputError('old and new must be strings');
    }
    if (!old) throw new ToolInputError('old must not be empty; use write to create or replace a whole file');
    if (old === replacement) throw new ToolInputError('old and new are identical; nothing to change');

    const file = resolvePath(path, cwd);
    let text: string;
    try {
      text = await readFile(file, { encoding: 'utf8', signal });
    } catch (err) {
      throw fsError(err, path);
    }

    // Models write \n; keep a CRLF file's line endings intact.
    if (text.includes('\r\n') && !old.includes('\r\n')) {
      old = old.replaceAll('\n', '\r\n');
      replacement = replacement.replaceAll('\n', '\r\n');
    }

    const count = text.split(old).length - 1;
    if (count === 0) {
      throw new ToolInputError(
        squash(text).includes(squash(old))
          ? `old not found in ${path} exactly, but it matches if whitespace is ignored; copy the text exactly, including indentation`
          : `old not found in ${path}; read the file and copy the text exactly`,
      );
    }
    if (count > 1 && !all) {
      throw new ToolInputError(
        `old appears ${count} times in ${path}; include more surrounding lines to make it unique, or set all=true`,
      );
    }

    // split/join and slicing avoid String.replace's `$&`-style patterns in the replacement.
    const index = text.indexOf(old);
    const updated = all ? text.split(old).join(replacement) : text.slice(0, index) + replacement + text.slice(index + old.length);
    await writeFile(file, updated, { encoding: 'utf8', signal });

    return `Updated ${path} (${count} ${count === 1 ? 'replacement' : 'replacements'})`;
  },
});

function squash(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
