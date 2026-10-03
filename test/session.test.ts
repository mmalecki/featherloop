import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { hostname, tmpdir } from 'node:os';
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

  const opened = Session.read(session.id.toUpperCase(), { root: dir });
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

  const opened = Session.read(session.id, { root: dir });
  assert.deepEqual(opened.messages, [{ role: 'user', content: 'One.' }, say('1'), { role: 'user', content: 'Three.' }]);
  assert.deepEqual(opened.model, { ref: 'big' });
  assert.equal(readFileSync(session.file, 'utf8').trimEnd().split('\n').length, 7);
});

test('cuts off a torn last line, so later appends start on a fresh line', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  session.append({ role: 'user', content: 'Hi.' });
  appendFileSync(session.file, '{"time":"2026-10-03T00:00:00Z","type":"mess');
  const torn = readFileSync(session.file, 'utf8');
  session.close();

  const opened = Session.open(session.id, { root: dir });
  assert.equal(readFileSync(session.file, 'utf8'), torn, 'opening alone changes nothing');
  assert.deepEqual(opened.messages, [{ role: 'user', content: 'Hi.' }]);
  opened.append(say('Hello.'));
  opened.close();
  assert.deepEqual(Session.read(session.id, { root: dir }).messages, [{ role: 'user', content: 'Hi.' }, say('Hello.')]);

  // Cut just before the newline: the line is whole and stays.
  appendFileSync(session.file, JSON.stringify({ time: '2026-10-03T00:00:00Z', type: 'message', message: { role: 'user', content: 'More.' } }));
  Session.open(session.id, { root: dir }).append(say('Yes.'));
  assert.deepEqual(Session.read(session.id, { root: dir }).messages.slice(2), [{ role: 'user', content: 'More.' }, say('Yes.')]);
});

test('refuses a damaged file, a bad id and a missing session', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  session.append({ role: 'user', content: 'Hi.' }, say('Hello.'));
  session.close();
  writeFileSync(session.file, readFileSync(session.file, 'utf8').replace('"type":"message"', '"type":"mess'));
  assert.throws(() => Session.open(session.id, { root: dir }), (err) => err instanceof SessionError && /:2: not JSON/.test(err.message));
  assert.equal(existsSync(join(session.dir, 'lock')), false, 'a failed open lets go of the lock');
  assert.throws(() => Session.open('../../etc', { root: dir }), SessionError);
  assert.throws(() => Session.open(crypto.randomUUID(), { root: dir }), /No session/);
  const id = crypto.randomUUID();
  mkdirSync(join(dir, id, 'session.jsonl'), { recursive: true });
  assert.throws(() => Session.open(id, { root: dir }), (err) => err instanceof SessionError && /Can't read/.test(err.message));
});

