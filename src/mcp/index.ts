import type { McpConfig } from '../config.ts';
import { defineTool, type JSONSchema, type ParamDefinition, type Tool, type Toolset } from '../tool.ts';
import { HttpTransport } from './http.ts';
import { StdioTransport } from './stdio.ts';
import { McpError, McpTimeoutError, PROTOCOL_VERSION, type RequestOptions, type Transport } from './transport.ts';

export { McpError, PROTOCOL_VERSION as MCP_PROTOCOL_VERSION } from './transport.ts';

export interface McpOptions {
  /** The client's name and version, as servers are told. */
  clientInfo?: { name: string; version: string };
  /** Hears of each server or tool left out, e.g. a server that failed to start. */
  onWarning?: (message: string) => void;
}

export interface McpServers {
  /** The servers' tools, keyed `<server>_<tool>`, in the config's order. */
  tools(): Toolset;
  /** How many tools each server that connected gives. */
  readonly servers: ReadonlyMap<string, number>;
  /** Stops the local servers. */
  close(): Promise<void>;
}

/** What a server says about a tool. */
interface McpTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JSONSchema;
  annotations?: { readOnlyHint?: boolean };
}

type Call = (method: string, params: Record<string, unknown>, options: RequestOptions) => Promise<Record<string, unknown>>;

/** As OpenCode's: for `server/discover` and `tools/list`. */
const DEFAULT_TIMEOUT_MS = 5_000;
/** For each tool call. */
const CALL_TIMEOUT_MS = 300_000;
/** Longer results keep their start. */
const MAX_RESULT_CHARS = 30_000;
/** Bounds `tools/list` against a server that never stops paging. */
const MAX_PAGES = 100;
const UNSUPPORTED_PROTOCOL_VERSION = -32022;

/**
 * Connects to MCP servers, in parallel, and lists their tools. A server that fails
 * is left out with a warning, rather than failing them all. Only tools: no
 * resources, prompts, or input requests (sampling, elicitation, roots).
 */
export async function connectMcp(config: Record<string, McpConfig>, options: McpOptions = {}): Promise<McpServers> {
  const warn = options.onWarning ?? (() => {});
  const enabled = Object.entries(config).filter(([, server]) => server.enabled !== false);
  const transports = enabled.map(([, server]) => (server.type === 'local' ? new StdioTransport(server) : new HttpTransport(server)));
  const listed = await Promise.all(
    enabled.map(async ([name, server], i) => {
      try {
        return await serverTools(name, server, transports[i]!, options.clientInfo, warn);
      } catch (err) {
        warn(`MCP server ${name} left out: ${(err as Error).message}`);
        await transports[i]!.close();
        return undefined;
      }
    }),
  );

  const tools: Toolset = {};
  const servers = new Map<string, number>();
  listed.forEach((found, i) => {
    if (!found) return;
    const server = enabled[i]![0];
    for (const [name, tool] of found) {
      if (name in tools) warn(`MCP server ${server}: left out ${name}, which another tool's name also became`);
      else tools[name] = tool;
    }
    servers.set(server, found.length);
  });
  return {
    tools: () => ({ ...tools }),
    servers,
    close: async () => void (await Promise.all(transports.map((transport) => transport.close()))),
  };
}

async function serverTools(
  server: string,
  config: McpConfig,
  transport: Transport,
  clientInfo: McpOptions['clientInfo'],
  warn: (message: string) => void,
): Promise<[string, Tool][]> {
  const _meta = {
    'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
    'io.modelcontextprotocol/clientCapabilities': {},
    ...(clientInfo ? { 'io.modelcontextprotocol/clientInfo': clientInfo } : {}),
  };
  const call: Call = async (method, params, options) => complete(await transport.request(method, { ...params, _meta }, options));
  const timeoutMs = config.timeout ?? DEFAULT_TIMEOUT_MS;

  let discovered: Record<string, unknown>;
  try {
    discovered = await call('server/discover', {}, { timeoutMs });
  } catch (err) {
    if (err instanceof McpError && err.code === UNSUPPORTED_PROTOCOL_VERSION) {
      const supported = (err.data as { supported?: string[] } | undefined)?.supported ?? [];
      throw new Error(`it speaks MCP ${supported.join(', ') || 'other versions'}; featherloop speaks ${PROTOCOL_VERSION}`);
    }
    // Servers from before server/discover existed reply with some error, or not at all.
    if (err instanceof McpError || err instanceof McpTimeoutError) {
      throw new Error(`${err.message} (featherloop speaks MCP ${PROTOCOL_VERSION} only; older servers fail server/discover)`);
    }
    throw err;
  }
  if (!(discovered.capabilities as Record<string, unknown> | undefined)?.tools) throw new Error('it has no tools');

  const listed: McpTool[] = [];
  let cursor: unknown;
  for (let page = 0; page < MAX_PAGES && (page === 0 || typeof cursor === 'string'); page++) {
    const result = await call('tools/list', cursor === undefined ? {} : { cursor }, { timeoutMs });
    listed.push(...((result.tools ?? []) as McpTool[]));
    cursor = result.nextCursor;
  }

  const wanted = config.tools && new Set(config.tools);
  for (const name of wanted ?? []) {
    if (!listed.some((tool) => tool.name === name)) warn(`MCP server ${server} has no tool ${name}`);
  }
  const tools: [string, Tool][] = [];
  for (const tool of listed) {
    if (wanted && !wanted.has(tool.name)) continue;
    const rejected = transport.rejects?.(tool.inputSchema);
    if (rejected) warn(`MCP server ${server}: left out ${tool.name}: ${rejected}`);
    else tools.push([toolName(server, tool.name), mcpTool(tool, call)]);
  }
  return tools;
}

