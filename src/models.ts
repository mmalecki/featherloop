import type Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { API_PACKAGES, ConfigError, type Config, type ProviderConfig } from './config.ts';
import type { Effort, Provider } from './provider.ts';
import { AnthropicProvider, type AnthropicProviderOptions } from './providers/anthropic.ts';
import { OpenAIProvider, type OpenAIProviderOptions } from './providers/openai.ts';

/**
 * A model ready to run: the provider and model id to give a loop, or that a tool
 * could get through its context to run inference with.
 */
export interface ResolvedModel {
  /** `provider/model`, as resolved. */
  ref: string;
  api: Provider;
  /** The id the API knows the model by. */
  model: string;
  variant?: string;
}

export interface ModelRegistryOptions {
  /** Options for every OpenAI-compatible provider; a model's limit and variant take precedence. */
  openai?: OpenAIProviderOptions;
  /** Options for every Anthropic provider; a model's limit and variant take precedence. */
  anthropic?: AnthropicProviderOptions;
}

/** The models a config's providers offer, referred to as `provider/model`. */
export class ModelRegistry {
  /** The config's default model, if it names one. */
  readonly default: string | undefined;
  readonly #providers: Record<string, ProviderConfig>;
  readonly #options: ModelRegistryOptions;
  /** SDK clients, one per provider, made on first use. */
  readonly #clients = new Map<string, Promise<OpenAI | Anthropic>>();

  constructor(config: Config = {}, options: ModelRegistryOptions = {}) {
    this.default = config.model;
    this.#providers = config.provider ?? {};
    this.#options = options;
  }

  /**
   * Splits a reference at its first slash, as model ids may have their own (e.g.
   * `local/Qwen/Qwen3.5-9B`). Undefined when the first part names no provider
   * here, e.g. for a bare model id.
   */
  parseRef(ref: string): { provider: string; model: string } | undefined {
    const slash = ref.indexOf('/');
    if (slash < 0 || !Object.hasOwn(this.#providers, ref.slice(0, slash))) return undefined;
    return { provider: ref.slice(0, slash), model: ref.slice(slash + 1) };
  }

  /** Every model, as `provider/model`, with its variants' names. */
  list(): { ref: string; variants: string[] }[] {
    return Object.entries(this.#providers).flatMap(([provider, { models }]) =>
      Object.entries(models).map(([model, { variants }]) => ({ ref: `${provider}/${model}`, variants: Object.keys(variants ?? {}) })),
    );
  }

  /** Sets up a model to run, with the variant asked for, or else its `default` variant if it has one. */
  async resolve(ref: string, { variant: asked }: { variant?: string | undefined } = {}): Promise<ResolvedModel> {
    const { parsed, config } = this.#model(ref);
    const variants = config.variants ?? {};
    let variant = asked ?? (Object.hasOwn(variants, 'default') ? 'default' : undefined);
    if (variant !== undefined && !Object.hasOwn(variants, variant)) {
      const names = Object.keys(variants);
      throw new ConfigError(`${ref} has no variant "${variant}"; ${names.length ? `variants: ${names.join(', ')}` : 'it has none'}`);
    }
    let settings = variant === undefined ? {} : variants[variant]!;
    // `default` may name another variant, which then is the one in use.
    if (typeof settings === 'string') {
      variant = settings;
      const named = variants[variant];
      if (typeof named !== 'object') throw new ConfigError(`${ref}: variants.default names no variant: ${variant}`);
      settings = named;
    }

    // As OpenCode's AI SDK providers send them: the effort setting as the API's own field, the rest as they are.
    const { reasoningEffort, effort, ...fields } = settings;
    const output = config.limit?.output;
    const client = await this.#client(parsed.provider);
    let api: Provider;
    if (client instanceof OpenAI) {
      if (effort !== undefined) throw new ConfigError(`${ref}: OpenAI-compatible variants set effort with reasoningEffort`);
      const base = this.#options.openai ?? {};
      api = new OpenAIProvider(client, {
        ...base,
        request: {
          ...base.request,
          ...(output ? { max_tokens: output } : {}),
          ...(reasoningEffort !== undefined ? { reasoning_effort: reasoningEffort } : {}),
          ...fields,
        },
      });
    } else {
      if (reasoningEffort !== undefined) throw new ConfigError(`${ref}: Anthropic variants set effort with effort`);
      const base = this.#options.anthropic ?? {};
      api = new AnthropicProvider(client, {
        ...base,
        ...(output ? { maxTokens: output } : {}),
        // An option, not a request field, so the provider still leaves it out for models without effort.
        ...(effort !== undefined ? { effort: effort as Effort } : {}),
        request: { ...base.request, ...fields },
      });
    }
    return { ref, api, model: parsed.model, ...(variant !== undefined ? { variant } : {}) };
  }

  #model(ref: string) {
    const parsed = this.parseRef(ref);
    if (!parsed) {
      throw new ConfigError(`Unknown provider in "${ref}"; providers: ${Object.keys(this.#providers).join(', ') || 'none configured'}`);
    }
    const { models } = this.#providers[parsed.provider]!;
    const config = Object.hasOwn(models, parsed.model) ? models[parsed.model]! : undefined;
    if (!config) throw new ConfigError(`Unknown model "${ref}"; ${parsed.provider} has ${Object.keys(models).join(', ')}`);
    return { parsed, config };
  }

  #client(id: string): Promise<OpenAI | Anthropic> {
    let client = this.#clients.get(id);
    if (!client) {
      const { npm, options } = this.#providers[id]!;
      const api = npm ? API_PACKAGES[npm as keyof typeof API_PACKAGES] : id === 'openai' || id === 'anthropic' ? id : undefined;
      if (!api) throw new ConfigError(`provider.${id} needs npm: one of ${Object.keys(API_PACKAGES).join(', ')}`);
      client =
        api === 'openai'
          ? Promise.resolve(
              new OpenAI({
                ...(options?.baseURL ? { baseURL: options.baseURL } : {}),
                // Local servers such as llama.cpp take any key, but the SDK insists on one.
                apiKey: options?.apiKey || process.env.OPENAI_API_KEY || 'none',
              }),
            )
          : anthropic(options?.baseURL, options?.apiKey);
      this.#clients.set(id, client);
    }
    return client;
  }
}

/** `@anthropic-ai/sdk` is an optional peer dependency; load it only when asked for. */
async function anthropic(baseURL: string | undefined, apiKey: string | undefined): Promise<Anthropic> {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    return new Anthropic({
      // OpenCode's base URLs end in /v1, which the SDK adds itself.
      ...(baseURL ? { baseURL: baseURL.replace(/\/v1\/?$/, '') } : {}),
      // Otherwise the SDK reads ANTHROPIC_API_KEY.
      ...(apiKey ? { apiKey } : {}),
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND') throw err;
    throw new ConfigError('The anthropic provider needs @anthropic-ai/sdk: npm install @anthropic-ai/sdk');
  }
}
