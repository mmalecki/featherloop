// One-off: featherloop on one case, a llama.cpp model with a hosted advisor, both metered.
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { changes, ensureToolchains, grade, linkToolchains, loadCases, prepareWorkspace, run } from './cases.ts';
import { MeteringProxy } from './proxy.ts';

const [caseId = 'python/connect', out = 'advisor-run', qwenUpstream = 'http://34.61.203.44:9931/v1', advisorModel = 'claude-sonnet-5-5'] = process.argv.slice(2);
const REPO = resolve(import.meta.dirname, '..', '..');
const c = loadCases([caseId])[0]!;
ensureToolchains([c]);
mkdirSync(out, { recursive: true });
const qwen = await MeteringProxy.start(qwenUpstream);
const claude = await MeteringProxy.start('https://api.anthropic.com/v1', { apiKey: process.env.ANTHROPIC_API_KEY! });
const q = qwen.open('qwen', join(out, 'qwen-requests.jsonl'), join(out, 'qwen-transcript.json'));
const a = claude.open('advisor', join(out, 'advisor-requests.jsonl'), join(out, 'advisor-transcript.json'));

const tmp = mkdtempSync(join(tmpdir(), 'bench-'));
const home = join(tmp, 'home');
mkdirSync(join(home, '.config', 'featherloop'), { recursive: true });
mkdirSync(join(tmp, 'tmp'), { recursive: true });
const workspace = join(tmp, c.exercise);
const toolchains = linkToolchains(tmp);
prepareWorkspace(c, workspace, toolchains.tools);
// The bench's qwen3.5-9b, plus the user's Sonnet entry and an advisor alias for it.
writeFileSync(
  join(home, '.config', 'featherloop', 'config.yaml'),
  `model: bench/qwen3.5-9b
provider:
  bench:
    flavor: openai
    options: { baseURL: "${q.baseURL}", apiKey: bench }
    models:
      qwen3.5-9b: { limit: { output: 262144 }, variants: { no-thinking: { reasoningEffort: none } } }
  anthropic:
    flavor: anthropic
    options: { baseURL: "${a.baseURL}", apiKey: bench }
    models:
      ${advisorModel}: { variants: { default: high, high: { effort: high } } }
aliases:
  advisor: anthropic/${advisorModel}
`,
);
const strip = /^(OPENCODE_|ANTHROPIC_|OPENAI_|OPENROUTER_|PARALLEL_|CLAUDE|FEATHERLOOP|XDG_|npm_)|^(MODEL|INIT_CWD|OLDPWD)$/i;
const env: NodeJS.ProcessEnv = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !strip.test(name))),
  HOME: home,
  XDG_CONFIG_HOME: join(home, '.config'),
  XDG_STATE_HOME: join(home, '.local', 'state'),
  XDG_DATA_HOME: join(home, '.local', 'share'),
  XDG_CACHE_HOME: join(home, '.cache'),
  TMPDIR: join(tmp, 'tmp'),
  PATH: [...toolchains.path, process.env.PATH ?? ''].join(delimiter),
  NO_PROXY: 'localhost,127.0.0.1',
  no_proxy: 'localhost,127.0.0.1',
};
console.error(`featherloop --shell --advisor (${advisorModel}) on ${c.id}, workspace ${workspace}`);
const result = await run(process.execPath, [join(REPO, 'bin', 'featherloop.ts'), '--shell', '--advisor', '--', c.prompt], {
  cwd: workspace,
  env,
  timeoutMs: 30 * 60_000,
  log: { stdout: join(out, 'stdout.log'), stderr: join(out, 'stderr.log') },
});
qwen.close('qwen');
claude.close('advisor');
const changed = changes(c, workspace);
writeFileSync(join(out, 'changes.diff'), changed.diff);
const graded = await grade(c, workspace, env);
writeFileSync(join(out, 'test.log'), graded.output);
await qwen.stop();
await claude.stop();

const sum = (rs: typeof q.records) => rs.reduce((t, r) => ({ prompt: t.prompt + (r.tokens?.prompt ?? 0), cached: t.cached + (r.tokens?.cached ?? 0), write: t.write + (r.tokens?.cacheWrite ?? 0), out: t.out + (r.tokens?.completion ?? 0) }), { prompt: 0, cached: 0, write: 0, out: 0 });
const qs = sum(q.records), as = sum(a.records);
const sonnetCost = ((as.prompt - as.cached - as.write) * 2 + as.write * 2.5 + as.cached * 0.2 + as.out * 10) / 1e6;
const advisorCalls = q.records.flatMap((r, i) => (r.toolCalls.includes('subagent') ? [i + 1] : []));
console.log(JSON.stringify({
  case: c.id, pass: graded.pass, tests: `${graded.passed}/${graded.total}`, exit: result.exitCode, timedOut: result.timedOut, wallSec: Math.round(result.ms / 1000),
  qwen: { requests: q.records.length, tokens: qs, toolCalls: q.records.flatMap((r) => r.toolCalls) },
  advisor: { calledAtQwenRequest: advisorCalls, requests: a.records.length, tokens: as, toolCalls: a.records.flatMap((r) => r.toolCalls), costUsd: Number(sonnetCost.toFixed(4)), errors: a.records.filter((r) => r.error).map((r) => r.error) },
}, null, 2));
