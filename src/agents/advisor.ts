import { defineAgent } from '../agent.ts';

/**
 * A second opinion from another model, by default the config's `advisor` alias.
 * It reads and searches but changes nothing.
 */
export const advisorAgent = defineAgent({
  name: 'advisor',
  description:
    'A stronger model for a second opinion: before committing to an approach, when stuck, or before calling work done. ' +
    'Send the plan or problem, with transcript: true so it sees the conversation. It reads code but changes nothing',
  model: 'advisor',
  system: ({ date, cwd }) =>
    'You advise another agent partway through a task. Check what you need with your tools, then reply with your ' +
    "assessment, most important first: what's wrong or risky, what to do next. Be direct and brief; don't do the work. " +
    `Today is ${date}. cwd: ${cwd}`,
  permissions: [
    { action: '*', effect: 'deny' },
    { action: 'read', effect: 'allow' },
    { action: 'grep', effect: 'allow' },
    { action: 'glob', effect: 'allow' },
  ],
});
