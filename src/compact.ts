import type { Reasoning } from './provider.ts';
import type { ToolContext } from './tool.ts';

export interface CompactOptions {
  /** Instruction for the compacting model. */
  prompt: string;
  content: string;
  /** What the calling agent cares about, if it said. */
  focus?: string | undefined;
  /** Defaults to the model the loop is running with. */
  model?: string | undefined;
  /** Defaults to `none`: shrinking text needs no thinking. */
  reasoning?: Reasoning | undefined;
  /** Extra provider-specific request fields. */
  request?: Record<string, unknown> | undefined;
}

/** Shrinks a tool result with a single inference call before it reaches the agent's context. */
export async function compact(ctx: ToolContext, { prompt, content, focus, model, reasoning = 'none', request }: CompactOptions): Promise<string> {
  const result = await ctx.api.complete({
    model: model ?? ctx.model,
    system: prompt,
    prompt: focus ? `${content}\n\n---\nFocus: ${focus}` : content,
    signal: ctx.signal,
    reasoning,
    request,
  });
  if (!result) throw new Error('Compaction returned no content');
  return result;
}
