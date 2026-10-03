import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import {
  defineAgent,
  findInstructions,
  formatInstructions,
  Loop,
  MAX_INSTRUCTION_CHARS,
  SimpleUI,
  SubagentTool,
  type AssistantMessage,
  type Provider,
} from '../src/index.ts';

/** Writes `files` (path → content; a trailing `/` makes a directory) under a new temp directory. */
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'featherloop-instructions-'));
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('/')) mkdirSync(join(root, path), { recursive: true });
    else {
      mkdirSync(join(root, path, '..'), { recursive: true });
      writeFileSync(join(root, path), content);
    }
  }
  return root;
}

const paths = (root: string, options: Parameters<typeof findInstructions>[0]) =>
  findInstructions(options).map(({ path }) => path.slice(root.length + 1));

test('loads the global file, then one per directory from the git root down, AGENTS.md before CLAUDE.md', () => {
  const root = tree({
    'AGENTS.md': 'Above the repository.',
    'config/AGENTS.md': 'Mine.',
    'repo/.git/': '',
    'repo/AGENTS.md': 'Root.',
    'repo/CLAUDE.md': 'Not read: AGENTS.md is here.',
    'repo/a/CLAUDE.md': 'Only CLAUDE.md here.',
    'repo/a/b/AGENTS.md': '  \n',
    'repo/a/b/c/AGENTS.md/': '',
    'repo/a/b/c/CLAUDE.md': 'AGENTS.md is a directory.',
    'repo/a/b/c/d/': '',
  });
  const found = findInstructions({ cwd: join(root, 'repo/a/b/c/d'), global: join(root, 'config') });
  assert.deepEqual(
    found.map(({ path, content }) => [path.slice(root.length + 1), content]),
    [
      ['config/AGENTS.md', 'Mine.'],
      ['repo/AGENTS.md', 'Root.'],
      ['repo/a/CLAUDE.md', 'Only CLAUDE.md here.'],
      ['repo/a/b/c/CLAUDE.md', 'AGENTS.md is a directory.'],
    ],
  );
});

test('a .git file marks the root too; outside a repository only the cwd counts', () => {
  const root = tree({ 'AGENTS.md': 'Parent.', 'wt/.git': 'gitdir: elsewhere', 'wt/AGENTS.md': 'Worktree.', 'wt/sub/AGENTS.md': 'Sub.' });
  assert.deepEqual(paths(root, { cwd: join(root, 'wt/sub'), global: null }), ['wt/AGENTS.md', 'wt/sub/AGENTS.md']);
  const loose = tree({ 'AGENTS.md': 'Parent.', 'dir/AGENTS.md': 'Here.' });
  assert.deepEqual(paths(loose, { cwd: join(loose, 'dir'), global: null }), ['dir/AGENTS.md']);
});

test('formats files with their paths, cutting long ones', () => {
  assert.equal(formatInstructions([]), '');
  const root = tree({ '.git/': '', 'AGENTS.md': 'x'.repeat(MAX_INSTRUCTION_CHARS + 10) });
  const [file] = findInstructions({ cwd: root, global: null });
  assert.equal(file?.truncated, true);
  assert.equal(file?.content.length, MAX_INSTRUCTION_CHARS);
  const text = formatInstructions([{ path: '/r/AGENTS.md', content: 'Use pnpm.', truncated: false }, file!]);
  assert.match(text, /^Instructions from the user and the project follow/);
  assert.match(text, /\n\n<instructions path="\/r\/AGENTS.md">\nUse pnpm.\n<\/instructions>\n\n/);
  assert.match(text, /x\n\[Cut at 32000 characters; read the file for the rest.\]\n<\/instructions>$/);
});

test('agents append instructions unless they opt out', () => {
  const ctx = { cwd: '/r', date: '2026-10-03', model: 'm', instructions: 'Use pnpm.' };
  assert.equal(defineAgent({ name: 'a', system: ({ cwd }) => `In ${cwd}.` }).system(ctx), 'In /r.\n\nUse pnpm.');
  assert.equal(defineAgent({ name: 'b', system: 'Titles.', instructions: false }).system(ctx), 'Titles.');
  assert.equal(defineAgent({ name: 'c', system: 'Plain.' }).system({ ...ctx, instructions: '' }), 'Plain.');
});

test("subagents get instructions for the directory they work in", async () => {
  const say = (content: string): AssistantMessage => ({ role: 'assistant', content, stop: 'end' });
  const systems: unknown[] = [];
  const api: Provider = {
    name: 'fake',
    async turn(request) {
      systems.push(request.messages[0]?.content);
      return say('Done.');
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  };
  const tool = SubagentTool({
    agents: [defineAgent({ name: 'advisor', system: 'Advise.' })],
    tools: () => ({}),
    instructions: (cwd) => `Rules for ${cwd}.`,
    params: { cwd: { value: '/work' } },
  });
  await tool.invoke({ input: 'Review.' }, { api, model: 'm', messages: [] });
  assert.deepEqual(systems, ['Advise.\n\nRules for /work.']);
});

test('SimpleUI builds a function system prompt again for each new conversation', async () => {
  let built = 0;
  const api: Provider = { name: 'fake', turn: async () => ({ role: 'assistant', content: 'Hi.', stop: 'end' }), complete: async () => '' };
  const input = new PassThrough();
  const out = new PassThrough().resume();
  const chat = new SimpleUI(Loop(api), {
    model: 'm',
    system: () => `Prompt ${++built}.`,
    notes: ['instructions: AGENTS.md'],
    input,
    output: out as unknown as NodeJS.WriteStream,
  });
  assert.equal(built, 1);
  const done = chat.start();
  input.end('/c\n');
  await done;
  assert.equal(built, 2);
});
