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

test("compacts with the loop's model's compact alias, unless given a model", async () => {
  const calls: string[] = [];
  const fake = (name: string): Provider => ({
    name,
    async turn() {
      throw new Error('turn() should not be called');
    },
    async complete(request) {
      calls.push(`${name} ${request.model}`);
      return 'short';
    },
  });
  const main = fake('main');
  const small = fake('small');
  const asked: string[] = [];
  const submodel = async (name: string) => (asked.push(name), name === 'compact' ? { ref: 'small/tiny', api: small, model: 'tiny' } : undefined);
  await compact({ api: main, model: 'big', submodel }, { prompt: 'Shorten.', content: 'long' });
  // A model given is one of the loop's provider's.
  await compact({ api: main, model: 'big', submodel }, { prompt: 'Shorten.', content: 'long', model: 'mini' });
  // No alias (or opted out of it), or no way to set models up: the loop's model.
  await compact({ api: main, model: 'big', submodel: async () => undefined }, { prompt: 'Shorten.', content: 'long' });
  await compact({ api: main, model: 'big' }, { prompt: 'Shorten.', content: 'long' });
  assert.deepEqual(calls, ['small tiny', 'main mini', 'main big', 'main big']);
  assert.deepEqual(asked, ['compact']);
});
