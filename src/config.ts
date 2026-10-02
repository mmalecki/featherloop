import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse, YAMLParseError } from 'yaml';

/**
 * featherloop's config file, shaped like OpenCode's (`opencode.json`) with only
 * the fields featherloop supports. Unknown fields are errors, not ignored. As in
 * OpenCode, `{env:NAME}` in a string is replaced by that variable, or by nothing.
 */
export interface Config {
  /** Default model, as `provider/model` or an alias. */
  model?: string;
  provider?: Record<string, ProviderConfig>;
  /**
   * Names for models, e.g. a role such as `advisor` that an agent asks for, which
   * the config then fills. Not in OpenCode. A string is short for `{ model }`.
   */
  aliases?: Record<string, string | AliasConfig>;
}

export interface AliasConfig {
  /** As `provider/model`; not another alias. */
  model: string;
  /** Used unless a variant is asked for; otherwise the model's `default` is. */
  variant?: string;
}

export interface ProviderConfig {
  /**
   * The API it speaks: `openai` for Chat Completions (OpenAI, llama.cpp and most
   * other servers), `anthropic` for the Messages API. Not in OpenCode, which names
   * an AI SDK package (`npm`) instead. Anthropic also offers Chat Completions, but
   * without prompt caching or thinking blocks, so use `anthropic` for Claude.
   */
  flavor: Flavor;
  options?: {
    /** Includes `/v1`, for either flavor. */
    baseURL?: string;
    /** Defaults to `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, by API. E.g. `"{env:GROQ_API_KEY}"`. */
    apiKey?: string;
  };
  models: Record<string, ModelConfig>;
}

export interface ModelConfig {
  limit?: {
    /** Max output tokens per request. */
    output?: number;
  };
  /**
   * Named sets of request fields, one picked per session. The effort setting, as
   * the AI SDK names it (`reasoningEffort` for OpenAI-compatible APIs, `effort` for
   * Anthropic), is sent as each API's own; other fields go into the request as they are.
   * The variant `default` is used when none is picked; it may instead name another
   * variant, e.g. `default: high`. Without it, requests carry only the model's limit.
   */
  variants?: Record<string, Record<string, unknown> | string>;
}

/** The APIs featherloop speaks. */
export const FLAVORS = ['openai', 'anthropic'] as const;

export type Flavor = (typeof FLAVORS)[number];

/** Each flavor's name for the effort setting in a variant, as OpenCode's AI SDK has them. */
export const EFFORT_KEYS = { openai: 'reasoningEffort', anthropic: 'effort' } as const;

/** Raised for a config, or a model reference, that featherloop can't use. */
export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** `$XDG_CONFIG_HOME/featherloop/config.yaml`, by default `~/.config/featherloop/config.yaml`. */
export function configPath(): string {
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'featherloop', 'config.yaml');
}

/** Reads and checks a config file; a missing file is an empty config. */
export function loadConfig(path = configPath()): Config {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
  try {
    return parseConfig(text);
  } catch (err) {
    if (!(err instanceof ConfigError || err instanceof YAMLParseError)) throw err;
    throw new ConfigError(`${path}: ${err.message}`);
  }
}

/** Parses and checks a config's YAML (or JSON) text, after replacing `{env:NAME}`. */
export function parseConfig(text: string, env: NodeJS.ProcessEnv = process.env): Config {
  return checkConfig(substitute(parse(text) ?? {}, env));
}

