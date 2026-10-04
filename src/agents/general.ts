import { defineAgent } from '../agent.ts';

/**
 * The default agent: a concise assistant with no rules of its own, so it gets
 * every tool it's offered that the caller's defaults allow. To keep it off the
 * shell, offer none, or pass `{ action: 'shell', effect: 'deny' }` as a default.
 *
 * One line of method: check with tools rather than reason at length. Left to
 * itself, a small model may try to settle everything in its head, and reason in circles.
 */
export const generalAgent = defineAgent({
  name: 'general',
  description: 'General-purpose assistant',
  system: ({ date, cwd }) =>
    `Concise assistant. Today is ${date}. cwd: ${cwd}\n` +
    'Use your tools to check your work and your knowledge, rather than reasoning at length.',
});
