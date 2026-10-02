#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  AnthropicProvider,
  Loop,
  ManagedFileTools,
  ParallelWebSearchTool,
  ShellTool,
  SimpleUI,
  WebFetchTool,
  type Provider,
  type Toolset,
} from '../src/index.ts';

const argv = await yargs(hideBin(process.argv))
  .scriptName('featherslop')
  .usage('$0 [options] [prompt]\n\nChat with an agent in the terminal, or run one prompt and exit.')
  .option('model', {
    alias: 'm',
    type: 'string',
    default: process.env.MODEL ?? 'qwen-3.5-9b',
    describe: 'Model (env MODEL)',
  })
  .option('provider', {
    choices: ['openai', 'anthropic'] as const,
    describe: 'API to use (default: anthropic for claude-* models, otherwise openai)',
  })
  .option('base-url', {
    type: 'string',
    default: process.env.OPENAI_BASE_URL ?? 'http://127.0.0.1:9931/v1',
    describe: 'OpenAI-compatible endpoint (env OPENAI_BASE_URL)',
  })
  .option('shell', { type: 'boolean', default: false, describe: 'Add an unsandboxed shell tool' })
  .epilogue(
    'Tools: read, write, update, webfetch; websearch when PARALLEL_API_KEY is set.\n' +
      'Keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, PARALLEL_API_KEY.',
  )
  .version(version())
  .alias('h', 'help')
  .alias('v', 'version')
  .strictOptions()
  .parseAsync();

const { model, shell } = argv;
const provider = argv.provider ?? (model.startsWith('claude-') ? 'anthropic' : 'openai');

const api = provider === 'anthropic' ? await anthropic() : openai();

// A factory, so `/c` starts over with fresh tool state (e.g. which files were read).
const createAgent = () => {
  const tools: Toolset = {
    // read, write and update; updates and overwrites only after a read.
    ...ManagedFileTools(),
    webfetch: WebFetchTool(
      provider === 'openai'
        ? // llama.cpp: skip thinking for compaction; other servers ignore unknown fields.
          { params: { compactOptions: { value: { chat_template_kwargs: { enable_thinking: false } } } } }
        : {},
    ),
  };
  if (process.env.PARALLEL_API_KEY) tools.websearch = ParallelWebSearchTool();
  if (shell) tools.shell = ShellTool();
  return Loop(api, tools);
};

const ui = new SimpleUI(createAgent, {
  model,
  system: `Concise assistant. Today is ${new Date().toISOString().slice(0, 10)}. cwd: ${process.cwd()}`,
});

const prompt = argv._.join(' ');
if (prompt) await ui.ask(prompt);
else await ui.start();

function openai(): Provider | OpenAI {
  return new OpenAI({
    baseURL: argv.baseUrl,
    apiKey: process.env.OPENAI_API_KEY ?? 'none',
  });
}

/** `@anthropic-ai/sdk` is an optional peer dependency; load it only when asked for. */
async function anthropic(): Promise<Provider> {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    // Agentic work does better at high effort than Claude Opus 5.5's medium default.
    return new AnthropicProvider(new Anthropic(), { effort: 'high' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND') throw err;
    console.error('The anthropic provider needs @anthropic-ai/sdk: npm install @anthropic-ai/sdk');
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
