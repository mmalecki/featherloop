import type OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import type { CompletionUsage } from 'openai/resources/completions';
import type {
  AssistantMessage,
  CompleteRequest,
  Message,
  Provider,
  Reasoning,
  StopReason,
  TurnHandlers,
  TurnRequest,
  Usage,
} from '../provider.ts';

export interface OpenAIProviderOptions {
  /** Extra request fields for every call, e.g. `reasoning_effort`; a call's own fields win. */
  request?: Record<string, unknown>;
}

/** OpenAI Chat Completions, and compatible servers such as llama.cpp. */
export class OpenAIProvider implements Provider {
  readonly name = 'openai';
  readonly client: OpenAI;
  readonly options: OpenAIProviderOptions;

  constructor(client: OpenAI, options: OpenAIProviderOptions = {}) {
    this.client = client;
    this.options = options;
  }

  async turn({ model, messages, tools, signal, reasoning: asked, request: own }: TurnRequest, on: TurnHandlers): Promise<AssistantMessage> {
    const request: Record<string, unknown> = { ...this.options.request, ...reasoningEffort(asked), ...own };
    const stream = await this.client.chat.completions.create(
      {
        ...request,
        model,
        messages: messages.map(toOpenAI),
        stream: true,
        stream_options: { include_usage: true, ...(request.stream_options as object | undefined) },
        ...(tools.length
          ? { tools: tools.map(({ name, description, parameters }) => ({ type: 'function' as const, function: { name, description, parameters } })) }
          : {}),
      },
      { signal },
    );

    let content = '';
    let reasoning = '';
    let finish: string | null = null;
    const calls: ChatCompletionMessageFunctionToolCall[] = [];

    for await (const chunk of stream) {
      // Sent in a final chunk without choices.
      if (chunk.usage) on.usage?.(toUsage(chunk.usage));
      const choice = chunk.choices[0];
      if (choice?.finish_reason) finish = choice.finish_reason;
      // Reasoning is an extension: `reasoning_content` from llama.cpp and DeepSeek,
      // `reasoning` from vLLM.
      const delta = choice?.delta as
        | (ChatCompletionChunk.Choice.Delta & { reasoning_content?: string | null; reasoning?: string | null })
        | undefined;
      if (!delta) continue;

      const thought = delta.reasoning_content || delta.reasoning;
      if (thought) {
        reasoning += thought;
        on.reasoning(thought);
      }
      if (delta.content) {
        content += delta.content;
        on.content(delta.content);
      }
      for (const part of delta.tool_calls ?? []) {
        const call = callFor(calls, part);
        if (part.id) call.id = part.id;
        if (part.function?.name) call.function.name += part.function.name;
        if (part.function?.arguments) call.function.arguments += part.function.arguments;
      }
    }

    const toolCalls = calls.filter(Boolean).map((call, i) => (call.id ? call : { ...call, id: `call_${i}` }));
    const message: AssistantMessage = { role: 'assistant', content: content || null, stop: stopReason(finish) };
    if (reasoning) message.reasoning_content = reasoning;
    if (toolCalls.length) message.tool_calls = toolCalls;
    return message;
  }

  async complete({ model, system, prompt, signal, reasoning, request, onUsage }: CompleteRequest): Promise<string> {
    const completion = await this.client.chat.completions.create(
      {
        ...this.options.request,
        ...reasoningEffort(reasoning),
        ...request,
        model,
        stream: false,
        messages: [...(system ? [{ role: 'system' as const, content: system }] : []), { role: 'user', content: prompt }],
      },
      { signal },
    );
    if (completion.usage) onUsage?.(toUsage(completion.usage));
    return completion.choices[0]?.message.content?.trim() ?? '';
  }
}

/**
 * OpenAI's `reasoning_effort`, which llama.cpp also takes: `none` turns thinking
 * off in templates that can, such as Qwen's.
 */
function reasoningEffort(reasoning: Reasoning | undefined): { reasoning_effort?: Reasoning } {
  return reasoning === undefined ? {} : { reasoning_effort: reasoning };
}

/**
 * The call a streamed piece belongs to. OpenAI numbers every piece with `index`;
 * some servers (Gemini's and Ollama's OpenAI-compatible APIs) leave it out and send
 * each call whole, with its id. Those are matched by id, and a piece with neither
 * continues the last call, so two calls never merge into one, as treating a
 * missing index as 0 would do.
 */
function callFor(
  calls: ChatCompletionMessageFunctionToolCall[],
  part: ChatCompletionChunk.Choice.Delta.ToolCall,
): ChatCompletionMessageFunctionToolCall {
  const index = typeof part.index === 'number' ? part.index : part.id ? calls.findIndex((call) => call?.id === part.id) : calls.length - 1;
  return (calls[index < 0 ? calls.length : index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } });
}

function toUsage(usage: CompletionUsage): Usage {
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const reasoning = usage.completion_tokens_details?.reasoning_tokens;
  return {
    input: usage.prompt_tokens - cached,
    output: usage.completion_tokens,
    cacheRead: cached,
    cacheWrite: 0,
    ...(reasoning ? { reasoning } : {}),
  };
}

/** Drops our history extensions; `reasoning_content` stays for servers that use it. */
function toOpenAI(message: Message): ChatCompletionMessageParam {
  if (message.role === 'assistant') {
    const { stop: _stop, native: _native, ...rest } = message as AssistantMessage;
    return rest as ChatCompletionMessageParam;
  }
  if (message.role === 'tool') {
    const { is_error: _isError, ...rest } = message as Message & { is_error?: boolean };
    return rest as ChatCompletionMessageParam;
  }
  return message;
}

function stopReason(finish: string | null): StopReason {
  switch (finish) {
    case 'stop':
      return 'end';
    case 'tool_calls':
    case 'function_call':
      return 'tool_use';
    case 'length':
      return 'max_tokens';
    case 'content_filter':
      return 'refusal';
    default:
      return 'other';
  }
}
