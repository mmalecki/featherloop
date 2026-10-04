import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advisorAgent,
  defineAgent,
  generalAgent,
  Loop,
  SubagentTool,
  type AssistantMessage,
  type PermissionRule,
  type Provider,
  type ResolvedModel,
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

test("default permissions apply to every subagent, under its own rules, and never allow nesting", async () => {
  const tools = () => ({ read: fixed('r'), shell: fixed('s'), subagent: fixed('nested') });
  const open = defineAgent({ name: 'open', system: 'You work.' });
  const careful = defineAgent({ name: 'careful', system: 'You check.', permissions: [{ action: 'shell', effect: 'deny' }] });
  const run = async (agent: string, permissions: PermissionRule[]) => {
    const api = fakeProvider(() => say('ok'));
    await SubagentTool({ agents: [open, careful], tools, permissions }).invoke({ agent, input: 'x' }, { api, model: 'm' });
    return api.requests[0]!.tools.map((t) => t.name);
  };
  assert.deepEqual(await run('open', []), ['read', 'shell']);
  assert.deepEqual(await run('open', [{ action: 'shell', effect: 'deny' }]), ['read']);
  // The agent's own deny wins over a default allow.
  assert.deepEqual(await run('careful', [{ action: '*', effect: 'allow' }]), ['read']);
  assert.deepEqual(await run('open', [{ action: '*', effect: 'allow' }]), ['read', 'shell']);
});

test('agents must be given, with unique names', () => {
  assert.throws(() => SubagentTool({ agents: [], tools: () => ({}) }), /at least one agent/);
  assert.throws(() => SubagentTool({ agents: [worker, worker], tools: () => ({}) }), /unique/);
});

