import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { caseName, changes, ensureToolchains, grade, killGroup, linkToolchains, loadCases, SETS, POLYGLOT, prepareWorkspace, run, toolchainVersions, type Case } from './cases.ts';
import { HARNESSES, type Harness, type HarnessContext } from './harnesses.ts';
import { MeteringProxy } from './proxy.ts';
import { summarize, toolCategory, type RunResult } from './report.ts';

const argv = await yargs(hideBin(process.argv))
  .scriptName('bench')
  .usage('$0 [options] [case...]\n\nRun the harnesses on the cases (all, or those named by id, language or exercise), and grade them.')
  .option('harness', {
    alias: 'H',
    type: 'array',
    string: true,
    choices: HARNESSES.map((harness) => harness.name),
    describe: 'Harnesses to run (default: all)',
  })
  .option('jobs', { alias: 'j', type: 'number', default: 1, describe: 'Runs at once; the server has its own slot count, beyond which requests queue' })
  .option('reps', { alias: 'r', type: 'number', default: 1, describe: 'Runs of each harness on each case' })
  .option('timeout', { type: 'number', default: 20, describe: 'Minutes a run may take before its harness is killed' })
  .option('base-url', {
    type: 'string',
    default: process.env.BENCH_UPSTREAM ?? 'http://34.61.203.44:9931/v1',
    describe: 'The model server, with /v1 (env BENCH_UPSTREAM)',
  })
  .option('model', { type: 'string', default: 'qwen3.5-9b', describe: 'Model name sent where a harness has no config of its own (nanocode)' })
  .option('out', { type: 'string', describe: 'Results directory (default: results/<timestamp>)' })
  .option('keep', { type: 'boolean', default: false, describe: "Keep each run's temporary home and workspace" })
  .option('list', { type: 'boolean', default: false, describe: 'List the harnesses and cases, and exit' })
  .option('set', { type: 'string', choices: SETS, default: 'all', describe: 'Case set from cases.json' })
  .strictOptions()
  .parseAsync();

const cases = loadCases(argv._.map(String), argv.set);
const harnesses = HARNESSES.filter((harness) => !argv.harness?.length || argv.harness.includes(harness.name));
if (argv.list) {
  for (const harness of harnesses) console.log(`${harness.name}: ${harness.description}`);
  console.log(cases.map((c) => c.id).join('\n'));
  process.exit(0);
}

