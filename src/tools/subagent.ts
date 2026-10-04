import type { Agent, PermissionRule } from '../agent.ts';
import { Loop, type LoopOptions } from '../loop.ts';
import type { Submodel } from '../models.ts';
import type { Message, Provider } from '../provider.ts';
import { defineTool, ToolInputError, type Tool, type ToolOptions, type Toolset } from '../tool.ts';

export interface SubagentParams {
  /** The agent to run, by name. Defaults to the first agent. */
  agent: string;
  input: string;
  /** Also pass on the conversation so far, as text. */
  transcript: boolean;
  /** Directory for the agents' system prompts. Defaults to the process cwd at call time. */
  cwd: string | undefined;
  /** Longer replies keep their start. */
  maxLength: number;
}

export interface SubagentToolOptions extends ToolOptions<SubagentParams> {
  /** Agents the model can hand tasks to. Their names and descriptions go in the tool's schema. */
  agents: readonly Agent[];
  /**
   * Builds the tools a subagent may use, afresh for each call, so it doesn't share
   * state (such as which files were read) with the caller. Its agent's permissions
   * pick from them. Any tool keyed `subagent` is left out: a subagent gets one only
   * for its agent's own `agents`.
   */
  tools: () => Toolset;
  /** Default rules for every subagent, e.g. the caller's own; each agent's rules override them. */
  permissions?: PermissionRule[];
  /**
   * Instructions (AGENTS.md) for the agents' system prompts, or a function of the
   * directory they work in, called for each task.
   */
  instructions?: string | ((cwd: string) => string);
  loop?: LoopOptions;
  /**
   * How deep subagents may hand tasks on to their own (see `AgentSpec.agents`),
   * counting this tool's: 1 keeps them from it. Defaults to 3.
   */
  maxDepth?: number;
}

/** The model a subagent runs on: the caller's, or its agent's own, which has a reference. */
type Runner = { api: Provider; model: string; ref?: string; variant?: string; submodel?: Submodel | undefined };

/** A transcript's tool results are cut to this; the subagent can re-read files itself. */
const TRANSCRIPT_RESULT_CHARS = 2_000;

/**
 * Hands a task to another agent, which runs its own loop and returns its final
 * reply. An agent with a `model` runs on it, as the caller's model refers to it
 * (`ToolContext.submodel`); others run on the caller's model. An agent with
 * `agents` may hand tasks on in turn. Calls in the same turn run in parallel.
 * The subagents' token use counts as this tool's.
 */
export function SubagentTool(options: SubagentToolOptions): Tool {
  const pool = new Map(options.agents.map((agent) => [agent.name, agent]));
  if (!pool.size) throw new Error('SubagentTool needs at least one agent');
  if (pool.size !== options.agents.length) throw new Error('SubagentTool: agent names must be unique');
  return subagentTool(options, { depth: 1, chain: [], pool });
}

interface Nesting {
  /** 1 for the caller's own tool, 2 for its subagents', and so on. */
  depth: number;
  /**
   * The models already working on the task, by `key()`: a subagent isn't offered
   * one of them again, so a chain of advisors ends, even if the config goes round.
   */
  chain: readonly string[];
  /** The caller's agents, which subagents' `agents` name. */
  pool: ReadonlyMap<string, Agent>;
}

