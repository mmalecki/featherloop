import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import {
  defineAgent,
  Loop,
  SimpleUI,
  SubagentTool,
  type AssistantMessage,
  type Provider,
  type Tool,
} from '../src/index.ts';

const call = (name: string, args: object, id: string): AssistantMessage => ({
  role: 'assistant',
  content: null,
  stop: 'tool_use',
  tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
});
const say = (content: string): AssistantMessage => ({ role: 'assistant', content, stop: 'end' });
const fixed = (result: string): Tool => ({
  schema: () => ({ description: '', parameters: { type: 'object', properties: {} } }),
  invoke: () => result,
});

test("shows a subagent's tool calls under its own call", async () => {
  // The subagent's calls reuse the parent's ids, as separate conversations may.
  const parent = [call('subagent', { input: 'Find the bug in main.js.' }, 'call_1'), say('Line 3.')];
  const sub = [call('read', { path: 'main.js' }, 'call_1'), call('grep', { search: 'total' }, 'call_2'), say('Line 3: off by one.')];
  const api: Provider = {
    name: 'fake',
    async turn(request) {
      return (request.messages[0]?.content === 'You lead.' ? parent : sub).shift()!;
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  };
  const tools = () => ({ read: fixed('const a = 1;\nlet total = a + 1;'), grep: fixed('main.js:2:let total = a + 1;') });
  const worker = defineAgent({ name: 'general', system: 'You work.' });
  const loop = Loop(api, { ...tools(), subagent: SubagentTool({ agents: [worker], tools }) });

  // Not a TTY, so no colors.
  const out = new PassThrough();
  let output = '';
  out.on('data', (chunk) => (output += chunk));
  await new SimpleUI(loop, { model: 'm', system: 'You lead.', output: out as unknown as NodeJS.WriteStream }).ask('Investigate.');

  assert.equal(
    output.trim(),
    [
      '⏺ Subagent(Find the bug in main.js.)',
      '  ⏺ Read(main.js)',
      '    ⎿  const a = 1; … +1 lines',
      '  ⏺ Grep(total)',
      '    ⎿  main.js:2:let total = a + 1;',
      '  ⎿  Subagent(Find the bug in main.js.) Line 3: off by one.',
    ].join('\n'),
  );
});

test('names the subagent when parallel subagents interleave', async () => {
  const parent = [
    {
      role: 'assistant',
      content: null,
      stop: 'tool_use',
      tool_calls: ['a', 'b'].map((x) => ({
        id: `call_${x}`,
        type: 'function' as const,
        function: { name: 'subagent', arguments: JSON.stringify({ input: `Read ${x}.js.` }) },
      })),
    } satisfies AssistantMessage,
    say('Both read.'),
  ];
  const subs: Record<string, AssistantMessage[]> = {
    a: [call('read', { path: 'a.js' }, 'call_1'), say('A done.')],
    b: [call('read', { path: 'b.js' }, 'call_1'), say('B done.')],
  };
  const api: Provider = {
    name: 'fake',
    async turn(request) {
      if (request.messages[0]?.content === 'You lead.') return parent.shift()!;
      const which = /Read (\w)/.exec(String(request.messages[1]?.content))![1]!;
      // a is slower, so b's call comes first, then a's: the order that misled without names.
      await new Promise((resolve) => setTimeout(resolve, which === 'a' ? 30 : 0));
      return subs[which]!.shift()!;
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  };
  const tools = () => ({ read: fixed('ok') });
  const worker = defineAgent({ name: 'general', system: 'You work.' });
  const loop = Loop(api, { subagent: SubagentTool({ agents: [worker], tools }) });

  const out = new PassThrough();
  let output = '';
  out.on('data', (chunk) => (output += chunk));
  await new SimpleUI(loop, { model: 'm', system: 'You lead.', output: out as unknown as NodeJS.WriteStream }).ask('Go.');

  assert.equal(
    output.trim(),
    [
      '⏺ Subagent(Read a.js.)',
      '',
      '⏺ Subagent(Read b.js.)',
      '  ⏺ Read(b.js)',
      '    ⎿  ok',
      '  ⎿  Subagent(Read b.js.) B done.',
      '  ⏺ Read(a.js) · in Subagent(Read a.js.)',
      '    ⎿  ok',
      '  ⎿  Subagent(Read a.js.) A done.',
    ].join('\n'),
  );
});

test('/model switches providers mid-conversation, keeping the history', async () => {
  const seen: { provider: string; model: string; messages: number; tool?: string }[] = [];
  const fake = (name: string, replies: AssistantMessage[]): Provider => ({
    name,
    async turn(request, on) {
      seen.push({ provider: name, model: request.model, messages: request.messages.length });
      const reply = replies.shift()!;
      if (typeof reply.content === 'string') on.content(reply.content);
      return reply;
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  });
  const local = fake('local', [say('Hi from local.')]);
  const remote = fake('remote', [call('probe', {}, 'call_1'), say('Hi from remote.')]);
  // Records which provider a tool gets in its context.
  const probe: Tool = {
    schema: () => ({ description: '', parameters: { type: 'object', properties: {} } }),
    invoke: (_, ctx) => ((seen.at(-1)!.tool = ctx.api.name), 'probed'),
  };
  const models = { local, remote };
  const resolveModel = async (ref: string, variant: string | undefined) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const [provider, model] = ref.split('/') as [keyof typeof models, string];
    if (!models[provider]) throw new Error(`Unknown provider in "${ref}"`);
    return { ref, api: models[provider], model, ...(variant ? { variant } : {}) };
  };

  const input = new PassThrough();
  const out = new PassThrough();
  let output = '';
  out.on('data', (chunk) => (output += chunk));
  const ui = new SimpleUI(Loop(local, { probe }), {
    model: await resolveModel('local/qwen', undefined),
    resolveModel,
    system: 'You lead.',
    input: input as unknown as NodeJS.ReadableStream,
    output: out as unknown as NodeJS.WriteStream,
  });
  const done = ui.start();
  const until = async (text: string) => {
    for (let i = 0; !output.includes(text); i++) {
      if (i > 200) throw new Error(`Never saw ${text}; output:\n${output}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  };

  input.write('Hello.\n');
  await until('Hi from local.');
  input.write('/model nowhere/x\n');
  await until('Unknown provider in "nowhere/x"');
  // Typed together: the prompt waits for the switch.
  input.write('/model remote/claude xhigh\nHello again.\n');
  await until('Hi from remote.');
  assert.match(output, /Model: remote\/claude \(xhigh\)/);
  assert.equal(ui.model, 'claude');
  input.end();
  await done;

  assert.deepEqual(seen, [
    { provider: 'local', model: 'qwen', messages: 2 },
    // System, both user messages and local's reply; the tool got remote too.
    { provider: 'remote', model: 'claude', messages: 4, tool: 'remote' },
    { provider: 'remote', model: 'claude', messages: 6 },
  ]);
  assert.match(output, /featherslop \| local\/qwen \|/);
});

test('a run started during a switch waits for it', async () => {
  const providers: string[] = [];
  const fake = (name: string): Provider => ({
    name,
    async turn() {
      providers.push(name);
      return say('ok');
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  });
  const models = { local: fake('local'), remote: fake('remote') };
  const resolveModel = async (ref: string) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { ref, api: models[ref as keyof typeof models], model: ref };
  };
  const ui = new SimpleUI(Loop(models.local), {
    model: 'local',
    resolveModel,
    output: new PassThrough() as unknown as NodeJS.WriteStream,
  });

  // Not awaited: the run must still go to the new model.
  const switched = ui.switchModel('remote');
  await ui.ask('Hi.');
  await switched;
  assert.deepEqual(providers, ['remote']);
  assert.equal(ui.model, 'remote');
});