ensureToolchains(cases);
const versions = Object.fromEntries(harnesses.map((harness) => [harness.name, harness.prepare()]));
const out = argv.out ?? join(import.meta.dirname, 'results', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(join(out, 'prompts'), { recursive: true });
for (const c of cases) writeFileSync(join(out, 'prompts', `${caseName(c)}.md`), `${c.prompt}\n`);

const server = await serverInfo(argv.baseUrl);
writeFileSync(
  join(out, 'meta.json'),
  `${JSON.stringify(
    {
      started: new Date().toISOString(),
      upstream: argv.baseUrl,
      server,
      harnesses: Object.fromEntries(harnesses.map((harness) => [harness.name, { version: versions[harness.name], description: harness.description }])),
      cases: cases.map((c) => c.id),
      reps: argv.reps,
      jobs: argv.jobs,
      timeoutMinutes: argv.timeout,
      toolchains: toolchainVersions(),
    },
    null,
    2,
  )}\n`,
);

const proxy = await MeteringProxy.start(argv.baseUrl);

interface Job {
  harness: Harness;
  c: Case;
  rep: number;
}

// Case-major, harness-minor: at -j matching the harness count, each case's runs share the server at once.
const jobs: Job[] = [];
for (let rep = 1; rep <= argv.reps; rep++) for (const c of cases) for (const harness of harnesses) jobs.push({ harness, c, rep });

const live = new Set<number>();
let interrupted = false;
process.on('SIGINT', () => {
  if (interrupted) process.exit(130);
  interrupted = true;
  console.error('\nInterrupted: stopping runs in flight; Ctrl-C again to quit now');
  for (const pid of live) killGroup(pid);
});

console.error(`${jobs.length} runs (${harnesses.length} harnesses × ${cases.length} cases × ${argv.reps}), ${argv.jobs} at a time → ${out}`);
let done = 0;
const queue = [...jobs];
await Promise.all(
  Array.from({ length: Math.max(1, Math.min(argv.jobs, jobs.length)) }, async () => {
    for (let job = queue.shift(); job && !interrupted; job = queue.shift()) {
      const result = await runJob(job);
      if (!result) continue;
      appendFileSync(join(out, 'results.jsonl'), `${JSON.stringify(result)}\n`);
      console.error(`[${++done}/${jobs.length}] ${progress(result)}`);
    }
  }),
);
await proxy.stop();
console.log(summarize(out));

async function runJob({ harness, c, rep }: Job): Promise<RunResult | undefined> {
  const id = `${harness.name}.${caseName(c)}.r${rep}`;
  const dir = join(out, 'runs', harness.name, `${caseName(c)}-r${rep}`);
  mkdirSync(dir, { recursive: true });
  // Neutral: the model sees this path, and it shouldn't name a harness.
  const tmp = mkdtempSync(join(tmpdir(), 'bench-'));
  const home = join(tmp, 'home');
  const xdg = { config: join(home, '.config'), data: join(home, '.local', 'share'), state: join(home, '.local', 'state'), cache: join(home, '.cache') };
  for (const path of [...Object.values(xdg), join(tmp, 'tmp'), join(tmp, 'run')]) mkdirSync(path, { recursive: true, mode: 0o700 });
  // Named after the exercise, as a user's checkout would be.
  const workspace = join(tmp, c.exercise);
  const toolchains = linkToolchains(tmp);
  prepareWorkspace(c, workspace, toolchains.tools);

  const meter = proxy.open(id, join(dir, 'requests.jsonl'), join(dir, 'transcript.json'));
  const ctx: HarnessContext = { home, xdg, workspace, prompt: c.prompt, baseURL: meter.baseURL, model: argv.model };
  const invocation = harness.setup(ctx);
  const env = isolatedEnv(tmp, toolchains.path, ctx, invocation.env);
  const started = new Date();
  const result = await run(invocation.command, invocation.args, {
    cwd: workspace,
    env,
    timeoutMs: argv.timeout * 60_000,
    log: { stdout: join(dir, 'stdout.log'), stderr: join(dir, 'stderr.log') },
    onSpawn: (pid) => live.add(pid),
  });
  if (result.pid !== undefined) live.delete(result.pid);
  proxy.close(id);
  if (interrupted) {
    rmSync(tmp, { recursive: true, force: true });
    return undefined;
  }

  const changed = changes(c, workspace);
  writeFileSync(join(dir, 'changes.diff'), changed.diff);
  const graded = await grade(c, workspace, env);
  writeFileSync(join(dir, 'test.log'), graded.output);
  if (argv.keep) console.error(`Kept ${tmp}`);
  else rmSync(tmp, { recursive: true, force: true });

  const records = meter.records;
  const sum = (pick: (tokens: { prompt: number; cached: number; completion: number }) => number) =>
    records.reduce((total, record) => total + (record.tokens ? pick(record.tokens) : 0), 0);
  const tools: Record<string, number> = {};
  const categories: Record<string, number> = {};
  for (const name of records.flatMap((record) => record.toolCalls)) {
    tools[name] = (tools[name] ?? 0) + 1;
    categories[toolCategory(name)] = (categories[toolCategory(name)] ?? 0) + 1;
  }
  // The output limit apart: opencode recomputes it for every request.
  const limits = records.flatMap((record) => [record.params.max_tokens, record.params.max_completion_tokens]).filter((value) => typeof value === 'number');
  const settings = records.map(({ params: { max_tokens, max_completion_tokens, ...rest } }) => JSON.stringify(rest));
  const params = [...new Set(settings)].map((text) => JSON.parse(text) as Record<string, unknown>);
  const run_: RunResult = {
    harness: harness.name,
    case: c.id,
    lang: c.lang,
    rep,
    started: started.toISOString(),
    status: result.timedOut ? 'timeout' : result.exitCode !== 0 ? 'crash' : graded.pass ? 'pass' : 'fail',
    pass: graded.pass,
    tests: { passed: graded.passed, total: graded.total },
    exitCode: result.exitCode,
    wallMs: result.ms,
    llmMs: records.reduce((total, record) => total + record.ms, 0),
    serverMs: records.reduce((total, record) => total + (record.serverMs ? record.serverMs.prompt + record.serverMs.predicted : 0), 0),
    requests: records.length,
    // Not the request cut off when the run ended: that's the timeout's.
    apiErrors: records.filter((record) => record.status >= 400 || (record.error && !record.error.startsWith('aborted'))).length,
    tokens: {
      prompt: sum((tokens) => tokens.prompt),
      cached: sum((tokens) => tokens.cached),
      uncached: sum((tokens) => tokens.prompt - tokens.cached),
      completion: sum((tokens) => tokens.completion),
    },
    uncounted: records.filter((record) => !record.tokens).length,
    peakContext: Math.max(0, ...records.map((record) => (record.tokens ? record.tokens.prompt + record.tokens.completion : 0))),
    firstPrompt: records[0]?.tokens?.prompt ?? null,
    toolCalls: Object.values(tools).reduce((total, count) => total + count, 0),
    tools,
    categories,
    unparsedToolCalls: records.filter((record) => record.unparsedToolCall).length,
    unknownToolCalls: records.reduce((total, record) => total + record.unknownTools.length, 0),
    lengthStops: records.filter((record) => record.finish === 'length' || record.finish === 'max_tokens').length,
    reasoningChars: records.reduce((total, record) => total + record.reasoningChars, 0),
    linesAdded: changed.files.reduce((total, file) => total + file.added, 0),
    linesRemoved: changed.files.reduce((total, file) => total + file.removed, 0),
    filesChanged: changed.files.map((file) => file.path),
    tampered: changed.tampered,
    sawCache: sawCache(dir),
    params,
    maxOutput: limits.length ? Math.max(...limits) : null,
  };
  writeFileSync(join(dir, 'result.json'), `${JSON.stringify(run_, null, 2)}\n`);
  return run_;
}

/**
 * The bench's environment for a harness, minus anything that would let it reach
 * past its run: keys (a config that misses the proxy fails instead of reaching a paid API), `MODEL` (featherloop and nanocode read it), opencode's
 * overrides, npm's script variables (`INIT_CWD` among them), and the user's XDG directories.
 */
function isolatedEnv(tmp: string, toolPath: string[], { home, xdg, baseURL }: HarnessContext, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const strip = /^(OPENCODE_|ANTHROPIC_|OPENAI_|OPENROUTER_|PARALLEL_|CLAUDE|FEATHERLOOP|XDG_|npm_)|^(MODEL|INIT_CWD|OLDPWD)$/i;
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !strip.test(name)));
  // The proxy is local: whatever proxy the environment sets, harnesses must reach it directly.
  const noProxy = [...new Set([...(process.env.NO_PROXY ?? process.env.no_proxy ?? '').split(',').filter(Boolean), '127.0.0.1', 'localhost'])].join(',');
  return {
    ...env,
    HOME: home,
    XDG_CONFIG_HOME: xdg.config,
    XDG_DATA_HOME: xdg.data,
    XDG_STATE_HOME: xdg.state,
    XDG_CACHE_HOME: xdg.cache,
    XDG_RUNTIME_DIR: join(tmp, 'run'),
    TMPDIR: join(tmp, 'tmp'),
    PATH: [...toolPath, process.env.PATH ?? ''].join(delimiter),
    NO_PROXY: noProxy,
    no_proxy: noProxy,
    // The harness configs point their provider here.
    BENCH_BASE_URL: baseURL,
    ...extra,
  };
}

