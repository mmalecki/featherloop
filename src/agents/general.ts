import { defineAgent } from '../agent.ts';

/**
 * The default agent: a concise assistant with no rules of its own, so it gets
 * every tool it's offered that the caller's defaults allow. To keep it off the
 * shell, offer none, or pass `{ action: 'shell', effect: 'deny' }` as a default.
 */
export const generalAgent = defineAgent({
  name: 'general',
  description: 'General-purpose assistant',
  system: ({ date, cwd }) =>
    `Concise assistant. Today is ${date}. cwd: ${cwd}\n` +
    "Run the tests without head or tail: the failures and the summary are in the full output.",
});
