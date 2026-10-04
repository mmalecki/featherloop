import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadCases } from './cases.ts';
import { hardcodedAnswers } from './guards.ts';
import { HARNESSES } from './harnesses.ts';
import type { RequestRecord } from './proxy.ts';
import type { RunResult } from './report.ts';
import { lastReasoning, readTranscript, toolResults as transcriptResults, webFetches } from './transcript.ts';

/**
 * Why runs failed, and how harnesses differ where they disagree: failure modes,
 * paired comparisons, how much the model reasons and when, and what the longest
 * responses were doing. Over one results directory, or several to compare them
 * (A/B): each harness becomes a column per directory, labelled `<label>:<harness>`.
 *
 *   node test/harness-bench/analyze.ts results/<run>
 *   node test/harness-bench/analyze.ts A=results/<before> B=results/<after> -H featherloop
 *   node test/harness-bench/analyze.ts results/<run> --failed-cases -H featherloop -H opencode-stock
 */

const argv = await yargs(hideBin(process.argv))
  .usage('$0 [label=]dir...\n\nAnalyze bench results: failure modes, paired comparisons, reasoning, runaway responses.')
  .option('harness', { alias: 'H', type: 'array', string: true, describe: 'Only these harnesses' })
  .option('runaways', { type: 'boolean', default: true, describe: 'List the runaway responses (--no-runaways to skip)' })
  .option('failed-cases', {
    type: 'boolean',
    default: false,
    describe: 'Only print the cases any of the (chosen) harnesses failed, one per line: a hard set to run again',
  })
  .demandCommand(1)
  .strictOptions()
  .parseAsync();

/** A response that ran this long, or reasoned this much, before the timeout cut it off ran away. */
const RUNAWAY_MS = 10 * 60_000;
const RUNAWAY_CHARS = 50_000;
/** Reasoning past this many characters is a long response. */
const LONG_CHARS = 20_000;
const LONG_MS = 5 * 60_000;
const EDITS = new Set(['write', 'edit', 'update', 'apply_patch', 'multiedit']);
const TEST_RESULT = /\d+ (passed|failed)|^Tests:/m;
const TEST_FAILED = /\d+ failed|^Tests:.*failed/m;

interface Run extends RunResult {
  /** Its column: the harness, or `<label>:<harness>` across directories. */
  column: string;
  /** Which directory it came from, by position. */
  label: number;
  dir: string;
  reqs: RequestRecord[];
}


const sources = argv._.map(String).map((arg) => {
  const eq = arg.indexOf('=');
  const dir = resolve(eq > 0 ? arg.slice(eq + 1) : arg);
  return { label: eq > 0 ? arg.slice(0, eq) : basename(dir), dir };
});
const runs = sources.flatMap(({ label, dir }, i) => load(dir, sources.length > 1 ? `${label}:` : '', i));
// By directory, then in the bench's harness order.
const order = (run: Run) => HARNESSES.findIndex((harness) => harness.name === run.harness);
const columns = [...new Set([...runs].sort((a, b) => a.label - b.label || order(a) - order(b)).map((run) => run.column))];
const out: string[] = [];

if (argv.failedCases) {
  // API-error runs don't count: they failed for the server, not the harness.
  const failed = new Set(runs.filter((run) => !run.apiErrors && !run.pass).map((run) => run.case));
  console.log([...failed].join('\n'));
  process.exit(0);
}

section('Failure modes', 'Runs by how they ended. API-error runs are left out of everything below; rerun them first.');
const modes = new Map<string, Map<string, number>>();
for (const run of runs) {
  const mode = classify(run);
  const counts = modes.get(mode) ?? new Map<string, number>();
  counts.set(run.column, (counts.get(run.column) ?? 0) + 1);
  modes.set(mode, counts);
}
table(
  ['', ...columns],
  [...modes].sort(([a], [b]) => a.localeCompare(b)).map(([mode, counts]) => [mode, ...columns.map((column) => String(counts.get(column) ?? 0))]),
);

const clean = runs.filter((run) => !run.apiErrors);

section('Paired comparisons', 'Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.');
const outcomes = new Map<string, Map<string, boolean>>();
for (const run of clean) {
  const key = `${run.case}#${run.rep}`;
  const byColumn = outcomes.get(key) ?? new Map<string, boolean>();
  byColumn.set(run.column, run.pass);
  outcomes.set(key, byColumn);
}
const pairs: string[][] = [];
for (const [i, a] of columns.entries()) {
  for (const b of columns.slice(i + 1)) {
    let aWins = 0;
    let bWins = 0;
    for (const byColumn of outcomes.values()) {
      if (!byColumn.has(a) || !byColumn.has(b)) continue;
      if (byColumn.get(a) && !byColumn.get(b)) aWins++;
      if (byColumn.get(b) && !byColumn.get(a)) bWins++;
    }
    pairs.push([`${a} vs ${b}`, `${aWins} / ${bWins}`, signTest(aWins, bWins).toFixed(2)]);
  }
}
table(['', 'wins', 'p'], pairs);

