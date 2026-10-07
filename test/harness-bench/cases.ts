import { execFileSync, spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';

/**
 * Exercises from Aider's polyglot benchmark: fetching them at a pinned commit, the
 * toolchains their tests need, a workspace per run and grading what the agent left.
 */

/** Checkouts, the pytest venv and the shared JS `node_modules`: fetched once, reused by every run. */
export const CACHE = join(import.meta.dirname, 'cache');

const SELECTION = JSON.parse(readFileSync(join(import.meta.dirname, 'cases.json'), 'utf8')) as {
  source: { repo: string; commit: string };
  sets: Record<string, { description: string[]; cases: string[] }>;
};

/** The case sets in `cases.json`; `all` is the default. */
export const SETS = Object.keys(SELECTION.sets);

export const POLYGLOT = { ...SELECTION.source, dir: join(CACHE, 'polyglot-benchmark') };

export type Lang = 'python' | 'javascript';

export interface Case {
  /** `<lang>/<exercise>`, as in `cases.json`. */
  id: string;
  lang: Lang;
  exercise: string;
  /** The exercise in the polyglot checkout. */
  dir: string;
  /** Files the agent is to change. */
  solution: string[];
  /** The tests, as the agent and the grader get them (skips removed). */
  tests: string[];
  /** Every other file shipped with the exercise, by relative path; the agent isn't to touch these either. */
  support: string[];
  /**
   * The workspace's files as shipped (tests un-skipped), read once: workspaces and
   * grading come from here, so an agent that wanders into the checkout can't change them.
   */
  files: Map<string, string>;
  /** Aider's prompt for the exercise. */
  prompt: string;
}

export interface Grade {
  pass: boolean;
  passed: number;
  /** Tests in the suite, counted from the source: a suite that doesn't load still has them. */
  total: number;
  exitCode: number | null;
  timedOut: boolean;
  ms: number;
  output: string;
}

interface Language {
  /** What the agent is told to run, and the grader runs, in the workspace. */
  testCommand(c: Case): string[];
  /** Tests in a test file's source. */
  countTests(source: string): number;
  /** Tests that passed, from the runner's output. */
  passed(output: string): number;
  /** Sets up a fresh workspace's toolchain, from the run's `linkToolchains` directory. */
  link(workspace: string, tools: string): void;
}

const LANGUAGES: Record<Lang, Language> = {
  python: {
    testCommand: (c) => ['python3', '-m', 'pytest', ...c.tests],
    countTests: (source) => source.match(/^\s*def test_\w+/gm)?.length ?? 0,
    passed: (output) => Number(/(\d+) passed/.exec(output)?.[1] ?? 0),
    link: () => {},
  },
  javascript: {
    testCommand: () => ['npm', 'test'],
    countTests: (source) => source.match(/^\s*(test|it)\(/gm)?.length ?? 0,
    passed: (output) => Number(/^Tests:.*?(\d+) passed/m.exec(output)?.[1] ?? 0),
    // One install for all: every exercise's package.json asks for the same jest and babel.
    link: (workspace, tools) => symlinkSync(join(tools, 'node_modules'), join(workspace, 'node_modules')),
  },
};

/** Exercism skips all but the first JS test; Aider's runner un-skips them, and so do we, before the agent sees them. */
function unskip(source: string): string {
  return source.replace(/\bxtest\(/g, 'test(').replace(/\bxit\(/g, 'it(').replace(/\btest\.skip\(/g, 'test(');
}

/** A set's cases, or those matching any filter (an id, a language, or an exercise name); fetches them first. */
export function loadCases(filters: string[] = [], set = 'all'): Case[] {
  ensureRepo(POLYGLOT.repo, POLYGLOT.commit, POLYGLOT.dir);
  const selected = SELECTION.sets[set];
  if (!selected) throw new Error(`No case set ${set}: ${SETS.join(', ')}`);
  const matches = (id: string, filter: string) => id === filter || id.startsWith(`${filter}/`) || id.endsWith(`/${filter}`);
  // A filter that matches nothing is a typo or a case from another set: running the rest would quietly shrink the bench.
  const unmatched = filters.filter((filter) => !selected.cases.some((id) => matches(id, filter)));
  if (unmatched.length) throw new Error(`No case in set ${set} matches ${unmatched.join(', ')}`);
  return selected.cases.filter((id) => !filters.length || filters.some((filter) => matches(id, filter))).map(loadCase);
}

function loadCase(id: string): Case {
  const [lang, exercise] = id.split('/') as [Lang, string];
  if (!Object.hasOwn(LANGUAGES, lang)) throw new Error(`${id}: unsupported language`);
  const dir = join(POLYGLOT.dir, lang, 'exercises', 'practice', exercise);
  const config = JSON.parse(readFileSync(join(dir, '.meta', 'config.json'), 'utf8')) as { files: { solution: string[]; test: string[] } };
  const { solution, test: tests } = config.files;
  // Not .meta (the reference solution), .docs (in the prompt), .approaches or .articles (solutions, discussed).
  const support = readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((path) => !path.split(sep).some((part) => part.startsWith('.') && statSync(join(dir, part)).isDirectory()))
    .filter((path) => statSync(join(dir, path)).isFile() && !solution.includes(path) && !tests.includes(path))
    .sort();
  const files = new Map<string, string>();
  for (const name of [...solution, ...support]) files.set(name, readFileSync(join(dir, name), 'utf8'));
  for (const name of tests) files.set(name, unskip(readFileSync(join(dir, name), 'utf8')));
  const c = { id, lang, exercise, dir, solution, tests, support, files, prompt: '' };
  c.prompt = prompt(c);
  return c;
}

/** Aider's prompt: the exercise's docs, then which files to change. Plus how to run the tests, which agents can. */
function prompt(c: Case): string {
  const docs = ['introduction.md', 'instructions.md', 'instructions.append.md']
    .map((name) => join(c.dir, '.docs', name))
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, 'utf8').trim());
  return [
    ...docs,
    '####',
    `Use the above instructions to modify the supplied files: ${c.solution.join(' ')}
Don't change the names of existing functions or classes, as they may be referenced from other code like unit tests, etc.
Only use standard libraries, don't install any packages.
The tests are in ${c.tests.join(' ')}; run them with \`${LANGUAGES[c.lang].testCommand(c).join(' ')}\`. Don't change the tests.`,
  ].join('\n\n');
}

/**
 * Copies the exercise into `workspace`, leaving out `.meta` (the reference
 * solution) and `.docs` (in the prompt instead), and commits it, so what the
 * agent changed is a `git diff` away.
 */
export function prepareWorkspace(c: Case, workspace: string, tools: string): void {
  mkdirSync(workspace, { recursive: true });
  for (const [name, content] of c.files) {
    mkdirSync(dirname(join(workspace, name)), { recursive: true });
    writeFileSync(join(workspace, name), content);
  }
  LANGUAGES[c.lang].link(workspace, tools);
  git(workspace, 'init', '-q');
  // Out of sight, unlike a .gitignore the agent would find.
  writeFileSync(join(workspace, '.git', 'info', 'exclude'), 'node_modules\n__pycache__/\n.pytest_cache/\n');
  git(workspace, 'add', '-A');
  git(workspace, 'commit', '-q', '--no-verify', '-m', `Start ${c.id}`);
}

export interface Changes {
  /** Lines added and removed per file, the agent's work as `git diff --numstat` sees it. */
  files: { path: string; added: number; removed: number }[];
  /** Tests or support files the agent changed or deleted; restored before grading. */
  tampered: string[];
  diff: string;
}

/** What the agent changed since `prepareWorkspace`, before grading puts the tests back. */
export function changes(c: Case, workspace: string): Changes {
  git(workspace, 'add', '-A');
  const numstat = git(workspace, 'diff', '--cached', '--numstat', 'HEAD');
  const files = numstat
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [added, removed, path] = line.split('\t') as [string, string, string];
      // Binary files show '-'.
      return { path, added: Number(added) || 0, removed: Number(removed) || 0 };
    });
  const tampered = files.map((file) => file.path).filter((path) => c.tests.includes(path) || c.support.includes(path));
  return { files, tampered, diff: git(workspace, 'diff', '--cached', 'HEAD') };
}

/** Puts the tests and support files back as shipped, then runs the tests. */
export async function grade(c: Case, workspace: string, env: NodeJS.ProcessEnv, timeoutMs = 180_000): Promise<Grade> {
  for (const name of [...c.tests, ...c.support]) {
    rmSync(join(workspace, name), { recursive: true, force: true });
    mkdirSync(dirname(join(workspace, name)), { recursive: true });
    writeFileSync(join(workspace, name), c.files.get(name)!);
  }
  const language = LANGUAGES[c.lang];
  const total = c.tests.reduce((sum, name) => sum + language.countTests(c.files.get(name)!), 0);
  const [command, ...args] = language.testCommand(c) as [string, ...string[]];
  const result = await run(command, args, { cwd: workspace, env, timeoutMs });
  const passed = language.passed(result.output);
  return { ...result, passed, total, pass: result.exitCode === 0 && !result.timedOut && passed === total };
}

export interface RunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  /** Files for stdout and stderr, instead of collecting them as `output`. */
  log?: { stdout: string; stderr: string };
  onSpawn?: (pid: number) => void;
}

