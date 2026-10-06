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
    "Change code with update, a few lines at a time, and keep what already passes; don't rewrite whole files.",
});
