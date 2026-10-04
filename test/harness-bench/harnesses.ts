import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { CACHE, ensureRepo, git } from './cases.ts';

/**
 * The harnesses under test. Each gets a fresh, empty home for every run, with its
 * config copied in from harnesses/<name> and the model under test added from
 * models.json: whatever the harness keeps globally (sessions, databases, caches,
 * the user's own instructions) starts empty and is thrown away after.
 */

/** A model in models.json, as the user's configs have it. */
export interface Model {
  /** Its key in models.json: the name harnesses send, which a single-model llama-server ignores. */
  id: string;
  name: string;
  /** The API it speaks, as featherloop names it: `openai` (Chat Completions; llama.cpp) or `anthropic` (Messages). */
  flavor: 'openai' | 'anthropic';
  /** Its server, with /v1. */
  upstream: string;
  limit: { context: number; output: number };
  /** Dollars per million tokens, for a priced API: cost per run in the report, and `--max-cost`. */
  pricing?: { input: number; output: number; cacheWrite: number; cacheRead: number };
  /** featherloop's own model settings, e.g. variants. */
  featherloop?: Record<string, unknown>;
}

export const MODELS: Record<string, Model> = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(join(import.meta.dirname, 'models.json'), 'utf8')) as Record<string, Omit<Model, 'id'>>).map(
    ([id, model]) => [id, { id, ...model }],
  ),
);

export interface HarnessContext {
  /** The run's `HOME`, with every `XDG_*` directory under it. */
  home: string;
  xdg: { config: string; data: string; state: string; cache: string };
  workspace: string;
  prompt: string;
  /** The run's prefix on the metering proxy, with `/v1`; also in the environment as `BENCH_BASE_URL`, for configs. */
  baseURL: string;
  model: Model;
  settings: Settings;
  /** The advisor's model and the run's prefix on its proxy, with `/v1`, when the bench has one (`--advisor`). */
  advisor?: { model: Model; baseURL: string };
}

/** Where the bench departs from a harness's own behaviour, by choice; recorded in meta.json, so reruns match. */
export interface Settings {
  /** nanocode's output limit, in place of the 8192 it ships with. */
  nanocodeMaxTokens?: number;
  /** False: the proxy turns the model's thinking off on every request, whatever the harness asks for. */
  thinking?: boolean;
  /** A model from models.json that `featherloop-advisor` asks for second opinions. */
  advisor?: string;
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
  /** How it's set up, beyond the model and the proxy, for the report. */
  notes(settings: Settings): string[];
  /** Whether it can run the model with these settings; all can, unless they say otherwise. */
  supports?(model: Model, settings: Settings): boolean;
  /** Whether a run that names no harnesses includes it; by default, when it `supports` the model. */
  byDefault?(model: Model, settings: Settings): boolean;
}

const REPO = resolve(import.meta.dirname, '..', '..');
const CONFIGS = join(import.meta.dirname, 'harnesses');

const NANOCODE = {
  repo: 'https://github.com/1rgs/nanocode',
  commit: 'b009d3dbedf14795a5c10804a5455386563f4b5b',
  dir: join(CACHE, 'nanocode'),
};

/**
 * featherloop from this repository. With `advised`, it also gets `--advisor`, on
 * the bench's advisor model, as its own config would name it: an `advisor` alias.
 */
const featherloopHarness = (advised: boolean): Harness => ({
  name: advised ? 'featherloop-advisor' : 'featherloop',
  description: advised
    ? 'This repository, from source, with --shell and --advisor; config: harnesses/featherloop, plus the advisor'
    : 'This repository, from source, with --shell; config: harnesses/featherloop',
  ...(advised ? { supports: (_model: Model, settings: Settings) => settings.advisor !== undefined } : {}),
  prepare: () => {
    const head = git(REPO, 'rev-parse', '--short', 'HEAD').trim();
    const dirty = git(REPO, 'status', '--porcelain', '--', 'src', 'bin').trim() ? '-dirty' : '';
    return `${head}${dirty}`;
  },
  setup: ({ xdg, prompt, model, advisor }) => {
    const dir = join(xdg.config, 'featherloop');
    copyConfig('featherloop', dir);
    const file = join(dir, 'config.yaml');
    const config = parseDocument(readFileSync(file, 'utf8'));
    config.setIn(['provider', 'bench', 'flavor'], model.flavor);
    config.setIn(['provider', 'bench', 'models', model.id], { limit: { output: model.limit.output }, ...model.featherloop });
    if (advised) {
      if (!advisor) throw new Error('featherloop-advisor needs --advisor');
      // Its own provider, on the advisor's proxy; the proxy supplies any key.
      config.setIn(['provider', 'advisor'], {
        flavor: advisor.model.flavor,
        options: { baseURL: advisor.baseURL, apiKey: 'bench' },
        models: { [advisor.model.id]: { limit: { output: advisor.model.limit.output }, ...advisor.model.featherloop } },
      });
      config.setIn(['aliases', 'advisor'], `advisor/${advisor.model.id}`);
    }
    writeFileSync(file, config.toString());
    // `--` so no line of the prompt reads as a flag.
    const flags = advised ? ['--shell', '--advisor'] : ['--shell'];
    return { command: process.execPath, args: [join(REPO, 'bin', 'featherloop.ts'), ...flags, '--model', `bench/${model.id}`, '--', prompt] };
  },
  notes: ({ advisor }) => [advised ? `--shell --advisor, advised by ${advisor}; no subagent` : '--shell; no advisor, no subagent'],
});

