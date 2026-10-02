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
  dir = await mkdtemp(join(tmpdir(), 'featherslop-shell-test-'));
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

const outputFiles = async () => (await readdir(dir)).filter((name) => name.startsWith('featherslop-shell-'));

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
