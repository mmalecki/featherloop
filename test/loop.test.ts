import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentLoop, EVENT_PREFIX, type AssistantMessage } from '../src/loop.ts';
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

/** A toolset with one tool, `later`, that hands the loop work and returns at once. */
function backgroundTool(work: () => Promise<string>): Toolset {
  return {
    later: {
      schema: () => ({ description: 'Start something', parameters: { type: 'object', properties: {} } }),
      invoke: (_params, ctx) => {
        ctx.background!(work());
        return 'started';
      },
    },
  };
}

const callLater: AssistantMessage = {
  role: 'assistant',
  content: null,
  stop: 'tool_use',
  tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'later', arguments: '{}' } }],
};

test('waits for background work, and gives the model its event before ending', async () => {
  let finish!: (text: string) => void;
  const api = fakeProvider([
    callLater,
    { role: 'assistant', content: 'Waiting for it.', stop: 'end' },
    { role: 'assistant', content: 'It finished.', stop: 'end' },
  ]);
  const loop = new AgentLoop(api, backgroundTool(() => new Promise((resolve) => (finish = resolve))));
  const waits: number[] = [];
  loop.on('waiting', (count) => {
    waits.push(count);
    finish('the work is done');
  });

  const { message, messages } = await loop.run({ model: 'm', input: [{ role: 'user', content: 'Go.' }] });

  assert.deepEqual(waits, [1]);
  assert.equal(message.content, 'It finished.');
  assert.deepEqual(messages.at(-2), { role: 'user', content: `${EVENT_PREFIX} the work is done` });
  assert.equal(api.requests.length, 3);
  assert.equal(loop.backgroundCount, 0);
});

test('an event that comes before the next turn is sent with it, without waiting', async () => {
  const api = fakeProvider([
    callLater,
    { role: 'assistant', content: 'Thinking.', stop: 'end' },
    { role: 'assistant', content: 'Done.', stop: 'end' },
  ]);
  const loop = new AgentLoop(api, backgroundTool(async () => 'quick'));
  let waited = false;
  loop.on('waiting', () => (waited = true));

  const { messages } = await loop.run({ model: 'm', input: [{ role: 'user', content: 'Go.' }] });

  // Settled before the second turn ended: queued, so no waiting.
  assert.equal(waited, false);
  assert.deepEqual(
    messages.filter((m) => m.role === 'user').map((m) => m.content),
    ['Go.', `${EVENT_PREFIX} quick`],
  );
});

test('a message queued while waiting starts a turn; the run still waits for the work', async () => {
  let finish!: (text: string) => void;
  const api = fakeProvider([
    callLater,
    { role: 'assistant', content: 'Waiting.', stop: 'end' },
    { role: 'assistant', content: 'Still waiting.', stop: 'end' },
    { role: 'assistant', content: 'Done.', stop: 'end' },
  ]);
  const loop = new AgentLoop(api, backgroundTool(() => new Promise((resolve) => (finish = resolve))));
  let waits = 0;
  loop.on('waiting', () => {
    if (++waits === 1) loop.queue('How is it going?');
    else finish('done');
  });

  const { messages } = await loop.run({ model: 'm', input: [{ role: 'user', content: 'Go.' }] });

  assert.equal(waits, 2);
  assert.deepEqual(
    messages.filter((m) => m.role === 'user').map((m) => m.content),
    ['Go.', 'How is it going?', `${EVENT_PREFIX} done`],
  );
});

test('failed background work is reported as an event', async () => {
  const api = fakeProvider([callLater, { role: 'assistant', content: 'Hm.', stop: 'end' }, { role: 'assistant', content: 'Ok.', stop: 'end' }]);
  const loop = new AgentLoop(api, backgroundTool(async () => Promise.reject(new Error('disk full'))));
  const { messages } = await loop.run({ model: 'm', input: [{ role: 'user', content: 'Go.' }] });
  assert.ok(messages.some((m) => m.content === `${EVENT_PREFIX} Background work failed: disk full`));
});

test('an abort ends a waiting run, and what the work reports after is dropped', async () => {
  let finish!: (text: string) => void;
  const api = fakeProvider([callLater, { role: 'assistant', content: 'Waiting.', stop: 'end' }]);
  const loop = new AgentLoop(api, backgroundTool(() => new Promise((resolve) => (finish = resolve))));
  const abort = new AbortController();
  loop.on('waiting', () => abort.abort(new Error('stop')));

  await assert.rejects(loop.run({ model: 'm', input: [{ role: 'user', content: 'Go.' }], signal: abort.signal }), /stop/);
  finish('too late');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(loop.backgroundCount, 0);
  // Nothing left queued for the next run.
  const next = fakeProvider([{ role: 'assistant', content: 'Hi.', stop: 'end' }]);
  const { messages } = await loop.run({ model: 'm', input: [{ role: 'user', content: 'Hello.' }], api: next });
  assert.deepEqual(messages.map((m) => m.content), ['Hello.', 'Hi.']);
});
