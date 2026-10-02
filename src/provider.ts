import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from 'openai/resources/chat/completions';
import type { JSONSchema } from './tool.ts';

/** Why a model stopped, normalized across providers. */
export type StopReason = 'end' | 'tool_use' | 'max_tokens' | 'refusal' | 'other';

/**
 * Assistant message as kept in history. Conversations use the OpenAI chat
 * shape as the common format, with a few extensions:
 * - `reasoning_content`: thinking text (llama.cpp's field; filled by every provider).
 * - `stop`: why the model stopped.
 * - `native`: the provider's raw content, replayed verbatim to the same provider
 *   (e.g. Anthropic thinking blocks must be passed back unchanged).
 */
export type AssistantMessage = Omit<ChatCompletionAssistantMessageParam, 'tool_calls'> & {
  tool_calls?: ChatCompletionMessageFunctionToolCall[];
  reasoning_content?: string;
  stop?: StopReason;
  native?: { provider: string; content: unknown };
};

/** Tool result; `is_error` lets providers that support it flag failures. */
export type ToolMessage = ChatCompletionToolMessageParam & { is_error?: boolean };

export type Message = ChatCompletionMessageParam | AssistantMessage | ToolMessage;

/** Token counts for one model call. `input` excludes cache reads and writes. */
export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** Part of `output` spent on reasoning, when the provider reports it. */
  reasoning?: number;
}

export function addUsage(a: Usage, b: Usage): Usage {
  const sum: Usage = {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  };
  if (a.reasoning !== undefined || b.reasoning !== undefined) sum.reasoning = (a.reasoning ?? 0) + (b.reasoning ?? 0);
  return sum;
}

export const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

export interface ToolSpec {
  name: string;
  description: string;
  parameters: JSONSchema;
}

export interface TurnRequest {
  model: string;
  messages: readonly Message[];
  tools: readonly ToolSpec[];
  signal?: AbortSignal | undefined;
  /** Extra provider-specific request fields. */
  request?: Record<string, unknown> | undefined;
}

export interface TurnHandlers {
  reasoning(delta: string): void;
  content(delta: string): void;
  usage?(usage: Usage): void;
}

export interface CompleteRequest {
  model: string;
  system?: string | undefined;
  prompt: string;
  signal?: AbortSignal | undefined;
  onUsage?: ((usage: Usage) => void) | undefined;
  /** Extra provider-specific request fields. */
  request?: Record<string, unknown> | undefined;
}

/** What the loop and tools need from a model API. */
export interface Provider {
  readonly name: string;
  /** Streams one assistant turn, reporting deltas as they arrive. */
  turn(request: TurnRequest, on: TurnHandlers): Promise<AssistantMessage>;
  /** Single non-streaming completion without tools, e.g. for compaction. */
  complete(request: CompleteRequest): Promise<string>;
}

export function isProvider(value: unknown): value is Provider {
  return typeof value === 'object' && value !== null && typeof (value as Provider).turn === 'function';
}
