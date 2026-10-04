import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LOST, ServerPool, WorkQueue, type Attempt, type Health } from './harness-bench/pool.ts';

const props = (slots: number, model = '/models/qwen.gguf', build = 'b1') => ({ modelPath: model, build, slots });

/** A pool over a list and health the test changes; checks only when told. */
function pool(servers: Record<string, Health>, options: { jobs?: number; reference?: { model: string; build: string } } = {}) {
  const lines: string[] = [];
  let list: string[] | Error = Object.keys(servers);
  const p = new ServerPool({
    list: async () => {
      if (list instanceof Error) throw list;
      return list;
    },
    listEvery: Infinity,
    probe: async (url) => servers[url] ?? { ok: false, why: 'connection refused' },
    checkEvery: Infinity,
    log: (line) => lines.push(line),
    ...options,
  });
  return { pool: p, lines, setList: (urls: string[] | Error) => (list = urls) };
}

/** Jobs whose attempts the test ends by hand. */
function queue(p: ServerPool, jobs: string[], options: { canStart?: () => boolean } = {}) {
  const started: Attempt<string>[] = [];
  const ends = new Map<Attempt<string>, (again?: string) => void>();
  const requeues: [string, number, string][] = [];
  const lines: string[] = [];
  const q = new WorkQueue(p, jobs, {
    run: (attempt) =>
      new Promise((resolve) => {
        started.push(attempt);
        ends.set(attempt, resolve);
        attempt.signal.addEventListener('abort', () => {
          ends.delete(attempt);
          resolve(String(attempt.signal.reason));
        });
      }),
    requeued: (attempt, why) => requeues.push([attempt.job, attempt.attempt, why]),
    log: (line) => lines.push(line),
    ...options,
  });
  const running = () => started.filter((attempt) => ends.has(attempt));
  const end = async (attempt: Attempt<string>, again?: string) => {
    const resolve = ends.get(attempt)!;
    ends.delete(attempt);
    resolve(again);
    await tick();
  };
  return { q, started, running, end, requeues, lines };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));
const on = (attempts: Attempt<string>[]) => attempts.map((attempt) => `${attempt.job}@${attempt.server.url}`);

