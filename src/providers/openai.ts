import type OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import type { CompletionUsage } from 'openai/resources/completions';
import type { AssistantMessage, CompleteRequest, Message, Provider, StopReason, TurnHandlers, TurnRequest, Usage } from '../provider.ts';

/** OpenAI Chat Completions, and compatible servers such as llama.cpp. */
export class OpenAIProvider implements Provider {
  readonly name = 'openai';
  readonly client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  async turn({ model, messages, tools, signal, request }: TurnRequest, on: TurnHandlers): Promise<AssistantMessage> {
    const stream = await this.client.chat.completions.create(
      {
        ...request,
        model,
        messages: messages.map(toOpenAI),
        stream: true,
        stream_options: { include_usage: true, ...(request?.stream_options as object | undefined) },
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
      // `reasoning_content` is llama.cpp's (and vLLM's/DeepSeek's) extension.
      const delta = choice?.delta as (ChatCompletionChunk.Choice.Delta & { reasoning_content?: string | null }) | undefined;
      if (!delta) continue;

      if (delta.reasoning_content) {
        reasoning += delta.reasoning_content;
        on.reasoning(delta.reasoning_content);
      }
      if (delta.content) {
        content += delta.content;
        on.content(delta.content);
      }
      for (const part of delta.tool_calls ?? []) {
        const call = (calls[part.index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } });
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

  async complete({ model, system, prompt, signal, request, onUsage }: CompleteRequest): Promise<string> {
    const completion = await this.client.chat.completions.create(
      {
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
