import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { Loop, Session, SessionError, SimpleUI, type AssistantMessage, type Message, type Provider, type Tool } from '../src/index.ts';

const root = () => mkdtempSync(join(tmpdir(), 'featherloop-sessions-'));
const say = (content: string): AssistantMessage => ({ role: 'assistant', content, stop: 'end' });
const call = (id: string): AssistantMessage => ({
  role: 'assistant',
  content: null,
  stop: 'tool_use',
  tool_calls: [{ id, type: 'function', function: { name: 'read', arguments: '{}' } }],
});
const fixed = (result: string): Tool => ({
  schema: () => ({ description: '', parameters: { type: 'object', properties: {} } }),
  invoke: () => result,
});

/** Replies in order, recording what each request sent; a function reply runs instead. */
function fake(replies: (AssistantMessage | (() => never))[]): Provider & { seen: Message[][] } {
  const seen: Message[][] = [];
  return {
    name: 'fake',
    seen,
    async turn(request) {
      seen.push([...request.messages]);
      const reply = replies.shift()!;
      return typeof reply === 'function' ? reply() : reply;
    },
    async complete() {
      throw new Error('complete() should not be called');
    },
  };
}

function ui(api: Provider, session: Session, system = 'You help.'): SimpleUI {
  const out = new PassThrough().resume();
  return new SimpleUI(Loop(api, { read: fixed('contents') }), { model: 'm', system, session, output: out as unknown as NodeJS.WriteStream });
}

test('saves nothing until the first message, then reopens with messages and model', () => {
  const dir = root();
  const session = Session.create({ root: dir, cwd: '/work', model: { ref: 'local/qwen' } });
  session.setModel({ ref: 'anthropic/claude-haiku-4-5', variant: 'fast' });
  assert.equal(session.stored, false);
  assert.equal(existsSync(join(dir, session.id)), false);

  session.append({ role: 'user', content: 'Hi.' }, say('Hello.'));
  assert.equal(session.stored, true);
  assert.equal(statSync(session.file).mode & 0o777, 0o600);
  assert.equal(statSync(session.dir).mode & 0o777, 0o700);

  const opened = Session.open(session.id.toUpperCase(), { root: dir });
  assert.equal(opened.id, session.id);
  assert.equal(opened.cwd, '/work');
  assert.deepEqual(opened.model, { ref: 'anthropic/claude-haiku-4-5', variant: 'fast' });
  assert.deepEqual(opened.messages, [{ role: 'user', content: 'Hi.' }, say('Hello.')]);
});

test('replays truncations and model switches', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  session.append({ role: 'user', content: 'One.' }, say('1'), { role: 'user', content: 'Two.' });
  session.truncate(2);
  session.truncate(5); // Nothing to drop: not written.
  session.setModel({ ref: 'big' });
  session.append({ role: 'user', content: 'Three.' });

  const opened = Session.open(session.id, { root: dir });
  assert.deepEqual(opened.messages, [{ role: 'user', content: 'One.' }, say('1'), { role: 'user', content: 'Three.' }]);
  assert.deepEqual(opened.model, { ref: 'big' });
  assert.equal(readFileSync(session.file, 'utf8').trimEnd().split('\n').length, 7);
});

test('cuts off a torn last line, so later appends start on a fresh line', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  session.append({ role: 'user', content: 'Hi.' });
  appendFileSync(session.file, '{"time":"2026-10-03T00:00:00Z","type":"mess');

  const opened = Session.open(session.id, { root: dir });
  assert.deepEqual(opened.messages, [{ role: 'user', content: 'Hi.' }]);
  opened.append(say('Hello.'));
  assert.deepEqual(Session.open(session.id, { root: dir }).messages, [{ role: 'user', content: 'Hi.' }, say('Hello.')]);

  // Cut just before the newline: the line is whole and stays.
  appendFileSync(session.file, JSON.stringify({ time: '2026-10-03T00:00:00Z', type: 'message', message: { role: 'user', content: 'More.' } }));
  Session.open(session.id, { root: dir }).append(say('Yes.'));
  assert.deepEqual(Session.open(session.id, { root: dir }).messages.slice(2), [{ role: 'user', content: 'More.' }, say('Yes.')]);
});

