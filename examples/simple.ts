// The smallest agent: one tool, any OpenAI-compatible server (llama-server's default
// address unless OPENAI_BASE_URL says otherwise).
import OpenAI from 'openai';
import { Loop, ReadTool } from '../src/index.ts';

const api = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? 'http://127.0.0.1:9931/v1',
  apiKey: process.env.OPENAI_API_KEY ?? 'none',
});

const agent = Loop(api, {
  // Parameters can be set when building a toolset; hidden ones never reach the
  // model's prompt. Here: line numbers on, and the model needn't know.
  read: ReadTool({ params: { lineNumbers: { value: true } } }),
});

agent.on('content', (delta) => process.stdout.write(delta));
agent.on('tool_call', ({ name, arguments: args }) => console.log(`\n[tool_call] ${name} ${JSON.stringify(args)}`));
agent.on('tool_result', ({ name, result, isError }) =>
  console.log(`[tool_result] ${name}${isError ? ' (error)' : ''}: ${result.length} chars`),
);

const { usage } = await agent.run({
  model: process.env.MODEL ?? 'qwen3.5-9b',
  input: [{ role: 'user', content: 'Read README.md and summarize it in three sentences.' }],
});
console.log(`\n[end] ${usage.input + usage.cacheRead} prompt tokens (${usage.cacheRead} cached), ${usage.output} out`);
