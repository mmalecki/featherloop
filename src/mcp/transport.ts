import type { JSONSchema } from '../tool.ts';

/**
 * The MCP revision featherloop speaks. Only this one: servers on revisions with an
 * `initialize` handshake (2025-11-25 and earlier) fail at `server/discover`.
 */
export const PROTOCOL_VERSION = '2026-07-28';

export interface RequestOptions {
  signal?: AbortSignal | undefined;
  timeoutMs: number;
  /** The called tool's input schema, for `tools/call`: HTTP mirrors some arguments into headers. */
  schema?: JSONSchema | undefined;
}

/** One way to reach a server. */
export interface Transport {
  /** A request's result; an error reply is thrown as an `McpError`. */
  request(method: string, params: Record<string, unknown>, options: RequestOptions): Promise<Record<string, unknown>>;
  /** Why this transport can't call a tool, if it can't. */
  rejects?(inputSchema: JSONSchema): string | undefined;
  close(): Promise<void>;
}

/** An error reply from a server. */
export class McpError extends Error {
  override name = 'McpError';
  readonly code: number;
  readonly data: unknown;

  constructor(message: string, code: number, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

/** No reply in time. */
export class McpTimeoutError extends Error {
  override name = 'McpTimeoutError';
}

/** A JSON-RPC message from a server. */
export interface Incoming {
  id?: string | number;
  method?: string;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

/** A response's result, or its error thrown. */
export function settle(message: Incoming): Record<string, unknown> {
  if (message.error) throw new McpError(message.error.message, message.error.code, message.error.data);
  if (typeof message.result !== 'object' || message.result === null) throw new Error('The server sent a malformed response');
  return message.result;
}

/** Aborts with the caller's signal or after the timeout, and says which. */
export function deadline(method: string, { signal, timeoutMs }: RequestOptions): { signal: AbortSignal; reason(): unknown } {
  const timeout = AbortSignal.timeout(timeoutMs);
  return {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    reason: () => (signal?.aborted ? signal.reason : new McpTimeoutError(`No reply to ${method} in ${timeoutMs / 1000}s`)),
  };
}
