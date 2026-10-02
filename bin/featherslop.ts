#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  ConfigError,
  configPath,
  generalAgent,
  GlobTool,
  GrepTool,
  loadConfig,
  Loop,
  ManagedFileTools,
  ModelRegistry,
  ParallelWebSearchTool,
  ShellTool,
  SimpleUI,
  SubagentTool,
  WebFetchTool,
  type Config,
  type PermissionRule,
  type ResolvedModel,
  type Toolset,
} from '../src/index.ts';

const argv = await yargs(hideBin(process.argv))
  .scriptName('featherslop')
  .usage('$0 [options] [prompt]\n\nChat with an agent in the terminal, or run one prompt and exit.')
  .option('model', {
    alias: 'm',
    type: 'string',
    describe: "provider/model from the config, or a bare model id (env MODEL; default: the config's model, else qwen-3.5-9b)",
  })
  .option('variant', { type: 'string', describe: "One of the model's variants from the config (default: its default one, if any)" })
  .option('provider', {
    choices: ['openai', 'anthropic'] as const,
    describe: 'API for a bare model id (default: anthropic for claude-* models, otherwise openai)',
  })
  .option('base-url', {
    type: 'string',
    default: process.env.OPENAI_BASE_URL ?? 'http://127.0.0.1:9931/v1',
    describe: 'OpenAI-compatible endpoint for a bare model id (env OPENAI_BASE_URL)',
  })
  .option('config', { type: 'string', default: configPath(), describe: 'Config file, for providers and models' })
  .option('shell', { type: 'boolean', default: false, describe: 'Add an unsandboxed shell tool' })
  .option('subagent', { type: 'boolean', default: false, describe: 'Add a subagent tool for handing off tasks' })
  .epilogue(
    'Tools: read, write, update, grep, glob, webfetch; websearch when PARALLEL_API_KEY is set;\n' +
      'shell and subagent with --shell and --subagent.\n' +
      'Keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, PARALLEL_API_KEY.',
  )
  .version(version())
  .alias('h', 'help')
  .alias('v', 'version')
  .strictOptions()
  .parseAsync();

const { shell, subagent } = argv;
const registry = await exitOnConfigError(() => new ModelRegistry(loadConfig(argv.config)));
const initial = await exitOnConfigError(() =>
  resolveModel(argv.model ?? process.env.MODEL ?? registry.default ?? 'qwen-3.5-9b', argv.variant),
);

// Rules from flags come after the agent's, so they win.
const flagPermissions: PermissionRule[] = shell ? [{ action: 'shell', effect: 'allow' }] : [];

/** Every tool an agent may get, built afresh: each loop and subagent tracks its own file state. */
const availableTools = (): Toolset => {
  const available: Toolset = {
    // read, write and update; updates and overwrites only after a read.
    ...ManagedFileTools(),
    // rg and fd when installed, otherwise grep and find.
    grep: GrepTool(),
    glob: GlobTool(),
    webfetch: WebFetchTool(),
    shell: ShellTool(),
  };
  if (process.env.PARALLEL_API_KEY) available.websearch = ParallelWebSearchTool();
  return available;
};

// A factory, so `/c` starts over with fresh tool state (e.g. which files were read).
const createLoop = () => {
  const available = availableTools();
  // Subagents get the same tools and flags, but never this tool (SubagentTool denies it).
  if (subagent) {
    available.subagent = SubagentTool({ agents: [generalAgent], tools: availableTools, permissions: flagPermissions });
  }
  // The UI passes each run the current model's provider; this one is only the default.
  return Loop(initial.api, generalAgent.toolset(available, flagPermissions));
};

const ui = new SimpleUI(createLoop, {
  model: initial,
  resolveModel,
  system: generalAgent.system({ cwd: process.cwd(), date: new Date().toISOString().slice(0, 10), model: initial.model }),
});

const prompt = argv._.join(' ');
if (prompt) await ui.ask(prompt);
else await ui.start();

/**
 * A model from the config, or a bare model id run where --provider and --base-url
 * say. For the initial model and `/model`.
 */
async function resolveModel(ref: string, variant: string | undefined): Promise<ResolvedModel> {
  if (registry.parseRef(ref)) return registry.resolve(ref, { variant });
  const provider = argv.provider ?? (ref.startsWith('claude-') ? 'anthropic' : 'openai');
  const flags: Config = {
    provider: { [provider]: { ...(provider === 'openai' ? { options: { baseURL: argv.baseUrl } } : {}), models: { [ref]: {} } } },
  };
  return new ModelRegistry(flags).resolve(`${provider}/${ref}`, { variant });
}

/** Config errors are the user's to fix: their message is enough. */
async function exitOnConfigError<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}

/** Finds our package.json from either bin/ (source) or dist/bin/ (built). */
function version(): string {
  for (let dir = dirname(fileURLToPath(import.meta.url)); dir !== dirname(dir); dir = dirname(dir)) {
    const file = join(dir, 'package.json');
    if (existsSync(file)) return (JSON.parse(readFileSync(file, 'utf8')) as { version: string }).version;
  }
  return 'unknown';
}