export interface RunResult {
  pid: number | undefined;
  exitCode: number | null;
  timedOut: boolean;
  ms: number;
  output: string;
}

/**
 * Runs a command in a process group of its own, to completion or until the
 * timeout. Either way the group is then killed, with whatever the command left
 * running in the background.
 */
export function run(command: string, args: string[], { cwd, env, timeoutMs, log, onSpawn }: RunOptions): Promise<RunResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const stdio = log ? (['ignore', openSync(log.stdout, 'w'), openSync(log.stderr, 'w')] as const) : (['ignore', 'pipe', 'pipe'] as const);
    // PWD too: opencode takes it over the real working directory.
    const child = spawn(command, args, { cwd, env: { ...env, PWD: cwd }, detached: true, stdio: [...stdio] });
    if (log) for (const fd of stdio.slice(1) as number[]) closeSync(fd);
    if (child.pid !== undefined) onSpawn?.(child.pid);
    let output = '';
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk));
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup(child.pid);
    }, timeoutMs);
    let exitCode: number | null = null;
    // Background processes may hold the pipes open: kill them on exit, so 'close' comes.
    child.on('exit', (code) => {
      exitCode = code;
      clearTimeout(timer);
      killGroup(child.pid);
    });
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ pid: child.pid, exitCode, timedOut, ms: Date.now() - start, output: error ? `${output}${error.message}\n` : output });
    };
    child.on('close', () => settle());
    child.on('error', (err) => settle(err));
  });
}

