import assert from 'node:assert/strict';
import { test } from 'node:test';
import type OpenAI from 'openai';
import {
  AnthropicProvider,
  ConfigError,
  ModelRegistry,
  OpenAIProvider,
  parseConfig,
  type Config,
} from '../src/index.ts';

const CONFIG = `
model: local/qwen
provider:
  local:
    npm: "@ai-sdk/openai-compatible"
    options:
      baseURL: http://127.0.0.1:9931/v1
    models:
      qwen:
        limit: { output: 8192 }
        variants:
          xhigh:
            reasoningEffort: xhigh
            reasoning_budget_tokens: 8192
            chat_template_kwargs: { preserve_thinking: false }
      Qwen/Qwen3.5-9B:
        variants:
          default: { chat_template_kwargs: { enable_thinking: false } }
          thinking: { chat_template_kwargs: { enable_thinking: true } }
  anthropic:
    models:
      claude-haiku-4-5: { limit: { output: 32000 } }
      claude-sonnet-5-5:
        variants:
          default: high
          high: { effort: high }
      claude-opus-5-5:
        variants:
          max: { effort: max, temperature: 1 }
          wrong: { reasoningEffort: max }
`;

test('reads an OpenCode-shaped config', () => {
  const config = parseConfig(CONFIG);
  assert.equal(config.model, 'local/qwen');
  assert.deepEqual(config.provider!.local!.models.qwen!.limit, { output: 8192 });
});

