import type Anthropic from '@anthropic-ai/sdk';
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessageParam,
  BetaTool,
  BetaUsage,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import type {
  AssistantMessage,
  CompleteRequest,
  Message,
  Provider,
  StopReason,
  ToolMessage,
  TurnHandlers,
  TurnRequest,
  Usage,
} from '../provider.ts';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AnthropicProviderOptions {
  /** Defaults to 64000; turns are streamed, so large values are fine. */
  maxTokens?: number;
  /** `output_config.effort`; unset uses the model's default (`medium` on Claude Opus 5.5). Not sent to Claude Haiku 4.5. */
  effort?: Effort;
  /**
   * Adaptive thinking display. `summarized` (default) returns readable thinking
   * summaries; `false` omits the `thinking` parameter. Not sent to Claude Haiku 4.5.
   */
  thinking?: 'summarized' | 'omitted' | false;
  /** Server-side fallback when a request is declined for policy reasons. On by default; not sent to Claude Haiku 4.5. */
  fallbacks?: 'default' | false;
  /** Automatic prompt caching of the conversation prefix. On by default. */
  cache?: boolean;
}

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/**
 * Claude Haiku 4.5 rejects adaptive thinking and `effort`, and server-side
 * fallbacks aren't documented for it. Checked per request, not per provider,
 * since `/model` can switch models mid-session.
 */
const lacksAdaptive = (model: string) => model.startsWith('claude-haiku-4-5');

const NO_ADAPTIVE: AnthropicProviderOptions = { thinking: false, fallbacks: false };

/** Claude through the Messages API (`@anthropic-ai/sdk`). */
export class AnthropicProvider implements Provider {
  readonly name = 'anthropic';
  readonly client: Anthropic;
  readonly options: AnthropicProviderOptions;

  constructor(client: Anthropic, options: AnthropicProviderOptions = {}) {
    this.client = client;
    this.options = options;
  }

  async turn({ model, messages, tools, signal, request }: TurnRequest, on: TurnHandlers): Promise<AssistantMessage> {
    const { maxTokens = 64_000, cache = true } = this.options;
    const { effort, thinking = 'summarized', fallbacks = 'default' } = lacksAdaptive(model) ? NO_ADAPTIVE : this.options;
    const { system, messages: converted } = toAnthropic(messages);

    const stream = this.client.beta.messages.stream(
      {
        model,
        max_tokens: maxTokens,
        messages: converted,
        ...(system ? { system } : {}),
        ...(tools.length
          ? {
              tools: tools.map(({ name, description, parameters }): BetaTool => ({
                name,
                description,
                input_schema: parameters as BetaTool.InputSchema,
              })),
            }
          : {}),
        ...(thinking ? { thinking: { type: 'adaptive' as const, display: thinking } } : {}),
        ...(effort ? { output_config: { effort } } : {}),
        ...(cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
        ...(fallbacks ? { betas: [FALLBACK_BETA], fallbacks } : {}),
        ...request,
      },
      { signal },
    );

    // Separate consecutive blocks of the same kind, as the final message does.
    let sawText = false;
    let sawThinking = false;
    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text' && sawText) on.content('\n\n');
        if (event.content_block.type === 'thinking' && sawThinking) on.reasoning('\n\n');
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          sawText = true;
          on.content(event.delta.text);
        } else if (event.delta.type === 'thinking_delta') {
          sawThinking = true;
          on.reasoning(event.delta.thinking);
        }
      }
    }
    const final = await stream.finalMessage();
    on.usage?.(toUsage(final.usage));

    const message: AssistantMessage = {
      role: 'assistant',
      content: textOf(final.content) || null,
      stop: stopReason(final.stop_reason),
      native: { provider: this.name, content: final.content },
    };
    const reasoning = final.content
      .flatMap((block) => (block.type === 'thinking' && block.thinking ? [block.thinking] : []))
      .join('\n\n');
    if (reasoning) message.reasoning_content = reasoning;
    const calls = final.content.flatMap((block) =>
      block.type === 'tool_use'
        ? [{ id: block.id, type: 'function' as const, function: { name: block.name, arguments: JSON.stringify(block.input) } }]
        : [],
    );
    if (calls.length) message.tool_calls = calls;
    return message;
  }

  async complete({ model, system, prompt, signal, request, onUsage }: CompleteRequest): Promise<string> {
    const response = await this.client.beta.messages.create(
      {
        model,
        max_tokens: 16_000,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
        ...request,
      },
      { signal },
    );
    onUsage?.(toUsage(response.usage));
    return textOf(response.content).trim();
  }
}

