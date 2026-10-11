import { defineAgent } from '../agent.ts';

/**
 * The default agent: a concise assistant with no rules of its own, so it gets
 * every tool it's offered that the caller's defaults allow. To keep it off the
 * shell, offer none, or pass `{ action: 'shell', effect: 'deny' }` as a default.
 * With an advisor on offer, it's asked to have its plan and its work reviewed.
 */
export const generalAgent = defineAgent({
  name: 'general',
  description: 'General-purpose assistant',
  system: ({ date, cwd, agents }) => `Concise assistant.${agents?.includes('advisor') ? ` ${ADVISOR_REVIEWS}` : ''} Today is ${date}. cwd: ${cwd}`,
});

/** When to ask the advisor: the two points where a second opinion is cheapest, and catches most. */
export const ADVISOR_REVIEWS = 'Ask the advisor to review your plan before you change anything, and your work before you call it done.';
