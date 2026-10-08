
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop | featherloop-advisor |
|---|---:|---:|
| out of budget: iterating | 44 | 17 |
| passed | 45 | 73 |
| stopped: tests failing | 1 | 0 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| featherloop vs featherloop-advisor | 8 / 36 | 0.00 |

## Test score

The share of its tests a run passed at the end, averaged: partial credit, so a run that gets 29 of 31 counts for more than one that gets 3. Differences between columns: a stratified permutation test, shuffling runs between the two columns within each case, so case mix cancels out.

|  | runs | mean score |
|---|---:|---:|
| featherloop | 90 | 84% |
| featherloop-advisor | 90 | 95% |
|  | second minus first | p |
|---|---:|---:|
| featherloop vs featherloop-advisor | +11.4 points | 0.000 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/pov | featherloop-advisor | featherloop (out of budget: iterating) |
| python/transpose | featherloop-advisor | featherloop (out of budget: iterating) |
| python/paasio | featherloop-advisor | featherloop (out of budget: iterating) |
| python/react | featherloop | featherloop-advisor (out of budget: iterating) |
| javascript/complex-numbers | featherloop-advisor | featherloop (out of budget: iterating) |
| python/connect | featherloop-advisor | featherloop (out of budget: iterating) |
| python/book-store#2 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/transpose#2 | featherloop-advisor | featherloop (out of budget: iterating) |
| javascript/complex-numbers#2 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/react#2 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/book-store#4 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/pov#3 | featherloop | featherloop-advisor (out of budget: iterating) |
| python/connect#4 | featherloop-advisor | featherloop (out of budget: iterating) |
| javascript/book-store#4 | featherloop | featherloop-advisor (out of budget: iterating) |
| python/react#4 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/pov#4 | featherloop | featherloop-advisor (out of budget: iterating) |
| python/connect#5 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/forth#5 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/react#5 | featherloop-advisor | featherloop (out of budget: iterating) |
| javascript/book-store#5 | featherloop | featherloop-advisor (out of budget: iterating) |
| python/paasio#5 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/connect#6 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/pov#6 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/react#6 | featherloop-advisor | featherloop (out of budget: iterating) |
| javascript/book-store#6 | featherloop | featherloop-advisor (out of budget: iterating) |
| python/connect#7 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/forth#7 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/paasio#7 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/transpose#7 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/react#7 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/book-store#8 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/pov#8 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/connect#8 | featherloop-advisor | featherloop (out of budget: iterating) |
| javascript/complex-numbers#7 | featherloop-advisor | featherloop (stopped: tests failing) |
| python/transpose#8 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/book-store#9 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/forth#9 | featherloop | featherloop-advisor (out of budget: iterating) |
| python/pov#9 | featherloop-advisor | featherloop (out of budget: iterating) |
| javascript/book-store#8 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/transpose#9 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/react#9 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/connect#10 | featherloop-advisor | featherloop (out of budget: iterating) |
| python/pov#10 | featherloop | featherloop-advisor (out of budget: iterating) |
| python/react#10 | featherloop-advisor | featherloop (out of budget: iterating) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| featherloop | 730 | 2.9k | 0% | 2 | 3.5k |
| featherloop-advisor | 371 | 2.7k | 0% | 2 | 3.9k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 4.7 | 335 | 2.0k | 3% | 2.4k / 11k |
| featherloop-advisor | 5.0 | 330 | 1.9k | 2% | 2.5k / 14k |

## Iterating

Tests passing at each test run, and what moved them: does a run build on what passes, or lose it? Fell: a test run passing fewer than the one before. Lost: runs whose last test run passed fewer than their best. Rewrites: whole-file writes to a file already written, once some tests passed. Cut: test commands piped through head or tail, which can hide the failures and the summary.

|  | runs with 2+ test runs | fell / run | lost | best − last, median | rewrites / run | cut test commands |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | 85 | 1.4 | 18 | 11 | 12.9 | 447 of 724 (62%) |
| featherloop-advisor | 89 | 1.4 | 10 | 9 | 8.7 | 368 of 707 (52%) |

## Repeats

Notes: shell results saying "[Same output as …]", the repeat sensor. Again: notes after which the model ran the same command again within its next 3 shell calls, still doing what didn't work. Mid-run: user messages after the task that aren't the harness's events (a nudge, if one runs).

|  | notes / run | runs with any | again | mid-run user messages / run |
|---|---:|---:|---:|---:|
| featherloop | 1.1 | 42 | 37 of 101 (37%) | 1.1 |
| featherloop-advisor | 0.9 | 51 | 28 of 82 (34%) | 0.9 |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 0 | 0% | 0.8 |
| featherloop-advisor | 1 | 0% | 0.7 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.01 | 1 | raw.githubusercontent.com 1 | javascript/complex-numbers: https://raw.githubusercontent.com/exercism/javascript/main/babel-preset-javascript/src/index.js |
| featherloop-advisor | 0.04 | 2 | github.com 2, raw.githubusercontent.com 2 | python/connect: https://github.com/exercism/problem-specifications/tree/main/exercises/connect/canonical-data.json<br>python/transpose: https://github.com/exercism/problem-specifications/tree/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json<br>python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json |

## Advisor

featherloop-advisor: whether the model asked for advice, when, and how the runs that asked did.

|  | runs | asked | calls / run | first call, median request | passed when asked | passed otherwise | advisor $ |
|---|---:|---:|---:|---:|---:|---:|---:|
| featherloop-advisor | 90 | 3 | 0.0 | 25 | 3/3 | 70/87 | $5.56 |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

(none)
