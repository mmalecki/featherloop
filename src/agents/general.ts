import { defineAgent } from '../agent.ts';

/**
 * The default agent: a concise assistant with no rules of its own, so it gets
 * every tool it's offered that the caller's defaults allow. To keep it off the
 * shell, offer none, or pass `{ action: 'shell', effect: 'deny' }` as a default.
 *
 * One line of method: work by acting and checking. Left to itself, a small model
 * may instead try to settle everything in its head, and reason in circles.
 */
export const generalAgent = defineAgent({
  name: 'general',
  description: 'General-purpose assistant',
  system: ({ date, cwd }) =>
    `Concise assistant. Today is ${date}. cwd: ${cwd}\n` +
    'Work in a loop: take a step with your tools, check what it did, and repeat until the task is done. Settle doubts by trying things, not by long deliberation.',
});
