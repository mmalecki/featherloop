import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { ShellTool, type Provider, type ToolContext } from '../src/index.ts';

const ctx: ToolContext = { api: {} as Provider, model: 'test' };

// The tool writes output files to os.tmpdir(), which follows $TMPDIR; a directory
// of our own shows exactly which files it leaves behind.
let dir: string;
let previous: string | undefined;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'featherloop-shell-test-'));
  previous = process.env.TMPDIR;
  process.env.TMPDIR = dir;
});
after(async () => {
  if (previous === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = previous;
  await rm(dir, { recursive: true, force: true });
});

async function shell(command: string, params: { maxLength?: number; timeoutMs?: number } = {}): Promise<string> {
  const tool = ShellTool({
    params: {
      cwd: { value: dir },
      ...(params.maxLength !== undefined ? { maxLength: { value: params.maxLength } } : {}),
      ...(params.timeoutMs !== undefined ? { timeoutMs: { value: params.timeoutMs } } : {}),
    },
  });
  return tool.invoke({ command }, ctx);
}

const outputFiles = async () => (await readdir(dir)).filter((name) => name.startsWith('featherloop-shell-'));

test('keeps stdout and stderr in the order they were written', async () => {
  const expected = [1, 2, 3, 4, 5, 6].flatMap((i) => [`out${i}`, `err${i}`]).join('\n');
  // With two pipes this came out in a different order almost every time.
  for (let i = 0; i < 5; i++) {
    assert.equal(await shell('for i in 1 2 3 4 5 6; do echo out$i; echo err$i >&2; done'), `${expected}\n[exit code 0]`);
  }
});

test('reports the exit code, and removes the output file when the output fits', async () => {
  assert.equal(await shell('echo hi; exit 3'), 'hi\n[exit code 3]');
  assert.equal(await shell('true'), '[exit code 0]');
  assert.deepEqual(await outputFiles(), []);
});

test('decodes a character written in two halves', async () => {
  // € is E2 82 AC in UTF-8.
  assert.equal(await shell("printf '\\342\\202'; sleep 0.2; printf '\\254 euro\\n'"), '€ euro\n[exit code 0]');
});

test('keeps the end of long output inline, and all of it in a file', async () => {
  const result = await shell('seq 1 3000', { maxLength: 50 });
  const [notice, ...rest] = result.split('\n');
  const match = /^\[… (\d+) bytes omitted; full output saved to (.+) …\]$/.exec(notice!);
  assert.ok(match, result);
  const [, omitted, file] = match;
  assert.equal(rest.at(-1), '[exit code 0]');
  const kept = rest.slice(0, -1);
  assert.equal(kept.at(-1), '3000');
  // Whole lines only, and nothing between the omitted part and the kept part.
  const full = readFileSync(file!, 'utf8');
  assert.equal(full, Array.from({ length: 3000 }, (_, i) => `${i + 1}\n`).join(''));
  assert.equal(Number(omitted) + Buffer.byteLength(kept.join('\n')), full.trimEnd().length);
  await rm(file!);
});

test("doesn't cut a character in half when keeping the end", async () => {
  // 3-byte characters, so reading from 4 * maxLength bytes before the end starts mid-character.
  const result = await shell("for i in $(seq 1 200); do printf '€'; done", { maxLength: 50 });
  const [notice, kept] = result.split('\n');
  assert.equal(kept, '€'.repeat(50));
  await rm(/saved to (.+) …\]$/.exec(notice!)![1]!);
});

test('maxLength 0 only saves the output to a file', async () => {
  const result = await shell('echo saved', { maxLength: 0 });
  const match = /^\[Output \(6 bytes\) saved to (.+)\]\n\[exit code 0\]$/.exec(result);
  assert.ok(match, result);
  assert.equal(readFileSync(match[1]!, 'utf8'), 'saved\n');
  await rm(match[1]!);
});

test('returns while background processes run, and keeps their output', async () => {
  const started = Date.now();
  const result = await shell('(sleep 1; echo late) & echo early');
  assert.ok(Date.now() - started < 900, `took ${Date.now() - started}ms`);
  const match = /^early\n\[exit code 0\]\n\[Processes it started are still running; their output goes to (.+)\]$/.exec(result);
  assert.ok(match, result);
  await sleep(1_500);
  assert.equal(readFileSync(match[1]!, 'utf8'), 'early\nlate\n');
  await rm(match[1]!);
});

test('kills the command and everything it started on timeout', async () => {
  const started = Date.now();
  assert.equal(await shell('sleep 5 & sleep 5', { timeoutMs: 200 }), '[timed out after 0.2s]');
  assert.ok(Date.now() - started < 2_000);
  assert.deepEqual(await outputFiles(), []);
});

