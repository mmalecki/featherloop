import assert from 'node:assert/strict';
import { test } from 'node:test';
import type OpenAI from 'openai';
import { OpenAIProvider } from '../src/index.ts';

/** A client whose stream yields these tool-call deltas, one chunk each. */
function streaming(...deltas: object[][]): OpenAI {
  const create = async () =>
    (async function* () {
      for (const tool_calls of deltas) yield { choices: [{ delta: { tool_calls } }] };
      yield { choices: [{ finish_reason: 'tool_calls', delta: {} }] };
    })();
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

const calls = async (client: OpenAI) => {
  const message = await new OpenAIProvider(client).turn(
    { model: 'm', messages: [{ role: 'user', content: 'hi' }], tools: [] },
    { content() {}, reasoning() {} },
  );
  return message.tool_calls?.map(({ id, function: { name, arguments: args } }) => ({ id, name, args }));
};

test('joins streamed tool calls by index, as OpenAI sends them', async () => {
  const client = streaming(
    [{ index: 0, id: 'a', function: { name: 'read', arguments: '{"pa' } }],
    [{ index: 1, id: 'b', function: { name: 'glob', arguments: '{}' } }],
    [{ index: 0, function: { arguments: 'th":"x"}' } }],
  );
  assert.deepEqual(await calls(client), [
    { id: 'a', name: 'read', args: '{"path":"x"}' },
    { id: 'b', name: 'glob', args: '{}' },
  ]);
});

test('keeps calls apart when a server leaves out index, as Gemini and Ollama do', async () => {
  // Whole calls with ids, two in one chunk and one in the next.
  const client = streaming(
    [
      { id: 'a', function: { name: 'read', arguments: '{"path":"x"}' } },
      { id: 'b', function: { name: 'read', arguments: '{"path":"y"}' } },
    ],
    [{ id: 'c', function: { name: 'glob', arguments: '{}' } }],
  );
  assert.deepEqual(await calls(client), [
    { id: 'a', name: 'read', args: '{"path":"x"}' },
    { id: 'b', name: 'read', args: '{"path":"y"}' },
    { id: 'c', name: 'glob', args: '{}' },
  ]);
});

test('without index, a piece with no id continues the last call', async () => {
  const client = streaming(
    [{ id: 'a', function: { name: 'read', arguments: '{"pa' } }],
    [{ function: { arguments: 'th":"x"}' } }],
    [{ id: 'b', function: { name: 'glob', arguments: '{}' } }],
  );
  assert.deepEqual(await calls(client), [
    { id: 'a', name: 'read', args: '{"path":"x"}' },
    { id: 'b', name: 'glob', args: '{}' },
  ]);
});
