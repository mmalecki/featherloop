import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ensureToolchains, grade, linkToolchains, loadCases, SETS, prepareWorkspace, type Case } from './cases.ts';

/**
 * Proves the grading of every case, without a model: the stub as shipped fails,
 * the reference solution passes every test, the test count the grader expects is
 * what the runner reports, and the workspace holds nothing that gives a solution away.
 */

const argv = await yargs(hideBin(process.argv))
  .usage('$0 [case...]\n\nCheck that each case grades a stub as failing and the reference solution as passing.')
  .option('jobs', { alias: 'j', type: 'number', default: 4, describe: 'Cases checked at once' })
  .option('set', { type: 'string', choices: SETS, default: 'all', describe: 'Case set from cases.json' })
  .strictOptions()
  .parseAsync();

const cases = loadCases(argv._.map(String), argv.set);
ensureToolchains(cases);
const root = mkdtempSync(join(tmpdir(), 'bench-validate-'));
const { tools, path } = linkToolchains(root);
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
  prepareWorkspace(c, stub, tools);
  // .meta has the reference solution, .approaches and .articles discuss solutions.
  const hidden = readdirSync(stub).filter((name) => name.startsWith('.') && name !== '.git' && statSync(join(stub, name)).isDirectory());
  if (hidden.length) problems.push(`workspace has ${hidden.join(', ')}`);
  const before = await grade(c, stub, env);
  if (before.pass) problems.push('stub passes');
  if (before.total === 0) problems.push('no tests counted');

  const solved = join(root, `${c.lang}-${c.exercise}-reference`);
  prepareWorkspace(c, solved, tools);
  const config = JSON.parse(readFileSync(join(c.dir, '.meta', 'config.json'), 'utf8')) as { files: { example: string[] } };
  if (config.files.example.length !== 1 || c.solution.length !== 1) problems.push('expected one solution file');
  cpSync(join(c.dir, config.files.example[0]!), join(solved, c.solution[0]!));
  const after = await grade(c, solved, env);
  if (!after.pass) problems.push(`reference fails: ${after.passed}/${after.total} passed, exit ${after.exitCode}\n${after.output.slice(-1500)}`);
  return problems;
}
