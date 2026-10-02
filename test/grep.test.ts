import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { GrepTool, type GrepParams, type Provider, type ToolContext } from '../src/index.ts';

const installed = (command: string) => !spawnSync(command, ['--version'], { stdio: 'ignore' }).error;
const backends = { rg: installed('rg'), grep: installed('grep') };

const ctx: ToolContext = { api: {} as Provider, model: 'test' };

let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'featherslop-grep-'));
  const files: Record<string, string> = {
    'src/a.ts': 'export const foo = 1;\nconst bar = foo + 1;\n',
    'src/b.ts': '-flag here\nnothing\n',
    'src/crlf.txt': 'crlf line\r\n',
    'src/nested/c.test.ts': "test('foo')\n",
    'lib/d.js': 'foo()\n',
    '-dashed/e.txt': 'foo dash\n',
    'long/min.js': `${'x'.repeat(1000)}needle\n`,
    'node_modules/pkg/index.js': 'foo\n',
    '.git/config': 'foo\n',
  };
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
});
after(() => rm(dir, { recursive: true, force: true }));

async function grep(backend: GrepParams['backend'], input: Record<string, unknown>, params: { maxLength?: number } = {}) {
  const tool = GrepTool({
    params: {
      cwd: { value: dir },
      backend: { value: backend },
      ...(params.maxLength ? { maxLength: { value: params.maxLength } } : {}),
    },
  });
  return tool.invoke(input, ctx);
}

const allFoo = [
  '-dashed/e.txt:1:foo dash',
  'lib/d.js:1:foo()',
  'src/a.ts:1:export const foo = 1;',
  'src/a.ts:2:const bar = foo + 1;',
  "src/nested/c.test.ts:1:test('foo')",
].join('\n');

test('the model sees only search and paths; grep is not sequential', () => {
  const tool = GrepTool();
  const { parameters } = tool.schema();
  assert.deepEqual(Object.keys(parameters.properties as object), ['search', 'paths']);
  assert.deepEqual(parameters.required, ['search']);
  assert.equal(tool.sequential, false);
});

for (const backend of ['rg', 'grep'] as const) {
  describe(`grep (backend: ${backend})`, { skip: backends[backend] ? false : `${backend} is not installed` }, () => {
    test('searches the cwd by default, sorted, skipping .git and node_modules', async () => {
      assert.equal(await grep(backend, { search: 'foo' }), allFoo);
      assert.equal(await grep(backend, { search: 'foo', paths: [] }), allFoo);
    });

    test('no matches is a result, not an error', async () => {
      assert.equal(await grep(backend, { search: 'nowhere to be found' }), 'No matches');
    });

    test('searches several paths, files or directories, relative or absolute', async () => {
      const expected = ['lib/d.js:1:foo()', 'src/a.ts:1:export const foo = 1;', 'src/a.ts:2:const bar = foo + 1;'].join('\n');
      assert.equal(await grep(backend, { search: 'foo', paths: ['lib', 'src/a.ts'] }), expected);
      assert.equal(await grep(backend, { search: 'foo', paths: [join(dir, 'lib'), join(dir, 'src', 'a.ts')] }), expected);
      // A string where an array belongs is accepted, and overlapping paths don't repeat lines.
      assert.equal(await grep(backend, { search: 'foo', paths: 'lib' }), 'lib/d.js:1:foo()');
      assert.equal(await grep(backend, { search: 'foo', paths: ['lib', 'lib/d.js'] }), 'lib/d.js:1:foo()');
    });

    test('patterns and paths starting with "-" are not read as options', async () => {
      assert.equal(await grep(backend, { search: '-flag' }), 'src/b.ts:1:-flag here');
      assert.equal(await grep(backend, { search: 'foo', paths: ['-dashed'] }), '-dashed/e.txt:1:foo dash');
    });

    test('a regex works, and CRLF line endings are dropped from the output', async () => {
      // Neither backend treats "\r" as part of the line ending, so "line$" wouldn't match.
      assert.equal(await grep(backend, { search: '^crlf.*e' }), 'src/crlf.txt:1:crlf line');
      assert.equal(await grep(backend, { search: 'foo \\+ [0-9]', paths: ['src'] }), 'src/a.ts:2:const bar = foo + 1;');
    });

    test('a bad regex is an error', async () => {
      await assert.rejects(grep(backend, { search: 'foo(' }), /^Error: Search failed: /);
    });

    test('a missing path is an error', async () => {
      await assert.rejects(grep(backend, { search: 'foo', paths: ['src', 'nope'] }), /No such file or directory: nope/);
    });

    test('long output keeps its first lines and says how much was cut', async () => {
      assert.equal(
        await grep(backend, { search: 'foo' }, { maxLength: 40 }),
        '-dashed/e.txt:1:foo dash\n[… 4 more matching lines omitted; use a more specific pattern or narrower paths …]',
      );
      const long = await grep(backend, { search: 'needle' });
      assert.equal(long, `long/min.js:1:${'x'.repeat(500)}…`);
    });

    test('an aborted signal stops the search', async () => {
      const tool = GrepTool({ params: { cwd: { value: dir }, backend: { value: backend } } });
      await assert.rejects(async () => tool.invoke({ search: 'foo' }, { ...ctx, signal: AbortSignal.abort() }), { name: 'AbortError' });
    });
  });
}

test('rg and grep give the same results', { skip: backends.rg && backends.grep ? false : 'needs both rg and grep' }, async () => {
  const cases = [
    { search: 'foo' },
    { search: 'nothing', paths: ['src'] },
    { search: '-flag' },
    { search: 'foo', paths: ['-dashed', 'lib', 'src/a.ts'] },
    { search: '^crlf' },
  ];
  for (const input of cases) {
    assert.equal(await grep('rg', input), await grep('grep', input), JSON.stringify(input));
  }
});