/**
 * Whether the conversation reached the exercises' checkout, where the reference
 * solutions are: harnesses run unsandboxed, and a search outside the workspace can
 * find them. The last request holds the whole conversation, unless it was compacted.
 */
function sawCache(dir: string): boolean {
  return ['transcript.json', 'stdout.log'].some((name) => {
    const path = join(dir, name);
    return existsSync(path) && readFileSync(path, 'utf8').includes(POLYGLOT.dir);
  });
}

function progress(result: RunResult): string {
  const tokens = result.tokens.prompt + result.tokens.completion;
  return [
    `${result.harness} ${result.case} r${result.rep}: ${result.status}`,
    `${result.tests.passed}/${result.tests.total} tests`,
    `${(result.wallMs / 1000).toFixed(0)}s`,
    `${result.requests} req`,
    `${(tokens / 1000).toFixed(1)}k tok`,
    `${result.toolCalls} tool calls`,
    ...(result.sawCache ? ['REACHED THE BENCH CACHE'] : []),
  ].join(', ');
}

/** The server's model, build and slots, from llama.cpp's `/props` and `/v1/models`; whatever answers. */
async function serverInfo(baseURL: string): Promise<Record<string, unknown>> {
  const root = baseURL.replace(/\/v1\/?$/, '');
  const props = (await getJson(`${root}/props`)) as Record<string, any> | undefined;
  const models = (await getJson(`${baseURL.replace(/\/$/, '')}/models`)) as { data?: { id: string; meta?: unknown }[] } | undefined;
  if (!props && !models) throw new Error(`No model server at ${baseURL}`);
  return {
    models: models?.data?.map((model) => ({ id: model.id, meta: model.meta })),
    build: props?.build_info,
    modelPath: props?.model_path,
    slots: props?.total_slots,
    defaults: props?.default_generation_settings?.params
      ? Object.fromEntries(
          ['temperature', 'top_k', 'top_p', 'min_p', 'presence_penalty', 'repeat_penalty'].map((key) => [key, props.default_generation_settings.params[key]]),
        )
      : undefined,
  };
}

function getJson(url: string): Promise<unknown> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(res.statusCode === 200 ? JSON.parse(body) : undefined);
        } catch {
          resolve(undefined);
        }
      });
    });
    req.setTimeout(30_000, () => req.destroy());
    req.on('error', () => resolve(undefined));
  });
}
