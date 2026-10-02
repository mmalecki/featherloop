import { basename, matchesGlob, relative, resolve, sep } from 'node:path';
import { defineTool, ToolInputError } from '../tool.ts';
import { dedupe, lines, probe, relativePath, report, run, searchPaths } from './search.ts';

export interface GlobParams {
  /** Matched against file names, or against paths relative to the searched directory if it contains "/". */
  search: string;
  /** Directories to search. Defaults to the cwd. */
  paths: string[] | undefined;
  /** Directory paths are resolved against and shown relative to. Defaults to the process cwd at call time. */
  cwd: string | undefined;
  timeoutMs: number;
  /** Longer output keeps its first lines. */
  maxLength: number;
  /** `auto` uses fd (or fdfind) when it's installed, and find otherwise. */
  backend: 'auto' | 'fd' | 'find';
}

/**
 * Finds files by glob. fd, or find when fd isn't installed, only lists files;
 * the glob is matched here (with `path.matchesGlob`), so both match the same way.
 * Output is one path per line, sorted.
 *
 * Both skip hidden files and directories, unless the pattern names one (".env*",
 * ".github/**"), and node_modules. The difference that remains: fd also skips
 * gitignored files, and find doesn't.
 */
export const GlobTool = defineTool<GlobParams>({
  description: 'Find files by glob.',
  params: {
    search: {
      schema: { type: 'string', description: 'Glob, e.g. *.ts or src/**/*.js' },
      required: true,
    },
    paths: {
      schema: { type: 'array', items: { type: 'string' }, description: 'Directories (default: .)' },
    },
    cwd: {
      schema: { type: 'string' },
      expose: false,
    },
    timeoutMs: {
      schema: { type: 'integer', minimum: 1 },
      default: 60_000,
      expose: false,
    },
    maxLength: {
      schema: {
        type: 'integer',
        minimum: 1,
        description: 'Max characters of output to return. Longer output keeps its first lines.',
      },
      default: 10_000,
      expose: false,
    },
    backend: {
      schema: { type: 'string', enum: ['auto', 'fd', 'find'] },
      default: 'auto',
      expose: false,
    },
  },

  async invoke({ search, paths, cwd, timeoutMs, maxLength, backend }, { signal }) {
    if (typeof search !== 'string' || !search) throw new ToolInputError('search must be a non-empty glob');
    signal?.throwIfAborted();

    const pattern = search.replace(/^(\.\/)+/, '');
    const dir = resolve(cwd ?? process.cwd());
    const roots = await searchPaths(paths, dir, true);
    // A pattern naming a hidden file or directory gets to see them; .git stays out.
    const hidden = /(^|\/)\.[^./]/.test(pattern);

    const command = await globBackend(backend);
    const args =
      command === 'find'
        ? [...roots, '-mindepth', '1', '(', '-name', hidden ? '.git' : '.*', '-o', '-name', 'node_modules', ')',
           '-prune', '-o', '-type', 'f', '-print0']
        : ['--type', 'f', '--print0', '--color', 'never', '--exclude', 'node_modules',
           ...(hidden ? ['--hidden', '--exclude', '.git'] : []), ...roots.map((root) => `--search-path=${root}`)];

    // fd and find exit with 1 for errors such as unreadable directories, even if they listed files.
    const result = await run(command, args, { cwd: dir, timeoutMs, signal });
    const listed = lines(result, '\0');
    const failed = !result.stopped && result.code !== 0;
    const errors = failed ? (listed.length ? 'some' : 'fatal') : 'none';

    // Without a "/", match the file name at any depth, like fd and find -name do.
    const byName = !pattern.includes('/');
    const bases = roots.map((root) => resolve(dir, root));
    const found = listed.flatMap((printed) => {
      const file = resolve(dir, printed);
      const matches = byName
        ? matchesGlob(basename(file), pattern)
        : bases.some((base) => file.startsWith(base + sep) && matchesGlob(relative(base, file), pattern));
      return matches ? [relativePath(dir, file)] : [];
    });

    // fd lists in parallel and find in directory order; sort so both agree.
    return report(dedupe(found.sort()), result, errors, maxLength, 'files');
  },
});

async function globBackend(backend: GlobParams['backend']): Promise<'fd' | 'fdfind' | 'find'> {
  if (backend !== 'find') {
    // Debian and Ubuntu install fd as fdfind.
    if (await hasFd('fd')) return 'fd';
    if (await hasFd('fdfind')) return 'fdfind';
    if (backend === 'fd') throw new Error('fd is not installed');
  }
  if (!(await hasFind())) throw new Error(backend === 'auto' ? 'Neither fd nor find is installed' : 'find is not installed');
  return 'find';
}

// Another program can be called fd, e.g. the fdclone file manager; check that it's this one.
const hasFd = (command: string) => probe(command, ['--version'], (code, out) => code === 0 && /^fd(find)? \d/.test(out));
const hasFind = () => probe('find', ['/', '-prune'], (code) => code === 0);
