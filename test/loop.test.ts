import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentLoop, type AssistantMessage } from '../src/loop.ts';
import type { Provider, TurnRequest } from '../src/provider.ts';
import type { Toolset } from '../src/tool.ts';

/** A provider that replays scripted assistant replies, one per turn. */
function fakeProvider(replies: AssistantMessage[]): Provider & { requests: TurnRequest[] } {
  const requests: TurnRequest[] = [];
  return {
    name: 'fake',
    requests,
    async turn(request) {
      requests.push({ ...request, messages: [...request.messages] });
      const reply = replies[requests.length - 1];
      if (!reply) throw new Error(`Unexpected turn ${requests.length}: the loop should have ended`);
      return reply;
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  };
}

test('run ends when the model replies without tool calls', async () => {
  const toolReply: AssistantMessage = {
    role: 'assistant',
    content: null,
    stop: 'tool_use',
    tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'echo', arguments: '{"text":"hi"}' } }],
  };
  const finalReply: AssistantMessage = { role: 'assistant', content: 'All done.', stop: 'end' };
  const api = fakeProvider([toolReply, finalReply]);

  const invocations: unknown[] = [];
  const toolset: Toolset = {
    echo: {
      schema: () => ({ description: 'Echo text back', parameters: { type: 'object', properties: { text: { type: 'string' } } } }),
      invoke: (params) => {
        invocations.push(params);
        return `echo: ${params.text}`;
      },
    },
  };

  const loop = new AgentLoop(api, toolset);
  const ends: unknown[] = [];
  loop.on('end', (result) => ends.push(result));

  const result = await loop.run({ model: 'fake-model', input: [{ role: 'user', content: 'Say hi' }] });

  // The tool-call turn kept the loop going; the plain reply ended it, with no extra request.
  assert.equal(api.requests.length, 2);
  assert.deepEqual(invocations, [{ text: 'hi' }]);
  assert.equal(result.message, finalReply);
  assert.deepEqual(result.messages, [
    { role: 'user', content: 'Say hi' },
    toolReply,
    { role: 'tool', tool_call_id: 'call_1', content: 'echo: hi' },
    finalReply,
  ]);
  assert.equal(ends.length, 1);
  assert.equal(ends[0], result);
  assert.equal(loop.running, false);
});

test("tool names the model sends are only the toolset's own, not Object's", async () => {
  const call = (name: string, id: string) => ({ id, type: 'function' as const, function: { name, arguments: '{}' } });
  const api = fakeProvider([
    { role: 'assistant', content: null, stop: 'tool_use', tool_calls: [call('constructor', 'call_1'), call('toString', 'call_2')] },
    { role: 'assistant', content: 'Done.', stop: 'end' },
  ]);
  const { messages } = await new AgentLoop(api, {}).run({ model: 'm', input: [{ role: 'user', content: 'Go.' }] });
  assert.deepEqual(
    messages.filter((m) => m.role === 'tool').map((m) => m.content),
    ['Error: Unknown tool "constructor"', 'Error: Unknown tool "toString"'],
  );
});
