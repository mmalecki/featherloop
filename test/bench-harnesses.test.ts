import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { HARNESSES, MODELS, type HarnessContext, type Model } from './harness-bench/harnesses.ts';

const harness = (name: string) => HARNESSES.find((harness) => harness.name === name)!;

/** A run's context, in a home of its own under `dir`. */
function context(dir: string, model: Model): HarnessContext {
  const home = join(dir, model.id, 'home');
  return {
    home,
    xdg: { config: join(home, '.config'), data: join(home, '.local', 'share'), state: join(home, '.local', 'state'), cache: join(home, '.cache') },
    workspace: join(dir, model.id, 'wordy'),
    prompt: '# Instructions\n\n--help is not a flag here',
    baseURL: 'http://127.0.0.1:4000/pi.python-wordy.r1/v1',
    model,
    settings: {},
  };
}

describe('pi', () => {
  let dir: string;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bench-harnesses-'));
  });
  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("puts the model, on the run's proxy, in Pi's models.json in the run's home", async () => {
    const model = MODELS['qwen3.5-9b']!;
    const ctx = context(dir, model);
    const invocation = harness('pi').setup(ctx);
    const config = JSON.parse(await readFile(join(ctx.home, '.pi', 'agent', 'models.json'), 'utf8'));
    assert.deepEqual(config, {
      providers: {
        bench: {
          baseUrl: ctx.baseURL,
          api: 'openai-completions',
          apiKey: 'bench',
          models: [{ id: 'qwen3.5-9b', name: model.name, contextWindow: model.limit.context, maxTokens: model.limit.output }],
        },
      },
    });
    assert.deepEqual(invocation.args, ['--mode', 'json', '--model', 'bench/qwen3.5-9b', '--', ctx.prompt]);
    assert.equal(invocation.env, undefined);
  });

  test('speaks Messages to an Anthropic model, with a dummy key the proxy replaces', async () => {
    const model = MODELS['claude-haiku-4-5']!;
    const ctx = context(dir, model);
    harness('pi').setup(ctx);
    const { bench } = JSON.parse(await readFile(join(ctx.home, '.pi', 'agent', 'models.json'), 'utf8')).providers;
    // The SDK adds /v1 itself.
    assert.equal(bench.baseUrl, 'http://127.0.0.1:4000/pi.python-wordy.r1');
    assert.equal(bench.api, 'anthropic-messages');
    assert.equal(bench.apiKey, 'bench');
    assert.deepEqual(bench.models, [{ id: 'claude-haiku-4-5', name: model.name, contextWindow: 200000, maxTokens: 64000 }]);
  });
});
