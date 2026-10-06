import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/featherloop.ts', import.meta.url));
const home = mkdtempSync(join(tmpdir(), 'featherloop-cli-'));

interface Request {
  messages: { role: string; content: string }[];
  tools?: { function: { name: string } }[];
}
const requests: Request[] = [];

/** An OpenAI-compatible server that records each chat request and streams back "ok". */
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') return void res.writeHead(404).end();
    requests.push(JSON.parse(body) as Request);
    const chunk = (choice: object) =>
      `data: ${JSON.stringify({ id: 'c', object: 'chat.completion.chunk', created: 0, model: 'test-model', choices: [{ index: 0, ...choice }] })}\n\n`;
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end(
      chunk({ delta: { role: 'assistant', content: 'ok' }, finish_reason: null }) +
        chunk({ delta: {}, finish_reason: 'stop' }) +
        'data: [DONE]\n\n',
    );
  });
});
let baseURL = '';

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
after(() => {
  server.close();
  rmSync(home, { recursive: true, force: true });
});

interface Run {
  code: number | null;
  stderr: string;
}

/** Runs the CLI against the fake server, away from the real config, sessions and env. */
function run(signal: AbortSignal, args: string[], stdin: 'ignore' | number, shellPipe?: string): Promise<Run> {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, 'config'), XDG_STATE_HOME: join(home, 'state') };
  for (const key of ['MODEL', 'OPENAI_BASE_URL', 'OPENAI_API_KEY', 'PARALLEL_API_KEY']) delete env[key];
  const config = args.includes('--config') ? [] : ['--config', join(home, 'none.yaml')];
  const argv = [cli, '--model', 'test-model', '--base-url', baseURL, '--no-instructions', ...config, ...args];
  // A real pipe needs a shell: Node gives a child's stdin as a socket, which the CLI ignores.
  const child =
    shellPipe === undefined
      ? spawn(process.execPath, argv, { env, signal, stdio: [stdin, 'ignore', 'pipe'] })
      : spawn('sh', ['-c', 'printf "%s" "$INPUT" | "$@"', 'sh', process.execPath, ...argv], {
          env: { ...env, INPUT: shellPipe },
          signal,
          stdio: ['ignore', 'ignore', 'pipe'],
        });
  let stderr = '';
  child.stderr!.on('data', (chunk) => (stderr += chunk));
  // A timed-out test aborts the signal, which kills the child rather than leaving it behind.
  child.on('error', () => {});
  return new Promise((resolve) => child.on('close', (code) => resolve({ code, stderr })));
}

/** A file holding this text, open as stdin would be for `featherloop < file`. */
function fileWith(text: string): number {
  const path = join(home, `stdin-${requests.length}-${Math.random()}`);
  writeFileSync(path, text);
  return openSync(path, 'r');
}

/** The last user message of the only request since `start`. */
function onlyPrompt(start: number): string {
  const sent = requests.slice(start);
  assert.equal(sent.length, 1);
  return sent[0]!.messages.findLast((message) => message.role === 'user')!.content;
}

const input = 'line one\n\n  indented line\nline three\n';
const timeout = 20_000;

test('a file on stdin is one prompt, newlines and indentation intact', { timeout }, async (t) => {
  const start = requests.length;
  const fd = fileWith(input);
  const { code, stderr } = await run(t.signal, [], fd);
  closeSync(fd);
  assert.equal(code, 0, stderr);
  assert.equal(onlyPrompt(start), 'line one\n\n  indented line\nline three');
});

test('a piped prompt is one prompt too', { timeout }, async (t) => {
  const start = requests.length;
  const { code, stderr } = await run(t.signal, [], 'ignore', input);
  assert.equal(code, 0, stderr);
  assert.equal(onlyPrompt(start), 'line one\n\n  indented line\nline three');
});

test('piped text follows the argument, after a blank line', { timeout }, async (t) => {
  const start = requests.length;
  const { code, stderr } = await run(t.signal, ['review', 'this diff'], 'ignore', '+added\n-removed\n\n');
  assert.equal(code, 0, stderr);
  assert.equal(onlyPrompt(start), 'review this diff\n\n+added\n-removed');
});

test('with stdin ignored, runs the argument prompt without waiting on stdin', { timeout }, async (t) => {
  const start = requests.length;
  const { code, stderr } = await run(t.signal, ['hello'], 'ignore');
  assert.equal(code, 0, stderr);
  assert.equal(onlyPrompt(start), 'hello');
});

test('empty or blank piped stdin with no argument is an error, with no request', { timeout }, async (t) => {
  for (const piped of ['', ' \n\n']) {
    const start = requests.length;
    const { code, stderr } = await run(t.signal, [], 'ignore', piped);
    assert.equal(code, 1, JSON.stringify(piped));
    assert.match(stderr, /No prompt: pass one as an argument or pipe it on stdin/);
    assert.equal(requests.length, start);
  }
});

test("the config's MCP servers' tools reach the model, unless --no-mcp; their servers stop at exit", { timeout }, async (t) => {
  const config = join(home, 'mcp.yaml');
  const server = fileURLToPath(new URL('./mcp-server.ts', import.meta.url));
  writeFileSync(config, `mcp:\n  fake:\n    type: local\n    command: ${JSON.stringify([process.execPath, server])}\n    tools: [echo]\n`);
  const tools = async (args: string[]) => {
    const start = requests.length;
    const { code, stderr } = await run(t.signal, ['--config', config, ...args, 'hello'], 'ignore');
    assert.equal(code, 0, stderr);
    return requests[start]!.tools?.map((tool) => tool.function.name) ?? [];
  };
  assert.ok((await tools([])).includes('fake_echo'));
  assert.ok(!(await tools(['--no-mcp'])).includes('fake_echo'));
});
