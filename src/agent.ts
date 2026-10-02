import type { Toolset } from './tool.ts';

/** An agent as data: what an agent file will hold. `defineAgent()` makes it an `Agent`. */
export interface AgentSpec {
  name: string;
  description?: string;
  /** The system prompt, or a function of where and when it runs. */
  system: string | ((ctx: AgentContext) => string);
  /** Ordered; the last matching rule wins. Tools that no rule matches are allowed. */
  permissions?: PermissionRule[];
}

export interface AgentContext {
  cwd: string;
  /** Today, as YYYY-MM-DD. */
  date: string;
  model: string;
}

/**
 * Allows or denies a tool, like OpenCode's permission rules, but without `ask`
 * or `resource`: a rule applies to a whole tool, so a denied tool is left out of
 * the toolset and costs no tokens.
 */
export interface PermissionRule {
  /** A tool's action: its name in the toolset, or `edit` for write and update. `*` matches anything. */
  action: string;
  effect: 'allow' | 'deny';
}

/** Tools whose action isn't their own name. */
const ACTIONS: Record<string, string> = { write: 'edit', update: 'edit' };

/** The built-in tools' actions, valid in rules even when a tool isn't available (e.g. websearch without a key). */
const BUILT_IN_ACTIONS = ['read', 'edit', 'grep', 'glob', 'shell', 'webfetch', 'websearch'];

/**
 * A system prompt and the permissions that pick its tools. The loop doesn't know
 * about agents: `system()` and `toolset()` give what `Loop` and `SimpleUI` take.
 */
export class Agent {
  readonly name: string;
  readonly description: string | undefined;
  readonly permissions: readonly PermissionRule[];
  readonly #system: AgentSpec['system'];

  constructor(spec: AgentSpec) {
    if (typeof spec.name !== 'string' || !spec.name) throw new Error('An agent needs a name');
    if (typeof spec.system !== 'string' && typeof spec.system !== 'function') {
      throw new Error(`Agent ${spec.name}: system must be a string or a function`);
    }
    spec.permissions?.forEach((rule, i) => checkRule(rule, `Agent ${spec.name}, permission ${i + 1}`));
    this.name = spec.name;
    this.description = spec.description;
    this.permissions = [...(spec.permissions ?? [])];
    this.#system = spec.system;
  }

  /** The system prompt. */
  system(ctx: AgentContext): string {
    return typeof this.#system === 'function' ? this.#system(ctx) : this.#system;
  }

  /**
   * The tools in `available` that the permissions allow. `extra` rules come after
   * the agent's, so they win: e.g. a CLI flag that turns a tool on.
   */
  toolset(available: Toolset, extra: PermissionRule[] = []): Toolset {
    extra.forEach((rule, i) => checkRule(rule, `Extra permission ${i + 1}`));
    const rules = [...this.permissions, ...extra];

    // A rule naming an action no tool has is most likely a typo, which would
    // otherwise silently allow or deny nothing.
    const actions = new Set([...BUILT_IN_ACTIONS, ...Object.keys(available).map(actionOf)]);
    for (const { action } of rules) {
      if (!action.includes('*') && !actions.has(action)) {
        throw new Error(`Unknown action ${action}; known actions: ${[...actions].sort().join(', ')}`);
      }
    }

    return Object.fromEntries(Object.entries(available).filter(([name]) => allowed(rules, actionOf(name))));
  }
}

export function defineAgent(spec: AgentSpec): Agent {
  return new Agent(spec);
}

function checkRule(rule: PermissionRule, where: string): void {
  const { action, effect, ...rest } = rule as PermissionRule & Record<string, unknown>;
  if ('resource' in rest) throw new Error(`${where}: resource isn't supported; a rule applies to a whole tool`);
  const unknown = Object.keys(rest);
  if (unknown.length) throw new Error(`${where}: unknown key ${unknown.join(', ')}`);
  if (typeof action !== 'string' || !action) throw new Error(`${where}: action must be a non-empty string`);
  if ((effect as string) === 'ask') throw new Error(`${where}: ask isn't supported; use allow or deny`);
  if (effect !== 'allow' && effect !== 'deny') throw new Error(`${where}: effect must be allow or deny`);
}

function actionOf(tool: string): string {
  return ACTIONS[tool] ?? tool;
}

function allowed(rules: readonly PermissionRule[], action: string): boolean {
  let effect: PermissionRule['effect'] = 'allow';
  for (const rule of rules) if (matches(rule.action, action)) effect = rule.effect;
  return effect === 'allow';
}

function matches(pattern: string, action: string): boolean {
  const regex = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${regex}$`).test(action);
}