test('rejects fields it does not support, by path', () => {
  const rejects = (yaml: string, message: RegExp) => assert.throws(() => parseConfig(yaml), (err) => err instanceof ConfigError && message.test(err.message));
  rejects('small_model: local/qwen', /^small_model isn't supported/);
  rejects('provider: { local: { models: { qwen: { limit: { context: 1000 } } } } }', /^provider\.local\.models\.qwen\.limit\.context isn't supported/);
  rejects('provider: { local: { name: Local, models: {} } }', /^provider\.local\.name isn't supported/);
  rejects('provider: { local: { npm: "@ai-sdk/google", models: {} } }', /^provider\.local\.npm must be one of/);
  rejects('provider: { local: { options: {} } }', /^provider\.local\.models is missing/);
  rejects('provider: { local: { models: { qwen: { limit: { output: -1 } } } } }', /must be a positive integer/);
  rejects('provider: { local: { models: { qwen: { variants: { low: 1 } } } } }', /^provider\.local\.models\.qwen\.variants\.low must be a mapping/);
  rejects('provider: { local: { models: { qwen: { variants: { default: high } } } } }', /^provider\.local\.models\.qwen\.variants\.default names no variant: high/);
  rejects('provider: { local: { models: { qwen: { variants: { default: 1 } } } } }', /^provider\.local\.models\.qwen\.variants\.default must be a mapping/);
});

test('takes an API key, from the environment as in OpenCode', async () => {
  const yaml = 'provider: { groq: { npm: "@ai-sdk/openai", options: { apiKey: "{env:GROQ_KEY}" }, models: { llama: {} } } }';
  const config = parseConfig(yaml, { GROQ_KEY: 'gsk-1' });
  assert.equal(config.provider!.groq!.options!.apiKey, 'gsk-1');
  const { api } = await new ModelRegistry(config).resolve('groq/llama');
  assert.equal((api as OpenAIProvider).client.apiKey, 'gsk-1');
  // An unset variable is replaced by nothing, so the key falls back to OPENAI_API_KEY.
  assert.equal(parseConfig(yaml, {}).provider!.groq!.options!.apiKey, '');
});

test('sends a variant as OpenCode does: reasoningEffort as reasoning_effort, the rest as is', async () => {
  const registry = new ModelRegistry(parseConfig(CONFIG));
  const { api, model, variant } = await registry.resolve('local/qwen', { variant: 'xhigh' });
  assert.equal(model, 'qwen');
  assert.equal(variant, 'xhigh');
  assert.deepEqual((api as OpenAIProvider).options.request, {
    max_tokens: 8192,
    reasoning_effort: 'xhigh',
    reasoning_budget_tokens: 8192,
    chat_template_kwargs: { preserve_thinking: false },
  });
  // Without a variant, only the limit.
  assert.deepEqual(((await registry.resolve('local/qwen')).api as OpenAIProvider).options.request, { max_tokens: 8192 });
});

test("sets up Anthropic models with the caller's options, then the model's", async () => {
  const registry = new ModelRegistry(parseConfig(CONFIG), { anthropic: { effort: 'high' } });
  const haiku = (await registry.resolve('anthropic/claude-haiku-4-5')).api as AnthropicProvider;
  assert.deepEqual(haiku.options, { effort: 'high', maxTokens: 32000, request: {} });
  // effort becomes the provider's option, which it leaves out for models without effort.
  const opus = (await registry.resolve('anthropic/claude-opus-5-5', { variant: 'max' })).api as AnthropicProvider;
  assert.deepEqual(opus.options, { effort: 'max', request: { temperature: 1 } });
  // Each API's own name for it, as the AI SDK has them.
  await assert.rejects(registry.resolve('anthropic/claude-opus-5-5', { variant: 'wrong' }), /Anthropic variants set effort with effort/);
});

test('uses the default variant unless asked for another, by name if it names one', async () => {
  const registry = new ModelRegistry(parseConfig(CONFIG));
  const sonnet = await registry.resolve('anthropic/claude-sonnet-5-5');
  assert.equal(sonnet.variant, 'high');
  assert.equal((sonnet.api as AnthropicProvider).options.effort, 'high');
  assert.equal((await registry.resolve('anthropic/claude-sonnet-5-5', { variant: 'default' })).variant, 'high');

  const qwen = await registry.resolve('local/Qwen/Qwen3.5-9B');
  assert.equal(qwen.variant, 'default');
  assert.deepEqual((qwen.api as OpenAIProvider).options.request, { chat_template_kwargs: { enable_thinking: false } });
  const thinking = await registry.resolve('local/Qwen/Qwen3.5-9B', { variant: 'thinking' });
  assert.deepEqual((thinking.api as OpenAIProvider).options.request, { chat_template_kwargs: { enable_thinking: true } });

  // Without a default, no variant.
  assert.equal((await registry.resolve('local/qwen')).variant, undefined);
});

test('splits references at the first slash, and knows only its providers', async () => {
  const registry = new ModelRegistry(parseConfig(CONFIG));
  assert.deepEqual(registry.parseRef('local/Qwen/Qwen3.5-9B'), { provider: 'local', model: 'Qwen/Qwen3.5-9B' });
  assert.equal((await registry.resolve('local/Qwen/Qwen3.5-9B')).model, 'Qwen/Qwen3.5-9B');
  assert.equal(registry.parseRef('qwen-3.5-9b'), undefined);
  assert.equal(registry.parseRef('Qwen/Qwen3.5-9B'), undefined);
  assert.deepEqual(registry.list().map(({ ref }) => ref), [
    'local/qwen',
    'local/Qwen/Qwen3.5-9B',
    'anthropic/claude-haiku-4-5',
    'anthropic/claude-sonnet-5-5',
    'anthropic/claude-opus-5-5',
  ]);

  await assert.rejects(registry.resolve('local/llama'), /Unknown model "local\/llama"; local has qwen, Qwen\/Qwen3.5-9B/);
  await assert.rejects(registry.resolve('local/qwen', { variant: 'low' }), /local\/qwen has no variant "low"; variants: xhigh/);
  await assert.rejects(registry.resolve('anthropic/claude-haiku-4-5', { variant: 'max' }), /has no variant "max"; it has none/);
  await assert.rejects(registry.resolve('remote/qwen'), /Unknown provider in "remote\/qwen"; providers: local, anthropic/);
});

test('needs npm for providers other than openai and anthropic', async () => {
  const config: Config = { provider: { local: { models: { qwen: {} } } } };
  await assert.rejects(new ModelRegistry(config).resolve('local/qwen'), /provider\.local needs npm/);
});

test("providers send their request fields with every call, under the call's own", async () => {
  const bodies: Record<string, any>[] = [];
  const client = {
    chat: {
      completions: {
        async create(body: Record<string, any>) {
          bodies.push(body);
          if (!body.stream) return { choices: [{ message: { content: 'ok' } }] };
          return (async function* () {
            yield { choices: [{ finish_reason: 'stop', delta: { content: 'ok' } }] };
          })();
        },
      },
    },
  } as unknown as OpenAI;
  const provider = new OpenAIProvider(client, {
    request: { reasoning_effort: 'low', chat_template_kwargs: { preserve_thinking: false }, stream_options: { foo: 1 } },
  });
  const say = (extra: object) =>
    provider.turn({ model: 'm', messages: [{ role: 'user', content: 'hi' }], tools: [], ...extra }, { content() {}, reasoning() {} });

  await say({});
  await provider.complete({ model: 'm', prompt: 'hi', request: { chat_template_kwargs: { enable_thinking: false } } });
  const [turn, complete] = bodies;
  assert.equal(turn!.reasoning_effort, 'low');
  assert.deepEqual(turn!.chat_template_kwargs, { preserve_thinking: false });
  assert.deepEqual(turn!.stream_options, { include_usage: true, foo: 1 });
  // A call's fields replace the provider's, whole.
  assert.equal(complete!.reasoning_effort, 'low');
  assert.deepEqual(complete!.chat_template_kwargs, { enable_thinking: false });
});

test("sends a call's reasoning as reasoning_effort, over the provider's and under the call's fields", async () => {
  const bodies: Record<string, any>[] = [];
  const client = {
    chat: {
      completions: {
        async create(body: Record<string, any>) {
          bodies.push(body);
          if (!body.stream) return { choices: [{ message: { content: 'ok' } }] };
          return (async function* () {
            yield { choices: [{ finish_reason: 'stop', delta: { content: 'ok' } }] };
          })();
        },
      },
    },
  } as unknown as OpenAI;
  const provider = new OpenAIProvider(client, { request: { reasoning_effort: 'high' } });
  const messages = [{ role: 'user' as const, content: 'hi' }];
  const on = { content() {}, reasoning() {} };

  await provider.turn({ model: 'm', messages, tools: [], reasoning: 'none' }, on);
  await provider.turn({ model: 'm', messages, tools: [], reasoning: 'none', request: { reasoning_effort: 'low' } }, on);
  await provider.complete({ model: 'm', prompt: 'hi', reasoning: 'none' });
  await provider.complete({ model: 'm', prompt: 'hi' });
  assert.deepEqual(
    bodies.map((body) => body.reasoning_effort),
    ['none', 'low', 'none', 'high'],
  );
});