/** A result's fields, unless it asks for input featherloop doesn't give. */
function complete(result: Record<string, unknown>): Record<string, unknown> {
  const { resultType = 'complete' } = result;
  if (resultType === 'complete') return result;
  if (resultType === 'input_required') throw new Error('The server asked for input (sampling, elicitation or roots), which featherloop does not provide');
  throw new Error(`Unknown resultType ${JSON.stringify(resultType)}`);
}

/** `<server>_<tool>`, with characters the APIs don't allow in tool names replaced, cut to their limit of 64. */
function toolName(server: string, tool: string): string {
  return `${server}_${tool}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
}

/**
 * A server's tool as one of ours. A plain schema becomes `defineTool` parameters,
 * so string arguments are coerced as small models need; any other is passed on as
 * it is. Only read-only tools run in parallel; the rest in order, like `write`.
 */
function mcpTool(tool: McpTool, call: Call): Tool {
  const description = tool.description ?? tool.title ?? '';
  const sequential = tool.annotations?.readOnlyHint !== true;
  const invoke = async (args: Record<string, unknown>, { signal }: { signal?: AbortSignal | undefined }) =>
    text(await call('tools/call', { name: tool.name, arguments: args }, { signal, timeoutMs: CALL_TIMEOUT_MS, schema: tool.inputSchema }));
  const params = paramsOf(tool.inputSchema);
  if (!params) return { sequential, schema: () => ({ description, parameters: tool.inputSchema }), invoke };
  return defineTool<Record<string, unknown>>({ description, params, sequential, invoke })();
}

/** Schema keys that `defineTool` parameters can stand for. */
const PLAIN_KEYS = new Set(['type', 'properties', 'required', 'additionalProperties', '$schema', 'title', 'description']);

/** Parameters for a plain object schema: no `$defs`, combinators, or extra properties. */
function paramsOf(schema: JSONSchema): Record<string, ParamDefinition> | undefined {
  const { type, properties, required = [], additionalProperties = false } = schema as Record<string, any>;
  const plain = Object.keys(schema).every((key) => PLAIN_KEYS.has(key)) && additionalProperties === false;
  if (type !== 'object' || !plain || typeof properties !== 'object' || properties === null || !Object.keys(properties).length) return undefined;
  return Object.fromEntries(
    Object.entries<Record<string, unknown>>(properties).map(([name, property]) => {
      const { default: fallback, ...rest } = property;
      return [name, { schema: rest, required: required.includes(name), ...('default' in property ? { default: fallback } : {}) }];
    }),
  );
}

/** A call's result as text: images and other binary content are named, not sent. Throws if the tool failed. */
function text(result: Record<string, unknown>): string {
  const blocks = Array.isArray(result.content) ? (result.content as Record<string, any>[]) : [];
  let text = blocks.map(blockText).join('\n');
  if (!text && result.structuredContent !== undefined) text = JSON.stringify(result.structuredContent);
  if (text.length > MAX_RESULT_CHARS) text = `${text.slice(0, MAX_RESULT_CHARS)}\n[… ${text.length - MAX_RESULT_CHARS} more characters cut]`;
  if (result.isError === true) throw new Error(text || 'The tool failed');
  return text;
}

function blockText(block: Record<string, any>): string {
  switch (block.type) {
    case 'text':
      return String(block.text);
    case 'resource':
      return typeof block.resource?.text === 'string' ? block.resource.text : `[${block.resource?.mimeType ?? 'binary'} resource ${block.resource?.uri} omitted]`;
    case 'resource_link':
      return `[Resource: ${block.uri}]`;
    default:
      return `[${block.mimeType ?? block.type} omitted]`;
  }
}