test('rejects when aborted, and removes the output file', async () => {
  const controller = new AbortController();
  const tool = ShellTool({ params: { cwd: { value: dir } } });
  setTimeout(() => controller.abort(new Error('stop')), 100);
  await assert.rejects(Promise.resolve(tool.invoke({ command: 'sleep 5' }, { ...ctx, signal: controller.signal })), /stop/);
  assert.deepEqual(await outputFiles(), []);
});

/** Runs a command with bg, and returns what it said at once and what it reports when it exits. */
async function inBackground(
  command: string,
  params: { maxLength?: number; bgTimeoutMs?: number } = {},
): Promise<{ started: string; report: string }> {
  const tool = ShellTool({
    params: {
      cwd: { value: dir },
      ...(params.maxLength !== undefined ? { maxLength: { value: params.maxLength } } : {}),
      ...(params.bgTimeoutMs !== undefined ? { bgTimeoutMs: { value: params.bgTimeoutMs } } : {}),
    },
  });
  let work: Promise<string> | undefined;
  const started = await tool.invoke({ command, bg: true }, { ...ctx, background: (promise) => (work = promise) });
  assert.ok(work, 'no background work handed over');
  return { started, report: await work };
}

test('bg returns at once, and a success reports where its output is, not the output', async () => {
  const before = Date.now();
  const tool = ShellTool({ params: { cwd: { value: dir } } });
  let work!: Promise<string>;
  const started = await tool.invoke({ command: 'sleep 0.5; seq 1 3', bg: true }, { ...ctx, background: (promise) => (work = promise) });
  assert.ok(Date.now() - before < 400, `took ${Date.now() - before}ms`);
  assert.match(started, /^Started in the background as process group \d+\. A message will report when it exits\.$/);

  const report = await work;
  const match = /^Background command `sleep 0\.5; seq 1 3` finished after \d+s \[exit code 0\]; output: 3 lines in (.+)$/.exec(report);
  assert.ok(match, report);
  assert.equal(readFileSync(match[1]!, 'utf8'), '1\n2\n3\n');
  await rm(match[1]!);
});

test('a bg failure brings the end of its output along', async () => {
  const { report } = await inBackground('seq 1 100; echo broken >&2; exit 2', { maxLength: 20 });
  const [first, ...rest] = report.split('\n');
  const match = /^Background command `.+` failed after \d+s \[exit code 2\]; output: 101 lines in (.+), ending:$/.exec(first!);
  assert.ok(match, report);
  assert.equal(rest.at(-1), 'broken');
  assert.ok(rest.join('\n').length <= 20, report);
  await rm(match[1]!);
});

test('a bg command with no output leaves no file', async () => {
  assert.match((await inBackground('true')).report, /^Background command `true` finished after \d+s \[exit code 0\], with no output$/);
  assert.match((await inBackground('exit 1')).report, /^Background command `exit 1` failed after \d+s \[exit code 1\], with no output$/);
  assert.deepEqual(await outputFiles(), []);
});

test('bg with maxLength 0 keeps even a failure out of the report', async () => {
  const { report } = await inBackground('echo oops; exit 1', { maxLength: 0 });
  const match = /^Background command `.+` failed after \d+s \[exit code 1\]; output: 1 lines in (.+)$/.exec(report);
  assert.ok(match, report);
  await rm(match[1]!);
});

test('bg has its own timeout, and a timeout is a failure', async () => {
  const { report } = await inBackground('echo going; sleep 5', { bgTimeoutMs: 200 });
  const match = /^Background command `.+` failed after \d+s \[timed out after 0\.2s\]; output: 1 lines in (.+), ending:\ngoing$/.exec(report);
  assert.ok(match, report);
  await rm(match[1]!);
});

test('bg names a long or multi-line command by the start of its first line', async () => {
  const { report } = await inBackground(`true # ${'x'.repeat(100)}\ntrue`);
  assert.match(report, /^Background command `true # x{73}…` finished/);
});

test('bg needs a loop to report back to', async () => {
  const tool = ShellTool({ params: { cwd: { value: dir } } });
  await assert.rejects(Promise.resolve(tool.invoke({ command: 'true', bg: true }, ctx)), /bg needs an agent loop/);
});

test('an abort kills a bg command, and its work rejects', async () => {
  const controller = new AbortController();
  const tool = ShellTool({ params: { cwd: { value: dir } } });
  let work!: Promise<string>;
  await tool.invoke({ command: 'sleep 5', bg: true }, { ...ctx, signal: controller.signal, background: (promise) => (work = promise) });
  const before = Date.now();
  controller.abort(new Error('stop'));
  await assert.rejects(work, /stop/);
  assert.ok(Date.now() - before < 1_000);
});

