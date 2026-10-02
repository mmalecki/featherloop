import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  defineAgent,
  Loop,
  SubagentTool,
  type AssistantMessage,
  type PermissionRule,
  type Provider,
  type Tool,
  type Toolset,
  type TurnRequest,
} from '../src/index.ts';

/** A provider whose replies are computed from each request; every turn reports 10 in, 1 out. */
function fakeProvider(reply: (request: TurnRequest) => AssistantMessage): Provider & { requests: TurnRequest[] } {
  const requests: TurnRequest[] = [];
  return {
    name: 'fake',
    requests,
    async turn(request, on) {
      requests.push({ ...request, messages: [...request.messages] });
      on.usage?.({ input: 10, output: 1, cacheRead: 0, cacheWrite: 0 });
      return reply(request);
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  };
}

const call = (name: string, args: Record<string, unknown>, id = `call_${name}`): AssistantMessage => ({
  role: 'assistant',
  content: null,
  stop: 'tool_use',
  tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
});
const say = (content: string): AssistantMessage => ({ role: 'assistant', content, stop: 'end' });

const fixed = (result: string): Tool => ({
  schema: () => ({ description: result, parameters: { type: 'object', properties: {} } }),
  invoke: () => result,
});

const worker = defineAgent({ name: 'worker', description: 'Does the work', system: 'You work.' });
const reviewer = defineAgent({
  name: 'reviewer',
  description: 'Reviews, read-only',
  system: ({ cwd }) => `You review ${cwd}.`,
  permissions: [{ action: 'edit', effect: 'deny' }],
});
const isSubagent = (request: TurnRequest) => request.messages[0]?.content !== 'You lead.';

/** Runs a parent loop whose model makes `calls` first and then says "done"; the subagent says "found it". */
async function delegate(calls: AssistantMessage[], subagent: Tool, tools: Record<string, Tool> = {}) {
  let parentTurn = 0;
  const api = fakeProvider((request) => (isSubagent(request) ? say('found it') : (calls[parentTurn++] ?? say('done'))));
  const result = await Loop(api, { ...tools, subagent }).run({
    model: 'm',
    input: [
      { role: 'system', content: 'You lead.' },
      { role: 'user', content: 'Investigate the bug.' },
    ],
  });
  return { api, result, sub: api.requests.filter(isSubagent) };
}

const subagentTool = (tools: () => Toolset = () => ({})) => SubagentTool({ agents: [worker, reviewer], tools });

test('runs the task with the chosen agent and returns its reply', async () => {
  const tools = () => ({ read: fixed('r'), write: fixed('w'), update: fixed('u'), subagent: fixed('nested') });
  const tool = SubagentTool({ agents: [worker, reviewer], tools, params: { cwd: { value: '/repo' } } });
  const { result, sub } = await delegate([call('subagent', { agent: 'reviewer', input: 'Check main.js.' })], tool);

  assert.equal(sub.length, 1);
  assert.deepEqual(sub[0]!.messages, [
    { role: 'system', content: 'You review /repo.' },
    { role: 'user', content: 'Check main.js.' },
  ]);
  // The agent's permissions pick the tools, and subagents never get the subagent tool.
  assert.deepEqual(sub[0]!.tools.map((t) => t.name), ['read']);
  assert.equal(result.messages.find((m) => m.role === 'tool')?.content, 'found it');
  assert.equal(result.message.content, 'done');
});

test("counts the subagent's tokens in the caller's usage", async () => {
  const { result } = await delegate([call('subagent', { input: 'Look.' })], subagentTool());
  // Three turns: the call, the subagent's reply, and "done".
  assert.deepEqual(result.usage, { input: 30, output: 3, cacheRead: 0, cacheWrite: 0 });
});

test('defaults to the first agent, and lists the agents in the schema', async () => {
  const { sub } = await delegate([call('subagent', { input: 'Look.' })], subagentTool());
  assert.equal(sub[0]!.messages[0]!.content, 'You work.');

  const { parameters } = subagentTool().schema() as unknown as { parameters: { properties: Record<string, any>; required: string[] } };
  assert.deepEqual(parameters.properties.agent.enum, ['worker', 'reviewer']);
  assert.equal(parameters.properties.agent.default, 'worker');
  assert.match(parameters.properties.agent.description, /worker: Does the work; reviewer: Reviews, read-only/);
  assert.deepEqual(parameters.required, ['input']);
  assert.deepEqual(Object.keys(parameters.properties).sort(), ['agent', 'input', 'transcript']);
});

test('transcript passes on the conversation so far, but not the pending calls', async () => {
  const long = 'x'.repeat(3_000);
  const { sub } = await delegate(
    [
      call('read', { path: 'main.js' }),
      {
        role: 'assistant',
        content: 'Delegating the review.',
        stop: 'tool_use',
        tool_calls: [{ id: 'call_sub', type: 'function', function: { name: 'subagent', arguments: '{"input":"Review it.","transcript":true}' } }],
      },
    ],
    subagentTool(),
    { read: fixed(long) },
  );

  const task = sub[0]!.messages[1]!.content as string;
  assert.match(task, /^<transcript>\nUser: Investigate the bug\.\n\nAssistant called read\(\{"path":"main.js"\}\)\n\nResult of read: x{2000} \[… cut\]\n\nAssistant: Delegating the review\.\n<\/transcript>\n\n<task>\nReview it\.\n<\/task>$/);
  // Neither the parent's system prompt nor this call itself.
  assert.doesNotMatch(task, /You lead|subagent\(/);
});

test('bad calls come back to the model as errors', async () => {
  const { result } = await delegate(
    [call('subagent', { agent: 'boss', input: 'x' }, 'a'), call('subagent', { input: '  ' }, 'b')],
    subagentTool(),
  );
  const errors = result.messages.filter((m) => m.role === 'tool').map((m) => m.content);
  assert.deepEqual(errors, ['Error: Unknown agent "boss"; agents: worker, reviewer', 'Error: input must be a non-empty task']);

  // Outside a loop there is no conversation to pass on.
  await assert.rejects(
    Promise.resolve(subagentTool().invoke({ input: 'x', transcript: true }, { api: fakeProvider(() => say('')), model: 'm' })),
    /no conversation to pass on/,
  );
});

test('cuts long replies to maxLength, keeping the start', async () => {
  const api = fakeProvider(() => say('a'.repeat(50)));
  const tool = SubagentTool({ agents: [worker], tools: () => ({}), params: { maxLength: { value: 10 } } });
  assert.equal(await tool.invoke({ input: 'x' }, { api, model: 'm' }), `${'a'.repeat(10)}\n[… 40 more characters cut]`);
});

test('hides the agent choice when there is only one agent, but still describes it', () => {
  const { description, parameters } = SubagentTool({ agents: [worker], tools: () => ({}) }).schema() as unknown as {
    description: string;
    parameters: { properties: Record<string, unknown> };
  };
  assert.deepEqual(Object.keys(parameters.properties).sort(), ['input', 'transcript']);
  assert.match(description, /Agent: worker: Does the work\.$/);
  assert.doesNotMatch(subagentTool().schema().description, /Agent:/);
});

test("relays the subagent's tool calls under its own call, and counts its usage once", async () => {
  let subTurn = 0;
  let parentTurn = 0;
  const api = fakeProvider((request) =>
    isSubagent(request)
      ? [call('read', { path: 'a.js' }), say('found it')][subTurn++]!
      : [call('subagent', { input: 'Look.' }), say('done')][parentTurn++]!,
  );
  const loop = Loop(api, { subagent: SubagentTool({ agents: [worker], tools: () => ({ read: fixed('contents') }) }) });
  const events: string[] = [];
  loop.on('tool_call', ({ name, parent }) => events.push(`call ${name}${parent ? ` under ${parent}` : ''}`));
  loop.on('tool_result', ({ name, result, parent }) => events.push(`result ${name}${parent ? ` under ${parent}` : ''}: ${result}`));

  const { usage } = await loop.run({ model: 'm', input: [{ role: 'system', content: 'You lead.' }, { role: 'user', content: 'Go.' }] });
  assert.deepEqual(events, [
    'call subagent',
    'call read under call_subagent',
    'result read under call_subagent: contents',
    'result subagent: found it',
  ]);
  // Four turns: two of the parent's, two of the subagent's.
  assert.deepEqual(usage, { input: 40, output: 4, cacheRead: 0, cacheWrite: 0 });
});

test('extra permissions apply to every subagent, but never allow nesting', async () => {
  const tools = () => ({ read: fixed('r'), shell: fixed('s'), subagent: fixed('nested') });
  const careful = defineAgent({ name: 'careful', system: 'You work.', permissions: [{ action: 'shell', effect: 'deny' }] });
  const run = async (permissions: PermissionRule[]) => {
    const api = fakeProvider(() => say('ok'));
    await SubagentTool({ agents: [careful], tools, permissions }).invoke({ input: 'x' }, { api, model: 'm' });
    return api.requests[0]!.tools.map((t) => t.name);
  };
  assert.deepEqual(await run([]), ['read']);
  assert.deepEqual(await run([{ action: 'shell', effect: 'allow' }]), ['read', 'shell']);
  assert.deepEqual(await run([{ action: '*', effect: 'allow' }]), ['read', 'shell']);
});

test('agents must be given, with unique names', () => {
  assert.throws(() => SubagentTool({ agents: [], tools: () => ({}) }), /at least one agent/);
  assert.throws(() => SubagentTool({ agents: [worker, worker], tools: () => ({}) }), /unique/);
});

test('runs an agent with its own model on it, counting its usage as the tool\'s', async () => {
  const advisor = defineAgent({ name: 'advisor', system: ({ model }) => `You advise, as ${model}.`, model: 'advisor' });
  const strong = fakeProvider(() => say('looks fine'));
  const resolved: string[] = [];
  const models = async (ref: string) => {
    resolved.push(ref);
    return { ref: 'big/claude', alias: ref, api: strong, model: 'claude' };
  };
  const parent = fakeProvider((request) => (request.messages.length === 2 ? call('subagent', { input: 'Check.' }) : say('done')));
  const events: { source: string; tool?: string | undefined; model: string }[] = [];
  const loop = Loop(parent, { subagent: SubagentTool({ agents: [advisor], tools: () => ({}) }) }, { models });
  loop.on('usage', ({ source, tool, model }) => events.push({ source, tool, model }));
  const result = await loop.run({
    model: 'small',
    input: [
      { role: 'system', content: 'You lead.' },
      { role: 'user', content: 'Fix it.' },
    ],
  });

  assert.deepEqual(resolved, ['advisor']);
  assert.equal(strong.requests.length, 1);
  assert.equal(strong.requests[0]!.model, 'claude');
  assert.equal(strong.requests[0]!.messages[0]!.content, 'You advise, as claude.');
  assert.equal(result.messages.find((m) => m.role === 'tool')?.content, 'looks fine');
  assert.deepEqual(events, [
    { source: 'turn', tool: undefined, model: 'small' },
    { source: 'tool', tool: 'subagent', model: 'claude' },
    { source: 'turn', tool: undefined, model: 'small' },
  ]);
  assert.deepEqual(result.usage, { input: 30, output: 3, cacheRead: 0, cacheWrite: 0 });
});

test('an agent with its own model needs a loop that can set it up', async () => {
  const advisor = defineAgent({ name: 'advisor', system: 'You advise.', model: 'advisor' });
  const { result, sub } = await delegate([call('subagent', { input: 'Check.' })], SubagentTool({ agents: [advisor], tools: () => ({}) }));
  assert.equal(sub.length, 0);
  assert.match(String(result.messages.find((m) => m.role === 'tool')?.content), /Agent advisor runs on advisor, but this loop can't set up other models/);
});
