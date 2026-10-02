import { resolve } from 'node:path';
import { defineTool, ToolInputError } from '../tool.ts';
import { dedupe, lines, probe, relativePath, report, run, searchPaths } from './search.ts';

export interface GrepParams {
  /** Regex: Rust syntax with rg, PCRE (or ERE without PCRE) with grep. */
  search: string;
  /** Files or directories to search. Defaults to the cwd. */
  paths: string[] | undefined;
  /** Directory paths are resolved against and shown relative to. Defaults to the process cwd at call time. */
  cwd: string | undefined;
  timeoutMs: number;
  /** Longer output keeps its first lines. */
  maxLength: number;
  /** `auto` uses rg when it's installed, and grep otherwise. */
  backend: 'auto' | 'rg' | 'grep';
}

/** Longer matching lines are cut, so one minified file can't fill the output. */
const MAX_LINE_LENGTH = 500;

/**
 * Searches file contents with rg, or `grep -r` when rg isn't installed.
 * Output is `path:line:text`, sorted by path and line, whichever runs.
 *
 * Differences that remain: rg skips hidden and gitignored files, while grep only
 * skips .git and node_modules (rg skips node_modules too, gitignored or not).
 * The regex flavors differ a little: rg has no lookaround or backreferences,
 * and grep without PCRE support falls back to ERE, which lacks `\d` and friends.
 * In a UTF-8 locale, GNU grep skips files that aren't valid UTF-8 as binary.
 */
export const GrepTool = defineTool<GrepParams>({
  description: 'Search file contents for a regex.',
  params: {
    search: {
      schema: { type: 'string', description: 'Regex' },
      required: true,
    },
    paths: {
      schema: { type: 'array', items: { type: 'string' }, description: 'Files or directories (default: .)' },
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
      schema: { type: 'string', enum: ['auto', 'rg', 'grep'] },
      default: 'auto',
      expose: false,
    },
  },

  async invoke({ search, paths, cwd, timeoutMs, maxLength, backend }, { signal }) {
    if (typeof search !== 'string' || !search) throw new ToolInputError('search must be a non-empty regex');
    signal?.throwIfAborted();

    const dir = resolve(cwd ?? process.cwd());
    const targets = await searchPaths(paths, dir, false);
    const command = await grepBackend(backend);
    const args =
      command === 'rg'
        ? ['--no-config', '--line-number', '--with-filename', '--no-heading', '--null', '--color=never',
           '--glob=!node_modules', '-e', search, '--', ...targets]
        : ['-r', '-n', '-H', '-I', '--null', '--exclude-dir=.git', '--exclude-dir=node_modules',
           (await grepHasPcre()) ? '-P' : '-E', '-e', search, '--', ...targets];

    // Both exit with 1 for no matches, and 2 for errors, even if some files matched.
    const result = await run(command, args, { cwd: dir, timeoutMs, signal });
    const matches = parseMatches(lines(result, '\n'), dir);
    const failed = !result.stopped && result.code !== 0 && result.code !== 1;
    return report(matches, result, failed ? (matches.length ? 'some' : 'fatal') : 'none', maxLength, 'matching lines');
  },
});

async function grepBackend(backend: GrepParams['backend']): Promise<'rg' | 'grep'> {
  if (backend !== 'grep' && (await hasRg())) return 'rg';
  if (backend === 'rg') throw new Error('rg is not installed');
  if (!(await hasGrep())) throw new Error(backend === 'auto' ? 'Neither rg nor grep is installed' : 'grep is not installed');
  return 'grep';
}

const hasRg = () => probe('rg', ['--version'], (code, out) => code === 0 && out.startsWith('ripgrep'));
// Exit code 1 means "no match", so the command ran and understood its flags.
const hasGrep = () => probe('grep', ['-e', 'x', '/dev/null'], (code) => code === 1);
// PCRE is closest to rg's syntax; GNU grep may be built without it, and BSD grep lacks it.
const grepHasPcre = () => probe('grep', ['-P', '-e', 'x', '/dev/null'], (code) => code === 1);

interface Match {
  path: string;
  line: number;
  text: string;
}

/** Parses `path\0line:text` lines, as both rg and grep print them with `--null`. */
function parseMatches(output: string[], cwd: string): string[] {
  const shown = new Map<string, string>();
  const matches: Match[] = [];
  for (const raw of output) {
    const nul = raw.indexOf('\0');
    if (nul === -1) continue; // rg's "binary file matches" notice for a file named outright.
    const rest = raw.slice(nul + 1);
    const colon = rest.indexOf(':');
    const line = Number(rest.slice(0, colon));
    if (colon === -1 || !Number.isInteger(line) || line < 1) continue;

    const printed = raw.slice(0, nul);
    let path = shown.get(printed);
    if (path === undefined) shown.set(printed, (path = relativePath(cwd, printed)));
    let text = rest.slice(colon + 1);
    if (text.endsWith('\r')) text = text.slice(0, -1);
    if (text.length > MAX_LINE_LENGTH) text = `${text.slice(0, MAX_LINE_LENGTH)}…`;
    matches.push({ path, line, text });
  }

  // rg searches in parallel and grep in directory order; sort so both agree.
  matches.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line));
  return dedupe(matches.map((m) => `${m.path}:${m.line}:${m.text}`));
}
