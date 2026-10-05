
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | A:featherloop | B:featherloop | C:featherloop |
|---|---:|---:|---:|
| out of budget: iterating | 18 | 20 | 22 |
| out of budget: runaway response | 14 | 12 | 6 |
| passed | 24 | 24 | 29 |
| passed, then out of budget | 0 | 1 | 0 |
| stopped: tests failing | 1 | 0 | 0 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| A:featherloop vs B:featherloop | 7 / 8 | 1.00 |
| A:featherloop vs C:featherloop | 4 / 9 | 0.27 |
| B:featherloop vs C:featherloop | 3 / 7 | 0.34 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | C:featherloop | A:featherloop (out of budget: runaway response), B:featherloop (out of budget: runaway response) |
| python/connect | A:featherloop | B:featherloop (out of budget: iterating), C:featherloop (out of budget: iterating) |
| python/paasio | A:featherloop | B:featherloop (out of budget: iterating), C:featherloop (out of budget: iterating) |
| python/rest-api | B:featherloop, C:featherloop | A:featherloop (out of budget: runaway response) |
| python/robot-name | B:featherloop | A:featherloop (out of budget: runaway response), C:featherloop (out of budget: runaway response) |
| python/transpose | B:featherloop, C:featherloop | A:featherloop (out of budget: runaway response) |
| javascript/book-store | B:featherloop, C:featherloop | A:featherloop (out of budget: iterating) |
| javascript/complex-numbers | B:featherloop | A:featherloop (out of budget: runaway response), C:featherloop (out of budget: runaway response) |
| python/book-store#2 | B:featherloop, C:featherloop | A:featherloop (out of budget: iterating) |
| python/paasio#2 | B:featherloop, C:featherloop | A:featherloop (out of budget: runaway response) |
| python/pov#2 | C:featherloop | A:featherloop (out of budget: runaway response), B:featherloop (out of budget: iterating) |
| python/transpose#2 | C:featherloop | A:featherloop (stopped: tests failing), B:featherloop (out of budget: runaway response) |
| javascript/book-store#2 | C:featherloop | A:featherloop (out of budget: runaway response), B:featherloop (out of budget: iterating) |
| python/book-store#3 | A:featherloop, C:featherloop | B:featherloop (out of budget: runaway response) |
| python/react#3 | B:featherloop | A:featherloop (out of budget: runaway response), C:featherloop (out of budget: iterating) |
| python/scale-generator#3 | A:featherloop, C:featherloop | B:featherloop (out of budget: iterating) |
| python/transpose#3 | A:featherloop | B:featherloop (out of budget: runaway response), C:featherloop (out of budget: iterating) |
| javascript/complex-numbers#3 | A:featherloop | B:featherloop (out of budget: runaway response), C:featherloop (out of budget: runaway response) |
| javascript/connect#3 | A:featherloop, C:featherloop | B:featherloop (out of budget: iterating) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 531 | 5.8k | 2% | 2 | 3.0k |
| B:featherloop | 436 | 5.6k | 2% | 2 | 3.4k |
| C:featherloop | 496 | 5.3k | 1% | 2 | 4.1k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 3.6 | 176 | 3.1k | 14% | 3.9k / 17k |
| B:featherloop | 3.4 | 167 | 2.9k | 13% | 4.1k / 16k |
| C:featherloop | 4.2 | 202 | 2.0k | 8% | 3.7k / 18k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| A:featherloop | 21 | 0% | 1.4 |
| B:featherloop | 14 | 0% | 1.6 |
| C:featherloop | 11 | 0% | 1.5 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| A:featherloop | 0.19 | 2 | raw.githubusercontent.com 9, github.com 1, en.wikipedia.org 1 | python/connect: https://github.com/exercism/problem-specifications/tree/main/exercises/connect/canonical-data.json<br>python/connect: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/connect/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json |
| B:featherloop | 0.00 | 0 | – | – |
| C:featherloop | 0.04 | 1 | github.com 1, raw.githubusercontent.com 1 | python/scale-generator: https://github.com/exercism/problem-specifications/tree/main/exercises/scale-generator/canonical-data.json<br>python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/canonical-data.json |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| A:featherloop | python/book-store | 13 | 7 | 82k | 72% | another tool result |
| A:featherloop | python/react | 16 | 14 | 121k | 85% | failing tests |
| A:featherloop | python/rest-api | 10 | 15 | 97k | 91% | failing tests |
| A:featherloop | python/robot-name | 5 | 18 | 181k | 89% | failing tests |
| A:featherloop | python/transpose | 7 | 12 | 113k | 88% | failing tests |
| A:featherloop | javascript/complex-numbers | 12 | 14 | 160k | 97% | another tool result |
| A:featherloop | python/forth | 9 | 14 | 126k | 90% | another tool result |
| A:featherloop | python/paasio | 9 | 8 | 79k | 84% | failing tests |
| A:featherloop | python/pov | 4 | 10 | 101k | 97% | failing tests |
| A:featherloop | javascript/book-store | 6 | 7 | 134k | 97% | another tool result |
| A:featherloop | javascript/complex-numbers | 27 | 8 | 131k | 99% | failing tests |
| A:featherloop | python/paasio | 14 | 7 | 114k | 91% | another tool result |
| A:featherloop | python/pov | 4 | 12 | 1.1k | 0% | failing tests |
| A:featherloop | python/react | 18 | 7 | 87k | 95% | failing tests |
| B:featherloop | python/book-store | 3 | 10 | 143k | 95% | another tool result |
| B:featherloop | python/react | 2 | 20 | 177k | 81% | another tool result |
| B:featherloop | javascript/bowling | 2 | 17 | 200k | 80% | another tool result |
| B:featherloop | javascript/connect | 15 | 10 | 68k | 34% | failing tests |
| B:featherloop | python/bowling | 6 | 16 | 135k | 82% | failing tests |
| B:featherloop | python/transpose | 14 | 8 | 72k | 65% | failing tests |
| B:featherloop | javascript/complex-numbers | 6 | 13 | 149k | 92% | failing tests |
| B:featherloop | javascript/connect | 4 | 12 | 156k | 70% | failing tests |
| B:featherloop | python/book-store | 8 | 6 | 97k | 91% | another tool result |
| B:featherloop | python/paasio | 6 | 7 | 103k | 80% | failing tests |
| B:featherloop | python/transpose | 27 | 4 | 61k | 79% | another tool result |
| B:featherloop | javascript/complex-numbers | 8 | 11 | 145k | 93% | failing tests |
| C:featherloop | python/robot-name | 8 | 16 | 169k | 92% | failing tests |
| C:featherloop | javascript/complex-numbers | 8 | 12 | 140k | 97% | another tool result |
| C:featherloop | python/react | 33 | 6 | 57k | 75% | another tool result |
| C:featherloop | python/sgf-parsing | 4 | 17 | 121k | 81% | failing tests |
| C:featherloop | javascript/complex-numbers | 16 | 7 | 153k | 96% | another tool result |
| C:featherloop | javascript/complex-numbers | 6 | 12 | 167k | 90% | another tool result |
