import assert from 'node:assert/strict';
import { test } from 'node:test';
import type Anthropic from '@anthropic-ai/sdk';
import { AnthropicProvider } from '../src/index.ts';

/** A client that records each request and answers "hi" without streaming any events. */
function fakeClient(requests: Record<string, unknown>[]): Anthropic {
  const stream = (params: Record<string, unknown>) => {
    requests.push(params);
    return {
      async *[Symbol.asyncIterator]() {},
      finalMessage: async () => ({
        content: [{ type: 'text', text: 'hi' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      }),
    };
  };
  return { beta: { messages: { stream } } } as unknown as Anthropic;
}

const noop = { content() {}, reasoning() {} };

test('Claude Haiku 4.5 gets no adaptive thinking, effort or fallbacks, even mid-session', async () => {
  const requests: Record<string, unknown>[] = [];
  const provider = new AnthropicProvider(fakeClient(requests), { effort: 'high' });
  const turn = (model: string) =>
    provider.turn({ model, messages: [{ role: 'user', content: 'hello' }], tools: [], signal: undefined }, noop);

  // One provider, models switched between turns, as /model does.
  await turn('claude-opus-5-5');
  await turn('claude-haiku-4-5');
  await turn('claude-haiku-4-5-20251001');
  const [opus, haiku, dated] = requests;

  assert.deepEqual(opus!.thinking, { type: 'adaptive', display: 'summarized' });
  assert.deepEqual(opus!.output_config, { effort: 'high' });
  assert.equal(opus!.fallbacks, 'default');

  for (const request of [haiku!, dated!]) {
    assert.equal(request.thinking, undefined);
    assert.equal(request.output_config, undefined);
    assert.equal(request.fallbacks, undefined);
    assert.equal(request.betas, undefined);
    // Everything else stays as configured.
    assert.deepEqual(request.cache_control, { type: 'ephemeral' });
    assert.equal(request.max_tokens, 64_000);
  }
});