const opencode = (name: string, description: string, notes: string[]): Harness => ({
  name,
  description,
  notes: () => notes,
  prepare: () => isolated((env) => execFileSync(opencodeBin(), ['--version'], { encoding: 'utf8', env }).trim()),
  setup: ({ xdg, prompt, model }) => {
    const dir = join(xdg.config, 'opencode');
    copyConfig(name, dir);
    const file = join(dir, 'opencode.json');
    const config = JSON.parse(readFileSync(file, 'utf8')) as {
      provider: { bench: { npm: string; options: Record<string, string>; models: Record<string, unknown> } };
    };
    // The AI SDK package that speaks the model's API; the proxy supplies any key.
    if (model.flavor === 'anthropic') config.provider.bench = { ...config.provider.bench, npm: '@ai-sdk/anthropic', options: { ...config.provider.bench.options, apiKey: 'bench' } };
    config.provider.bench.models[model.id] = { name: model.name, limit: model.limit };
    writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
    // --standalone: a private server, not the user's background service. --auto: no permission prompts.
    return { command: opencodeBin(), args: ['run', '--standalone', '--auto', '--format', 'json', '--model', `bench/${model.id}`, prompt] };
  },
});

const nanocode: Harness = {
  name: 'nanocode',
  description: `github.com/1rgs/nanocode at ${NANOCODE.commit.slice(0, 7)}, unmodified, driven by harnesses/nanocode/driver.py`,
  prepare: () => {
    ensureRepo(NANOCODE.repo, NANOCODE.commit, NANOCODE.dir);
    return NANOCODE.commit.slice(0, 7);
  },
  setup: ({ model, prompt, settings }) => ({
    command: 'python3',
    args: [join(CONFIGS, 'nanocode', 'driver.py')],
    env: {
      NANOCODE: join(NANOCODE.dir, 'nanocode.py'),
      BENCH_MODEL: model.id,
      BENCH_PROMPT: prompt,
      ...(settings.nanocodeMaxTokens ? { BENCH_MAX_TOKENS: String(settings.nanocodeMaxTokens) } : {}),
    },
  }),
  notes: ({ nanocodeMaxTokens }) => [
    nanocodeMaxTokens ? `max_tokens ${nanocodeMaxTokens} (the model's output limit) in place of its 8192` : 'max_tokens 8192, as shipped',
  ],
};

/**
 * Claude Code, headless (`-p`), against the run's proxy: `ANTHROPIC_BASE_URL` and a
 * dummy key the proxy replaces. Its background model is the model under test, so
 * every call it makes is metered; telemetry, nonessential traffic and updates are off.
 * Anthropic models only: it speaks the Messages API with Claude's features.
 */
const claudeCode: Harness = {
  name: 'claude-code',
  description: 'Claude Code, headless (-p), with permissions skipped',
  // llama.cpp serves the Messages API too; a run includes it by default only on Anthropic's.
  supports: (model) => model.flavor === 'anthropic' || model.flavor === 'openai',
  byDefault: (model) => model.flavor === 'anthropic',
  prepare: () => isolated((env) => execFileSync(claudeBin(), ['--version'], { encoding: 'utf8', env }).trim()),
  setup: ({ baseURL, model, prompt }) => ({
    command: claudeBin(),
    args: ['-p', prompt, '--model', model.id, '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'],
    env: {
      // The SDK adds /v1 itself.
      ANTHROPIC_BASE_URL: baseURL.replace(/\/v1\/?$/, ''),
      ANTHROPIC_API_KEY: 'bench',
      ANTHROPIC_SMALL_FAST_MODEL: model.id,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: model.id,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      DISABLE_TELEMETRY: '1',
      DISABLE_AUTOUPDATER: '1',
    },
  }),
  notes: () => [
    'headless (-p), --dangerously-skip-permissions; its background model set to the model under test; telemetry and updates off; ' +
      'on llama.cpp, its mid-conversation system messages are folded into the user turn before them (the chat template takes one, first)',
  ],
};

export const HARNESSES: Harness[] = [
  featherloopHarness(false),
  featherloopHarness(true),
  opencode('opencode-stock', 'opencode with only the provider configured; config: harnesses/opencode-stock', [
    'title agent off (it takes a server slot per run)',
  ]),
  opencode('opencode-custom', "opencode with the user's agents for smaller models; config: harnesses/opencode-custom", [
    'title agent off (it takes a server slot per run)',
    'websearch off (it needs a key; the cases are offline)',
  ]),
  nanocode,
  claudeCode,
];

/** `CLAUDE_BIN`, or `claude` on the PATH. */
function claudeBin(): string {
  return process.env.CLAUDE_BIN || 'claude';
}

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
