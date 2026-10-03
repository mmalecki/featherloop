import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Aggregates a results directory's `results.jsonl` into `summary.json` and
 * `summary.md`. Runs on its own over any results directory, e.g. after editing
 * out a run that hit a server outage: `node test/harness-bench/report.ts <dir>`.
 */

/** One run, as a line of `results.jsonl`. */
export interface RunResult {
  harness: string;
  case: string;
  lang: string;
  rep: number;
  started: string;
  /** `pass` and `fail` by the tests; `timeout` and `crash` when the harness didn't exit cleanly, whatever the tests say. */
  status: 'pass' | 'fail' | 'timeout' | 'crash';
  /** The tests, as shipped, pass on what the agent left; graded even after a timeout or crash. */
  pass: boolean;
  tests: { passed: number; total: number };
  exitCode: number | null;
  wallMs: number;
  /** Time spent in model requests, at the proxy; the rest of `wallMs` is the harness and its tools. */
  llmMs: number;
  /** Prompt processing and generation, by llama.cpp's own timings. */
  serverMs: number;
  requests: number;
  apiErrors: number;
  /** Summed over requests: every request's whole prompt, cached or not; `uncached` is what the server processed. */
  tokens: { prompt: number; cached: number; uncached: number; completion: number };
  /** Requests whose tokens weren't reported (e.g. aborted). */
  uncounted: number;
  /** The most context any one request filled: prompt plus completion. */
  peakContext: number;
  /** The first request's prompt: the harness's system prompt and tools, plus the task, which is the same for all. */
  firstPrompt: number | null;
  toolCalls: number;
  tools: Record<string, number>;
  categories: Record<string, number>;
  /** Responses with tool-call markup in their text: calls the server couldn't parse, so the harness never got them. */
  unparsedToolCalls: number;
  /** Calls to tools the harness didn't offer. */
  unknownToolCalls: number;
  /** Responses cut off by the output limit. */
  lengthStops: number;
  reasoningChars: number;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: string[];
  /** Tests or support files the agent changed; put back before grading. */
  tampered: string[];
  /** The conversation mentions the bench's cache, which holds the reference solutions: treat a pass with suspicion. */
  sawCache: boolean;
  /** Distinct sampling settings the harness sent, the output limit apart. */
  params: Record<string, unknown>[];
  /** The largest output limit it asked for; none means the server's. */
  maxOutput: number | null;
}

/** Harnesses name their tools differently; these are what they do. */
export function toolCategory(name: string): string {
  const lower = name.toLowerCase();
  if (['read', 'read_file', 'view', 'cat'].includes(lower)) return 'read';
  if (['write', 'edit', 'update', 'multiedit', 'apply_patch', 'patch', 'str_replace', 'write_file'].includes(lower)) return 'edit';
  if (['bash', 'shell', 'exec', 'run'].includes(lower)) return 'shell';
  if (['grep', 'glob', 'list', 'ls', 'find', 'codesearch', 'search'].includes(lower)) return 'search';
  if (['webfetch', 'websearch'].includes(lower)) return 'web';
  return 'other';
}

const CATEGORIES = ['read', 'edit', 'shell', 'search', 'web', 'other'];

export interface HarnessSummary {
  harness: string;
  runs: number;
  passes: number;
  passRate: number;
  /** Wilson 95% interval for the pass rate. */
  passCI: [number, number];
  /** Mean share of tests passed: partial credit. */
  testsPassed: number;
  byLang: Record<string, { runs: number; passes: number }>;
  timeouts: number;
  crashes: number;
  wallSec: { median: number; mean: number; p90: number };
  /** Share of wall clock spent waiting on the model. */
  llmShare: number;
  requests: number;
  tokens: { prompt: number; uncached: number; completion: number; total: number };
  tokensPerPass: number | null;
  peakContext: { median: number; max: number };
  firstPrompt: number | null;
  toolCalls: number;
  categories: Record<string, number>;
  tools: Record<string, number>;
  unparsedToolCalls: number;
  unknownToolCalls: number;
  lengthStops: number;
  apiErrors: number;
  tamperedRuns: number;
  sawCacheRuns: number;
  linesChanged: number;
  params: Record<string, unknown>[];
  maxOutput: number | null;
}

