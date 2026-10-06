import assert from 'node:assert/strict';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ConfigError, connectMcp, parseConfig, type McpConfig, type Tool } from '../src/index.ts';
import { handle, type Message } from './mcp-server.ts';

const fixture = fileURLToPath(new URL('./mcp-server.ts', import.meta.url));
const local = (mode = 'modern', extra: Partial<McpConfig> = {}): McpConfig => ({ type: 'local', command: [process.execPath, fixture, mode], ...extra }) as McpConfig;

/** Connects to the servers, collecting warnings, and closes them after the test. */
async function connect(t: { after(fn: () => unknown): void }, config: Record<string, McpConfig>) {
  const warnings: string[] = [];
  const mcp = await connectMcp(config, { clientInfo: { name: 'test', version: '1' }, onWarning: (message) => warnings.push(message) });
  t.after(() => mcp.close());
  return { mcp, tools: mcp.tools(), warnings };
}

const call = async (tool: Tool | undefined, args: Record<string, unknown> = {}, signal?: AbortSignal) =>
  tool!.invoke(args, { api: undefined as never, model: 'test', ...(signal ? { signal } : {}) });

test('config: mcp servers are checked', () => {
  const config = parseConfig(`
mcp:
  files: { type: local, command: [mcp-files, --root, "{env:ROOT}"], environment: { A: b }, tools: [read] }
  web: { type: remote, url: "https://example.com/mcp", headers: { Authorization: "Bearer {env:TOKEN}" }, enabled: false, timeout: 100 }
`, { ROOT: '/srv', TOKEN: 't' });
  assert.deepEqual(config.mcp?.files, { type: 'local', command: ['mcp-files', '--root', '/srv'], environment: { A: 'b' }, tools: ['read'] });
  assert.equal((config.mcp?.web as { headers: Record<string, string> }).headers.Authorization, 'Bearer t');

  const rejects = (yaml: string, message: RegExp) => assert.throws(() => parseConfig(yaml), (err) => err instanceof ConfigError && message.test(err.message));
  rejects('mcp: { a.b: { type: local, command: [x] } }', /mcp\.a\.b: server names may only contain/);
  rejects('mcp: { a: { type: remote, url: "https://x", oauth: {} } }', /mcp\.a\.oauth isn't supported; send a token in headers/);
  rejects('mcp: { a: { type: local, command: [] } }', /mcp\.a\.command must be a non-empty list of strings/);
  rejects('mcp: { a: { type: local, command: x } }', /mcp\.a\.command must be a non-empty list/);
  rejects('mcp: { a: { type: local, command: [x], url: y } }', /mcp\.a\.url isn't supported/);
  rejects('mcp: { a: { type: remote, url: "ftp://x" } }', /mcp\.a\.url must be an http or https URL/);
  rejects('mcp: { a: { type: sse, url: "https://x" } }', /mcp\.a\.type must be local or remote/);
  rejects('mcp: { a: { type: local, command: [x], timeout: 0 } }', /mcp\.a\.timeout must be a positive integer/);
  rejects('mcp: { a: { type: local, command: [x], tools: read } }', /mcp\.a\.tools must be a list of tool names/);
});

test('stdio: lists every page of tools, prefixed and in order', async (t) => {
  const { mcp, tools, warnings } = await connect(t, { fake: local() });
  assert.deepEqual(warnings, []);
  assert.deepEqual(Object.keys(tools), [
    'fake_echo', 'fake_dotted_name', 'fake_fail', 'fake_slow', 'fake_cancelled', 'fake_anything',
    'fake_image', 'fake_ask', 'fake_pid', 'fake_crash', 'fake_region', 'fake_badheader',
  ]);
  assert.deepEqual([...mcp.servers], [['fake', 12]]);
  // Read-only tools run in parallel; the rest in order.
  assert.equal(tools.fake_echo!.sequential, false);
  assert.equal(tools.fake_fail!.sequential, true);
});

test('stdio: plain schemas become parameters, others pass through', async (t) => {
  const { tools } = await connect(t, { fake: local() });
  assert.deepEqual(tools.fake_echo!.schema(), {
    description: 'Repeats text',
    parameters: { type: 'object', properties: { text: { type: 'string' }, times: { type: 'integer', default: 1 } }, required: ['text'] },
  });
  // Coerced as small models need: a string where an integer goes.
  assert.equal(await call(tools.fake_echo, { text: 'hi', times: '2' }), 'hi hi');
  assert.equal(await call(tools.fake_echo, { text: 'hi' }), 'hi');
  assert.deepEqual(tools.fake_anything!.schema().parameters.$defs, { item: { type: 'string' } });
  assert.equal(await call(tools.fake_anything, { items: ['a'], extra: 1 }), '{"items":["a"],"extra":1}');
  assert.equal(await call(tools.fake_dotted_name), 'dotted');
});

test('stdio: results become text; failures and input requests throw', async (t) => {
  const { tools } = await connect(t, { fake: local() });
  assert.equal(await call(tools.fake_image), '[image/png omitted]\na caption');
  await assert.rejects(call(tools.fake_fail), /^Error: it broke$/);
  await assert.rejects(call(tools.fake_ask), /asked for input/);
});

test('stdio: an abort cancels the call on the server', async (t) => {
  const { tools } = await connect(t, { fake: local() });
  const controller = new AbortController();
  const slow = call(tools.fake_slow, {}, controller.signal);
  setTimeout(() => controller.abort(new Error('stop')), 50);
  await assert.rejects(slow, /^Error: stop$/);
  const ids = JSON.parse(await call(tools.fake_cancelled)) as number[];
  assert.equal(ids.length, 1);
});

test('stdio: a crash fails its call with the stderr, and the next call restarts the server', async (t) => {
  const { tools } = await connect(t, { fake: local() });
  const before = await call(tools.fake_pid);
  await assert.rejects(call(tools.fake_crash), /The server exited \(code 3\): something went wrong/);
  assert.notEqual(await call(tools.fake_pid), before);
});

test('stdio: close() stops the server', async (t) => {
  const { mcp, tools } = await connect(t, { fake: local() });
  const pid = Number(await call(tools.fake_pid));
  await mcp.close();
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
});

test('the tools allowlist picks tools, and warns of ones the server lacks', async (t) => {
  const { tools, warnings } = await connect(t, { fake: local('modern', { tools: ['echo', 'nope'] }) });
  assert.deepEqual(Object.keys(tools), ['fake_echo']);
  assert.deepEqual(warnings, ['MCP server fake has no tool nope']);
});

test('servers that fail are left out with a warning; disabled ones never start', async (t) => {
  const { mcp, tools, warnings } = await connect(t, {
    legacy: local('legacy'),
    future: local('future'),
    silent: local('silent', { timeout: 200 }),
    missing: { type: 'local', command: ['/nonexistent/mcp-server'] },
    off: local('modern', { enabled: false, command: ['/nonexistent/off'] }),
    ok: local('modern', { tools: ['echo'] }),
  });
  assert.deepEqual(Object.keys(tools), ['ok_echo']);
  assert.deepEqual([...mcp.servers.keys()], ['ok']);
  // In the order they failed.
  const [future, legacy, missing, silent, ...rest] = warnings.sort();
  assert.deepEqual(rest, []);
  assert.match(future!, /^MCP server future left out: it speaks MCP 2099-01-01; featherloop speaks 2026-07-28$/);
  assert.match(legacy!, /^MCP server legacy left out: Not initialized \(featherloop speaks MCP 2026-07-28 only/);
  assert.match(missing!, /^MCP server missing left out: Couldn't start \/nonexistent\/mcp-server: .*ENOENT/);
  assert.match(silent!, /^MCP server silent left out: No reply to server\/discover in 0.2s/);
});

describeHttp();

function describeHttp() {
  let url = '';
  const seen: IncomingHttpHeaders[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      seen.push(req.headers);
      const out = handle(JSON.parse(body) as Message);
      if (!out) return void res.writeHead(202).end();
      const failed = 'error' in out;
      if (req.url === '/sse' && !failed) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const progress = { jsonrpc: '2.0', method: 'notifications/progress', params: { progress: 1 } };
        return void res.end(`: keep-alive\r\n\r\nevent: message\r\ndata: ${JSON.stringify(progress)}\r\n\r\ndata: ${JSON.stringify(out)}\r\n\r\n`);
      }
      res.writeHead(failed ? 400 : 200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
    });
  });
  before(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => server.close());

  for (const path of ['/json', '/sse']) {
    test(`http (${path.slice(1)}): calls tools, with the spec's headers`, async (t) => {
      const { tools, warnings } = await connect(t, { web: { type: 'remote', url: `${url}${path}`, headers: { Authorization: 'Bearer t' } } });
      // Its x-mcp-header is on a number, which the spec forbids.
      assert.deepEqual(warnings, ['MCP server web: left out badheader: x-mcp-header N on a parameter of type number']);
      assert.equal('web_badheader' in tools, false);
      assert.equal(await call(tools.web_echo, { text: 'hi' }), 'hi');
      await assert.rejects(call(tools.web_fail), /it broke/);

      seen.length = 0;
      assert.equal(await call(tools.web_region, { region: 'Zürich', query: 'q' }), '{"region":"Zürich","query":"q"}');
      const headers = seen[0]!;
      assert.equal(headers.authorization, 'Bearer t');
      assert.equal(headers['mcp-protocol-version'], '2026-07-28');
      assert.equal(headers['mcp-method'], 'tools/call');
      assert.equal(headers['mcp-name'], 'region');
      assert.equal(headers['mcp-param-region'], `=?base64?${Buffer.from('Zürich').toString('base64')}?=`);
    });
  }
}