test('answers calls the session ended in, saving the answers with the next write', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  const turn: AssistantMessage = {
    ...call('a'),
    tool_calls: [...call('a').tool_calls!, ...call('b').tool_calls!.map((c) => ({ ...c, id: 'b' }))],
  };
  session.append({ role: 'user', content: 'Read.' }, turn, { role: 'tool', tool_call_id: 'a', content: 'done' });

  session.close();
  const before = readFileSync(session.file, 'utf8');
  const opened = Session.open(session.id, { root: dir });
  const last = opened.messages.at(-1)!;
  assert.equal(opened.messages.length, 4);
  assert.equal(last.role === 'tool' && last.tool_call_id, 'b');
  assert.equal(readFileSync(session.file, 'utf8'), before);

  opened.append({ role: 'user', content: 'Go on.' });
  const lines = readFileSync(session.file, 'utf8').trimEnd().split('\n');
  assert.equal(lines.length, 6);
  assert.deepEqual(Session.read(session.id, { root: dir }).messages, opened.messages);
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
  first.close();
  const resumed = ui(api, Session.open(first.id, { root: dir }), 'A newer prompt.');
  await resumed.ask('Thanks.');
  assert.deepEqual(api.seen[0], [...conversation, { role: 'user', content: 'Thanks.' }]);
  assert.deepEqual(Session.read(first.id, { root: dir }).messages, [...conversation, { role: 'user', content: 'Thanks.' }, say('Sure.')]);
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
  assert.equal(Session.read(session.id, { root: dir }).messages.length, 3);
  await chat.ask('Again?');
  assert.deepEqual(Session.read(session.id, { root: dir }).messages.slice(3), [{ role: 'user', content: 'Again?' }, say('Back.')]);
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
  session.close();

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

test('SimpleUI keeps working when saving fails, and stops saving', async () => {
  // Sessions can't be kept under a file.
  const blocker = join(root(), 'file');
  writeFileSync(blocker, '');
  const session = Session.create({ root: blocker });
  const out = new PassThrough();
  let output = '';
  out.on('data', (chunk) => (output += chunk));
  const api = fake([say('Hello.'), say('Again.')]);
  const chat = new SimpleUI(Loop(api), { model: 'm', session, output: out as unknown as NodeJS.WriteStream });

  await chat.ask('Hi.');
  await chat.ask('More?');
  assert.equal(output.match(/Session not saved from here on: ENOTDIR/g)?.length, 1, output);
  assert.equal(chat.session, undefined);
  // Both runs went through, the second with the first in its history.
  assert.deepEqual(api.seen[1], [{ role: 'user', content: 'Hi.' }, say('Hello.'), { role: 'user', content: 'More?' }]);
});

test('one process at a time: a session is locked from its first write, or from open(), until closed', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  const lock = join(session.dir, 'lock');
  session.setModel({ ref: 'm' });
  assert.equal(existsSync(lock), false);
  session.append({ role: 'user', content: 'Hi.' });
  assert.deepEqual(JSON.parse(readFileSync(lock, 'utf8')), { pid: process.pid, host: hostname() });
  assert.equal(statSync(lock).mode & 0o777, 0o600);

  assert.throws(() => Session.open(session.id, { root: dir }), /already open in this process/);
  const look = Session.read(session.id, { root: dir });
  assert.deepEqual(look.messages, session.messages);
  assert.throws(() => look.append(say('No.')), /opened with read\(\)/);

  session.close();
  assert.equal(existsSync(lock), false);
  assert.throws(() => session.append(say('No.')), /is closed/);
  const opened = Session.open(session.id, { root: dir });
  assert.equal(existsSync(lock), true);
  opened.close();
  assert.equal(existsSync(lock), false);
});

test('takes over a lock whose process is gone, but not a running one or one from another host', () => {
  const dir = root();
  const session = Session.create({ root: dir });
  session.append({ role: 'user', content: 'Hi.' });
  session.close();
  const lock = join(session.dir, 'lock');
  const holder = (pid: number | undefined, host = hostname()) => writeFileSync(lock, JSON.stringify({ pid, host }));

  holder(process.ppid);
  assert.throws(() => Session.open(session.id, { root: dir }), new RegExp(`open in another featherloop \\(pid ${process.ppid}\\)`));
  holder(1, 'elsewhere');
  assert.throws(() => Session.open(session.id, { root: dir }), (err) => err instanceof SessionError && err.message.includes(`on elsewhere (pid 1); if it isn't any more, delete ${lock}`));

  holder(spawnSync(process.execPath, ['-e', '']).pid);
  Session.open(session.id, { root: dir }).close();
  writeFileSync(lock, 'damaged');
  Session.open(session.id, { root: dir }).close();
});

test('a process lets go of its sessions when it exits', () => {
  const dir = root();
  const script = `
    import { Session } from ${JSON.stringify(new URL('../src/session.ts', import.meta.url).href)};
    const session = Session.create({ root: ${JSON.stringify(dir)} });
    session.append({ role: 'user', content: 'Hi.' });
    console.log(session.id);
  `;
  const id = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }).trim();
  assert.equal(existsSync(join(dir, id, 'session.jsonl')), true);
  assert.equal(existsSync(join(dir, id, 'lock')), false);
});

test('SimpleUI lets go of a session on /c', async () => {
  const dir = root();
  const session = Session.create({ root: dir });
  const input = new PassThrough();
  const chat = new SimpleUI(Loop(fake([say('Hello.')])), { model: 'm', session, input, output: new PassThrough().resume() as unknown as NodeJS.WriteStream });
  await chat.ask('Hi.');
  assert.equal(existsSync(join(session.dir, 'lock')), true);
  const done = chat.start();
  input.end('/c\n');
  await done;
  assert.equal(existsSync(join(session.dir, 'lock')), false);
  assert.notEqual(chat.session?.id, session.id);
});
