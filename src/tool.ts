import type { AgentLoop } from './loop.ts';
import type { Message, Provider } from './provider.ts';

export type JSONSchema = Record<string, unknown>;

/** What a tool advertises to the model. The loop adds the name from the toolset key. */
export interface ToolSchema {
  description: string;
  parameters: JSONSchema;
}

/** Passed to every `invoke()` so tools can, e.g., run inference to compact their results. */
export interface ToolContext {
  api: Provider;
  /** Model the loop is currently running with. */
  model: string;
  signal?: AbortSignal;
  /**
   * The conversation so far, ending with the assistant message that made this
   * call (its tool calls not yet answered), e.g. to pass on to a subagent or to
   * compact. Read-only, and only valid during the call. The loop always sets it;
   * it's absent when a tool is invoked directly.
   */
  messages?: readonly Message[];
  /**
   * Shows a loop the tool runs itself, such as a subagent's, as part of this one:
   * its tool calls and results are re-emitted here, with `parent` set to this
   * call's id. Attach it before running the child loop. Set by the loop.
   */
  relay?: (child: AgentLoop) => void;
}

export interface Tool<P = Record<string, unknown>> {
  schema(): ToolSchema;
  invoke(params: P, ctx: ToolContext): Promise<string> | string;
  /**
   * Run calls to this tool alone, in the model's order: after every earlier
   * call in the turn finishes, and before any later one starts.
   */
  sequential?: boolean;
}

/** Tools indexed by the name the model calls them with. */
export type Toolset = Record<string, Tool<any>>;

/** How a tool author declares a parameter. */
export interface ParamDefinition {
  /** JSON Schema for the parameter (type, description, enum, ...), minus `default`. */
  schema: JSONSchema;
  default?: unknown;
  /** Whether the model must provide it when no value is configured. */
  required?: boolean;
  /** Whether the model sees and may set the parameter. Defaults to true. */
  expose?: boolean;
}

/** How a tool user overrides a parameter when building a toolset. */
export interface ParamOverride {
  value?: unknown;
  expose?: boolean;
}

export interface ToolOptions<P> {
  /** Replaces the tool's default description. */
  description?: string;
  params?: { [K in keyof P]?: ParamOverride };
  /** Overrides the tool's default `sequential` setting. */
  sequential?: boolean;
}

export interface ToolDefinition<P> {
  description: string;
  params: { [K in keyof P]-?: ParamDefinition };
  /** Default for `Tool.sequential`, e.g. for tools with side effects. */
  sequential?: boolean;
  invoke(params: P, ctx: ToolContext): Promise<string> | string;
}

/** Raised for bad model input; the loop reports the message back to the model. */
export class ToolInputError extends Error {
  override name = 'ToolInputError';
}

interface ResolvedParam {
  schema: JSONSchema;
  value: unknown;
  hasValue: boolean;
  required: boolean;
  expose: boolean;
}

/**
 * Builds a tool factory from a definition. The factory takes per-toolset options
 * that set parameter values and decide which parameters the model gets to see.
 */
export function defineTool<P>(def: ToolDefinition<P>): (options?: ToolOptions<P>) => Tool {
  return (options = {}) => {
    const params = new Map<string, ResolvedParam>();
    for (const [name, param] of Object.entries<ParamDefinition>(def.params)) {
      const override: ParamOverride = (options.params as Record<string, ParamOverride> | undefined)?.[name] ?? {};
      const hasValue = 'value' in override || 'default' in param;
      params.set(name, {
        schema: param.schema,
        value: 'value' in override ? override.value : param.default,
        hasValue,
        required: (param.required ?? false) && !hasValue,
        expose: override.expose ?? param.expose ?? true,
      });
    }

    for (const [name, param] of params) {
      if (param.required && !param.expose) {
        throw new Error(`Parameter "${name}" is hidden from the model but has no value`);
      }
    }

    const description = options.description ?? def.description;
    const sequential = options.sequential ?? def.sequential ?? false;

    return {
      sequential,
      schema() {
        const properties: Record<string, JSONSchema> = {};
        const required: string[] = [];
        for (const [name, param] of params) {
          if (!param.expose) continue;
          properties[name] = param.hasValue && param.value !== undefined
            ? { ...param.schema, default: param.value }
            : param.schema;
          if (param.required) required.push(name);
        }
        return {
          description,
          parameters: { type: 'object', properties, ...(required.length ? { required } : {}) },
        };
      },

      async invoke(input, ctx) {
        const given = input ?? {};
        const resolved: Record<string, unknown> = {};
        for (const [name, param] of params) {
          const provided = param.expose && given[name] !== undefined && given[name] !== null;
          if (provided) {
            resolved[name] = coerce(name, given[name], param.schema);
          } else if (param.required) {
            throw new ToolInputError(`Missing required parameter "${name}"`);
          } else {
            resolved[name] = param.value;
          }
        }
        return def.invoke(resolved as P, ctx);
      },
    };
  };
}

/** Small models often send numbers, booleans and arrays as strings; accept them. */
function coerce(name: string, value: unknown, schema: JSONSchema): unknown {
  const type = schema.type;
  if (typeof value !== 'string') return value;
  if (type === 'array') {
    if (value.trim().startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        throw new ToolInputError(`Parameter "${name}" must be an array`);
      }
    }
    return [value];
  }
  if (type === 'integer' || type === 'number') {
    const n = Number(value);
    if (value.trim() === '' || Number.isNaN(n) || (type === 'integer' && !Number.isInteger(n))) {
      throw new ToolInputError(`Parameter "${name}" must be ${type === 'integer' ? 'an integer' : 'a number'}`);
    }
    return n;
  }
  if (type === 'boolean') {
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new ToolInputError(`Parameter "${name}" must be a boolean`);
  }
  return value;
}
