import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { after, before, test } from 'node:test';
import { ChatInput, InputFilter, legacyKeys } from '../src/chat-input.ts';

// ChatInput falls back to plain lines on a dumb terminal.
const term = process.env.TERM;
before(() => void (process.env.TERM = 'xterm-256color'));
after(() => void (term === undefined ? delete process.env.TERM : (process.env.TERM = term)));

const tick = () => new Promise((resolve) => setImmediate(resolve));

/** Runs chunks through a filter that folds every paste into `<paste>`. */
async function filter(...chunks: string[]): Promise<{ out: string; pastes: string[] }> {
  const pastes: string[] = [];
  const filter = new InputFilter(undefined, (text) => (pastes.push(text), '<paste>'));
  let out = '';
  filter.on('data', (chunk) => (out += chunk));
  for (const chunk of chunks) filter.write(chunk);
  filter.end();
  await tick();
  return { out, pastes };
}

test('kitty keys go back to legacy bytes, but Shift+Enter becomes Alt+Enter', () => {
  assert.equal(legacyKeys('a\x1b[13;2ub'), 'a\x1b\rb');
  assert.equal(legacyKeys('\x1b[99;5u'), '\x03'); // Ctrl+C
  assert.equal(legacyKeys('\x1b[106;5u'), '\n'); // Ctrl+J
  assert.equal(legacyKeys('\x1b[27u'), '\x1b'); // Escape
  assert.equal(legacyKeys('\x1b[97;3u'), '\x1ba'); // Alt+A
  assert.equal(legacyKeys('\x1b[97;7u'), '\x1b\x01'); // Ctrl+Alt+A
  assert.equal(legacyKeys('\x1b[13;3u'), '\x1b\r'); // Alt+Enter
  assert.equal(legacyKeys('\x1b[57376u'), ''); // F13: no legacy bytes
  assert.equal(legacyKeys('\x1b[57414;2u'), '\x1b\r'); // Shift+keypad Enter
  // Not kitty's: arrows and other CSI sequences pass.
  assert.equal(legacyKeys('\x1b[A\x1b[1;5C'), '\x1b[A\x1b[1;5C');
  // Event types and alternates, which readline would type out ("1D"): dropped; releases too.
  assert.equal(legacyKeys('\x1b[1;1:1D'), '\x1b[1D');
  assert.equal(legacyKeys('\x1b[1;9:2C'), '\x1b[1C');
  assert.equal(legacyKeys('\x1b[1;1:3D'), '');
  assert.equal(legacyKeys('\x1b[3;5:1~'), '\x1b[3;5~');
  // Num Lock (128) and Caps Lock (64) are in the modifiers; readline would type "29D".
  assert.equal(legacyKeys('\x1b[1;129D\x1b[1;129C\x1b[1;129A\x1b[1;129B'), '\x1b[1D\x1b[1C\x1b[1A\x1b[1B');
  assert.equal(legacyKeys('\x1b[1;133D'), '\x1b[1;5D'); // Ctrl+Left with Num Lock
  assert.equal(legacyKeys('\x1b[1;193:2C'), '\x1b[1C');
  assert.equal(legacyKeys('\x1b[1:9D'), '\x1b[1D'); // alternates, no modifiers
  assert.equal(legacyKeys('\x1b[1:2;9:1C'), '\x1b[1C');
});

test('the filter passes keys through and hands pastes to fold, whole', async () => {
  assert.deepEqual(await filter('hello\r'), { out: 'hello\r', pastes: [] });
  assert.deepEqual(await filter('a\x1b[200~one\rtwo\x1b[201~b'), { out: 'a<paste>b', pastes: ['one\rtwo'] });
  // Markers and pastes split across chunks.
  assert.deepEqual(await filter('a\x1b[20', '0~one\r', 'two\x1b[2', '01~b'), { out: 'a<paste>b', pastes: ['one\rtwo'] });
  // Kitty keys in a paste are text.
  assert.deepEqual(await filter('\x1b[200~\x1b[99;5u\x1b[201~\x1b[99;5u'), { out: '<paste>\x03', pastes: ['\x1b[99;5u'] });
  // An unfinished paste is folded at the end.
  assert.deepEqual(await filter('\x1b[200~one'), { out: '<paste>', pastes: ['one'] });
});

test("the filter doesn't hold back a lone Escape as half a marker", async () => {
  const filter = new InputFilter(undefined, (text) => text);
  let out = '';
  filter.on('data', (chunk) => (out += chunk));
  filter.write('\x1b');
  await tick();
  assert.equal(out, '\x1b');
});

