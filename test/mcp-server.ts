// A fake MCP server for the tests: over stdio when run (`node mcp-server.ts [mode]`),
// or through `handle()` for an HTTP one. Modes: `modern` (the default), `legacy`
// (wants `initialize` first), `future` (speaks only a later version), `silent`.
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export interface Message {
  id?: number | string;
  method: string;
  params?: Record<string, any>;
}

const VERSION = '2026-07-28';
const cancelled: (number | string)[] = [];

const tools = [
  {
    name: 'echo',
    description: 'Repeats text',
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, times: { type: 'integer', default: 1 } }, required: ['text'] },
    annotations: { readOnlyHint: true },
  },
  { name: 'dotted.name', description: 'No parameters', inputSchema: { type: 'object', additionalProperties: false } },
  { name: 'fail', inputSchema: { type: 'object' } },
  { name: 'slow', inputSchema: { type: 'object' } },
  { name: 'cancelled', inputSchema: { type: 'object' } },
  {
    name: 'anything',
    inputSchema: { type: 'object', $defs: { item: { type: 'string' } }, properties: { items: { type: 'array', items: { $ref: '#/$defs/item' } } } },
  },
  { name: 'image', inputSchema: { type: 'object' } },
  { name: 'ask', inputSchema: { type: 'object' } },
  { name: 'pid', inputSchema: { type: 'object' } },
  { name: 'crash', inputSchema: { type: 'object' } },
  {
    name: 'region',
    inputSchema: { type: 'object', properties: { region: { type: 'string', 'x-mcp-header': 'Region' }, query: { type: 'string' } } },
  },
  { name: 'badheader', inputSchema: { type: 'object', properties: { n: { type: 'number', 'x-mcp-header': 'N' } } } },
];

/** The reply to a message, or undefined for none (a notification, or a call that never ends). */
export function handle(message: Message, mode = 'modern'): object | undefined {
  const { id, method, params = {} } = message;
  if (method === 'notifications/cancelled') return void cancelled.push(params.requestId);
  if (id === undefined || mode === 'silent') return undefined;
  const reply = (result: object) => ({ jsonrpc: '2.0', id, result: { resultType: 'complete', ...result } });
  const error = (code: number, text: string, data?: object) => ({ jsonrpc: '2.0', id, error: { code, message: text, ...(data ? { data } : {}) } });
  if (mode === 'legacy') return method === 'initialize' ? reply({}) : error(-32600, 'Not initialized');

  const version = params._meta?.['io.modelcontextprotocol/protocolVersion'];
  if (!version || !params._meta['io.modelcontextprotocol/clientCapabilities']) return error(-32602, 'Missing _meta');
  const supported = mode === 'future' ? ['2099-01-01'] : [VERSION];
  if (!supported.includes(version)) return error(-32022, 'Unsupported protocol version', { supported, requested: version });

  switch (method) {
    case 'server/discover':
      return reply({ supportedVersions: supported, capabilities: { tools: {} } });
    case 'tools/list':
      // Two pages.
      return params.cursor === 'page-2' ? reply({ tools: tools.slice(2) }) : reply({ tools: tools.slice(0, 2), nextCursor: 'page-2' });
    case 'tools/call':
      return call(params.name, params.arguments ?? {}, reply);
    default:
      return error(-32601, `Method not found: ${method}`);
  }
}

function call(name: string, args: Record<string, any>, reply: (result: object) => object): object | undefined {
  const text = (text: string) => reply({ content: [{ type: 'text', text }] });
  switch (name) {
    case 'echo':
      return text(Array(args.times).fill(args.text).join(' '));
    case 'dotted.name':
      return text('dotted');
    case 'fail':
      return reply({ content: [{ type: 'text', text: 'it broke' }], isError: true });
    case 'slow':
      return undefined;
    case 'cancelled':
      return text(JSON.stringify(cancelled));
    case 'anything':
    case 'region':
      return text(JSON.stringify(args));
    case 'image':
      return reply({ content: [{ type: 'image', data: 'iVBORw0K', mimeType: 'image/png' }, { type: 'text', text: 'a caption' }] });
    case 'ask':
      return reply({ resultType: 'input_required', inputRequests: {} });
    case 'pid':
      return text(String(process.pid));
    case 'crash':
      process.stderr.write('something went wrong\n');
      process.exit(3);
    default:
      return reply({ content: [{ type: 'text', text: `Unknown tool ${name}` }], isError: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  createInterface({ input: process.stdin }).on('line', (line) => {
    const out = handle(JSON.parse(line) as Message, mode);
    if (out) process.stdout.write(`${JSON.stringify(out)}\n`);
  });
}
