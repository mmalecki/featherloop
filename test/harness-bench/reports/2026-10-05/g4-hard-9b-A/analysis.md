
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop |
|---|---:|
| out of budget: iterating | 18 |
| out of budget: runaway response | 14 |
| passed | 24 |
| stopped: tests failing | 1 |

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
| featherloop | 531 | 5.8k | 2% | 2 | 3.0k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 3.6 | 176 | 3.1k | 14% | 3.9k / 17k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 21 | 0% | 1.4 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.19 | 2 | raw.githubusercontent.com 9, github.com 1, en.wikipedia.org 1 | python/connect: https://github.com/exercism/problem-specifications/tree/main/exercises/connect/canonical-data.json<br>python/connect: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/connect/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | python/book-store | 13 | 7 | 82k | 72% | another tool result |
| featherloop | python/react | 16 | 14 | 121k | 85% | failing tests |
| featherloop | python/rest-api | 10 | 15 | 97k | 91% | failing tests |
| featherloop | python/robot-name | 5 | 18 | 181k | 89% | failing tests |
| featherloop | python/transpose | 7 | 12 | 113k | 88% | failing tests |
| featherloop | javascript/complex-numbers | 12 | 14 | 160k | 97% | another tool result |
| featherloop | python/forth | 9 | 14 | 126k | 90% | another tool result |
| featherloop | python/paasio | 9 | 8 | 79k | 84% | failing tests |
| featherloop | python/pov | 4 | 10 | 101k | 97% | failing tests |
| featherloop | javascript/book-store | 6 | 7 | 134k | 97% | another tool result |
| featherloop | javascript/complex-numbers | 27 | 8 | 131k | 99% | failing tests |
| featherloop | python/paasio | 14 | 7 | 114k | 91% | another tool result |
| featherloop | python/pov | 4 | 12 | 1.1k | 0% | failing tests |
| featherloop | python/react | 18 | 7 | 87k | 95% | failing tests |