/** A tool kept across commands, as a loop keeps it, so it can tell when output repeats. */
function repeating(params: { repeatWindow?: number } = {}) {
  const tool = ShellTool({
    params: { cwd: { value: dir }, ...(params.repeatWindow !== undefined ? { repeatWindow: { value: params.repeatWindow } } : {}) },
  });
  return (command: string) => tool.invoke({ command }, ctx);
}

test('notes when the output is the same as the previous run', async () => {
  const run = repeating();
  assert.equal(await run('echo 6 passed, 4 failed; exit 1'), '6 passed, 4 failed\n[exit code 1]');
  assert.equal(await run('echo 6 passed, 4 failed; exit 1'), '6 passed, 4 failed\n[exit code 1]\n[Same output as the previous run]');
});

test('counts back to the latest run with the same output', async () => {
  const run = repeating();
  await run('echo a');
  await run('echo a');
  await run('echo b');
  assert.equal(await run('echo a'), 'a\n[exit code 0]\n[Same output as 2 runs ago]');
});

test('ignores durations, escape codes and trailing whitespace', async () => {
  const run = repeating();
  // $$ differs between runs.
  const command = String.raw`printf "\033[32m1 passed in 0.$$s (0:00:00)\033[0m  \nTime: $$ ms\nok (1$$ ms)\n\n"`;
  const first = await run(command);
  const second = await run(command);
  assert.notEqual(first.split('\n')[0], second.split('\n')[0]);
  assert.match(second, /\[exit code 0\]\n\[Same output as the previous run\]$/);
  assert.match(await run('printf "1 passed in 0.3s (0:00:00)\nTime: 1 ms\nok (2 ms)"'), /\n\[Same output as the previous run\]$/);
});

test("doesn't take different test counts or exit codes for the same output", async () => {
  const run = repeating();
  await run('echo 1 passed');
  assert.equal(await run('echo 2 passed'), '2 passed\n[exit code 0]');
  assert.equal(await run('echo 2 passed; exit 1'), '2 passed\n[exit code 1]');
});

test('compares the whole output, not just what fits inline', async () => {
  const tool = ShellTool({ params: { cwd: { value: dir }, maxLength: { value: 0 } } });
  const run = async (command: string) => {
    const result = await tool.invoke({ command }, ctx);
    await rm(/saved to (.+)\]/.exec(result)![1]!);
    return result;
  };
  await run('echo a; echo end');
  assert.doesNotMatch(await run('echo b; echo end'), /Same output/);
  assert.match(await run('echo b; echo end'), /\[exit code 0\]\n\[Same output as the previous run\]$/);
});

test('a timeout repeats like any other run', async () => {
  const tool = ShellTool({ params: { cwd: { value: dir }, timeoutMs: { value: 200 } } });
  const run = () => tool.invoke({ command: 'echo partial; sleep 5' }, ctx);
  await run();
  assert.equal(await run(), 'partial\n[timed out after 0.2s]\n[Same output as the previous run]');
});

test('notes no repeat of empty output', async () => {
  const run = repeating();
  await run('true');
  assert.equal(await run('true'), '[exit code 0]');
});

test('repeatWindow sets how far back to look, and 0 turns it off', async () => {
  const off = repeating({ repeatWindow: 0 });
  await off('echo a');
  assert.equal(await off('echo a'), 'a\n[exit code 0]');

  const two = repeating({ repeatWindow: 2 });
  await two('echo a');
  await two('echo b');
  assert.match(await two('echo a'), /\[Same output as 2 runs ago\]$/);
  await two('echo c');
  await two('echo d');
  assert.equal(await two('echo a'), 'a\n[exit code 0]');
});

test("tools don't share what they've run", async () => {
  await repeating()('echo a');
  assert.equal(await repeating()('echo a'), 'a\n[exit code 0]');
});

test('a bg report notes when its output repeats', async () => {
  const tool = ShellTool({ params: { cwd: { value: dir } } });
  await tool.invoke({ command: 'echo 1 failed; exit 1' }, ctx);
  let work!: Promise<string>;
  await tool.invoke({ command: 'echo 1 failed; exit 1', bg: true }, { ...ctx, background: (promise) => (work = promise) });
  const report = await work;
  const match = /^Background command `.+` failed after \d+s \[exit code 1\]; output: 1 lines in (.+), ending:\n1 failed\n\[Same output as the previous run\]$/.exec(report);
  assert.ok(match, report);
  await rm(match[1]!);
});
