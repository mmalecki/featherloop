import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Agent, defineAgent, type PermissionRule, type Tool, type Toolset } from '../src/index.ts';

// The toolset only needs names here; nothing gets invoked.
const tool = {} as Tool;
const available: Toolset = { read: tool, write: tool, update: tool, grep: tool, glob: tool, shell: tool, webfetch: tool };

const agent = (permissions?: PermissionRule[]) => defineAgent({ name: 'test', system: 'You test.', permissions });
const tools = (permissions?: PermissionRule[], extra?: PermissionRule[]) =>
  Object.keys(agent(permissions).toolset(available, extra)).sort();

test('allows every tool when no rule matches', () => {
  assert.deepEqual(tools(), ['glob', 'grep', 'read', 'shell', 'update', 'webfetch', 'write']);
  assert.deepEqual(tools([]), tools());
});

test('the last matching rule wins', () => {
  assert.deepEqual(tools([{ action: '*', effect: 'deny' }, { action: 'read', effect: 'allow' }]), ['read']);
  assert.deepEqual(tools([{ action: 'read', effect: 'allow' }, { action: '*', effect: 'deny' }]), []);
});

test('edit covers write and update', () => {
  assert.deepEqual(tools([{ action: 'edit', effect: 'deny' }]), ['glob', 'grep', 'read', 'shell', 'webfetch']);
  // The tools' own names aren't actions: write's action is edit.
  assert.throws(() => tools([{ action: 'write', effect: 'deny' }]), /Unknown action write/);
});

test('* matches any part of an action', () => {
  assert.deepEqual(tools([{ action: '*', effect: 'deny' }, { action: 'g*', effect: 'allow' }]), ['glob', 'grep']);
  // Only * is special: the dot in a pattern is literal.
  assert.deepEqual(tools([{ action: 'web.*', effect: 'deny' }]), tools());
});

test('extra rules come after the agent’s, so they win', () => {
  const general = [{ action: '*', effect: 'allow' }, { action: 'shell', effect: 'deny' }] satisfies PermissionRule[];
  assert.ok(!tools(general).includes('shell'));
  assert.ok(tools(general, [{ action: 'shell', effect: 'allow' }]).includes('shell'));
});

test('rejects actions no tool has, but not built-in actions whose tool is missing', () => {
  assert.throws(() => tools([{ action: 'shel', effect: 'deny' }]), /Unknown action shel; known actions: .*shell/);
  // websearch is a built-in action, though this toolset has no websearch tool.
  assert.deepEqual(tools([{ action: 'websearch', effect: 'deny' }]), tools());
});

test('rejects what OpenCode has but we do not: ask, resource, and other keys', () => {
  const define = (rule: unknown) => defineAgent({ name: 'x', system: '', permissions: [rule as PermissionRule] });
  assert.throws(() => define({ action: 'shell', effect: 'ask' }), /permission 1: ask isn't supported; use allow or deny/);
  assert.throws(() => define({ action: 'shell', resource: '*', effect: 'deny' }), /resource isn't supported/);
  assert.throws(() => define({ action: 'shell', effect: 'deny', note: 1 }), /unknown key note/);
  assert.throws(() => define({ action: 'shell', effect: 'block' }), /effect must be allow or deny/);
  assert.throws(() => define({ action: '', effect: 'deny' }), /action must be a non-empty string/);
  assert.throws(() => agent().toolset(available, [{ action: 'shell', effect: 'ask' } as never]), /Extra permission 1: ask/);
});

test('checks the name and system prompt', () => {
  assert.throws(() => defineAgent({ name: '', system: '' }), /needs a name/);
  assert.throws(() => defineAgent({ name: 'x', system: 1 as never }), /system must be a string or a function/);
});

test('system prompts can depend on where and when they run', () => {
  const ctx = { cwd: '/work', date: '2026-10-02', model: 'm' };
  assert.equal(agent().system(ctx), 'You test.');
  assert.equal(defineAgent({ name: 'x', system: ({ cwd, date }) => `${date} in ${cwd}` }).system(ctx), '2026-10-02 in /work');
});

test('is an Agent, and keeps its own copy of the rules', () => {
  const rules: PermissionRule[] = [{ action: 'shell', effect: 'deny' }];
  const a = defineAgent({ name: 'x', system: '', permissions: rules });
  assert.ok(a instanceof Agent);
  rules.push({ action: 'shell', effect: 'allow' });
  assert.deepEqual(a.permissions, [{ action: 'shell', effect: 'deny' }]);
});
