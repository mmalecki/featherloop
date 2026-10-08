
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | A:featherloop | N:featherloop |
|---|---:|---:|
| out of budget: iterating | 37 | 40 |
| out of budget: runaway response | 2 | 2 |
| passed | 49 | 47 |
| passed, then out of budget | 2 | 0 |
| stopped: tests failing | 0 | 1 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| A:featherloop vs N:featherloop | 19 / 15 | 0.61 |

## Test score

The share of its tests a run passed at the end, averaged: partial credit, so a run that gets 29 of 31 counts for more than one that gets 3. Differences between columns: a stratified permutation test, shuffling runs between the two columns within each case, so case mix cancels out.

|  | runs | mean score |
|---|---:|---:|
| A:featherloop | 90 | 87% |
| N:featherloop | 90 | 85% |
|  | second minus first | p |
|---|---:|---:|
| A:featherloop vs N:featherloop | -1.3 points | 0.708 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | A:featherloop | N:featherloop (out of budget: iterating) |
| python/transpose | A:featherloop | N:featherloop (out of budget: iterating) |
| python/pov | N:featherloop | A:featherloop (out of budget: iterating) |
| python/forth | N:featherloop | A:featherloop (out of budget: iterating) |
| javascript/book-store#2 | A:featherloop | N:featherloop (out of budget: iterating) |
| javascript/complex-numbers#3 | N:featherloop | A:featherloop (out of budget: iterating) |
| python/paasio#4 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/react#4 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/forth#4 | N:featherloop | A:featherloop (out of budget: iterating) |
| javascript/book-store#4 | A:featherloop | N:featherloop (out of budget: runaway response) |
| python/paasio#5 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/transpose#5 | A:featherloop | N:featherloop (out of budget: iterating) |
| javascript/complex-numbers#4 | N:featherloop | A:featherloop (out of budget: iterating) |
| python/connect#5 | A:featherloop | N:featherloop (out of budget: iterating) |
| javascript/book-store#5 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/forth#5 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/react#5 | N:featherloop | A:featherloop (out of budget: iterating) |
| python/react#6 | N:featherloop | A:featherloop (out of budget: iterating) |
| python/transpose#6 | N:featherloop | A:featherloop (out of budget: iterating) |
| javascript/book-store#6 | A:featherloop | N:featherloop (stopped: tests failing) |
| python/paasio#7 | N:featherloop | A:featherloop (out of budget: iterating) |
| python/pov#7 | N:featherloop | A:featherloop (out of budget: iterating) |
| python/book-store#9 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/paasio#9 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/forth#9 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/paasio#10 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/forth#10 | A:featherloop | N:featherloop (out of budget: iterating) |
| python/pov#10 | A:featherloop | N:featherloop (out of budget: iterating) |
| javascript/book-store#9 | N:featherloop | A:featherloop (out of budget: iterating) |
| python/connect#10 | N:featherloop | A:featherloop (out of budget: iterating) |
| python/react#10 | N:featherloop | A:featherloop (out of budget: iterating) |
| javascript/complex-numbers#10 | A:featherloop | N:featherloop (out of budget: runaway response) |
| javascript/book-store#10 | N:featherloop | A:featherloop (out of budget: runaway response) |
| python/transpose#10 | N:featherloop | A:featherloop (out of budget: iterating) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 515 | 2.7k | 0% | 2 | 3.1k |
| N:featherloop | 654 | 3.2k | 0% | 2 | 3.2k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 7.1 | 534 | 1.3k | 0% | 2.3k / 10k |
| N:featherloop | 5.3 | 364 | 1.9k | 2% | 2.2k / 10k |

## Iterating

Tests passing at each test run, and what moved them: does a run build on what passes, or lose it? Fell: a test run passing fewer than the one before. Lost: runs whose last test run passed fewer than their best. Rewrites: whole-file writes to a file already written, once some tests passed. Cut: test commands piped through head or tail, which can hide the failures and the summary.

|  | runs with 2+ test runs | fell / run | lost | best − last, median | rewrites / run | cut test commands |
|---|---:|---:|---:|---:|---:|---:|
| A:featherloop | 86 | 2.2 | 18 | 9 | 10.6 | 542 of 939 (58%) |
| N:featherloop | 87 | 2.2 | 19 | 3 | 10.9 | 470 of 818 (57%) |

## Repeats

Notes: shell results saying "[Same output as …]", the repeat sensor. Again: notes after which the model ran the same command again within its next 3 shell calls, still doing what didn't work. Mid-run: user messages after the task that aren't the harness's events (a nudge, if one runs).

|  | notes / run | runs with any | again | mid-run user messages / run |
|---|---:|---:|---:|---:|
| A:featherloop | 3.0 | 54 | 146 of 272 (54%) | 0.0 |
| N:featherloop | 1.3 | 53 | 45 of 117 (38%) | 1.3 |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| A:featherloop | 2 | 0% | 0.7 |
| N:featherloop | 2 | 0% | 0.8 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| A:featherloop | 0.02 | 1 | github.com 1, raw.githubusercontent.com 1 | python/forth: https://github.com/exercism/problem-specifications/tree/main/exercises/forth/canonical-data.json<br>python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json |
| N:featherloop | 0.07 | 4 | github.com 5, raw.githubusercontent.com 1 | python/connect: https://github.com/exercism/problem-specifications/tree/main/exercises/connect/canonical-data.json<br>python/connect: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/connect/canonical-data.json<br>python/paasio: https://github.com/pytest-dev/pytest-mock/blob/main/docs/source/reference.rst<br>javascript/complex-numbers: https://github.com/exercism/javascript<br>javascript/complex-numbers: https://github.com/exercism/javascript<br>python/transpose: https://github.com/exercism/problem-specifications/blob/main/exercises/transpose/canonical-data.json |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| A:featherloop | javascript/book-store | 2 | 11 | 237k | 93% | another tool result |
| A:featherloop | javascript/book-store | 4 | 9 | 217k | 91% | another tool result |
| N:featherloop | javascript/book-store | 1 | 12 | 251k | 88% | the task |
| N:featherloop | javascript/complex-numbers | 6 | 6 | 186k | 86% | failing tests |