/** Kills a detached child's whole process group, including what it left running. */
export function killGroup(pid: number | undefined, signal: NodeJS.Signals = 'SIGKILL'): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, signal);
  } catch {
    // Already gone.
  }
}

export function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.name=bench', '-c', 'user.email=bench@localhost', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Clones `repo` into `dir` once, and checks out `commit`, undoing any changes. */
export function ensureRepo(repo: string, commit: string, dir: string): void {
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(CACHE, { recursive: true });
    console.error(`Fetching ${repo}`);
    execFileSync('git', ['clone', '-q', repo, dir], { stdio: 'inherit' });
  }
  if (git(dir, 'rev-parse', 'HEAD').trim() !== commit) {
    try {
      git(dir, 'checkout', '-q', '--detach', commit);
    } catch {
      git(dir, 'fetch', '-q', 'origin');
      git(dir, 'checkout', '-q', '--detach', commit);
    }
  }
  // Agents run unsandboxed and may wander in here; start every bench from the commit as it is.
  if (git(dir, 'status', '--porcelain', '--ignored').trim()) {
    console.error(`Resetting changes in ${dir}`);
    git(dir, 'checkout', '-q', '--', '.');
    git(dir, 'clean', '-qfdx');
  }
}

/** Installs what the cases' tests need, once, into the cache. */
export function ensureToolchains(cases: Case[]): void {
  const langs = new Set(cases.map((c) => c.lang));
  if (langs.has('python')) {
    const venv = join(CACHE, 'python');
    if (!existsSync(join(venv, 'bin', 'pytest'))) {
      console.error('Installing pytest');
      execFileSync('python3', ['-m', 'venv', venv], { stdio: 'inherit' });
      execFileSync(join(venv, 'bin', 'pip'), ['install', '-q', 'pytest'], { stdio: 'inherit' });
    }
  }
  if (langs.has('javascript')) {
    const dir = join(CACHE, 'javascript');
    if (!existsSync(join(dir, 'node_modules', '.bin', 'jest'))) {
      console.error('Installing jest');
      mkdirSync(dir, { recursive: true });
      const devDependencies: Record<string, string> = {};
      for (const c of cases.filter((c) => c.lang === 'javascript')) {
        Object.assign(devDependencies, (JSON.parse(readFileSync(join(c.dir, 'package.json'), 'utf8')) as { devDependencies: object }).devDependencies);
      }
      writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ private: true, devDependencies }, null, 2)}\n`);
      execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: dir, stdio: 'inherit' });
    }
  }
}

/**
 * Links the cached toolchains into `<root>/tools`, and returns the PATH entries
 * for them: agents and their test output see that path, not the bench's cache,
 * which names the repository and sits next to the reference solutions.
 */
export function linkToolchains(root: string): { tools: string; path: string[] } {
  const tools = join(root, 'tools');
  mkdirSync(tools, { recursive: true });
  const path: string[] = [];
  const venv = join(CACHE, 'python');
  if (existsSync(venv)) {
    // Python finds the venv from the path it's run by, so the link works as the venv itself.
    symlinkSync(venv, join(tools, 'python'));
    // Its python3 has pytest; it shadows the system one for agents too.
    path.push(join(tools, 'python', 'bin'));
  }
  const modules = join(CACHE, 'javascript', 'node_modules');
  if (existsSync(modules)) symlinkSync(modules, join(tools, 'node_modules'));
  return { tools, path };
}

/** Versions of the test toolchains, for the results' metadata. */
export function toolchainVersions(): Record<string, string> {
  const versions: Record<string, string> = {};
  const pytest = join(CACHE, 'python', 'bin', 'pytest');
  if (existsSync(pytest)) versions.pytest = execFileSync(pytest, ['--version'], { encoding: 'utf8' }).trim();
  const jest = join(CACHE, 'javascript', 'node_modules', 'jest', 'package.json');
  if (existsSync(jest)) versions.jest = (JSON.parse(readFileSync(jest, 'utf8')) as { version: string }).version;
  versions.python = execFileSync('python3', ['--version'], { encoding: 'utf8' }).trim();
  versions.node = process.version;
  return versions;
}

export const caseName = (c: Case) => `${c.lang}-${basename(c.exercise)}`;
