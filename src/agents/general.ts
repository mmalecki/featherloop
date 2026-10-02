import { defineAgent } from '../agent.ts';

/**
 * The default agent: a concise assistant with every tool but the shell, which
 * callers can turn on with an extra rule, `{ action: 'shell', effect: 'allow' }`.
 */
export const generalAgent = defineAgent({
  name: 'general',
  description: 'General-purpose assistant',
  system: ({ date, cwd }) => `Concise assistant. Today is ${date}. cwd: ${cwd}`,
  permissions: [
    { action: '*', effect: 'allow' },
    { action: 'shell', effect: 'deny' },
  ],
});
