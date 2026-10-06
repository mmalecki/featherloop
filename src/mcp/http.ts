import type { RemoteMcpConfig } from '../config.ts';
import type { JSONSchema } from '../tool.ts';
import { deadline, PROTOCOL_VERSION, settle, type Incoming, type RequestOptions, type Transport } from './transport.ts';

/** HTTP's field-name token characters, which an `x-mcp-header` name must stick to. */
const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/**
 * Streamable HTTP: a POST per request, answered with JSON or an SSE stream. The
 * request's method, tool name and `x-mcp-header` arguments go in headers too, as
 * the spec requires. Aborting the request closes the stream, which cancels it.
 */
export class HttpTransport implements Transport {
  readonly #config: RemoteMcpConfig;
  #nextId = 1;

  constructor(config: RemoteMcpConfig) {
    this.#config = config;
  }

  rejects(inputSchema: JSONSchema): string | undefined {
    try {
      headerParams(inputSchema);
    } catch (err) {
      return (err as Error).message;
    }
  }

  async request(method: string, params: Record<string, unknown>, options: RequestOptions): Promise<Record<string, unknown>> {
    const id = this.#nextId++;
    const headers: Record<string, string> = {
      ...this.#config.headers,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': PROTOCOL_VERSION,
      'mcp-method': method,
    };
    if (typeof params.name === 'string') headers['mcp-name'] = headerValue(params.name);
    for (const { header, path } of options.schema ? headerParams(options.schema) : []) {
      const value = path.reduce<unknown>((at, key) => (at as Record<string, unknown> | undefined)?.[key], params.arguments);
      if (value !== undefined && value !== null) headers[`mcp-param-${header}`] = headerValue(value);
    }

    const { signal, reason } = deadline(method, options);
    try {
      const response = await fetch(this.#config.url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }), signal });
      if (response.headers.get('content-type')?.startsWith('text/event-stream')) return settle(await fromStream(response, id));
      const text = await response.text();
      let message: Incoming | undefined;
      try {
        message = JSON.parse(text) as Incoming;
      } catch {
        // Not JSON-RPC: reported by status below.
      }
      // Errors come with 4xx statuses; a body that's an error reply says more than the status.
      if (message?.error || (response.ok && message)) return settle(message);
      throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 500)}` : ''}`);
    } catch (err) {
      throw signal.aborted ? reason() : err;
    }
  }

  async close(): Promise<void> {}
}

/** The reply to request `id` from an SSE stream, skipping the notifications before it. */
async function fromStream(response: Response, id: number): Promise<Incoming> {
  let buffer = '';
  for await (const chunk of response.body!.pipeThrough(new TextDecoderStream())) {
    buffer = (buffer + chunk).replace(/\r\n/g, '\n');
    for (let end = buffer.indexOf('\n\n'); end >= 0; end = buffer.indexOf('\n\n')) {
      const data = buffer
        .slice(0, end)
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(line.startsWith('data: ') ? 6 : 5))
        .join('\n');
      buffer = buffer.slice(end + 2);
      const message = data ? (JSON.parse(data) as Incoming) : undefined;
      if (message?.id === id) return message;
    }
  }
  throw new Error('The server ended its stream without a reply');
}

/**
 * The arguments a tool's schema marks with `x-mcp-header`, by path. Throws for
 * marks the spec forbids, which make the tool invalid: on a parameter that isn't
 * reached through `properties` alone, or that isn't a string, integer or boolean.
 */
function headerParams(schema: JSONSchema): { header: string; path: string[] }[] {
  const found: { header: string; path: string[] }[] = [];
  const seen = new Set<string>();
  const walk = (node: unknown, path: string[] | undefined): void => {
    if (typeof node !== 'object' || node === null) return;
    const { 'x-mcp-header': header, type } = node as Record<string, unknown>;
    if (header !== undefined) {
      if (!path?.length) throw new Error('x-mcp-header on a parameter not reached through properties alone');
      if (typeof header !== 'string' || !TOKEN.test(header)) throw new Error(`invalid x-mcp-header ${JSON.stringify(header)}`);
      if (!['string', 'integer', 'boolean'].includes(type as string)) throw new Error(`x-mcp-header ${header} on a parameter of type ${String(type)}`);
      if (seen.has(header.toLowerCase())) throw new Error(`x-mcp-header ${header} given twice`);
      seen.add(header.toLowerCase());
      found.push({ header, path });
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'properties' && path && typeof value === 'object' && value !== null) {
        for (const [name, property] of Object.entries(value)) walk(property, [...path, name]);
      } else {
        walk(value, undefined);
      }
    }
  };
  walk(schema, []);
  return found;
}

/** A header value as the spec encodes it: plain if it's safe ASCII, else Base64 in its sentinel. */
function headerValue(value: unknown): string {
  const text = String(value);
  const plain = /^[\x20-\x7e]*$/.test(text) && text.trim() === text && !/^=\?base64\?.*\?=$/.test(text);
  return plain ? text : `=?base64?${Buffer.from(text).toString('base64')}?=`;
}
