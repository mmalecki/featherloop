import type Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ConfigError, EFFORT_KEYS, FLAVORS, type AliasConfig, type Config, type ProviderConfig } from './config.ts';
import type { Effort, Provider } from './provider.ts';
import { AnthropicProvider } from './providers/anthropic.ts';
import { OpenAIProvider } from './providers/openai.ts';

/**
 * A model ready to run: the provider and model id to give a loop, or that a tool
 * could get through its context to run inference with.
 */
export interface ResolvedModel {
  /** `provider/model`, as resolved. */
  ref: string;
  /** The alias it was asked for by, if any. */
  alias?: string;
  api: Provider;
  /** The id the API knows the model by. */
  model: string;
  variant?: string;
  /** Sets up other models as this one refers to them, e.g. its advisor. Absent for a model that knows no others. */
  submodel?: Submodel;
}

/** Sets up a model by reference, e.g. a `ModelRegistry`'s `resolve()` or the CLI's, which also takes bare ids. */
export type ModelResolver = (ref: string, variant?: string) => Promise<ResolvedModel>;

/**
 * Sets up a model as another refers to it: by that model's own alias, else the
 * config's, else as `provider/model`. Undefined when the model opts out of the
 * alias (`null`), or when there's no alias by that name.
 */
export type Submodel = (ref: string, variant?: string) => Promise<ResolvedModel | undefined>;

/** The models a config's providers offer, referred to as `provider/model`. */
export class ModelRegistry {
  /** The config's default model, if it names one. */
  readonly default: string | undefined;
  readonly #providers: Record<string, ProviderConfig>;
  readonly #aliases: Record<string, string | AliasConfig>;
  /** SDK clients, one per provider, made on first use. */
  readonly #clients = new Map<string, Promise<OpenAI | Anthropic>>();

  constructor(config: Config = {}) {
    this.default = config.model;
    this.#providers = config.provider ?? {};
    this.#aliases = config.aliases ?? {};
  }

  /** Every configured model, as `provider/model`; aliases aren't models of their own. */
  models(): string[] {
    return Object.entries(this.#providers).flatMap(([provider, { models }]) => Object.keys(models).map((model) => `${provider}/${model}`));
  }

  /** Whether `ref` is an alias, or a model of one of this registry's providers. */
  knows(ref: string): boolean {
    return Object.hasOwn(this.#aliases, ref) || this.parseRef(ref) !== undefined;
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

  /**
   * Sets up a model, or an alias's, to run. Its variant is the one asked for, else
   * the alias's, else the model's `default` if it has one.
   */
  async resolve(ref: string, { variant: asked }: { variant?: string | undefined } = {}): Promise<ResolvedModel> {
    if (Object.hasOwn(this.#aliases, ref)) return this.#alias(ref, this.#aliases[ref]!, asked);
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
    const client = await this.#client(parsed.provider);
    const { [EFFORT_KEYS[this.#providers[parsed.provider]!.flavor]]: effort, ...fields } = settings;
    const output = config.limit?.output;
    const api: Provider =
      client instanceof OpenAI
        ? new OpenAIProvider(client, {
            request: {
              ...(output ? { max_tokens: output } : {}),
              ...(effort !== undefined ? { reasoning_effort: effort } : {}),
              ...fields,
            },
          })
        : new AnthropicProvider(client, {
            ...(output ? { maxTokens: output } : {}),
            // An option, not a request field, so the provider still leaves it out for models without effort.
            ...(effort !== undefined ? { effort: effort as Effort } : {}),
            request: fields,
          });
    return {
      ref,
      api,
      model: parsed.model,
      ...(variant !== undefined ? { variant } : {}),
      submodel: (name, variant) => this.submodel(name, { from: ref, variant }),
    };
  }

  /**
   * Sets up `ref` as the model `from` refers to it: by `from`'s own alias, else
   * the config's, else as `provider/model`. Undefined when `from` sets the alias
   * to `null`, or when neither has it. Without `from`, only the config's aliases.
   */
  async submodel(ref: string, { from, variant }: { from?: string | undefined; variant?: string | undefined } = {}): Promise<ResolvedModel | undefined> {
    const own = from === undefined ? undefined : this.#model(from).config.aliases;
    if (own && Object.hasOwn(own, ref)) {
      const value = own[ref]!;
      return value === null ? undefined : this.#alias(ref, value, variant);
    }
    // Alias names have no slash, so a name with one is a model reference.
    return Object.hasOwn(this.#aliases, ref) || ref.includes('/') ? this.resolve(ref, { variant }) : undefined;
  }

  /** An alias's model, with the variant asked for, else the alias's. */
  async #alias(name: string, value: string | AliasConfig, asked: string | undefined): Promise<ResolvedModel> {
    const { model, variant } = typeof value === 'string' ? { model: value } : value;
    if (!this.parseRef(model)) throw new ConfigError(`Alias ${name} names no configured model: ${model}`);
    return { ...(await this.resolve(model, { variant: asked ?? variant })), alias: name };
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
      const { flavor, options } = this.#providers[id]!;
      if (!FLAVORS.includes(flavor)) throw new ConfigError(`provider.${id}.flavor must be one of ${FLAVORS.join(', ')}`);
      client =
        flavor === 'openai'
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
      // Base URLs include /v1, as for the openai flavor; this SDK adds it itself.
      ...(baseURL ? { baseURL: baseURL.replace(/\/v1\/?$/, '') } : {}),
      // Otherwise the SDK reads ANTHROPIC_API_KEY.
      ...(apiKey ? { apiKey } : {}),
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND') throw err;
    throw new ConfigError('The anthropic provider needs @anthropic-ai/sdk: npm install @anthropic-ai/sdk');
  }
}