test('runs an agent with its own model on it, counting its usage as the tool\'s', async () => {
  const advisor = defineAgent({ name: 'advisor', system: ({ model }) => `You advise, as ${model}.`, model: 'advisor' });
  const strong = fakeProvider(() => say('looks fine'));
  const resolved: string[] = [];
  const submodel = async (ref: string) => {
    resolved.push(ref);
    return { ref: 'big/claude', alias: ref, api: strong, model: 'claude' };
  };
  const parent = fakeProvider((request) => (request.messages.length === 2 ? call('subagent', { input: 'Check.' }) : say('done')));
  const events: { source: string; tool?: string | undefined; model: string }[] = [];
  const loop = Loop(parent, { subagent: SubagentTool({ agents: [advisor], tools: () => ({}) }) }, { submodel });
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

test("an agent with its own model fails when the caller's model has none", async () => {
  const advisor = defineAgent({ name: 'advisor', system: 'You advise.', model: 'advisor' });
  const parent = fakeProvider((request) => (request.messages.length === 2 ? call('subagent', { input: 'Check.' }) : say('done')));
  const loop = Loop(parent, { subagent: SubagentTool({ agents: [advisor], tools: () => ({}) }) }, { submodel: async () => undefined });
  const result = await loop.run({
    model: 'big',
    input: [
      { role: 'system', content: 'You lead.' },
      { role: 'user', content: 'Fix it.' },
    ],
  });
  assert.match(String(result.messages.find((m) => m.role === 'tool')?.content), /Agent advisor runs on advisor, which this model has none of/);
});

test('an agent with its own model needs a loop that can set it up', async () => {
  const advisor = defineAgent({ name: 'advisor', system: 'You advise.', model: 'advisor' });
  const { result, sub } = await delegate([call('subagent', { input: 'Check.' })], SubagentTool({ agents: [advisor], tools: () => ({}) }));
  assert.equal(sub.length, 0);
  assert.match(String(result.messages.find((m) => m.role === 'tool')?.content), /Agent advisor runs on advisor, but this loop can't set up other models/);
});

/**
 * Models named `ref` or `ref@variant`, each advised by the one `advisors` maps it
 * to. Each asks its advisor when it has one, then reports what it was told.
 */
function advisorChain(advisors: Record<string, string | null>) {
  const asked: string[] = [];
  const offered: Record<string, string[]> = {};
  const provider = (id: string): Provider => ({
    name: id,
    async turn(request, on) {
      on.usage?.({ input: 10, output: 1, cacheRead: 0, cacheWrite: 0 });
      offered[id] = request.tools.map(({ name }) => name);
      const last = request.messages.at(-1)!;
      if (last.role === 'tool') return say(`${id}: ${last.content}`);
      if (!offered[id].includes('subagent')) return say(`${id} ok`);
      asked.push(id);
      return call('subagent', { agent: 'advisor', input: 'Check.', transcript: true });
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  });
  const resolve = (id: string): ResolvedModel => {
    const [ref, variant] = id.split('@') as [string, string | undefined];
    return {
      ref,
      ...(variant ? { variant } : {}),
      api: provider(id),
      model: id,
      submodel: async (name) => (name === 'advisor' && advisors[id] ? resolve(advisors[id]) : undefined),
    };
  };
  return { asked, offered, resolve };
}

async function askAdvisors(advisors: Record<string, string | null>, from: string, options: { maxDepth?: number } = {}) {
  const { asked, offered, resolve } = advisorChain(advisors);
  const user = resolve(from);
  const tool = SubagentTool({ agents: [generalAgent, advisorAgent], tools: () => ({ read: fixed('x'), grep: fixed('x') }), ...options });
  const loop = Loop(user.api, { subagent: tool }, { submodel: user.submodel! });
  const calls: { name: string; parent?: string | undefined }[] = [];
  const usage: string[] = [];
  loop.on('tool_call', ({ name, parent }) => calls.push({ name, parent }));
  loop.on('usage', ({ model, source }) => usage.push(`${source} ${model}`));
  const result = await loop.run({ model: user.model, input: [{ role: 'user', content: 'Fix it.' }] });
  return { reply: result.message.content, asked, offered, calls, usage, total: result.usage };
}

test('an advisor asks its own advisor, until a model has none', async () => {
  const { reply, asked, offered, calls, usage, total } = await askAdvisors({ small: 'mid', mid: 'big', big: null }, 'small');
  assert.equal(reply, 'small: mid: big ok');
  assert.deepEqual(asked, ['small', 'mid']);
  // The advisors get only the advisor, and only while there's a stronger one.
  assert.deepEqual(offered, { small: ['subagent'], mid: ['read', 'grep', 'subagent'], big: ['read', 'grep'] });
  // The inner call shows under the outer one.
  assert.deepEqual(calls, [
    { name: 'subagent', parent: undefined },
    { name: 'subagent', parent: 'call_subagent' },
  ]);
  // Every model's usage counts as the outer call's.
  assert.deepEqual(usage, ['turn small', 'tool mid', 'tool big', 'tool mid', 'turn small']);
  assert.deepEqual(total, { input: 50, output: 5, cacheRead: 0, cacheWrite: 0 });
});

test('a chain of advisors ends at a model already on the task, even at another variant', async () => {
  // b's advisor is a, which is already advising.
  assert.equal((await askAdvisors({ small: 'a', a: 'b', b: 'a' }, 'small')).reply, 'small: a: b ok');
  // An advisor that is its own advisor has none.
  assert.equal((await askAdvisors({ small: 'x', x: 'x' }, 'small')).reply, 'small: x ok');
  // The same model at a higher effort is another model, though.
  const { reply } = await askAdvisors({ small: 'x@low', 'x@low': 'x@max', 'x@max': 'x@max' }, 'small');
  assert.equal(reply, 'small: x@low: x@max ok');
  // The user's own model may advise, as with a single advisor.
  assert.equal((await askAdvisors({ x: 'x' }, 'x')).reply, 'x: x ok');
});

test('advisors hand tasks on only as deep as allowed', async () => {
  const chain = { m0: 'm1', m1: 'm2', m2: 'm3', m3: 'm4', m4: 'm5' };
  assert.equal((await askAdvisors(chain, 'm0')).reply, 'm0: m1: m2: m3 ok');
  assert.equal((await askAdvisors(chain, 'm0', { maxDepth: 1 })).reply, 'm0: m1 ok');
});