section('Split cases', 'Cases some columns passed and others failed, with how each failure ended.');
const split: string[][] = [];
for (const [key, byColumn] of outcomes) {
  const passed = columns.filter((column) => byColumn.get(column) === true);
  const failed = columns.filter((column) => byColumn.get(column) === false);
  if (!passed.length || !failed.length) continue;
  const why = failed.map((column) => `${column} (${classify(clean.find((run) => `${run.case}#${run.rep}` === key && run.column === column)!)})`);
  split.push([key.replace(/#1$/, ''), passed.join(', '), why.join(', ')]);
}
table(['case', 'passed', 'failed'], split);

section(
  'Reasoning',
  'Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.',
);
table(
  ['', 'median / response', 'p90', `over ${LONG_CHARS / 1000}k`, 'turns to first edit', 'reasoning before it (median)'],
  columns.map((column) => {
    const own = clean.filter((run) => run.column === column);
    const reasoning = own.flatMap((run) => run.reqs.filter((req) => !req.error).map((req) => req.reasoningChars));
    const toEdit: number[] = [];
    const beforeEdit: number[] = [];
    for (const run of own) {
      let sum = 0;
      const index = run.reqs.findIndex((req) => {
        sum += req.reasoningChars;
        return req.toolCalls.some((name) => EDITS.has(name));
      });
      if (index >= 0) {
        toEdit.push(index + 1);
        beforeEdit.push(sum);
      }
    }
    return [
      column,
      fmt(quantile(reasoning, 0.5)),
      fmt(quantile(reasoning, 0.9)),
      pct(reasoning.filter((chars) => chars > LONG_CHARS).length / reasoning.length),
      fmt(quantile(toEdit, 0.5)),
      fmt(quantile(beforeEdit, 0.5)),
    ];
  }),
);

section('After failing tests', 'The response right after a tool result with failing tests: does the model act, or deliberate?');
table(
  ['', 'test runs / run', 'failing results', 'next response: median reasoning', `over ${LONG_CHARS / 1000}k`, 'test output chars (median / p90)'],
  columns.map((column) => {
    const own = clean.filter((run) => run.column === column);
    const next: number[] = [];
    const sizes: number[] = [];
    let testRuns = 0;
    for (const run of own) {
      const results = toolResults(run);
      const tests = results.filter((result) => TEST_RESULT.test(result));
      testRuns += tests.length;
      sizes.push(...tests.map((result) => result.length));
      // Each request's tool calls are answered, in order, before the next request.
      let at = 0;
      run.reqs.slice(0, -1).forEach((req, i) => {
        const answers = results.slice(at, (at += req.toolCalls.length));
        const following = run.reqs[i + 1]!;
        if (answers.some((result) => TEST_FAILED.test(result))) next.push(following.error ? Infinity : following.reasoningChars);
      });
    }
    return [
      column,
      (testRuns / own.length).toFixed(1),
      String(next.length),
      fmt(quantile(next, 0.5)),
      pct(next.filter((chars) => chars > LONG_CHARS).length / (next.length || 1)),
      `${fmt(quantile(sizes, 0.5))} / ${fmt(quantile(sizes, 0.9))}`,
    ];
  }),
);

section('Long responses', `Responses over ${LONG_MS / 60_000} minutes, and the share of timed-out runs' time they took.`);
table(
  ['', 'count', 'share of timed-out time', 'longest finished response, median (min)'],
  columns.map((column) => {
    const own = clean.filter((run) => run.column === column);
    const timedOut = own.filter((run) => run.status === 'timeout');
    const longTime = timedOut.reduce((sum, run) => sum + run.reqs.filter((req) => req.ms > LONG_MS).reduce((s, req) => s + req.ms, 0), 0);
    const wall = timedOut.reduce((sum, run) => sum + run.wallMs, 0);
    const longest = own.map((run) => Math.max(0, ...run.reqs.filter((req) => !req.error).map((req) => req.ms)) / 60_000);
    return [column, String(own.reduce((n, run) => n + run.reqs.filter((req) => req.ms > LONG_MS).length, 0)), pct(wall ? longTime / wall : 0), quantile(longest, 0.5).toFixed(1)];
  }),
);

section(
  'Web use',
  'Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.',
);
table(
  ['', 'fetches / run', 'runs with any', 'hosts', 'from solution sources'],
  columns.map((column) => {
    const own = clean.filter((run) => run.column === column);
    const fetches = own.map((run) => ({ run, fetches: webFetches(readTranscript(run.dir)) }));
    const hosts = new Map<string, number>();
    for (const { fetches: list } of fetches) for (const fetch of list) hosts.set(fetch.host ?? `search: ${fetch.target}`, (hosts.get(fetch.host ?? `search: ${fetch.target}`) ?? 0) + 1);
    const suspicious = fetches.flatMap(({ run, fetches: list }) => list.filter((fetch) => fetch.solutionSource).map((fetch) => `${run.case}: ${fetch.target}`));
    return [
      column,
      (fetches.reduce((n, { fetches: list }) => n + list.length, 0) / (own.length || 1)).toFixed(2),
      String(fetches.filter(({ fetches: list }) => list.length).length),
      [...hosts].sort(([, a], [, b]) => b - a).map(([host, n]) => `${host} ${n}`).join(', ') || '–',
      suspicious.join('<br>') || '–',
    ];
  }),
);

section('Possibly hardcoded', 'Short solutions returning literals from the tests (guards.ts): look before trusting the pass.');
const cases = new Map(loadCases().map((c) => [c.id, c]));
table(
  ['column', 'case', 'passed', 'literals'],
  clean.flatMap((run) => {
    const c = cases.get(run.case);
    const diff = join(run.dir, 'changes.diff');
    if (!c || !existsSync(diff)) return [];
    const hits = hardcodedAnswers(readFileSync(diff, 'utf8'), c.solution, c.tests.map((name) => c.files.get(name)!));
    return hits.length ? [[run.column, run.case, run.pass ? 'yes' : 'no', hits.join(', ')]] : [];
  }),
);

if (argv.runaways) {
  section(
    'Runaway responses',
    'Timeouts that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.',
  );
  table(
    ['column', 'case', 'turn', 'minutes', 'reasoning', 'repeated', 'after'],
    clean
      .filter((run) => classify(run) === 'timeout: runaway response')
      .map((run) => {
        const last = run.reqs.at(-1)!;
        const reasoning = lastReasoning(readTranscript(run.dir));
        const previous = toolResults(run).at(-1);
        const after = previous === undefined ? 'the task' : TEST_FAILED.test(previous) ? 'failing tests' : TEST_RESULT.test(previous) ? 'passing tests' : 'another tool result';
        return [run.column, run.case, String(run.reqs.length), (last.ms / 60_000).toFixed(0), fmt(reasoning.length), pct(repetition(reasoning)), after];
      }),
  );
}

console.log(out.join('\n'));

function load(dir: string, prefix: string, label: number): Run[] {
  // The latest row of each run: a rerun replaces the row before it.
  const rows = new Map<string, RunResult>();
  for (const line of readFileSync(join(dir, 'results.jsonl'), 'utf8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line) as RunResult;
    rows.set(`${row.harness}|${row.case}|${row.rep}`, row);
  }
  return [...rows.values()]
    .filter((row) => !argv.harness?.length || argv.harness.includes(row.harness))
    .map((row) => {
      const runDir = join(dir, 'runs', row.harness, `${row.case.replace('/', '-')}-r${row.rep}`);
      const file = join(runDir, 'requests.jsonl');
      const reqs = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as RequestRecord) : [];
      return { ...row, column: `${prefix}${row.harness}`, label, dir: runDir, reqs };
    });
}

function classify(run: Run): string {
  if (run.apiErrors) return 'API errors';
  if (run.pass) return run.status === 'timeout' ? 'passed, then timed out' : 'passed';
  const last = run.reqs.at(-1);
  if (run.status === 'timeout') {
    if (last?.error?.startsWith('aborted') && (last.ms > RUNAWAY_MS || last.reasoningChars > RUNAWAY_CHARS)) return 'timeout: runaway response';
    if (run.wallMs && run.llmMs / run.wallMs < 0.5) return 'timeout: mostly in tools';
    return 'timeout: iterating';
  }
  if (run.status === 'crash') return 'crashed';
  if (last && (last.finish === 'length' || last.finish === 'max_tokens')) return 'stopped: output limit';
  return 'stopped: tests failing';
}

function toolResults(run: Run): string[] {
  return transcriptResults(readTranscript(run.dir));
}

function repetition(text: string): number {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 20);
  return lines.length ? 1 - new Set(lines).size / lines.length : 0;
}

function signTest(a: number, b: number): number {
  const n = a + b;
  if (!n) return 1;
  let tail = 0;
  for (let k = 0; k <= Math.min(a, b); k++) tail += choose(n, k);
  return Math.min(1, (2 * tail) / 2 ** n);
}

function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

function quantile(values: number[], q: number): number {
  const sorted = values.filter((value) => Number.isFinite(value) || value === Infinity).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]! : 0;
}

function fmt(value: number): string {
  if (value === Infinity) return 'cut off';
  return value >= 10_000 ? `${(value / 1000).toFixed(0)}k` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function section(title: string, note: string): void {
  out.push('', `## ${title}`, '', note, '');
}

function table(header: string[], rows: string[][]): void {
  if (!rows.length) return void out.push('(none)');
  out.push(`| ${header.join(' | ')} |`, `|${header.map((_, i) => (i ? '---:' : '---')).join('|')}|`, ...rows.map((row) => `| ${row.join(' | ')} |`));
}
