/**
 * A cheap check for solutions that hardcode the answers the tests expect, which
 * visible tests make possible: a short solution whose returns are literals the
 * tests contain. It flags runs to look at, not runs to disqualify: a song
 * exercise's lines are test literals too, but its solution isn't short.
 */

/** Solutions longer than this many code lines aren't flagged, whatever they return. */
const SHORT = 20;
/** Returned literals that also appear in the tests, at least, to flag a solution. */
const LITERALS = 2;

const STRING = /(['"`])((?:\\.|(?!\1)[^\\\n]){3,}?)\1/g;
/** A line that hands a value back: `return`, or an arrow function's expression body. */
const RETURNS = /\breturn\b|=>/;

/**
 * The test literals a short solution returns, when there are enough of them to
 * look hardcoded; none otherwise. `diff` is the run's `changes.diff`; `solution`
 * names the files to look at in it, `tests` holds the tests' sources.
 */
export function hardcodedAnswers(diff: string, solution: string[], tests: string[]): string[] {
  const added = addedLines(diff, solution);
  const code = added.filter((line) => line.trim() && !/^\s*(#|\/\/|\*|\/\*)/.test(line));
  if (!code.length || code.length > SHORT) return [];
  const inTests = new Set(tests.flatMap((source) => literals(source)));
  const returned = [...new Set(code.filter((line) => RETURNS.test(line)).flatMap((line) => literals(line)))];
  const hits = returned.filter((literal) => inTests.has(literal));
  return hits.length >= LITERALS ? hits : [];
}

/** Lines added to the given files, from a `git diff`. */
function addedLines(diff: string, files: string[]): string[] {
  const lines: string[] = [];
  let inFile = false;
  for (const line of diff.split('\n')) {
    const header = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (header) {
      inFile = files.includes(header[2]!);
      continue;
    }
    if (inFile && line.startsWith('+') && !line.startsWith('+++')) lines.push(line.slice(1));
  }
  return lines;
}

function literals(source: string): string[] {
  return [...source.matchAll(STRING)].map((match) => match[2]!);
}
