// A web research agent: Parallel's search (PARALLEL_API_KEY) and a fetch tool that
// compacts each page with a second inference call before the agent sees it.
import OpenAI from 'openai';
import { Loop, ParallelWebSearchTool, WebFetchTool } from '../src/index.ts';

const api = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? 'http://127.0.0.1:9931/v1',
  apiKey: process.env.OPENAI_API_KEY ?? 'none',
});

const agent = Loop(api, {
  // Compaction is on and hidden by default (a small model won't know when it needs
  // it), and runs without thinking: shrinking a page needs none.
  webfetch: WebFetchTool(),
  websearch: ParallelWebSearchTool(),
});

agent.on('content', (delta) => process.stdout.write(delta));
agent.on('tool_call', ({ name, arguments: args }) => console.log(`\n[tool_call] ${name} ${JSON.stringify(args)}`));
agent.on('tool_result', ({ name, result, isError }) =>
  console.log(`[tool_result] ${name}${isError ? ` (error) ${result}` : `: ${result.length} chars`}`),
);
// The tools' own inference (compaction) is reported separately from the agent's turns.
agent.on('usage', ({ source, tool, output }) => source === 'tool' && console.log(`[usage] ${tool} compaction: ${output} tokens out`));

await agent.run({
  model: process.env.MODEL ?? 'qwen3.5-9b',
  input: [
    {
      role: 'system',
      content: `Today is ${new Date().toISOString().slice(0, 10)}. Use websearch to find sources and webfetch to read the most promising pages. Cite URLs.`,
    },
    { role: 'user', content: 'What are my options for a 2 x NVMe Linux-based NAS box under 200 euros?' },
  ],
});
console.log('\n[end]');
