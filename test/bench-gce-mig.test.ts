import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { after, before, describe, test } from 'node:test';

const SCRIPT = join(import.meta.dirname, 'harness-bench', 'servers', 'gce-mig.sh');

/** Runs the script with a fake `gcloud` first on the PATH, which records its arguments and prints `output`, or fails. */
async function mig(dir: string, args: string[], gcloud: { output?: string; fail?: boolean } = {}) {
  await writeFile(join(dir, 'output'), gcloud.output ?? '');
  await writeFile(
    join(dir, 'gcloud'),
    `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${join(dir, 'args')}"\n${gcloud.fail ? 'echo "ERROR: (gcloud.compute.instances.list) no credentials" >&2; exit 1' : `cat "${join(dir, 'output')}"`}\n`,
  );
  await chmod(join(dir, 'gcloud'), 0o755);
  return spawnSync(SCRIPT, args, { encoding: 'utf8', env: { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH}` } });
}

describe('servers/gce-mig.sh', () => {
  let dir: string;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bench-gce-mig-'));
  });
  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("lists the MIG's running instances with one gcloud call, a base URL each", async () => {
    // An instance without an external IP prints an empty line.
    const result = await mig(dir, ['llama-9b', 'us-central1'], { output: '34.1.1.1\n\n34.1.1.2\n' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'http://34.1.1.1:9931/v1\nhttp://34.1.1.2:9931/v1\n');
    assert.deepEqual((await readFile(join(dir, 'args'), 'utf8')).trimEnd().split('\n'), [
      'compute',
      'instances',
      'list',
      '--filter=status=RUNNING AND metadata.items.created-by~"/regions/us-central1/instanceGroupManagers/llama-9b$"',
      '--format=value(networkInterfaces[0].accessConfigs[0].natIP)',
    ]);
  });

  test('takes another port', async () => {
    const result = await mig(dir, ['llama-9b', 'us-central1', '8080'], { output: '34.1.1.1\n' });
    assert.equal(result.stdout, 'http://34.1.1.1:8080/v1\n');
  });

  test('prints nothing for an empty group', async () => {
    const result = await mig(dir, ['llama-9b', 'us-central1'], { output: '' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  });

  test('fails when gcloud does, so the bench keeps the servers it has', async () => {
    const result = await mig(dir, ['llama-9b', 'us-central1'], { fail: true });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /no credentials/);
  });

  test('refuses names that would change the filter', async () => {
    for (const args of [['llama"9b', 'us-central1'], ['llama-9b', 'us-central1$'], ['llama-9b', 'us-central1', '99x'], ['llama-9b']]) {
      const result = await mig(dir, args, { output: '34.1.1.1\n' });
      assert.equal(result.status, 2, args.join(' '));
      assert.equal(result.stdout, '');
    }
  });
});
