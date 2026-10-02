import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import { isProvider, type Provider } from '../provider.ts';
import { AnthropicProvider } from './anthropic.ts';
import { OpenAIProvider } from './openai.ts';

/** A provider, or an SDK client to wrap in one with default options. */
export type ApiClient = Provider | OpenAI | Anthropic;

export function toProvider(api: ApiClient): Provider {
  if (isProvider(api)) return api;
  const client = api as { chat?: { completions?: unknown }; messages?: { stream?: unknown } };
  if (client.chat?.completions) return new OpenAIProvider(api as OpenAI);
  if (typeof client.messages?.stream === 'function') return new AnthropicProvider(api as Anthropic);
  throw new Error('Unsupported API client: pass an OpenAI or Anthropic client, or a Provider');
}

export * from './anthropic.ts';
export * from './openai.ts';
