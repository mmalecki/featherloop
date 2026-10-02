import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse, YAMLParseError } from 'yaml';

/**
 * featherslop's config file, shaped like OpenCode's (`opencode.json`) with only
 * the fields featherslop supports. Unknown fields are errors, not ignored. As in
 * OpenCode, `{env:NAME}` in a string is replaced by that variable, or by nothing.
 */
export interface Config {
  /** Default model, as `provider/model`. */
  model?: string;
  provider?: Record<string, ProviderConfig>;
}

export interface ProviderConfig {
  /**
   * Which API to use, named by OpenCode's AI SDK package: `@ai-sdk/openai-compatible`
   * or `@ai-sdk/openai` for Chat Completions (e.g. llama.cpp), `@ai-sdk/anthropic` for
   * the Messages API. Defaults to the provider's own for the ids `openai` and `anthropic`.
   */
  npm?: string;
  options?: {
    /** As in OpenCode: includes `/v1` for Anthropic too. */
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

/** The APIs featherslop speaks, by the AI SDK package OpenCode names them with. */
export const API_PACKAGES = {
  '@ai-sdk/openai-compatible': 'openai',
  '@ai-sdk/openai': 'openai',
  '@ai-sdk/anthropic': 'anthropic',
} as const;

/** Raised for a config, or a model reference, that featherslop can't use. */
export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** `$XDG_CONFIG_HOME/featherslop/config.yaml`, by default `~/.config/featherslop/config.yaml`. */
export function configPath(): string {
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'featherslop', 'config.yaml');
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

/** Parses and checks a config's YAML (or JSON) text. */
export function parseConfig(text: string, env: NodeJS.ProcessEnv = process.env): Config {
  const config = object(substitute(parse(text) ?? {}, env), 'config');
  only(config, ['model', 'provider'], '');
  if (config.model !== undefined) string(config.model, 'model');
  for (const [id, provider] of entries(config.provider, 'provider')) {
    const at = `provider.${id}`;
    only(provider, ['npm', 'options', 'models'], at);
    if (provider.npm !== undefined && !Object.hasOwn(API_PACKAGES, provider.npm)) {
      throw new ConfigError(`${at}.npm must be one of ${Object.keys(API_PACKAGES).join(', ')}`);
    }
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
        entries(named, `${path}.variants`);
        if (typeof fallback === 'string') {
          if (!Object.hasOwn(named, fallback)) throw new ConfigError(`${path}.variants.default names no variant: ${fallback}`);
        } else if (fallback !== undefined) {
          object(fallback, `${path}.variants.default`);
        }
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
