import type { Agent, PermissionRule } from '../agent.ts';
import { Loop, type LoopOptions } from '../loop.ts';
import type { Message } from '../provider.ts';
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
   * pick from them, and subagents never get the subagent tool.
   */
  tools: () => Toolset;
  /** Rules for every subagent, after its agent's, e.g. the caller's own flags. They can't allow nesting. */
  permissions?: PermissionRule[];
  loop?: LoopOptions;
}

/** A transcript's tool results are cut to this; the subagent can re-read files itself. */
const TRANSCRIPT_RESULT_CHARS = 2_000;

/**
 * Hands a task to another agent, which runs its own loop with the caller's model
 * and provider and returns its final reply. Calls in the same turn run in
 * parallel. The subagent's token use counts as this tool's.
 */
export function SubagentTool({ agents, tools, permissions = [], loop: loopOptions, ...options }: SubagentToolOptions): Tool {
  const byName = new Map(agents.map((agent) => [agent.name, agent]));
  if (!byName.size) throw new Error('SubagentTool needs at least one agent');
  if (byName.size !== agents.length) throw new Error('SubagentTool: agent names must be unique');
  const listed = agents.map(({ name, description }) => (description ? `${name}: ${description}` : name)).join('; ');

  return defineTool<SubagentParams>({
    description:
      'Hand a self-contained task to a subagent, which works on it with its own tools and returns its final reply. ' +
      'Several calls in one turn run in parallel.',
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

    async invoke({ agent: name, input, transcript, cwd, maxLength }, { api, model, signal, messages, relay }) {
      const agent = byName.get(name);
      if (!agent) throw new ToolInputError(`Unknown agent "${name}"; agents: ${[...byName.keys()].join(', ')}`);
      if (typeof input !== 'string' || !input.trim()) throw new ToolInputError('input must be a non-empty task');
      if (transcript && !messages) throw new ToolInputError('There is no conversation to pass on');

      const system = agent.system({ cwd: cwd ?? process.cwd(), date: new Date().toISOString().slice(0, 10), model });
      // The deny comes last, so no extra rule (e.g. allowing *) can let subagents nest.
      const toolset = agent.toolset(tools(), [...permissions, { action: 'subagent', effect: 'deny' }]);
      const task = transcript ? `${render(messages!)}\n\n<task>\n${input}\n</task>` : input;
      const loop = Loop(api, toolset, loopOptions);
      relay?.(loop);
      const { message } = await loop.run({
        model,
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
