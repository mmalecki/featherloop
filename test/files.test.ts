import assert from 'node:assert/strict';
import { chmod, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { UpdateTool, WriteTool } from '../src/index.ts';

let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'featherloop-files-'));
});
after(() => rm(dir, { recursive: true, force: true }));

const ctx = { api: {} as never, model: 'm' };

test('writes replace a file whole, keeping its mode and leaving no temporary files', async () => {
  const file = join(dir, 'run.sh');
  await writeFile(file, 'echo old\n');
  await chmod(file, 0o751);
  await WriteTool().invoke({ path: file, content: 'echo new\n' }, ctx);
  await UpdateTool().invoke({ path: file, old: 'new', new: 'newer' }, ctx);
  assert.equal(await readFile(file, 'utf8'), 'echo newer\n');
  assert.equal((await stat(file)).mode & 0o777, 0o751);
  assert.deepEqual(await readdir(dir), ['run.sh']);
});

test('writes through a symlink change its target, not the link', async () => {
  const target = join(dir, 'target.txt');
  const link = join(dir, 'link.txt');
  await writeFile(target, 'a\n');
  await symlink(target, link);
  await UpdateTool().invoke({ path: link, old: 'a', new: 'b' }, ctx);
  assert.equal(await readFile(target, 'utf8'), 'b\n');
  assert.ok((await stat(link)).isFile());
  assert.equal(await readFile(link, 'utf8'), 'b\n');
});

test('an aborted call writes nothing', async () => {
  const file = join(dir, 'kept.txt');
  await writeFile(file, 'kept\n');
  const signal = AbortSignal.abort();
  await assert.rejects(async () => WriteTool().invoke({ path: file, content: 'gone\n' }, { ...ctx, signal }));
  await assert.rejects(async () => UpdateTool().invoke({ path: file, old: 'kept', new: 'gone' }, { ...ctx, signal }));
  assert.equal(await readFile(file, 'utf8'), 'kept\n');
});
