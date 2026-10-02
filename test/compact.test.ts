import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compact, type CompleteRequest, type Provider } from '../src/index.ts';

test('compacts without reasoning unless asked for some', async () => {
  const requests: CompleteRequest[] = [];
  const api: Provider = {
    name: 'fake',
    async turn() {
      throw new Error('turn() should not be called');
    },
    async complete(request) {
      requests.push(request);
      return 'short';
    },
  };
  const ctx = { api, model: 'm' };
  assert.equal(await compact(ctx, { prompt: 'Shorten.', content: 'long' }), 'short');
  await compact(ctx, { prompt: 'Shorten.', content: 'long', reasoning: 'low' });
  assert.deepEqual(requests.map(({ reasoning }) => reasoning), ['none', 'low']);
});
