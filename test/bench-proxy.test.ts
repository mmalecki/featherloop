import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { infrastructureError, MeteringProxy, SERVER_LOST } from './harness-bench/proxy.ts';

/** A model server that streams its name (the proxy streams every request upstream), or never finishes when `hang`. */
async function stub(name: string, hang = false): Promise<{ url: string; server: http.Server }> {
  const server = http.createServer((req, res) => {
    req.resume();
    if (hang) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'thinking' } }] })}\n\n`);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: name } }] })}\n\n`);
    res.end(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, server };
}

async function chat(baseURL: string, stream = false): Promise<unknown> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'm', stream, messages: [{ role: 'user', content: 'hi' }] }),
  });
  return res.json();
}

describe('MeteringProxy upstreams', () => {
  let dir: string;
  const servers: http.Server[] = [];
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bench-proxy-'));
  });
  after(async () => {
    for (const server of servers) server.closeAllConnections(), server.close();
    await rm(dir, { recursive: true, force: true });
  });

  test("each run's requests go to its own upstream, or the proxy's", async () => {
    const a = await stub('a');
    const b = await stub('b');
    servers.push(a.server, b.server);
    const proxy = await MeteringProxy.start(a.url);
    try {
      const first = proxy.open('one', join(dir, 'one.jsonl'), join(dir, 'one.json'));
      const second = proxy.open('two', join(dir, 'two.jsonl'), join(dir, 'two.json'), b.url);
      const content = (body: unknown) => (body as { choices: { message: { content: string } }[] }).choices[0]!.message.content;
      assert.equal(content(await chat(first.baseURL)), 'a');
      assert.equal(content(await chat(second.baseURL)), 'b');
    } finally {
      await proxy.stop();
    }
  });

  test("a run closed because its server was lost leaves an infrastructure error; the bench's own end doesn't", async () => {
    const hung = await stub('hung', true);
    servers.push(hung.server);
    const proxy = await MeteringProxy.start(hung.url);
    try {
      const lost = proxy.open('lost', join(dir, 'lost.jsonl'), join(dir, 'lost.json'));
      const ended = proxy.open('ended', join(dir, 'ended.jsonl'), join(dir, 'ended.json'));
      const requests = [chat(lost.baseURL, true).catch(() => undefined), chat(ended.baseURL, true).catch(() => undefined)];
      // Both streams have started.
      while ((await streamed(lost.generated, ended.generated)) < 2);
      proxy.close('lost', SERVER_LOST);
      proxy.close('ended');
      await Promise.all(requests);
      assert.equal(lost.records[0]!.error, SERVER_LOST);
      assert.ok(infrastructureError(lost.records[0]!));
      assert.ok(!infrastructureError(ended.records[0]!));
    } finally {
      await proxy.stop();
    }
  });

  test('a request on a kept-alive connection the server closed goes again on a fresh one, and is no error', async () => {
    const { url, server } = await stub('fresh');
    servers.push(server);
    // As a server that closes its end between requests: a second request on a connection meets a hang-up.
    const used = new WeakSet<object>();
    server.prependListener('request', (req: http.IncomingMessage) => {
      if (used.has(req.socket)) req.socket.destroy();
      used.add(req.socket);
    });
    const proxy = await MeteringProxy.start(url);
    try {
      const meter = proxy.open('kept', join(dir, 'kept.jsonl'), join(dir, 'kept.json'));
      const content = (body: unknown) => (body as { choices: { message: { content: string } }[] }).choices[0]!.message.content;
      assert.equal(content(await chat(meter.baseURL)), 'fresh');
      assert.equal(content(await chat(meter.baseURL)), 'fresh');
      const second = meter.records[1]!;
      assert.equal(second.status, 200);
      assert.equal(second.error, undefined);
      assert.ok(second.resent);
      assert.ok(!infrastructureError(second));
    } finally {
      await proxy.stop();
    }
  });
});

/** Streamed chunks so far, after a moment. */
async function streamed(...generated: (() => number)[]): Promise<number> {
  await new Promise((resolve) => setTimeout(resolve, 20));
  return generated.reduce((sum, fn) => sum + fn(), 0);
}
