
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop |
|---|---:|
| out of budget: iterating | 22 |
| out of budget: runaway response | 6 |
| passed | 29 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

(none)

## Split cases

Cases some columns passed and others failed, with how each failure ended.

(none)

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| featherloop | 496 | 5.3k | 1% | 2 | 4.1k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 4.2 | 202 | 2.0k | 8% | 3.7k / 18k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 11 | 0% | 1.5 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.04 | 1 | github.com 1, raw.githubusercontent.com 1 | python/scale-generator: https://github.com/exercism/problem-specifications/tree/main/exercises/scale-generator/canonical-data.json<br>python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/canonical-data.json |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | python/robot-name | 8 | 16 | 169k | 92% | failing tests |
| featherloop | javascript/complex-numbers | 8 | 12 | 140k | 97% | another tool result |
| featherloop | python/react | 33 | 6 | 57k | 75% | another tool result |
| featherloop | python/sgf-parsing | 4 | 17 | 121k | 81% | failing tests |
| featherloop | javascript/complex-numbers | 16 | 7 | 153k | 96% | another tool result |
| featherloop | javascript/complex-numbers | 6 | 12 | 167k | 90% | another tool result |
