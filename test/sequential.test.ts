import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  AgentLoop,
  ManagedFileTools,
  ShellTool,
  WriteTool,
  type AssistantMessage,
  type LoopOptions,
  type Provider,
  type Tool,
  type Toolset,
} from '../src/index.ts';

/** One turn calling the given tools in order, then a plain reply. */
function provider(calls: string[]): Provider {
  let turn = 0;
  return {
    name: 'fake',
    async turn() {
      turn++;
      const reply: AssistantMessage =
        turn === 1
          ? {
              role: 'assistant',
              content: null,
              stop: 'tool_use',
              tool_calls: calls.map((name, i) => ({ id: `c${i}`, type: 'function', function: { name, arguments: '{}' } })),
            }
          : { role: 'assistant', content: 'done', stop: 'end' };
      return reply;
    },
    async complete() {
      return '';
    },
  };
}

/** Tools that log when they start and finish; `ms` sets how long each takes. */
function timedTools(spec: Record<string, { ms: number; sequential?: boolean }>, log: string[]): Toolset {
  const tools: Toolset = {};
  for (const [name, { ms, sequential }] of Object.entries(spec)) {
    const tool: Tool = {
      schema: () => ({ description: name, parameters: { type: 'object', properties: {} } }),
      async invoke() {
        log.push(`${name}:start`);
        await sleep(ms);
        log.push(`${name}:end`);
        return name;
      },
    };
    if (sequential) tool.sequential = true;
    tools[name] = tool;
  }
  return tools;
}

async function run(calls: string[], tools: Toolset, options?: LoopOptions) {
  const loop = new AgentLoop(provider(calls), tools, options);
  const { messages } = await loop.run({ model: 'fake', input: [{ role: 'user', content: 'go' }] });
  return messages.filter((m) => m.role === 'tool').map((m) => m.content);
}

test('tool calls run concurrently by default', async () => {
  const log: string[] = [];
  const results = await run(['slow', 'fast'], timedTools({ slow: { ms: 30 }, fast: { ms: 1 } }, log));
  assert.deepEqual(log, ['slow:start', 'fast:start', 'fast:end', 'slow:end']);
  assert.deepEqual(results, ['slow', 'fast'], 'results keep the model order');
});

test('a sequential tool waits for earlier calls and blocks later ones', async () => {
  const log: string[] = [];
  const tools = timedTools({ a: { ms: 20 }, b: { ms: 5 }, s: { ms: 10, sequential: true }, c: { ms: 1 } }, log);
  const results = await run(['a', 'b', 's', 'c'], tools);
  assert.deepEqual(log, ['a:start', 'b:start', 'b:end', 'a:end', 's:start', 's:end', 'c:start', 'c:end']);
  assert.deepEqual(results, ['a', 'b', 's', 'c']);
});

test('sequentialTools runs every call in order', async () => {
  const log: string[] = [];
  await run(['slow', 'fast'], timedTools({ slow: { ms: 20 }, fast: { ms: 1 } }, log), { sequentialTools: true });
  assert.deepEqual(log, ['slow:start', 'slow:end', 'fast:start', 'fast:end']);
});

test('side-effecting tools are sequential by default, and it can be overridden', () => {
  assert.equal(ShellTool().sequential, true);
  assert.equal(WriteTool().sequential, true);
  assert.equal(ShellTool({ sequential: false }).sequential, false);

  const files = ManagedFileTools();
  assert.equal(files.read.sequential, undefined);
  assert.equal(files.write?.sequential, true);
  assert.equal(files.update?.sequential, true);
});