describe('ServerPool and WorkQueue', () => {
  test('runs pull from one queue, as many on each server as its slots, capped by -j', async () => {
    const { pool: p } = pool({ a: { ok: true, props: props(2) }, b: { ok: true, props: props(4) } }, { jobs: 3 });
    await p.start();
    assert.deepEqual(
      p.up().map((server) => [server.url, server.slots]),
      [
        ['a', 2],
        ['b', 3],
      ],
    );
    const { q, running, end } = queue(p, ['1', '2', '3', '4', '5', '6', '7']);
    q.pump();
    assert.equal(running().filter((attempt) => attempt.server.url === 'a').length, 2);
    assert.equal(running().filter((attempt) => attempt.server.url === 'b').length, 3);
    // A free slot takes the next.
    await end(running()[0]!);
    assert.equal(running().length, 5);
    assert.deepEqual(q.pending.map((item) => item.job), ['7']);
    while (running().length) await end(running()[0]!);
    assert.deepEqual(await q.done, { left: 0 });
  });

  test('a server joins when listed and healthy, and one no longer listed takes no new runs but finishes its own', async () => {
    const servers: Record<string, Health> = { a: { ok: true, props: props(1) }, b: { ok: true, props: props(1) } };
    const { pool: p, setList, lines } = pool(servers);
    setList(['a']);
    await p.start();
    const { q, running, end } = queue(p, ['1', '2', '3', '4']);
    q.pump();
    assert.deepEqual(on(running()), ['1@a']);
    setList(['a', 'b']);
    await p.refresh();
    assert.deepEqual(on(running()), ['1@a', '2@b']);
    setList(['b']);
    await p.refresh();
    assert.ok(lines.some((line) => /server a: no longer listed, finishing its 1 runs/.test(line)));
    assert.ok(p.servers.has('a'), 'kept while its run lasts');
    await end(running()[0]!);
    assert.ok(!p.servers.has('a'), 'forgotten after');
    assert.deepEqual(on(running()), ['2@b']);
    await end(running()[0]!);
    assert.deepEqual(on(running()), ['3@b']);
  });

  test('a listing that fails keeps the last list', async () => {
    const { pool: p, setList, lines } = pool({ a: { ok: true, props: props(1) } });
    await p.start();
    setList(new Error('gcloud: no credentials'));
    await p.refresh();
    assert.deepEqual(
      p.up().map((server) => server.url),
      ['a'],
    );
    assert.ok(lines.some((line) => line.includes('listing failed, keeping the last list: gcloud: no credentials')));
  });

  test("a server that fails two checks in a row leaves the pool; its runs go back on the front of the queue, to the others", async () => {
    const servers: Record<string, Health> = { a: { ok: true, props: props(2) }, b: { ok: true, props: props(1) } };
    const { pool: p, lines } = pool(servers);
    await p.start();
    const { q, running, end, requeues } = queue(p, ['1', '2', '3', '4']);
    q.pump();
    assert.deepEqual(on(running()).sort(), ['1@a', '2@b', '3@a']);
    servers.a = { ok: false, why: 'timed out' };
    await p.check();
    assert.equal(running().length, 3, 'one failed check is not enough');
    await p.check();
    await tick();
    assert.ok(lines.some((line) => line === 'server a: down after 2 failed checks (timed out); requeueing its 2 runs'));
    assert.deepEqual(requeues, [
      ['1', 1, LOST],
      ['3', 1, LOST],
    ]);
    assert.deepEqual(
      q.pending.map((item) => [item.job, item.attempt]),
      [
        ['3', 2],
        ['1', 2],
        ['4', 1],
      ],
    );
    await end(running().find((attempt) => attempt.job === '2')!);
    assert.deepEqual(on(running()), ['3@b']);
    // Back when it passes again.
    servers.a = { ok: true, props: props(2) };
    await p.check();
    assert.deepEqual(on(running()), ['3@b', '1@a', '4@a']);
    assert.equal(running().find((attempt) => attempt.job === '1')!.attempt, 2);
  });

  test('a run that asks to run again does, up to three attempts; the last stands', async () => {
    const { pool: p } = pool({ a: { ok: true, props: props(1) } });
    await p.start();
    const { q, running, end, requeues } = queue(p, ['1', '2']);
    q.pump();
    for (const attempt of [1, 2, 3]) {
      const [current] = running();
      assert.equal(current!.job, '1');
      assert.equal(current!.attempt, attempt);
      assert.equal(current!.final, attempt === 3);
      await end(current!, 'HTTP 503');
    }
    assert.equal(requeues.length, 2);
    assert.equal(running()[0]!.job, '2');
    await end(running()[0]!);
    assert.deepEqual(await q.done, { left: 0 });
  });

  test("servers on another model or build are refused; the reference is the first to join's, or given", async () => {
    const { pool: p, lines } = pool({
      a: { ok: true, props: props(1) },
      b: { ok: true, props: props(1, '/other/qwen.gguf') },
      c: { ok: true, props: props(1, '/models/llama.gguf') },
      d: { ok: true, props: props(1, '/models/qwen.gguf', 'b2') },
    });
    await p.start();
    assert.deepEqual(
      p.up().map((server) => server.url),
      ['a', 'b'],
      'the same file, wherever it is',
    );
    assert.deepEqual(p.reference, { model: 'qwen.gguf', build: 'b1' });
    assert.ok(lines.includes("server c: refused: serves llama.gguf (build b1), not the pool's qwen.gguf (build b1)"));
    assert.equal(p.servers.get('d')!.state, 'refused');
    // Said once.
    await p.check();
    assert.equal(lines.filter((line) => line.startsWith('server c: refused')).length, 1);

    const { pool: given } = pool({ a: { ok: true, props: props(1) }, c: { ok: true, props: props(1, '/models/llama.gguf') } }, { reference: { model: 'llama.gguf', build: 'b1' } });
    await given.start();
    assert.deepEqual(
      given.up().map((server) => server.url),
      ['c'],
    );
  });

  test('a server that is loading joins once it is healthy', async () => {
    const servers: Record<string, Health> = { a: { ok: false, why: 'HTTP 503' } };
    const { pool: p } = pool(servers);
    await p.start();
    const { q, running, lines } = queue(p, ['1']);
    q.pump();
    assert.deepEqual(lines, ['waiting for a server: 1 runs queued']);
    servers.a = { ok: true, props: props(1) };
    await p.check();
    assert.deepEqual(on(running()), ['1@a']);
  });

  test('no more runs start once told not to; the queue ends with what never ran', async () => {
    const { pool: p } = pool({ a: { ok: true, props: props(1) } });
    await p.start();
    let open = true;
    const { q, running, end } = queue(p, ['1', '2', '3'], { canStart: () => open });
    q.pump();
    open = false;
    await end(running()[0]!);
    assert.deepEqual(await q.done, { left: 2 });
  });

  test('an empty queue is done at once', async () => {
    const { pool: p } = pool({});
    await p.start();
    const { q } = queue(p, []);
    q.pump();
    assert.deepEqual(await q.done, { left: 0 });
  });
});