test('refuses a damaged file, a bad id and a missing session', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  session.append({ role: 'user', content: 'Hi.' }, say('Hello.'));
  writeFileSync(session.file, readFileSync(session.file, 'utf8').replace('"type":"message"', '"type":"mess'));
  assert.throws(() => Session.open(session.id, { root: dir }), (err) => err instanceof SessionError && /:2: not JSON/.test(err.message));
  assert.throws(() => Session.open('../../etc', { root: dir }), SessionError);
  assert.throws(() => Session.open(crypto.randomUUID(), { root: dir }), /No session/);
});

test('answers calls the session ended in, and saves those answers', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  const turn: AssistantMessage = {
    ...call('a'),
    tool_calls: [...call('a').tool_calls!, ...call('b').tool_calls!.map((c) => ({ ...c, id: 'b' }))],
  };
  session.append({ role: 'user', content: 'Read.' }, turn, { role: 'tool', tool_call_id: 'a', content: 'done' });

  const opened = Session.open(session.id, { root: dir });
  const last = opened.messages.at(-1)!;
  assert.equal(opened.messages.length, 4);
  assert.equal(last.role === 'tool' && last.tool_call_id, 'b');
  assert.deepEqual(Session.open(session.id, { root: dir }).messages, opened.messages);
});

test('SimpleUI saves each run as it goes and resumes with the saved system prompt', async () => {
  const dir = root();
  const first = Session.create({ root: dir });
  await ui(fake([call('c1'), say('It says contents.')]), first).ask('What does it say?');
  const conversation = [
    { role: 'system', content: 'You help.' },
    { role: 'user', content: 'What does it say?' },
    call('c1'),
    { role: 'tool', tool_call_id: 'c1', content: 'contents' },
    say('It says contents.'),
  ];
  assert.deepEqual(first.messages, conversation);

  const api = fake([say('Sure.')]);
  const resumed = ui(api, Session.open(first.id, { root: dir }), 'A newer prompt.');
  await resumed.ask('Thanks.');
  assert.deepEqual(api.seen[0], [...conversation, { role: 'user', content: 'Thanks.' }]);
  assert.deepEqual(Session.open(first.id, { root: dir }).messages, [...conversation, { role: 'user', content: 'Thanks.' }, say('Sure.')]);
});

test('SimpleUI drops a failed run from the session, as from its history', async () => {
  const dir = root();
  const session = Session.create({ root: dir });
  const chat = ui(
    fake([
      say('Hello.'),
      call('c1'),
      () => {
        throw new Error('overloaded');
      },
      say('Back.'),
    ]),
    session,
  );
  await chat.ask('Hi.');
  await chat.ask('Read it.');
  assert.equal(Session.open(session.id, { root: dir }).messages.length, 3);
  await chat.ask('Again?');
  assert.deepEqual(Session.open(session.id, { root: dir }).messages.slice(3), [{ role: 'user', content: 'Again?' }, say('Back.')]);
});

test('SimpleUI shows the last turn of a resumed session', async () => {
  const dir = root();
  const session = Session.create({ root: dir });
  session.append(
    { role: 'system', content: 'You help.' },
    { role: 'user', content: 'Hi.' },
    say('Hello.'),
    { role: 'user', content: 'What does\nit say?' },
    { ...call('c1'), content: 'Reading it.' },
    { role: 'tool', tool_call_id: 'c1', content: 'contents' },
    say('It says **contents**.'),
  );

  const input = new PassThrough();
  const out = new PassThrough();
  let output = '';
  out.on('data', (chunk) => (output += chunk));
  const chat = new SimpleUI(Loop(fake([])), { model: 'm', session: Session.open(session.id, { root: dir }), input, output: out as unknown as NodeJS.WriteStream });
  const done = chat.start();
  input.end();
  await done;

  const rule = '─'.repeat(80);
  assert.ok(
    output.includes(
      [`⏺ Resumed session ${session.id} (6 messages)`, rule, '❯ What does', '  it say?', rule, '', '⏺ It says contents.', '', rule].join('\n'),
    ),
    output,
  );
});
