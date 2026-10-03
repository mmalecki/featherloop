import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { configDir } from './config.ts';

/** The files a directory's instructions may be in, by preference: CLAUDE.md only where there's no AGENTS.md. */
export const INSTRUCTION_FILES = ['AGENTS.md', 'CLAUDE.md'] as const;

/** Longer files are cut, with a note saying so. */
export const MAX_INSTRUCTION_CHARS = 32_000;

export interface InstructionFile {
  path: string;
  content: string;
  /** Cut at `MAX_INSTRUCTION_CHARS`. */
  truncated: boolean;
}

export interface FindInstructionsOptions {
  /** Where the agent works. Defaults to the process cwd. */
  cwd?: string;
  /** The user's own instructions, before the project's; `null` for none. Defaults to `configDir()`. */
  global?: string | null;
  /** Told about a directory or file that can't be read (e.g. no permission), which is then skipped. */
  onSkip?: (path: string, error: unknown) => void;
}

/**
 * Instruction files from the most general to the most specific: the user's own,
 * then one per directory from the git root down to `cwd` (outside a repository,
 * only `cwd`'s). Each directory gives its AGENTS.md, or else its CLAUDE.md.
 */
export function findInstructions(options: FindInstructionsOptions = {}): InstructionFile[] {
  const { cwd = process.cwd(), global = configDir(), onSkip } = options;
  const dirs = [...(global === null ? [] : [resolve(global)]), ...projectDirs(resolve(cwd), onSkip)];
  return [...new Set(dirs)].flatMap((dir) => {
    let path = dir;
    try {
      const found = INSTRUCTION_FILES.map((name) => join(dir, name)).find(isFile);
      if (!found) return [];
      path = found;
      const text = readFileSync(path, 'utf8').trim();
      if (!text) return [];
      const truncated = text.length > MAX_INSTRUCTION_CHARS;
      return [{ path, content: truncated ? text.slice(0, MAX_INSTRUCTION_CHARS) : text, truncated }];
    } catch (err) {
      onSkip?.(path, err);
      return [];
    }
  });
}

/** Instructions for a system prompt, with where each came from; empty without files. */
export function formatInstructions(files: readonly InstructionFile[]): string {
  if (!files.length) return '';
  const blocks = files.map(({ path, content, truncated }) => {
    const cut = truncated ? `\n[Cut at ${MAX_INSTRUCTION_CHARS} characters; read the file for the rest.]` : '';
    return `<instructions path="${path}">\n${content}${cut}\n</instructions>`;
  });
  return [
    'Instructions from the user and the project follow, from the most general to the most specific. ' +
      "Where they conflict, the later one wins; the user's own messages override them all.",
    ...blocks,
  ].join('\n\n');
}

/** From the git root down to `cwd`; just `cwd` outside a repository, or when the walk up can't go on. */
function projectDirs(cwd: string, onSkip: FindInstructionsOptions['onSkip']): string[] {
  const dirs = [cwd];
  let dir = cwd;
  try {
    // `.git` is a directory, or a file in worktrees and submodules.
    for (; !exists(join(dir, '.git')); dir = dirname(dir)) {
      if (dir === dirname(dir)) return [cwd];
      dirs.unshift(dirname(dir));
    }
  } catch (err) {
    onSkip?.(dir, err);
    return [cwd];
  }
  return dirs;
}

function isFile(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

function exists(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false }) !== undefined;
}
