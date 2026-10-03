import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ensureToolchains, grade, loadCases, prepareWorkspace, type Case } from './cases.ts';

/**
 * Proves the grading of every case, without a model: the stub as shipped fails,
 * the reference solution passes every test, and the test count the grader expects
 * is what the runner reports.
 */

const argv = await yargs(hideBin(process.argv))
  .usage('$0 [case...]\n\nCheck that each case grades a stub as failing and the reference solution as passing.')
  .option('jobs', { alias: 'j', type: 'number', default: 4, describe: 'Cases checked at once' })
  .strictOptions()
  .parseAsync();

const cases = loadCases(argv._.map(String));
const path = ensureToolchains(cases);
const root = mkdtempSync(join(tmpdir(), 'featherloop-bench-validate-'));
const env = { ...process.env, PATH: [...path, process.env.PATH].join(delimiter), HOME: join(root, 'home'), TMPDIR: root };

let failures = 0;
const queue = [...cases];
await Promise.all(Array.from({ length: Math.max(1, argv.jobs) }, async () => {
  for (let c = queue.shift(); c; c = queue.shift()) {
    const problems = await check(c);
    failures += problems.length ? 1 : 0;
    console.log(problems.length ? `✗ ${c.id}: ${problems.join('; ')}` : `✓ ${c.id}`);
  }
}));
rmSync(root, { recursive: true, force: true });
console.log(`${cases.length - failures}/${cases.length} cases valid`);
process.exitCode = failures ? 1 : 0;

async function check(c: Case): Promise<string[]> {
  const problems: string[] = [];
  const stub = join(root, `${c.lang}-${c.exercise}-stub`);
  prepareWorkspace(c, stub);
  if (existsSync(join(stub, '.meta'))) problems.push('workspace has .meta');
  const before = await grade(c, stub, env);
  if (before.pass) problems.push('stub passes');
  if (before.total === 0) problems.push('no tests counted');

  const solved = join(root, `${c.lang}-${c.exercise}-reference`);
  prepareWorkspace(c, solved);
  const config = JSON.parse(readFileSync(join(c.dir, '.meta', 'config.json'), 'utf8')) as { files: { example: string[] } };
  if (config.files.example.length !== 1 || c.solution.length !== 1) problems.push('expected one solution file');
  cpSync(join(c.dir, config.files.example[0]!), join(solved, c.solution[0]!));
  const after = await grade(c, solved, env);
  if (!after.pass) problems.push(`reference fails: ${after.passed}/${after.total} passed, exit ${after.exitCode}\n${after.output.slice(-1500)}`);
  return problems;
}
