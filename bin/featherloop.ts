#!/usr/bin/env node
import { existsSync, fstatSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { text } from 'node:stream/consumers';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  advisorAgent,
  ConfigError,
  configDir,
  configPath,
  findInstructions,
  FLAVORS,
  formatInstructions,
  generalAgent,
  GlobTool,
  GrepTool,
  loadConfig,
  Loop,
  ManagedFileTools,
  ModelRegistry,
  ParallelWebSearchTool,
  Session,
  SessionError,
  sessionModel,
  ShellTool,
  SimpleUI,
  SubagentTool,
  WebFetchTool,
  type Config,
  type ResolvedModel,
  sessionsDir,
  type Toolset,
} from '../src/index.ts';

const argv = await yargs(hideBin(process.argv))
  .scriptName('featherloop')
  .usage(
    '$0 [options] [prompt]\n\nChat with an agent in the terminal, or run one prompt and exit.\n' +
      'A prompt can also be piped on stdin; it goes after the argument prompt:\n  git diff | $0 "review this"',
  )
  .option('model', {
    alias: 'm',
    type: 'string',
    describe:
      "provider/model or an alias from the config, or a bare model id (env MODEL; default: the config's model, or its only one)",
  })
  .option('variant', { type: 'string', describe: "One of the model's variants from the config (default: its default one, if any)" })
  .option('flavor', { choices: FLAVORS, default: 'openai' as const, describe: 'API a bare model id speaks' })
  .option('base-url', {
    type: 'string',
    describe:
      "Endpoint for a bare model id, with /v1 (openai flavor: env OPENAI_BASE_URL, else llama-server's default, http://127.0.0.1:9931/v1)",
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
  .option('instructions', {
    type: 'boolean',
    default: true,
    describe: `Load AGENTS.md, or else CLAUDE.md, from ${configDir()} and each directory from the git root down to the cwd (--no-instructions to skip)`,
  })
  .option('resume', {
    alias: 'r',
    type: 'string',
    describe: "Continue a saved session by its id, on its last model unless --model or --variant is given",
  })
  .epilogue(
    'Tools: read, write, update, grep, glob, webfetch; websearch when PARALLEL_API_KEY is set;\n' +
      'shell with --shell; subagent with --subagent or --advisor.\n' +
      'Keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, PARALLEL_API_KEY.\n' +
      `Sessions are saved in ${sessionsDir()}. Flags aren't: a session on a bare model id\n` +
      'needs its --flavor and --base-url again to resume.',
  )
  .version(version())
  .alias('h', 'help')
  .alias('v', 'version')
  .strictOptions()
  .parseAsync();

// Read before the session is set up: piped input with no prompt in it is an error, not a REPL.
const piped = stdinIsInput() ? (await text(process.stdin)).trimEnd() : undefined;
const prompt = [argv._.join(' '), piped].filter(Boolean).join('\n\n');
if (piped !== undefined && !prompt) {
  console.error('No prompt: pass one as an argument or pipe it on stdin');
  process.exit(1);
}

const { shell, subagent } = argv;
const advisor = argv.advisor || argv.advisorModel !== undefined;
const registry = await exitOnUserError(() => new ModelRegistry(loadConfig(argv.config)));
const resumed = argv.resume === undefined ? undefined : await exitOnUserError(() => Session.open(argv.resume!));
// A resumed session stays on its model and variant, unless the flags pick them.
const ref = await exitOnUserError(() => argv.model ?? resumed?.model?.ref ?? process.env.MODEL ?? registry.default ?? onlyModel());
const variant = argv.model === undefined && argv.variant === undefined ? resumed?.model?.variant : argv.variant;
const initial = await exitOnUserError(() => resolveModel(ref, variant));
const model = sessionModel(ref, variant);
const session = resumed ?? Session.create({ model });
// Flags switched a resumed session's model: the next resume should stay on it.
if (resumed && (argv.model !== undefined || argv.variant !== undefined)) resumed.setModel(model);
if (session.cwd !== process.cwd()) console.error(`Note: the session started in ${session.cwd}; tools now run in ${process.cwd()}`);
if (advisor) {
  // Set it up now, so a missing alias or SDK shows before the session, not on the first call.
  await exitOnUserError(() => {
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
  if (agents.length) available.subagent = SubagentTool({ agents, tools: availableTools, instructions });
  // The UI passes each run the current model's provider; this one is only the default.
  return Loop(initial.api, generalAgent.toolset(available), { models: resolveModel });
};

// Read for each new conversation (`/c`) and subagent task, so edits apply from then on. The startup
// read serves the header and the first prompt, and is the only one that warns.
const instructions = (cwd: string) => (argv.instructions ? formatInstructions(findInstructions({ cwd })) : '');
const startup = argv.instructions
  ? findInstructions({ onSkip: (path, err) => console.error(`Skipping instructions in ${path}: ${(err as Error).message}`) })
  : [];
const loaded = resumed ? [] : startup.map(({ path }) => shortPath(path));
let first = true;

const ui = new SimpleUI(createLoop, {
  model: initial,
  resolveModel,
  session,
  // A resumed session keeps the system prompt it was saved with; `/c` builds a new one.
  system: () => {
    const cwd = process.cwd();
    const text = first ? formatInstructions(startup) : instructions(cwd);
    first = false;
    return generalAgent.system({ cwd, date: new Date().toISOString().slice(0, 10), model: initial.model, instructions: text });
  },
  ...(loaded.length ? { notes: [`instructions: ${loaded.join(', ')}`] } : {}),
});

// Piped stdin always has a prompt by now: with no terminal to chat in, it never starts the REPL.
if (prompt) await ui.ask(prompt);
else await ui.start();
// After /c, the UI's session is a newer one. One with only a system prompt (its first run failed) isn't worth it.
if (ui.session?.messages.some((message) => message.role !== 'system')) console.error(`Resume with: featherloop --resume ${ui.session.id}`);

/**
 * A model or alias from the config, or a bare model id run where --flavor and
 * --base-url say. For the initial model, `/model` and agents' own models; a model
 * given to --advisor-model stands in for the advisor alias.
 */
async function resolveModel(ref: string, variant?: string): Promise<ResolvedModel> {
  if (ref === advisorAgent.model && argv.advisorModel) ref = argv.advisorModel;
  if (registry.knows(ref)) return registry.resolve(ref, { variant });
  const { flavor } = argv;
  const baseURL = argv.baseUrl ?? (flavor === 'openai' ? (process.env.OPENAI_BASE_URL ?? 'http://127.0.0.1:9931/v1') : undefined);
  const flags: Config = { provider: { [flavor]: { flavor, ...(baseURL ? { options: { baseURL } } : {}), models: { [ref]: {} } } } };
  return new ModelRegistry(flags).resolve(`${flavor}/${ref}`, { variant });
}

/** With no model named anywhere, the config's only model; with none or several, the user picks. */
function onlyModel(): string {
  const models = registry.models();
  if (models.length === 1) return models[0]!;
  throw new ConfigError(
    models.length
      ? `Pick a model with --model, or set model in ${argv.config}. Configured: ${models.join(', ')}`
      : `No model: pass --model, or configure one in ${argv.config}`,
  );
}

/**
 * Whether stdin is a pipe or a file, and so carries a prompt. Not just `!isTTY`:
 * stdin may also be /dev/null or a socket (e.g. Node's default for child processes)
 * that never closes, and waiting on it would hang `featherloop "prompt"`.
 */
function stdinIsInput(): boolean {
  try {
    const stat = fstatSync(0);
    return stat.isFIFO() || stat.isFile();
  } catch {
    // stdin is closed.
    return false;
  }
}

/** Relative for the cwd's and its parents' files (e.g. `../AGENTS.md`), else from the home directory. */
function shortPath(path: string): string {
  const rel = relative(process.cwd(), path);
  if (rel.split(sep).slice(0, -1).every((part) => part === '..')) return rel;
  return path.startsWith(`${homedir()}${sep}`) ? `~${path.slice(homedir().length)}` : path;
}

/** Config and session errors are the user's to fix: their message is enough. */
async function exitOnUserError<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof ConfigError || err instanceof SessionError)) throw err;
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