function toUsage(usage: BetaUsage): Usage {
  const reasoning = usage.output_tokens_details?.thinking_tokens;
  return {
    input: usage.input_tokens,
    output: usage.output_tokens,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    ...(reasoning ? { reasoning } : {}),
  };
}

/**
 * Converts the common history format. Leading system messages become the
 * `system` prompt; tool results and any user text that follows are merged
 * into one user message, since parallel results belong together.
 */
export function toAnthropic(messages: readonly Message[]): { system: string | undefined; messages: BetaMessageParam[] } {
  const system: string[] = [];
  const out: BetaMessageParam[] = [];

  const pushUser = (blocks: BetaContentBlockParam[]) => {
    const last = out.at(-1);
    if (last?.role === 'user') last.content = [...asBlocks(last.content), ...blocks];
    else out.push({ role: 'user', content: blocks });
  };

  for (const message of messages) {
    switch (message.role) {
      case 'system':
      case 'developer': {
        const text = plainText(message.content);
        if (!out.length) system.push(text);
        else out.push({ role: 'system', content: text });
        break;
      }
      case 'user':
        pushUser(userBlocks(message.content));
        break;
      case 'tool': {
        const { tool_call_id, content, is_error } = message as ToolMessage;
        pushUser([{ type: 'tool_result', tool_use_id: tool_call_id, content: plainText(content), ...(is_error ? { is_error } : {}) }]);
        break;
      }
      case 'assistant': {
        const assistant = message as AssistantMessage;
        // Replay Claude's own blocks verbatim; thinking blocks must come back unchanged.
        if (assistant.native?.provider === 'anthropic') {
          out.push({ role: 'assistant', content: assistant.native.content as BetaContentBlockParam[] });
          break;
        }
        const blocks: BetaContentBlockParam[] = [];
        const text = assistant.content ? plainText(assistant.content) : '';
        if (text) blocks.push({ type: 'text', text });
        for (const call of assistant.tool_calls ?? []) {
          blocks.push({ type: 'tool_use', id: call.id, name: call.function.name, input: parseInput(call.function.arguments) });
        }
        if (blocks.length) out.push({ role: 'assistant', content: blocks });
        break;
      }
      default:
        throw new Error(`Unsupported message role "${message.role}" for Anthropic`);
    }
  }

  return { system: system.length ? system.join('\n\n') : undefined, messages: out };
}

function userBlocks(content: string | ChatCompletionContentPart[]): BetaContentBlockParam[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return content.map((part): BetaContentBlockParam => {
    if (part.type === 'text') return { type: 'text', text: part.text };
    if (part.type === 'image_url') {
      const data = /^data:(image\/[\w+.-]+);base64,(.*)$/.exec(part.image_url.url);
      return data
        ? { type: 'image', source: { type: 'base64', media_type: data[1] as 'image/png', data: data[2] ?? '' } }
        : { type: 'image', source: { type: 'url', url: part.image_url.url } };
    }
    throw new Error(`Unsupported content part "${part.type}" for Anthropic`);
  });
}

function asBlocks(content: string | BetaContentBlockParam[]): BetaContentBlockParam[] {
  return typeof content === 'string' ? [{ type: 'text', text: content }] : content;
}

function plainText(content: string | readonly { type: string; text?: string }[]): string {
  return typeof content === 'string' ? content : content.map((part) => part.text ?? '').join('');
}

function textOf(content: BetaContentBlock[]): string {
  return content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n\n');
}

function parseInput(raw: string): Record<string, unknown> {
  try {
    const input: unknown = JSON.parse(raw || '{}');
    return typeof input === 'object' && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stopReason(reason: string | null): StopReason {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'end';
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
    case 'model_context_window_exceeded':
      return 'max_tokens';
    case 'refusal':
      return 'refusal';
    default:
      return 'other';
  }
}
