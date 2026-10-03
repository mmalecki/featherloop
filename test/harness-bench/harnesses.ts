import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CACHE, ensureRepo, git } from './cases.ts';

/**
 * The harnesses under test. Each gets a fresh, empty home for every run, with its
 * config copied in from harnesses/<name>: whatever the harness keeps globally
 * (sessions, databases, caches, the user's own instructions) starts empty and is
 * thrown away after.
 */

export interface HarnessContext {
  /** The run's `HOME`, with every `XDG_*` directory under it. */
  home: string;
  xdg: { config: string; data: string; state: string; cache: string };
  workspace: string;
  prompt: string;
  /** The run's prefix on the metering proxy, with `/v1`; also in the environment as `BENCH_BASE_URL`, for configs. */
  baseURL: string;
  model: string;
}

export interface Invocation {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface Harness {
  name: string;
  description: string;
  /** Fetches or checks what it needs, once before any run; returns its version, for the results. */
  prepare(): string;
  /** Puts its config into the run's home and says how to run it. */
  setup(ctx: HarnessContext): Invocation;
}

const REPO = resolve(import.meta.dirname, '..', '..');
const CONFIGS = join(import.meta.dirname, 'harnesses');

const NANOCODE = {
  repo: 'https://github.com/1rgs/nanocode',
  commit: 'b009d3dbedf14795a5c10804a5455386563f4b5b',
  dir: join(CACHE, 'nanocode'),
};

const featherloop: Harness = {
  name: 'featherloop',
  description: 'This repository, from source, with --shell; config: harnesses/featherloop',
  prepare: () => {
    const head = git(REPO, 'rev-parse', '--short', 'HEAD').trim();
    const dirty = git(REPO, 'status', '--porcelain', '--', 'src', 'bin').trim() ? '-dirty' : '';
    return `${head}${dirty}`;
  },
  setup: ({ xdg, prompt }) => {
    copyConfig('featherloop', join(xdg.config, 'featherloop'));
    // Its config's default model; `--` so no line of the prompt reads as a flag.
    return { command: process.execPath, args: [join(REPO, 'bin', 'featherloop.ts'), '--shell', '--', prompt] };
  },
};

const opencode = (name: string, description: string): Harness => ({
  name,
  description,
  prepare: () => isolated((env) => execFileSync(opencodeBin(), ['--version'], { encoding: 'utf8', env }).trim()),
  setup: ({ xdg, prompt }) => {
    copyConfig(name, join(xdg.config, 'opencode'));
    // --standalone: a private server, not the user's background service. --auto: no permission prompts.
    return { command: opencodeBin(), args: ['run', '--standalone', '--auto', '--format', 'json', prompt] };
  },
});

const nanocode: Harness = {
  name: 'nanocode',
  description: `github.com/1rgs/nanocode at ${NANOCODE.commit.slice(0, 7)}, unmodified, driven by harnesses/nanocode/driver.py`,
  prepare: () => {
    ensureRepo(NANOCODE.repo, NANOCODE.commit, NANOCODE.dir);
    return NANOCODE.commit.slice(0, 7);
  },
  setup: ({ model, prompt }) => ({
    command: 'python3',
    args: [join(CONFIGS, 'nanocode', 'driver.py')],
    env: { NANOCODE: join(NANOCODE.dir, 'nanocode.py'), BENCH_MODEL: model, BENCH_PROMPT: prompt },
  }),
};

export const HARNESSES: Harness[] = [
  featherloop,
  opencode('opencode-stock', 'opencode with only the provider configured (and title generation off); config: harnesses/opencode-stock'),
  opencode('opencode-custom', "opencode with the user's agents for smaller models; config: harnesses/opencode-custom"),
  nanocode,
];

/** `OPENCODE_BIN`, or `opencode` on the PATH. */
function opencodeBin(): string {
  return process.env.OPENCODE_BIN || 'opencode';
}

/** Runs `fn` with an environment whose home is empty and thrown away after: even `opencode --version` writes a log. */
function isolated<T>(fn: (env: NodeJS.ProcessEnv) => T): T {
  const home = mkdtempSync(join(tmpdir(), 'bench-'));
  try {
    const { XDG_CONFIG_HOME, XDG_DATA_HOME, XDG_STATE_HOME, XDG_CACHE_HOME, ...env } = process.env;
    return fn({ ...env, HOME: home });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function copyConfig(name: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  cpSync(join(CONFIGS, name), dest, { recursive: true });
}
