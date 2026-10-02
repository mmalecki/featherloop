import { stat } from 'node:fs/promises';
import { ToolInputError, type Tool, type ToolOptions } from '../tool.ts';
import { resolvePath } from './shared/fs.ts';
import { ReadTool, type ReadParams } from './read.ts';
import { UpdateTool, type UpdateParams } from './update.ts';
import { WriteTool, type WriteParams } from './write.ts';

export interface FileTools {
  read: Tool;
  write?: Tool;
  update?: Tool;
}

export interface FileStateOptions {
  /** Directory relative paths are resolved against; must match the tools' `cwd`. */
  cwd?: string;
}

interface Seen {
  mtimeMs: number;
  size: number;
}

/**
 * Wraps file tools so the agent can only update a file, or overwrite an
 * existing one, after reading it, and only if it hasn't changed since.
 * Returns the same tools; state is shared between them.
 *
 * Prefer `ManagedFileTools` unless you bring your own file tools.
 */
export function FileStateManager<T extends FileTools>(tools: T, { cwd }: FileStateOptions = {}): T {
  const seen = new Map<string, Seen>();

  async function remember(file: string): Promise<void> {
    const stats = await statOf(file);
    if (stats) seen.set(file, stats);
    else seen.delete(file);
  }

  async function check(file: string, display: string, action: string): Promise<void> {
    const current = await statOf(file);
    if (!current) return; // Nothing to clobber; the tool reports missing files itself.
    const known = seen.get(file);
    if (!known) throw new ToolInputError(`Read ${display} before ${action} it`);
    if (known.mtimeMs !== current.mtimeMs || known.size !== current.size) {
      throw new ToolInputError(`${display} changed since it was last read; read it again before ${action} it`);
    }
  }

  const wrap = (tool: Tool, action?: string): Tool => ({
    ...(tool.sequential ? { sequential: true } : {}),
    schema: () => tool.schema(),
    async invoke(params, ctx) {
      const path = params?.path;
      const file = typeof path === 'string' ? resolvePath(path, cwd) : undefined;
      if (file && action) await check(file, String(path), action);
      const result = await tool.invoke(params, ctx);
      if (file) await remember(file);
      return result;
    },
  });

  return {
    ...tools,
    read: wrap(tools.read),
    ...(tools.write ? { write: wrap(tools.write, 'overwriting') } : {}),
    ...(tools.update ? { update: wrap(tools.update, 'updating') } : {}),
  };
}

export interface ManagedFileToolsOptions {
  /** Directory every tool resolves relative paths against. Defaults to the process cwd at call time. */
  cwd?: string;
  read?: ToolOptions<ReadParams>;
  /** Options for the write tool, or `false` to leave it out. */
  write?: ToolOptions<WriteParams> | false;
  /** Options for the update tool, or `false` to leave it out. */
  update?: ToolOptions<UpdateParams> | false;
}

/** Read, write and update tools sharing one `cwd` and read-before-update state. */
export function ManagedFileTools({ cwd, read = {}, write = {}, update = {} }: ManagedFileToolsOptions = {}): FileTools {
  const withCwd = <P extends { cwd: string | undefined }>(name: string, options: ToolOptions<P>): ToolOptions<P> => {
    if (options.params?.cwd) throw new Error(`Set cwd on ManagedFileTools, not on the ${name} tool`);
    return cwd === undefined ? options : { ...options, params: { ...options.params, cwd: { value: cwd } } };
  };

  return FileStateManager(
    {
      read: ReadTool(withCwd('read', read)),
      ...(write ? { write: WriteTool(withCwd('write', write)) } : {}),
      ...(update ? { update: UpdateTool(withCwd('update', update)) } : {}),
    },
    cwd === undefined ? {} : { cwd },
  );
}

async function statOf(file: string): Promise<Seen | undefined> {
  try {
    const { mtimeMs, size } = await stat(file);
    return { mtimeMs, size };
  } catch {
    return undefined;
  }
}