/** A ChatInput on a fake terminal, with what it sends and writes. */
function chat() {
  const input = Object.assign(new PassThrough(), {
    isTTY: true,
    isRaw: false,
    setRawMode(mode: boolean) {
      input.isRaw = mode;
      return input;
    },
  });
  const output = Object.assign(new PassThrough(), { isTTY: true, columns: 80, rows: 24 });
  let screen = '';
  output.on('data', (chunk) => (screen += chunk));
  const ui = new ChatInput({ input, output: output as unknown as NodeJS.WriteStream, prompt: '> ' });
  const lines: string[] = [];
  ui.on('line', (line) => lines.push(line));
  ui.prompt();
  const type = async (keys: string) => {
    input.write(keys);
    await tick();
    await tick();
  };
  return { ui, input, lines, type, screen: () => screen };
}

test('messages span lines: Shift+Enter, Alt+Enter, Ctrl+J and a trailing backslash', async () => {
  const { ui, input, lines, type } = chat();
  assert.equal(input.isRaw, true);
  await type('one\x1b[13;2utwo\r');
  await type('three\x1b\rfour\r');
  await type('five\nsix\r');
  await type('seven\\\reight\r');
  await type('.env is missing\r');
  assert.deepEqual(lines, ['one\ntwo', 'three\nfour', 'five\nsix', 'seven\neight', '.env is missing']);
  ui.close();
  // The REPL closes on the next tick.
  await tick();
  assert.equal(input.isRaw, false);
});

test('short pastes land as lines to edit; long ones as a placeholder, expanded when sent', async () => {
  const { ui, lines, type, screen } = chat();
  await type('\x1b[200~p1\r\r  p3\r\x1b[201~more\r');
  assert.deepEqual(lines, ['p1\n\n  p3\nmore']);

  const long = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\r');
  await type(`see \x1b[200~${long}\x1b[201~ end`);
  assert.equal(ui.line, 'see [paste #1 +30 lines] end');
  assert.match(screen(), /\[paste #1 \+30 lines\]/);
  await type('\r');
  assert.equal(lines[1], `see ${long.replaceAll('\r', '\n')} end`);

  // An edited placeholder is plain text.
  await type(`\x1b[200~${long}\x1b[201~\x7f\r`);
  assert.equal(lines[2], '[paste #2 +30 lines');
  ui.close();
});

test('output goes above the input, a whole line at a time', async () => {
  const { ui, type, screen } = chat();
  await type('draft');
  const before = screen().length;
  ui.write('partial');
  assert.equal(screen().length, before);
  ui.write(' line\nnext');
  const after = screen().slice(before);
  // The input erased, the line written, the input drawn again below it.
  assert.match(after, /\x1b\[0J/);
  assert.ok(after.indexOf('partial line\n') < after.lastIndexOf('> draft'));
  assert.equal(ui.line, 'draft');
  ui.close();
  await tick();
  // What's still held comes out on close, below the input.
  assert.match(screen(), /> draft[^]*\nnext/);
  // And writes after it go straight out.
  ui.write('after\n');
  assert.ok(screen().endsWith('after\n'));
});

test("messages go out after the REPL's eval, outside its domain", async () => {
  const { ui, type } = chat();
  let domain: unknown = 'unset';
  ui.on('line', () => (domain = (process as { domain?: unknown }).domain));
  await type('hello\r');
  assert.equal(domain, undefined);
  ui.close();
});

test('an Enter swallowed by readline leaves no newline behind for the next one', async () => {
  const { ui, lines, type } = chat();
  // \r\n together is one Enter to readline: the \n (Ctrl+J's key) doesn't break the line.
  await type('one\r\n');
  await type('two\r');
  assert.deepEqual(lines, ['one', 'two']);
  ui.close();
});

test('Ctrl+C is the UI\'s to handle; clear empties the input', async () => {
  const { ui, type } = chat();
  let interrupts = 0;
  ui.on('SIGINT', () => interrupts++);
  await type('typed\x1b[13;2umore');
  await type('\x1b[99;5u');
  assert.equal(interrupts, 1);
  assert.equal(ui.line, 'typed\nmore');
  ui.clear();
  assert.equal(ui.line, '');
  ui.close();
});

test('elsewhere, each line is a message', async () => {
  const input = new PassThrough();
  const ui = new ChatInput({ input, output: new PassThrough() as unknown as NodeJS.WriteStream, prompt: '> ' });
  const lines: string[] = [];
  ui.on('line', (line) => lines.push(line));
  input.write('one\\\ntwo\n');
  await tick();
  assert.deepEqual(lines, ['one\\', 'two']);
  ui.close();
});
