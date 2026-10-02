#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  advisorAgent,
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
  type ResolvedModel,
  type Toolset,
} from '../src/index.ts';

const argv = await yargs(hideBin(process.argv))
  .scriptName('featherloop')
  .usage('$0 [options] [prompt]\n\nChat with an agent in the terminal, or run one prompt and exit.')
  .option('model', {
    alias: 'm',
    type: 'string',
    describe:
      "provider/model or an alias from the config, or a bare model id (env MODEL; default: the config's model, else qwen-3.5-9b)",
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
  .option('advisor', {
    type: 'boolean',
    default: false,
    describe: "Add an advisor subagent for second opinions, on the config's advisor alias",
  })
  .option('advisor-model', { type: 'string', describe: 'Model for the advisor instead of the alias; implies --advisor' })
  .epilogue(
    'Tools: read, write, update, grep, glob, webfetch; websearch when PARALLEL_API_KEY is set;\n' +
      'shell with --shell; subagent with --subagent or --advisor.\n' +
      'Keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, PARALLEL_API_KEY.',
  )
  .version(version())
  .alias('h', 'help')
  .alias('v', 'version')
  .strictOptions()
  .parseAsync();

const { shell, subagent } = argv;
const advisor = argv.advisor || argv.advisorModel !== undefined;
const registry = await exitOnConfigError(() => new ModelRegistry(loadConfig(argv.config)));
const initial = await exitOnConfigError(() =>
  resolveModel(argv.model ?? process.env.MODEL ?? registry.default ?? 'qwen-3.5-9b', argv.variant),
);
if (advisor) {
  // Set it up now, so a missing alias or SDK shows before the session, not on the first call.
  await exitOnConfigError(() => {
    if (argv.advisorModel === undefined && !registry.knows(advisorAgent.model!)) {
      throw new ConfigError(`--advisor needs an alias "${advisorAgent.model}" in ${argv.config}, or --advisor-model`);
    }
    return resolveModel(advisorAgent.model!, undefined);
  });
}

/**
 * Every tool an agent may get, built afresh: each loop and subagent tracks its own
 * file state. Flags decide what's here; agents' permissions pick from it, so even
 * an agent that allows everything gets no shell without --shell.
 */
const availableTools = (): Toolset => {
  const available: Toolset = {
    // read, write and update; updates and overwrites only after a read.
    ...ManagedFileTools(),
    // rg and fd when installed, otherwise grep and find.
    grep: GrepTool(),
    glob: GlobTool(),
    webfetch: WebFetchTool(),
  };
  if (shell) available.shell = ShellTool();
  if (process.env.PARALLEL_API_KEY) available.websearch = ParallelWebSearchTool();
  return available;
};

// A factory, so `/c` starts over with fresh tool state (e.g. which files were read).
const createLoop = () => {
  const available = availableTools();
  // Subagents get the same tools, but never this one (SubagentTool leaves it out).
  const agents = [...(subagent ? [generalAgent] : []), ...(advisor ? [advisorAgent] : [])];
  if (agents.length) available.subagent = SubagentTool({ agents, tools: availableTools });
  // The UI passes each run the current model's provider; this one is only the default.
  return Loop(initial.api, generalAgent.toolset(available), { models: resolveModel });
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
 * A model or alias from the config, or a bare model id run where --provider and
 * --base-url say. For the initial model, `/model` and agents' own models; a model
 * given to --advisor-model stands in for the advisor alias.
 */
async function resolveModel(ref: string, variant?: string): Promise<ResolvedModel> {
  if (ref === advisorAgent.model && argv.advisorModel) ref = argv.advisorModel;
  if (registry.knows(ref)) return registry.resolve(ref, { variant });
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