function subagentTool(all: SubagentToolOptions, { depth, chain, pool }: Nesting): Tool {
  const { agents, tools, permissions = [], instructions, loop: loopOptions, maxDepth = 3, ...options } = all;
  const byName = new Map(agents.map((agent) => [agent.name, agent]));
  const listed = agents.map(({ name, description }) => (description ? `${name}: ${description}` : name)).join('; ');

  return defineTool<SubagentParams>({
    description:
      'Hand a self-contained task to a subagent, which works on it with its own tools and returns its final reply. ' +
      'Several calls in one turn run in parallel.' +
      // With one agent, the agent parameter (and so its description) is hidden.
      (byName.size === 1 ? ` Agent: ${listed}.` : ''),
    params: {
      agent: {
        schema: { type: 'string', enum: [...byName.keys()], description: `Agent to run. ${listed}` },
        default: agents[0]!.name,
        // With one agent there's nothing to choose, so the model doesn't see it.
        expose: byName.size > 1,
      },
      input: {
        schema: {
          type: 'string',
          description: 'The task: what to do and what to report back. The subagent sees nothing else unless transcript is true.',
        },
        required: true,
      },
      transcript: {
        schema: {
          type: 'boolean',
          description:
            'Also give it this conversation so far, as text, when the task depends on what was found or decided here ' +
            'and restating that would be long. Costs about the conversation in tokens; long tool results are cut.',
        },
        default: false,
      },
      cwd: {
        schema: { type: 'string' },
        expose: false,
      },
      maxLength: {
        schema: { type: 'integer', minimum: 1, description: 'Max characters of the reply to return. Longer replies keep their start.' },
        default: 20_000,
        expose: false,
      },
    },

    async invoke({ agent: name, input, transcript, cwd, maxLength }, { api, model, signal, messages, relay, submodel }) {
      const agent = byName.get(name);
      if (!agent) throw new ToolInputError(`Unknown agent "${name}"; agents: ${[...byName.keys()].join(', ')}`);
      if (typeof input !== 'string' || !input.trim()) throw new ToolInputError('input must be a non-empty task');
      if (transcript && !messages) throw new ToolInputError('There is no conversation to pass on');

      let runner: Runner = { api, model, submodel };
      if (agent.model) {
        if (!submodel) throw new Error(`Agent ${agent.name} runs on ${agent.model}, but this loop can't set up other models`);
        const resolved = await submodel(agent.model);
        if (!resolved) throw new Error(`Agent ${agent.name} runs on ${agent.model}, which this model has none of`);
        runner = resolved;
      }

      const dir = cwd ?? process.cwd();
      const system = agent.system({
        cwd: dir,
        date: new Date().toISOString().slice(0, 10),
        model: runner.model,
        ...(instructions === undefined ? {} : { instructions: typeof instructions === 'function' ? instructions(dir) : instructions }),
      });
      // Only an agent with agents of its own gets a subagent tool, for those.
      const { subagent: _, ...available } = tools();
      const nested = depth < maxDepth ? await offer(agent, runner) : undefined;
      if (nested) available.subagent = nested;
      const toolset = agent.toolset(available, permissions);
      const task = transcript ? `${render(messages!)}\n\n<task>\n${input}\n</task>` : input;
      // The subagent's tools set up models as its own model refers to them.
      const loop = Loop(runner.api, toolset, { ...loopOptions, ...(runner.submodel ? { submodel: runner.submodel } : {}) });
      relay?.(loop);
      const { message } = await loop.run({
        model: runner.model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: task },
        ],
        signal,
      });

      const reply = text(message.content).trim() || '(The subagent finished without a reply.)';
      return reply.length > maxLength ? `${reply.slice(0, maxLength)}\n[… ${reply.length - maxLength} more characters cut]` : reply;
    },
  })(options);

  /** A subagent tool for `agent`'s own agents that `runner` can run, one level down; none if there are none. */
  async function offer(agent: Agent, runner: Runner): Promise<Tool | undefined> {
    const below = runner.ref === undefined ? chain : [...chain, key(runner)];
    const offered: Agent[] = [];
    for (const name of agent.agents) {
      const next = pool.get(name);
      if (!next) continue;
      if (next.model) {
        const model = runner.submodel ? await runner.submodel(next.model) : undefined;
        // A model already on the task would be no stronger: e.g. the strongest model's advisor is itself.
        if (!model || below.includes(key(model))) continue;
      }
      offered.push(next);
    }
    if (!offered.length) return undefined;
    return subagentTool({ ...all, agents: offered }, { depth: depth + 1, chain: below, pool });
  }
}

/** A model as the chain of models on a task tells them apart: the same model at another variant is another. */
function key({ ref, variant }: Runner): string {
  return JSON.stringify([ref, variant]);
}

/**
 * The conversation as text: what was said, and which tools were called with what
 * results. Leaves out system prompts, reasoning, and the calls of the last
 * message, which are still waiting for their results (one of them is this task).
 */
function render(messages: readonly Message[]): string {
  const names = new Map<string, string>();
  const last = messages.at(-1);
  const parts: string[] = [];
  for (const message of messages) {
    if (message.role === 'user') parts.push(`User: ${text(message.content)}`);
    else if (message.role === 'assistant') {
      const said = text(message.content);
      if (said) parts.push(`Assistant: ${said}`);
      if (message === last) continue;
      for (const call of message.tool_calls ?? []) {
        if (call.type !== 'function') continue;
        names.set(call.id, call.function.name);
        parts.push(`Assistant called ${call.function.name}(${call.function.arguments})`);
      }
    } else if (message.role === 'tool') {
      const result = text(message.content);
      const cut = result.length > TRANSCRIPT_RESULT_CHARS ? `${result.slice(0, TRANSCRIPT_RESULT_CHARS)} [… cut]` : result;
      parts.push(`Result of ${names.get(message.tool_call_id) ?? 'a tool'}: ${cut}`);
    }
  }
  return `<transcript>\n${parts.join('\n\n')}\n</transcript>`;
}

/** A message's content as plain text; parts that aren't text are named, e.g. "[image_url]". */
function text(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part: { type?: string; text?: string; refusal?: string }) =>
      part.type === 'text' ? (part.text ?? '') : part.type === 'refusal' ? (part.refusal ?? '') : `[${part.type}]`,
    )
    .join('');
}