export function summarize(dir: string): string {
  const results = readFileSync(join(dir, 'results.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RunResult);
  const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) as Record<string, any>;
  // In the order the bench defines them, not the order they finished in.
  const harnesses = [...new Set([...Object.keys(meta.harnesses ?? {}), ...results.map((result) => result.harness)])].filter((harness) =>
    results.some((result) => result.harness === harness),
  );
  const summaries = harnesses.map((harness) => summarizeHarness(harness, results.filter((result) => result.harness === harness)));
  writeFileSync(join(dir, 'summary.json'), `${JSON.stringify({ meta, harnesses: summaries }, null, 2)}\n`);
  const markdown = render(meta, summaries, results);
  writeFileSync(join(dir, 'summary.md'), markdown);
  return markdown;
}

function summarizeHarness(harness: string, runs: RunResult[]): HarnessSummary {
  const passes = runs.filter((run) => run.pass).length;
  const mean = (pick: (run: RunResult) => number) => runs.reduce((total, run) => total + pick(run), 0) / runs.length;
  const total = (pick: (run: RunResult) => number) => runs.reduce((sum, run) => sum + pick(run), 0);
  const wall = runs.map((run) => run.wallMs / 1000);
  const byLang: Record<string, { runs: number; passes: number }> = {};
  for (const run of runs) {
    const lang = (byLang[run.lang] ??= { runs: 0, passes: 0 });
    lang.runs++;
    if (run.pass) lang.passes++;
  }
  const tools: Record<string, number> = {};
  for (const run of runs) for (const [name, count] of Object.entries(run.tools)) tools[name] = (tools[name] ?? 0) + count / runs.length;
  const firstPrompts = runs.map((run) => run.firstPrompt).filter((value): value is number => value !== null);
  const allTokens = total((run) => run.tokens.prompt + run.tokens.completion);
  return {
    harness,
    runs: runs.length,
    passes,
    passRate: passes / runs.length,
    passCI: wilson(passes, runs.length),
    testsPassed: mean((run) => (run.tests.total ? run.tests.passed / run.tests.total : 0)),
    byLang,
    timeouts: runs.filter((run) => run.status === 'timeout').length,
    crashes: runs.filter((run) => run.status === 'crash').length,
    wallSec: { median: quantile(wall, 0.5), mean: mean((run) => run.wallMs / 1000), p90: quantile(wall, 0.9) },
    llmShare: total((run) => run.llmMs) / total((run) => run.wallMs),
    requests: mean((run) => run.requests),
    tokens: {
      prompt: mean((run) => run.tokens.prompt),
      uncached: mean((run) => run.tokens.uncached),
      completion: mean((run) => run.tokens.completion),
      total: allTokens / runs.length,
    },
    tokensPerPass: passes ? allTokens / passes : null,
    peakContext: { median: quantile(runs.map((run) => run.peakContext), 0.5), max: Math.max(...runs.map((run) => run.peakContext)) },
    firstPrompt: firstPrompts.length ? quantile(firstPrompts, 0.5) : null,
    toolCalls: mean((run) => run.toolCalls),
    categories: Object.fromEntries(CATEGORIES.map((category) => [category, mean((run) => run.categories[category] ?? 0)])),
    tools,
    unparsedToolCalls: total((run) => run.unparsedToolCalls),
    unknownToolCalls: total((run) => run.unknownToolCalls),
    lengthStops: total((run) => run.lengthStops),
    apiErrors: total((run) => run.apiErrors),
    tamperedRuns: runs.filter((run) => run.tampered.length).length,
    sawCacheRuns: runs.filter((run) => run.sawCache).length,
    linesChanged: mean((run) => run.linesAdded + run.linesRemoved),
    params: [...new Set(runs.flatMap((run) => run.params.map((params) => JSON.stringify(params))))].map((text) => JSON.parse(text)),
    maxOutput: runs.some((run) => run.maxOutput !== null) ? Math.max(...runs.map((run) => run.maxOutput ?? 0)) : null,
  };
}

function render(meta: Record<string, any>, summaries: HarnessSummary[], results: RunResult[]): string {
  const columns = summaries.map((summary) => summary.harness);
  const row = (label: string, cell: (summary: HarnessSummary) => string) => `| ${label} | ${summaries.map(cell).join(' | ')} |`;
  const header = [`| | ${columns.join(' | ')} |`, `|---|${columns.map(() => '---:').join('|')}|`];
  const k = (value: number) => (value >= 10_000 ? `${(value / 1000).toFixed(0)}k` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0));
  const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
  const langs = [...new Set(results.map((result) => result.lang))];

  const lines = [
    '# Harness bench',
    '',
    `Model: ${meta.server?.models?.map((model: { id: string }) => model.id).join(', ') ?? '?'} (${meta.server?.modelPath?.split('/').pop() ?? '?'}), llama.cpp ${meta.server?.build ?? '?'}, ${meta.server?.slots ?? '?'} slots.`,
    `${meta.cases?.length} cases × ${meta.reps} reps, ${meta.jobs} at a time, ${meta.timeoutMinutes} min timeout. Started ${meta.started}.`,
    `Versions: ${Object.entries(meta.harnesses ?? {})
      .map(([name, info]) => `${name} ${(info as { version: string }).version}`)
      .join(', ')}.`,
    '',
    '## Results',
    '',
    ...header,
    row('**Passed**', (s) => `**${s.passes}/${s.runs} (${pct(s.passRate)})**`),
    row('95% interval', (s) => `${pct(s.passCI[0])}–${pct(s.passCI[1])}`),
    ...langs.map((lang) => row(`↳ ${lang}`, (s) => (s.byLang[lang] ? `${s.byLang[lang].passes}/${s.byLang[lang].runs}` : '–'))),
    row('Tests passed (partial credit)', (s) => pct(s.testsPassed)),
    row('Timeouts / crashes', (s) => `${s.timeouts} / ${s.crashes}`),
    row('Wall clock, median (p90)', (s) => `${s.wallSec.median.toFixed(0)}s (${s.wallSec.p90.toFixed(0)}s)`),
    row('Share waiting on the model', (s) => pct(s.llmShare)),
    row('Model requests / run', (s) => s.requests.toFixed(1)),
    row('Tokens / run', (s) => k(s.tokens.total)),
    row('↳ prompt (all)', (s) => k(s.tokens.prompt)),
    row('↳ prompt (processed, not cached)', (s) => k(s.tokens.uncached)),
    row('↳ completion', (s) => k(s.tokens.completion)),
    row('Tokens / pass', (s) => (s.tokensPerPass === null ? '–' : k(s.tokensPerPass))),
    row('First prompt (system + tools + task)', (s) => (s.firstPrompt === null ? '–' : k(s.firstPrompt))),
    row('Peak context, median (max)', (s) => `${k(s.peakContext.median)} (${k(s.peakContext.max)})`),
    row('Tool calls / run', (s) => s.toolCalls.toFixed(1)),
    ...CATEGORIES.filter((category) => summaries.some((s) => s.categories[category])).map((category) =>
      row(`↳ ${category}`, (s) => (s.categories[category] ?? 0).toFixed(1)),
    ),
    row('Unparsed tool calls', (s) => String(s.unparsedToolCalls)),
    row('Calls to tools not offered', (s) => String(s.unknownToolCalls)),
    row('Output cut off at limit', (s) => String(s.lengthStops)),
    row('API errors', (s) => String(s.apiErrors)),
    row('Runs that changed the tests', (s) => String(s.tamperedRuns)),
    row('Runs that reached the bench cache', (s) => String(s.sawCacheRuns)),
    row('Lines changed / run', (s) => s.linesChanged.toFixed(0)),
    '',
    '## Tools called, per run',
    '',
    ...summaries.map(
      (s) =>
        `- **${s.harness}**: ${
          Object.entries(s.tools)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => `${name} ${count.toFixed(1)}`)
            .join(', ') || 'none'
        }`,
    ),
    '',
    '## Sampling settings sent',
    '',
    `Server defaults: ${JSON.stringify(meta.server?.defaults ?? {})}`,
    '',
    ...summaries.map((s) => {
      const params = s.params.filter((params) => Object.keys(params).length).map((params) => JSON.stringify(params));
      return `- **${s.harness}**: ${params.join('; ') || 'server defaults'}; output limit ${s.maxOutput ?? 'none (server default)'}`;
    }),
    '',
    '## By case',
    '',
    'Passes out of reps; tests passed in brackets for runs that failed.',
    '',
    `| case | ${columns.join(' | ')} |`,
    `|---|${columns.map(() => ':---:').join('|')}|`,
    ...[...new Set(results.map((result) => result.case))].map((id) => {
      const cells = columns.map((harness) => {
        const runs = results.filter((result) => result.case === id && result.harness === harness);
        if (!runs.length) return '–';
        const passes = runs.filter((run) => run.pass).length;
        const partial = runs.filter((run) => !run.pass).map((run) => `${run.tests.passed}/${run.tests.total}${run.status === 'timeout' ? '⏱' : run.status === 'crash' ? '💥' : ''}`);
        return `${passes === runs.length ? '✓' : passes ? `${passes}/${runs.length}` : '✗'}${partial.length ? ` (${partial.join(', ')})` : ''}`;
      });
      return `| ${id} | ${cells.join(' | ')} |`;
    }),
    '',
  ];
  return lines.join('\n');
}

function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
}

function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (!n) return [0, 0];
  const p = successes / n;
  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node test/harness-bench/report.ts <results dir>');
    process.exit(1);
  }
  console.log(summarize(resolve(dir)));
}