/** Checks a config as parsed; throws a `ConfigError` naming the first problem's path. */
export function checkConfig(value: unknown): Config {
  const config = object(value, 'config');
  only(config, ['model', 'provider', 'aliases'], '');
  if (config.model !== undefined) string(config.model, 'model');
  for (const [id, provider] of entries(config.provider, 'provider')) {
    const at = `provider.${id}`;
    only(provider, ['flavor', 'options', 'models'], at);
    const { flavor } = provider;
    if (!FLAVORS.includes(flavor)) throw new ConfigError(`${at}.flavor must be one of ${FLAVORS.join(', ')}`);
    if (provider.options !== undefined) {
      only(object(provider.options, `${at}.options`), ['baseURL', 'apiKey'], `${at}.options`);
      if (provider.options.baseURL !== undefined) string(provider.options.baseURL, `${at}.options.baseURL`);
      if (provider.options.apiKey !== undefined) string(provider.options.apiKey, `${at}.options.apiKey`);
    }
    if (provider.models === undefined) throw new ConfigError(`${at}.models is missing`);
    for (const [name, model] of entries(provider.models, `${at}.models`)) {
      const path = `${at}.models.${name}`;
      only(model, ['limit', 'variants'], path);
      if (model.limit !== undefined) {
        only(object(model.limit, `${path}.limit`), ['output'], `${path}.limit`);
        const output = model.limit.output;
        if (output !== undefined && !(Number.isInteger(output) && (output as number) > 0)) {
          throw new ConfigError(`${path}.limit.output must be a positive integer`);
        }
      }
      if (model.variants !== undefined) {
        const { default: fallback, ...named } = object(model.variants, `${path}.variants`);
        const variants = entries(named, `${path}.variants`);
        if (typeof fallback === 'string') {
          if (!Object.hasOwn(named, fallback)) throw new ConfigError(`${path}.variants.default names no variant: ${fallback}`);
        } else if (fallback !== undefined) {
          variants.push(['default', object(fallback, `${path}.variants.default`)]);
        }
        // The other API's name for effort would go out as an unknown request field.
        const right = EFFORT_KEYS[flavor as Flavor];
        const wrong = EFFORT_KEYS[flavor === 'openai' ? 'anthropic' : 'openai'];
        for (const [name, variant] of variants) {
          if (wrong in variant) throw new ConfigError(`${path}.variants.${name}.${wrong}: ${flavor} variants set effort with ${right}`);
        }
      }
    }
  }
  if (config.aliases !== undefined) {
    for (const [name, value] of Object.entries(object(config.aliases, 'aliases'))) {
      const at = `aliases.${name}`;
      if (name.includes('/')) throw new ConfigError(`${at}: alias names can't contain "/", which marks provider/model`);
      const alias = typeof value === 'string' ? { model: value } : object(value, at);
      only(alias, ['model', 'variant'], at);
      string(alias.model, `${at}.model`);
      // The model must be configured: an alias can't name another alias, or a bare id.
      const slash = alias.model.indexOf('/');
      const provider = slash < 0 ? undefined : config.provider?.[alias.model.slice(0, slash)];
      const model = provider && Object.hasOwn(provider.models, alias.model.slice(slash + 1)) ? provider.models[alias.model.slice(slash + 1)] : undefined;
      if (!model) throw new ConfigError(`${at}.model names no configured model: ${alias.model}`);
      if (alias.variant !== undefined) {
        string(alias.variant, `${at}.variant`);
        if (!Object.hasOwn(model.variants ?? {}, alias.variant)) throw new ConfigError(`${at}.variant: ${alias.model} has no variant ${alias.variant}`);
      }
    }
  }
  return config as Config;
}

type Fields = Record<string, any>;

/** Replaces `{env:NAME}` in every string value. */
function substitute(value: unknown, env: NodeJS.ProcessEnv): unknown {
  if (typeof value === 'string') return value.replace(/\{env:([^}]+)\}/g, (_, name: string) => env[name] ?? '');
  if (Array.isArray(value)) return value.map((item) => substitute(item, env));
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item, env)]));
}

function object(value: unknown, path: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ConfigError(`${path} must be a mapping`);
  return value as Fields;
}

/** A mapping's entries, each itself a mapping; none when the mapping is absent. */
function entries(value: unknown, path: string): [string, Fields][] {
  if (value === undefined) return [];
  return Object.entries(object(value, path)).map(([key, entry]) => [key, object(entry, `${path}.${key}`)]);
}

function only(value: Fields, keys: string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) throw new ConfigError(`${path ? `${path}.` : ''}${key} isn't supported (${path || 'top level'}: ${keys.join(', ')})`);
  }
}

function string(value: unknown, path: string): void {
  if (typeof value !== 'string') throw new ConfigError(`${path} must be a string`);
}
