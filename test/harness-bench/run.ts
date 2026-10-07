import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { tmpdir } from 'node:os';
import { basename, delimiter, join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { caseName, changes, ensureToolchains, grade, killGroup, linkToolchains, loadCases, SETS, POLYGLOT, prepareWorkspace, run, toolchainVersions, type Case } from './cases.ts';
import { HARNESSES, MODELS, type Harness, type HarnessContext, type Settings } from './harnesses.ts';
import { hardcodedAnswers } from './guards.ts';
import { ServerPool, WorkQueue, type Attempt, type Health, type Server } from './pool.ts';
import { infrastructureError, MeteringProxy, SERVER_LOST, type RequestRecord } from './proxy.ts';
import { readTranscript, webFetches } from './transcript.ts';
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
  .option('jobs', {
    alias: 'j',
    type: 'number',
    describe: "Runs at once on each server (default: its slots, from llama.cpp's /props; 1 on a hosted API)",
  })
  .option('reps', { alias: 'r', type: 'number', default: 1, describe: 'Runs of each harness on each case' })
  .option('timeout', {
    type: 'number',
    describe: 'Minutes a run may take before its harness is killed (default: 20; with --max-output, a safety net: time for the budget at 10 tokens a second, at least 120)',
  })
  .option('model', { alias: 'm', type: 'string', choices: Object.keys(MODELS), default: 'qwen3.5-9b', describe: 'Model under test, from models.json' })
  .option('base-url', {
    type: 'string',
    describe: "The model server, with /v1 (env BENCH_UPSTREAM; default: the model's upstream in models.json)",
  })
  .option('servers-cmd', {
    type: 'string',
    conflicts: 'base-url',
    describe:
      'A shell command that prints model servers, a base URL with /v1 a line (e.g. test/harness-bench/servers/gce-mig.sh): run again every --servers-every seconds, servers join and leave as its output changes',
  })
  .option('servers-every', { type: 'number', default: 60, describe: 'Seconds between runs of --servers-cmd' })
  .option('out', { type: 'string', describe: 'Results directory (default: results/<timestamp>)' })
  .option('sync-cmd', {
    type: 'string',
    describe:
      'A shell command that copies the results directory, its $1, somewhere that outlives this machine (e.g. \'gcloud storage rsync --recursive "$1" gs://<bucket>/results/$(basename "$1")\'): run every --sync-every seconds and once at the end; a failure is said, and the bench goes on',
  })
  .option('sync-every', { type: 'number', default: 300, describe: 'Seconds between runs of --sync-cmd' })
  .option('keep', { type: 'boolean', default: false, describe: "Keep each run's temporary home and workspace" })
  .option('list', { type: 'boolean', default: false, describe: 'List the harnesses and cases, and exit' })
  .option('set', { type: 'string', choices: SETS, default: 'all', describe: 'Case set from cases.json' })
  .option('advisor', {
    type: 'string',
    choices: Object.keys(MODELS),
    describe: 'A model from models.json to advise featherloop-advisor (and include that harness)',
  })
  .option('max-cost', {
    type: 'number',
    describe: "Dollars: start no more runs once the runs so far cost this much (priced models only; runs in flight finish)",
  })
  .option('max-output', {
    type: 'number',
    describe: 'Tokens a run may generate before it is ended, its harness killed as at the timeout: a budget of work, the same on any hardware (keep --timeout as a safety net)',
  })
  .option('reasoning-budget', {
    type: 'number',
    describe: "Caps the model's reasoning per response, for every harness, at the proxy (reasoning_budget_tokens; llama.cpp)",
  })
  .option('thinking', {
    type: 'boolean',
    default: true,
    describe: "--no-thinking turns the model's thinking off for every harness, at the proxy (enable_thinking: false)",
  })
  .option('rerun-api-errors', {
    type: 'string',
    describe:
      "A results directory: run again the runs in it that hit API errors (e.g. a proxy's timeout), replacing them, and any an interrupted bench never started, on its model, server and timeout",
  })
  .strictOptions()
  .parseAsync();

/** Attempts at a run whose server failed it, the first included: its last result stands. */
const ATTEMPTS = 3;
/** How often the pool checks its servers' health, and how long a check may take: two failed in a row and a server is out. */
const HEALTH_EVERY_MS = 10_000;
const PROBE_TIMEOUT_MS = 10_000;
/** The server defaults the report shows: llama.cpp's samplers that change what a model writes. */
const SAMPLING_SHOWN = ['temperature', 'top_k', 'top_p', 'min_p', 'presence_penalty', 'frequency_penalty', 'repeat_penalty', 'dry_multiplier', 'xtc_probability', 'typical_p', 'top_n_sigma', 'mirostat'];

const rerun = argv.rerunApiErrors === undefined ? undefined : rerunTargets(argv.rerunApiErrors);
// Results from before models.json are all on the default model.
const model = MODELS[rerun ? (rerun.meta.model ?? 'qwen3.5-9b') : argv.model]!;
// One server, or a command that lists them; a rerun's, unless told otherwise.
const explicitUpstream = argv.baseUrl ?? process.env.BENCH_UPSTREAM;
const serversCmd: string | undefined = argv.serversCmd ?? (explicitUpstream === undefined ? rerun?.meta.serversCmd : undefined);
// A rerun copies its results where the run it reruns did.
const syncCmd: string | undefined = argv.syncCmd ?? rerun?.meta.syncCmd;
let syncing: Promise<boolean> | undefined;
const upstream: string | undefined = serversCmd === undefined ? (explicitUpstream ?? (rerun ? rerun.meta.upstream : model.upstream)) : undefined;
if (serversCmd !== undefined && model.flavor !== 'openai') throw new Error(`--servers-cmd lists llama.cpp servers; ${model.id} speaks ${model.flavor}`);
// With a budget, the timeout is only a safety net, which load mustn't reach: 40k tokens at 16 a second (8 runs
// at 60k contexts on a G4) take 42 minutes.
const timeout: number = rerun ? rerun.meta.timeoutMinutes : (argv.timeout ?? (argv.maxOutput ? Math.max(120, Math.ceil(argv.maxOutput / 10 / 60)) : 20));
// Reruns as the run they replace; results from before settings ran nanocode as shipped.
const settings: Settings = rerun
  ? (rerun.meta.settings ?? {})
  : {
      nanocodeMaxTokens: model.limit.output,
      ...(argv.thinking ? {} : { thinking: false }),
      ...(argv.advisor ? { advisor: argv.advisor } : {}),
      ...(argv.maxOutput ? { maxOutput: argv.maxOutput } : {}),
      ...(argv.reasoningBudget ? { reasoningBudget: argv.reasoningBudget } : {}),
    };
const advisorModel = settings.advisor === undefined ? undefined : MODELS[settings.advisor];
if (settings.advisor !== undefined && !advisorModel) throw new Error(`No model ${settings.advisor} in models.json`);
const cases = loadCases(argv._.map(String), rerun ? 'all' : argv.set).filter((c) => !rerun || rerun.cases.has(c.id));
const harnesses = HARNESSES.filter(
  (harness) =>
    (argv.harness?.length
      ? argv.harness.includes(harness.name)
      : (harness.byDefault ?? harness.supports)?.(model, settings) ?? true) &&
    (!rerun || rerun.harnesses.has(harness.name)),
);
for (const harness of harnesses) {
  if (harness.supports && !harness.supports(model, settings)) {
    throw new Error(`${harness.name} can't run ${model.id} (${model.flavor})${settings.advisor ? '' : ' without --advisor'}`);
  }
}
if (argv.list) {
  for (const harness of harnesses) console.log(`${harness.name}: ${harness.description}`);
  console.log(cases.map((c) => c.id).join('\n'));
  process.exit(0);
}

ensureToolchains(cases);
const versions = Object.fromEntries(harnesses.map((harness) => [harness.name, harness.prepare()]));
const out = rerun?.dir ?? argv.out ?? join(import.meta.dirname, 'results', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(join(out, 'prompts'), { recursive: true });
for (const c of cases) writeFileSync(join(out, 'prompts', `${caseName(c)}.md`), `${c.prompt}\n`);

if (settings.thinking === false && model.flavor !== 'openai') {
  throw new Error(`--no-thinking sets llama.cpp's chat template; ${model.id} speaks ${model.flavor}`);
}
if (settings.reasoningBudget !== undefined && model.flavor !== 'openai') {
  throw new Error(`--reasoning-budget is llama.cpp's; ${model.id} speaks ${model.flavor}`);
}
// A hosted API's key stays here: the proxy adds it upstream, harnesses get none.
const keyFor = (m: typeof model) => {
  if (m.flavor !== 'anthropic') return undefined;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error(`${m.id} needs ANTHROPIC_API_KEY (in .env)`);
  return process.env.ANTHROPIC_API_KEY;
};
const apiKey = keyFor(model);

interface Job {
  harness: Harness;
  c: Case;
  rep: number;
}

// Case-major, harness-minor: with as many slots as harnesses, each case's runs share a server at once.
const jobs: Job[] = [];
if (rerun) {
  for (const key of rerun.keys) {
    const [name, id, rep] = key.split('|') as [string, string, string];
    const harness = harnesses.find((harness) => harness.name === name);
    const c = cases.find((c) => c.id === id);
    if (harness && c) jobs.push({ harness, c, rep: Number(rep) });
  }
} else {
  for (let rep = 1; rep <= argv.reps; rep++) for (const c of cases) for (const harness of harnesses) jobs.push({ harness, c, rep });
}

const live = new Set<number>();
let interrupted = false;
let queue: WorkQueue<Job> | undefined;
process.on('SIGINT', () => {
  // Nothing runs before the queue does.
  if (interrupted || !queue) process.exit(130);
  interrupted = true;
  console.error('\nInterrupted: stopping runs in flight; Ctrl-C again to quit now');
  for (const pid of live) killGroup(pid);
  queue.pump();
});

// The servers: llama.cpp's join once healthy and on the reference model and build, a rerun's
// those of the run it reruns; a hosted API is taken as it is.
const hosted = model.flavor !== 'openai';
const pool = new ServerPool({
  list: serversCmd === undefined ? async () => [upstream!] : () => listServers(serversCmd),
  listEvery: serversCmd === undefined ? Infinity : argv.serversEvery * 1000,
  probe: hosted ? async () => ({ ok: true }) : probe,
  checkEvery: hosted ? Infinity : HEALTH_EVERY_MS,
  ...(argv.jobs !== undefined ? { jobs: argv.jobs } : hosted ? { jobs: 1 } : {}),
  ...(rerun?.meta.server?.modelPath
    ? {
        reference: {
          model: basename(rerun.meta.server.modelPath),
          build: rerun.meta.server.build ?? null,
          // Results from before the pool compared settings have none: those reruns check model and build only.
          ...(rerun.meta.server.settings ? { settings: rerun.meta.server.settings } : {}),
        },
      }
    : {}),
  log: (line) => console.error(line),
});
await pool.start();
if (!pool.up().length) {
  console.error(`Waiting for a server${serversCmd === undefined ? '' : ` from ${serversCmd}`}`);
  await once(pool, 'join');
}
const first = pool.up()[0]!;

const started = new Date().toISOString();
// What this bench (or rerun) ran on: the first server's model and build, which the others match; each server as it joined; the runs requeued.
const record: Record<string, any> = {
  started,
  ...(serversCmd === undefined ? { upstream } : { serversCmd }),
  ...(syncCmd ? { syncCmd } : {}),
  server: await serverInfo(first.url),
  servers: [] as { url: string; joined: string; slots: number }[],
  requeues: [] as { run: string; attempt: number; server: string; why: string; at: string }[],
};
const meta = rerun
  ? { ...rerun.meta, reruns: [...(rerun.meta.reruns ?? []), record] }
  : Object.assign(record, {
      model: model.id,
      harnesses: Object.fromEntries(
        harnesses.map((harness) => [harness.name, { version: versions[harness.name], description: harness.description, notes: harness.notes(settings) }]),
      ),
      settings,
      cases: cases.map((c) => c.id),
      reps: argv.reps,
      // A cap per server; none means each server's slots.
      jobs: argv.jobs ?? null,
      timeoutMinutes: timeout,
      toolchains: toolchainVersions(),
    });
if (rerun) {
  Object.assign(record, {
    why: 'API errors',
    runs: [...rerun.keys],
    harnesses: Object.fromEntries(harnesses.map((harness) => [harness.name, { version: versions[harness.name] }])),
    settings,
    jobs: argv.jobs ?? null,
  });
}
// The record is meta, or its latest rerun: write meta again as it changes.
const saveMeta = () => writeFileSync(join(out, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
const joined = (server: Server) => {
  if (record.servers.some((known: { url: string }) => known.url === server.url)) return;
  record.servers.push({ url: server.url, joined: new Date().toISOString(), slots: server.slots });
  saveMeta();
};
for (const server of pool.up()) joined(server);
pool.on('join', joined);
saveMeta();

// Every run names its server; this one is only the default.
const proxy = await MeteringProxy.start(first.url, {
  ...(settings.thinking === false ? { thinking: false } : {}),
  ...(apiKey ? { apiKey } : {}),
  // llama.cpp's chat templates take one system message, first.
  ...(model.flavor === 'openai' ? { foldSystemMessages: true } : {}),
  ...(settings.reasoningBudget !== undefined ? { reasoningBudget: settings.reasoningBudget } : {}),
});
// The advisor's own proxy: its calls are metered apart from the model's.
const advisorKey = advisorModel && keyFor(advisorModel);
const advisorProxy = advisorModel && (await MeteringProxy.start(advisorModel.upstream, advisorKey ? { apiKey: advisorKey } : {}));
let spent = 0;

const perServer = argv.jobs === undefined ? (hosted ? '1 at a time' : 'as many at a time as each server has slots') : `up to ${argv.jobs} at a time per server`;
console.error(
  rerun
    ? `Running ${jobs.length} runs that hit infrastructure errors or never ran, ${perServer} → ${out}`
    : `${jobs.length} runs (${harnesses.length} harnesses × ${cases.length} cases × ${argv.reps}), ${perServer} → ${out}`,
);
let done = 0;
queue = new WorkQueue(pool, jobs, {
  attempts: ATTEMPTS,
  run: runJob,
  canStart: () => !interrupted && !overBudget(),
  requeued: ({ job, attempt, server }, why) => {
    const id = `${job.harness.name}|${job.c.id}|${job.rep}`;
    record.requeues.push({ run: id, attempt, server: server.url, why, at: new Date().toISOString() });
    saveMeta();
    console.error(`requeued ${job.harness.name} ${job.c.id} r${job.rep} after attempt ${attempt} on ${server.url}: ${why}`);
  },
  log: (line) => console.error(line),
});
queue.pump();
// Results only on this machine are lost with it: copy them as they come, from the start, so a command that fails says so at once.
if (syncCmd) void sync();
const syncTimer = syncCmd ? setInterval(() => void sync(), argv.syncEvery * 1000) : undefined;
const { left } = await queue.done;
pool.stop();
await proxy.stop();
await advisorProxy?.stop();
if (interrupted) console.error(`Interrupted, ${left} runs not started: --rerun-api-errors ${out} runs what's missing`);
else if (left) console.error(`Stopped, ${left} runs not started`);
// The servers can go: nothing left to run.
else console.error(`queue drained: ${done} of ${jobs.length} runs done, none in flight`);
console.log(summarize(out));
if (syncCmd) {
  clearInterval(syncTimer);
  // After any copy in flight, one of everything, the summary included.
  await syncing;
  if (await sync()) console.error(`results copied: ${syncCmd}`);
  else process.exitCode = 1;
}

/**
 * Runs a harness on a case, on a server, and records the result; or, when the
 * infrastructure failed it (errors from the server, or the server lost from the
 * pool) and it isn't the last attempt, says why it should run again, ungraded and unrecorded.
 */
async function runJob({ job: { harness, c, rep }, attempt, final, server, signal }: Attempt<Job>): Promise<string | undefined> {
  const id = `${harness.name}.${caseName(c)}.r${rep}`;
  const dir = join(out, 'runs', harness.name, `${caseName(c)}-r${rep}`);
  // An earlier attempt, or the run a rerun replaces: kept beside, to see what went wrong.
  if (existsSync(dir)) renameSync(dir, uniquePath(`${dir}.replaced`));
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

  const meter = proxy.open(id, join(dir, 'requests.jsonl'), join(dir, 'transcript.json'), server.url);
  const advisorMeter = advisorProxy?.open(`${id}.advisor`, join(dir, 'advisor-requests.jsonl'), join(dir, 'advisor-transcript.json'));
  const ctx: HarnessContext = {
    home,
    xdg,
    workspace,
    prompt: c.prompt,
    baseURL: meter.baseURL,
    model,
    settings,
    ...(advisorModel && advisorMeter ? { advisor: { model: advisorModel, baseURL: advisorMeter.baseURL } } : {}),
  };
  const invocation = harness.setup(ctx);
  const env = isolatedEnv(tmp, toolchains.path, ctx, invocation.env);
  const started = new Date();
  // A budget of output, checked as it streams: past it, the run ends as at the timeout.
  let overBudget = false;
  let budgetCheck: NodeJS.Timeout | undefined;
  // Its server left the pool: end the run, its requests in flight marked as the infrastructure's failure.
  let pid: number | undefined;
  const lose = () => {
    proxy.close(id, SERVER_LOST);
    killGroup(pid);
  };
  signal.addEventListener('abort', lose, { once: true });
  const result = await run(invocation.command, invocation.args, {
    cwd: workspace,
    env,
    timeoutMs: timeout * 60_000,
    log: { stdout: join(dir, 'stdout.log'), stderr: join(dir, 'stderr.log') },
    onSpawn: (spawned) => {
      pid = spawned;
      live.add(spawned);
      if (signal.aborted) lose();
      if (settings.maxOutput === undefined) return;
      budgetCheck = setInterval(() => {
        if (meter.generated() < settings.maxOutput!) return;
        overBudget = true;
        clearInterval(budgetCheck);
        killGroup(spawned);
      }, 1000);
    },
  });
  signal.removeEventListener('abort', lose);
  clearInterval(budgetCheck);
  if (result.pid !== undefined) live.delete(result.pid);
  proxy.close(id);
  advisorProxy?.close(`${id}.advisor`);
  if (interrupted) {
    rmSync(tmp, { recursive: true, force: true });
    return undefined;
  }
  const failed = meter.records.find(infrastructureError);
  const again = signal.aborted ? `${SERVER_LOST} (${server.why ?? 'failed its health checks'})` : failed ? `infrastructure error: ${failed.error ?? `HTTP ${failed.status}`}` : undefined;
  if (again !== undefined && !final) {
    rmSync(tmp, { recursive: true, force: true });
    // What it cost counts all the same.
    if (model.pricing) spent += cost(meter.records, model.pricing);
    writeFileSync(join(dir, 'requeued.json'), `${JSON.stringify({ attempt, server: server.url, why: again }, null, 2)}\n`);
    return again;
  }

  const changed = changes(c, workspace);
  writeFileSync(join(dir, 'changes.diff'), changed.diff);
  const graded = await grade(c, workspace, env);
  writeFileSync(join(dir, 'test.log'), graded.output);
  if (argv.keep) console.error(`Kept ${tmp}`);
  else rmSync(tmp, { recursive: true, force: true });

  const records = meter.records;
  // Model requests: not token counts and other side calls.
  const requests = records.filter((record) => record.dialect !== 'other');
  // The advisor: how often the model asked (featherloop's subagent tool), and what the answers cost.
  const advisorRecords = advisorMeter?.records.filter((record) => record.dialect !== 'other') ?? [];
  const advised =
    advisorModel && harness.name === 'featherloop-advisor'
      ? {
          model: advisorModel.id,
          calls: requests.reduce((n, record) => n + record.toolCalls.filter((name) => name === 'subagent').length, 0),
          requests: advisorRecords.length,
          tokens: {
            prompt: advisorRecords.reduce((n, record) => n + (record.tokens?.prompt ?? 0), 0),
            cached: advisorRecords.reduce((n, record) => n + (record.tokens?.cached ?? 0), 0),
            completion: advisorRecords.reduce((n, record) => n + (record.tokens?.completion ?? 0), 0),
          },
          firstCall: requests.findIndex((record) => record.toolCalls.includes('subagent')) + 1 || null,
          ...(advisorModel.pricing ? { costUsd: cost(advisorRecords, advisorModel.pricing) } : {}),
        }
      : undefined;
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
  const sampling = records.map(({ params: { max_tokens, max_completion_tokens, ...rest } }) => JSON.stringify(rest));
  const params = [...new Set(sampling)].map((text) => JSON.parse(text) as Record<string, unknown>);
  const run_: RunResult = {
    harness: harness.name,
    case: c.id,
    lang: c.lang,
    rep,
    started: started.toISOString(),
    status: overBudget ? 'budget' : result.timedOut ? 'timeout' : result.exitCode !== 0 ? 'crash' : graded.pass ? 'pass' : 'fail',
    pass: graded.pass,
    tests: { passed: graded.passed, total: graded.total },
    exitCode: result.exitCode,
    wallMs: result.ms,
    llmMs: records.reduce((total, record) => total + record.ms, 0),
    serverMs: records.reduce((total, record) => total + (record.serverMs ? record.serverMs.prompt + record.serverMs.predicted : 0), 0),
    requests: requests.length,
    // Not the request cut off when the run ended: that's the timeout's.
    // Any failed request but the bench's own aborts: 4xx included, whoever's doing they were.
    apiErrors: records.filter((record) => record.status >= 400 || infrastructureError(record)).length,
    tokens: {
      prompt: sum((tokens) => tokens.prompt),
      cached: sum((tokens) => tokens.cached),
      uncached: sum((tokens) => tokens.prompt - tokens.cached),
      completion: sum((tokens) => tokens.completion),
    },
    uncounted: records.filter((record) => !record.tokens).length,
    uncountedOutput: records.reduce((total, record) => total + (record.tokens ? 0 : record.chunks), 0),
    peakContext: Math.max(0, ...records.map((record) => (record.tokens ? record.tokens.prompt + record.tokens.completion : 0))),
    firstPrompt: requests[0]?.tokens?.prompt ?? null,
    toolCalls: Object.values(tools).reduce((total, count) => total + count, 0),
    tools,
    categories,
    unparsedToolCalls: records.filter((record) => record.unparsedToolCall).length,
    unknownToolCalls: records.reduce((total, record) => total + record.unknownTools.length, 0),
    lengthStops: records.filter((record) => record.finish === 'length' || record.finish === 'max_tokens').length,
    resends: records.filter((record) => record.resent).length,
    reasoningChars: records.reduce((total, record) => total + record.reasoningChars, 0),
    linesAdded: changed.files.reduce((total, file) => total + file.added, 0),
    linesRemoved: changed.files.reduce((total, file) => total + file.removed, 0),
    filesChanged: changed.files.map((file) => file.path),
    tampered: changed.tampered,
    sawCache: sawCache(dir),
    fetches: webFetches(readTranscript(dir)),
    hardcoded: hardcodedAnswers(changed.diff, c.solution, c.tests.map((name) => c.files.get(name)!)),
    ...(advised ? { advisor: advised } : {}),
    ...(model.pricing || advised?.costUsd !== undefined
      ? { costUsd: (model.pricing ? cost(records, model.pricing) : 0) + (advised?.costUsd ?? 0) }
      : {}),
    params,
    maxOutput: limits.length ? Math.max(...limits) : null,
    server: server.url,
    ...(attempt > 1 ? { attempt } : {}),
    ...(rerun ? { rerun: true } : {}),
  };
  writeFileSync(join(dir, 'result.json'), `${JSON.stringify(run_, null, 2)}\n`);
  appendFileSync(join(out, 'results.jsonl'), `${JSON.stringify(run_)}\n`);
  spent += run_.costUsd ?? 0;
  console.error(`[${++done}/${jobs.length}] ${progress(run_)}`);
  return undefined;
}

/**
 * The bench's environment for a harness, minus anything that would let it reach
 * past its run: keys (a config that misses the proxy fails instead of reaching a paid API), Google Cloud's credentials and
 * config (for `--servers-cmd`), `MODEL` (featherloop and nanocode read it), opencode's
 * overrides, npm's script variables (`INIT_CWD` among them), and the user's XDG directories.
 */
function isolatedEnv(tmp: string, toolPath: string[], { home, xdg, baseURL }: HarnessContext, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const strip = /^(OPENCODE_|ANTHROPIC_|OPENAI_|OPENROUTER_|PARALLEL_|GOOGLE_|CLOUDSDK_|CLAUDE|FEATHERLOOP|XDG_|npm_)|^(MODEL|INIT_CWD|OLDPWD)$/i;
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

/**
 * The runs in a results directory that hit API errors the infrastructure caused
 * (5xx, 429, a dropped connection), by `harness|case|rep`: the latest row for each,
 * as the report counts them. Not other 4xx: a request the API refused, say for
 * exceeding the context, is the harness's doing, and stays a result.
 */
function rerunTargets(dir: string) {
  const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) as Record<string, any>;
  const rows = new Map<string, RunResult>();
  for (const line of readFileSync(join(dir, 'results.jsonl'), 'utf8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line) as RunResult;
    rows.set(`${row.harness}|${row.case}|${row.rep}`, row);
  }
  const infrastructure = (row: RunResult) => {
    const file = join(dir, 'runs', row.harness, `${row.case.replace('/', '-')}-r${row.rep}`, 'requests.jsonl');
    if (!existsSync(file)) return true;
    return readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RequestRecord)
      .some(infrastructureError);
  };
  // Judged from the requests, not the row's count: older rows missed streams a crash cut off.
  const failed = [...rows].filter(([, row]) => infrastructure(row)).map(([key]) => key);
  // An interrupted bench leaves runs it never started: every harness on every case, for every rep.
  const missing: string[] = [];
  for (let rep = 1; rep <= (meta.reps ?? 1); rep++) {
    for (const id of meta.cases ?? []) for (const harness of Object.keys(meta.harnesses ?? {})) {
      const key = `${harness}|${id}|${rep}`;
      if (!rows.has(key)) missing.push(key);
    }
  }
  const keys = [...failed, ...missing];
  return {
    dir,
    meta,
    keys: new Set(keys),
    cases: new Set(keys.map((key) => key.split('|')[1]!)),
    harnesses: new Set(keys.map((key) => key.split('|')[0]!)),
  };
}

/** What a run's requests cost, at the model's prices. Requests cut off before reporting tokens aren't counted. */
function cost(records: RequestRecord[], pricing: NonNullable<typeof model.pricing>): number {
  return records.reduce((sum, { tokens }) => {
    if (!tokens) return sum;
    const write = tokens.cacheWrite ?? 0;
    const fresh = tokens.prompt - tokens.cached - write;
    return sum + (fresh * pricing.input + write * pricing.cacheWrite + tokens.cached * pricing.cacheRead + tokens.completion * pricing.output) / 1e6;
  }, 0);
}

/** Past `--max-cost`: no more runs start. Said once. */
let budgetNoted = false;
function overBudget(): boolean {
  if (argv.maxCost === undefined || spent < argv.maxCost) return false;
  if (!budgetNoted) console.error(`Spent $${spent.toFixed(2)}, past --max-cost $${argv.maxCost}: starting no more runs`);
  budgetNoted = true;
  return true;
}

function uniquePath(path: string): string {
  let candidate = path;
  for (let n = 2; existsSync(candidate); n++) candidate = `${path}-${n}`;
  return candidate;
}

function progress(result: RunResult): string {
  const tokens = result.tokens.prompt + result.tokens.completion;
  return [
    `${result.harness} ${result.case} r${result.rep}${result.attempt ? ` (attempt ${result.attempt})` : ''}: ${result.status}`,
    `${result.tests.passed}/${result.tests.total} tests`,
    `${(result.wallMs / 1000).toFixed(0)}s`,
    `${result.requests} req`,
    `${(tokens / 1000).toFixed(1)}k tok`,
    `${result.toolCalls} tool calls`,
    ...(result.server ? [`on ${new URL(result.server).host}`] : []),
    ...(result.sawCache ? ['REACHED THE BENCH CACHE'] : []),
  ].join(', ');
}

/** The server's model, build and slots, from llama.cpp's `/props` and `/v1/models`; whatever answers. */
async function serverInfo(baseURL: string): Promise<Record<string, unknown>> {
  if (model.flavor === 'anthropic') {
    // A hosted API: the Models API says the model is there, and what it's called.
    const key = process.env.ANTHROPIC_API_KEY ?? '';
    const info = (await getJson(`${baseURL.replace(/\/$/, '')}/models/${model.id}`, { 'x-api-key': key, 'anthropic-version': '2023-06-01' })) as
      | { id: string; display_name?: string; max_input_tokens?: number; max_tokens?: number }
      | undefined;
    if (!info) throw new Error(`${model.id} isn't available at ${baseURL}`);
    return { models: [{ id: info.id, meta: { name: info.display_name, context: info.max_input_tokens, output: info.max_tokens } }], build: 'hosted API' };
  }
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
      ? Object.fromEntries(SAMPLING_SHOWN.map((key) => [key, props.default_generation_settings.params[key]]).filter(([, value]) => value !== undefined))
      : undefined,
    settings: props ? serverSettings(props, models) : undefined,
  };
}

/**
 * What a llama.cpp server is set to, beyond model and build, that changes what runs do,
 * for the pool to compare servers on: every default sampling setting, the context, a hash
 * of the chat template, and the model file's size and parameters (a file re-uploaded under
 * the same name, as a VM made later downloads it, differs in those).
 */
function serverSettings(props: Record<string, any>, models: { data?: { meta?: any }[] } | undefined): Record<string, unknown> {
  const meta = models?.data?.[0]?.meta;
  return {
    ...props.default_generation_settings?.params,
    n_ctx: props.default_generation_settings?.n_ctx,
    chat_template: createHash('sha256').update(String(props.chat_template ?? '')).digest('hex').slice(0, 12),
    model_size: meta?.size,
    model_params: meta?.n_params,
  };
}

/** Copies the results with `--sync-cmd`, one copy at a time: whether it worked. A failure is said, and the bench goes on. */
function sync(): Promise<boolean> {
  return (syncing ??= new Promise<boolean>((resolve) => {
    execFile('sh', ['-c', syncCmd!, 'sync', out], { timeout: 30 * 60_000, maxBuffer: 16 * 1024 * 1024 }, (err, _stdout, stderr) => {
      if (err) console.error(`--sync-cmd failed, results are only in ${out}: ${stderr.trim().split('\n').slice(-3).join(' ') || err.message}`);
      syncing = undefined;
      resolve(!err);
    });
  }));
}

/** Runs `--servers-cmd`: its output's lines are the servers. Fails, and the pool keeps its last list, if the command does. */
function listServers(command: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // The bench's own environment: the command may need credentials harnesses never get.
    execFile('sh', ['-c', command], { timeout: 120_000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${command}: ${stderr.trim() || err.message}`));
      else resolve(stdout.split('\n'));
    });
  });
}

/**
 * A llama.cpp server's health: `/health` answers 200 once the model is loaded (503
 * while loading), and `/props` says what it serves and how many slots it has. A
 * preempted VM may not answer at all, hence the timeout.
 */
async function probe(url: string): Promise<Health> {
  const root = url.replace(/\/v1\/?$/, '');
  const health = await get(`${root}/health`, {}, PROBE_TIMEOUT_MS);
  if (health.status !== 200) return { ok: false, why: `/health: ${health.error ?? `HTTP ${health.status}`}` };
  const props = await get(`${root}/props`, {}, PROBE_TIMEOUT_MS);
  const json = props.status === 200 ? (tryParse(props.body) as Record<string, any> | undefined) : undefined;
  if (!json) return { ok: false, why: `/props: ${props.error ?? `HTTP ${props.status}`}` };
  const models = await get(`${root}/v1/models`, {}, PROBE_TIMEOUT_MS);
  const list = models.status === 200 ? (tryParse(models.body) as { data?: { meta?: unknown }[] } | undefined) : undefined;
  if (!list) return { ok: false, why: `/v1/models: ${models.error ?? `HTTP ${models.status}`}` };
  return { ok: true, props: { modelPath: json.model_path, build: json.build_info, slots: json.total_slots, settings: serverSettings(json, list) } };
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await get(url, headers, 30_000);
  return res.status === 200 ? tryParse(res.body) : undefined;
}

/** A GET, whole: its status and body, or why there's none (status 0), within `timeoutMs`. */
function get(url: string, headers: Record<string, string>, timeoutMs: number): Promise<{ status: number; body: string; error?: string }> {
  return new Promise((resolve) => {
    const req = (url.startsWith('https:') ? https : http).get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => (body += chunk));
      res.on('end', () => {
        clearTimeout(timer);
        resolve({ status: res.statusCode ?? 0, body });
      });
      res.on('error', (err) => req.destroy(err));
    });
    // Connecting included: a VM that's gone may never answer.
    const timer = setTimeout(() => req.destroy(new Error(`no answer in ${timeoutMs / 1000}s`)), timeoutMs);
    req.on('error', (err) => {
      clearTimeout(timer);
      resolve({ status: 0, body: '', error: err.message });
    });
  });
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
