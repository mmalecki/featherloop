import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { GlobTool, type GlobParams, type Provider, type ToolContext } from '../src/index.ts';

const installed = (command: string) => !spawnSync(command, ['--version'], { stdio: 'ignore' }).error;
const backends = { fd: installed('fd') || installed('fdfind'), find: installed('find') };

const ctx: ToolContext = { api: {} as Provider, model: 'test' };

let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'featherloop-glob-'));
  const files = [
    'README.md',
    'src/a.ts',
    'src/b.ts',
    'src/.hidden.ts',
    'src/nested/c.test.ts',
    'lib/d.js',
    'lib/d.test.js',
    '-dashed/e.txt',
    '-weird.txt',
    '.env',
    '.github/workflows/ci.yml',
    '.git/HEAD',
    '.git/.keep',
    'node_modules/pkg/index.js',
    'node_modules/pkg/x.ts',
  ];
  for (const path of files) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), '');
  }
});
after(() => rm(dir, { recursive: true, force: true }));

async function glob(backend: GlobParams['backend'], input: Record<string, unknown>, params: { maxLength?: number } = {}) {
  const tool = GlobTool({
    params: {
      cwd: { value: dir },
      backend: { value: backend },
      ...(params.maxLength ? { maxLength: { value: params.maxLength } } : {}),
    },
  });
  return tool.invoke(input, ctx);
}

const lines = (...paths: string[]) => paths.join('\n');

test('the model sees only search and paths; glob is not sequential', () => {
  const tool = GlobTool();
  const { parameters } = tool.schema();
  assert.deepEqual(Object.keys(parameters.properties as object), ['search', 'paths']);
  assert.deepEqual(parameters.required, ['search']);
  assert.equal(tool.sequential, false);
});

for (const backend of ['fd', 'find'] as const) {
  describe(`glob (backend: ${backend})`, { skip: backends[backend] ? false : `${backend} is not installed` }, () => {
    test('a pattern without "/" matches file names at any depth, in the cwd by default', async () => {
      const ts = lines('src/a.ts', 'src/b.ts', 'src/nested/c.test.ts');
      assert.equal(await glob(backend, { search: '*.ts' }), ts);
      assert.equal(await glob(backend, { search: '*.ts', paths: [] }), ts);
      assert.equal(await glob(backend, { search: '*.{md,js}' }), lines('README.md', 'lib/d.js', 'lib/d.test.js'));
    });

    test('a pattern with "/" matches paths relative to the searched directory', async () => {
      assert.equal(await glob(backend, { search: 'src/*.ts' }), lines('src/a.ts', 'src/b.ts'));
      assert.equal(await glob(backend, { search: './src/*.ts' }), lines('src/a.ts', 'src/b.ts'));
      assert.equal(await glob(backend, { search: '**/*.test.js' }), 'lib/d.test.js');
      assert.equal(await glob(backend, { search: 'nested/*.ts', paths: ['src'] }), 'src/nested/c.test.ts');
    });

    test('no matches is a result, not an error', async () => {
      assert.equal(await glob(backend, { search: '*.py' }), 'No matches');
    });

    test('searches several directories, relative or absolute', async () => {
      const expected = lines('-dashed/e.txt', 'lib/d.js', 'lib/d.test.js');
      assert.equal(await glob(backend, { search: '*', paths: ['lib', '-dashed'] }), expected);
      assert.equal(await glob(backend, { search: '*', paths: [join(dir, 'lib'), join(dir, '-dashed')] }), expected);
      assert.equal(await glob(backend, { search: '*.js', paths: ['lib', 'lib'] }), lines('lib/d.js', 'lib/d.test.js'));
    });

    test('patterns and paths starting with "-" are not read as options', async () => {
      assert.equal(await glob(backend, { search: '-weird*' }), '-weird.txt');
      assert.equal(await glob(backend, { search: '*.txt', paths: ['-dashed'] }), '-dashed/e.txt');
    });

    test('skips hidden files, .git and node_modules', async () => {
      assert.equal(
        await glob(backend, { search: '*' }),
        lines('-dashed/e.txt', '-weird.txt', 'README.md', 'lib/d.js', 'lib/d.test.js', 'src/a.ts', 'src/b.ts', 'src/nested/c.test.ts'),
      );
    });

    test('a pattern naming a hidden file finds it, but still skips .git', async () => {
      assert.equal(await glob(backend, { search: '.env*' }), '.env');
      assert.equal(await glob(backend, { search: '.*' }), lines('.env', 'src/.hidden.ts'));
      assert.equal(await glob(backend, { search: '.github/**/*.yml' }), '.github/workflows/ci.yml');
    });

    test('missing paths and files are errors', async () => {
      await assert.rejects(glob(backend, { search: '*', paths: ['nope'] }), /No such directory: nope/);
      await assert.rejects(glob(backend, { search: '*', paths: ['README.md'] }), /Not a directory: README.md/);
    });

    test('long output keeps its first lines and says how much was cut', async () => {
      assert.equal(
        await glob(backend, { search: '*' }, { maxLength: 30 }),
        lines('-dashed/e.txt', '-weird.txt', '[… 6 more files omitted; use a more specific pattern or narrower paths …]'),
      );
    });

    test('an aborted signal stops the search', async () => {
      const tool = GlobTool({ params: { cwd: { value: dir }, backend: { value: backend } } });
      await assert.rejects(async () => tool.invoke({ search: '*' }, { ...ctx, signal: AbortSignal.abort() }), { name: 'AbortError' });
    });
  });
}

test('fd and find give the same results', { skip: backends.fd && backends.find ? false : 'needs both fd and find' }, async () => {
  const cases = [
    { search: '*' },
    { search: '*.ts', paths: ['src', 'lib'] },
    { search: '**/*.test.*' },
    { search: '.*' },
    { search: '*.py' },
  ];
  for (const input of cases) {
    assert.equal(await glob('fd', input), await glob('find', input), JSON.stringify(input));
  }
});
