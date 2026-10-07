
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | A:featherloop | C:featherloop | D1:featherloop | D2:featherloop |
|---|---:|---:|---:|---:|
| out of budget: iterating | 23 | 24 | 28 | 24 |
| passed | 34 | 32 | 29 | 33 |
| stopped: tests failing | 0 | 1 | 0 | 0 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| A:featherloop vs C:featherloop | 7 / 5 | 0.77 |
| A:featherloop vs D1:featherloop | 10 / 5 | 0.30 |
| A:featherloop vs D2:featherloop | 9 / 8 | 1.00 |
| C:featherloop vs D1:featherloop | 8 / 5 | 0.58 |
| C:featherloop vs D2:featherloop | 6 / 7 | 1.00 |
| D1:featherloop vs D2:featherloop | 6 / 10 | 0.45 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | D1:featherloop, D2:featherloop | A:featherloop (out of budget: iterating), C:featherloop (out of budget: iterating) |
| python/dominoes | C:featherloop, D1:featherloop, D2:featherloop | A:featherloop (out of budget: iterating) |
| python/paasio | A:featherloop, C:featherloop, D1:featherloop | D2:featherloop (out of budget: iterating) |
| python/forth | A:featherloop, C:featherloop | D1:featherloop (out of budget: iterating), D2:featherloop (out of budget: iterating) |
| python/transpose | A:featherloop, C:featherloop, D2:featherloop | D1:featherloop (out of budget: iterating) |
| python/pov | D1:featherloop | A:featherloop (out of budget: iterating), C:featherloop (out of budget: iterating), D2:featherloop (out of budget: iterating) |
| python/react | D2:featherloop | A:featherloop (out of budget: iterating), C:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating) |
| javascript/complex-numbers | A:featherloop, C:featherloop, D1:featherloop | D2:featherloop (out of budget: iterating) |
| python/forth#2 | A:featherloop, D1:featherloop | C:featherloop (out of budget: iterating), D2:featherloop (out of budget: iterating) |
| python/book-store#2 | C:featherloop, D2:featherloop | A:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating) |
| python/paasio#2 | D1:featherloop, D2:featherloop | A:featherloop (out of budget: iterating), C:featherloop (out of budget: iterating) |
| python/react#2 | A:featherloop, C:featherloop, D1:featherloop | D2:featherloop (out of budget: iterating) |
| python/pov#2 | C:featherloop, D2:featherloop | A:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating) |
| python/transpose#2 | A:featherloop, C:featherloop, D1:featherloop | D2:featherloop (out of budget: iterating) |
| javascript/complex-numbers#2 | A:featherloop, D1:featherloop, D2:featherloop | C:featherloop (stopped: tests failing) |
| python/book-store#3 | A:featherloop, D2:featherloop | C:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating) |
| python/hangman#3 | A:featherloop, C:featherloop, D2:featherloop | D1:featherloop (out of budget: iterating) |
| python/paasio#3 | A:featherloop, D2:featherloop | C:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating) |
| python/pov#3 | A:featherloop, D2:featherloop | C:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating) |
| python/react#3 | A:featherloop | C:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating), D2:featherloop (out of budget: iterating) |
| python/connect#3 | A:featherloop, C:featherloop | D1:featherloop (out of budget: iterating), D2:featherloop (out of budget: iterating) |
| javascript/complex-numbers#3 | A:featherloop, C:featherloop, D2:featherloop | D1:featherloop (out of budget: iterating) |
| javascript/book-store#3 | A:featherloop | C:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating), D2:featherloop (out of budget: iterating) |
| python/forth#3 | C:featherloop, D1:featherloop, D2:featherloop | A:featherloop (out of budget: iterating) |
| python/transpose#3 | C:featherloop, D2:featherloop | A:featherloop (out of budget: iterating), D1:featherloop (out of budget: iterating) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 432 | 3.1k | 0% | 2 | 3.4k |
| C:featherloop | 569 | 3.0k | 0% | 2 | 2.5k |
| D1:featherloop | 408 | 2.9k | 0% | 3 | 1.9k |
| D2:featherloop | 477 | 2.9k | 0% | 2 | 2.8k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 4.3 | 185 | 1.4k | 2% | 2.4k / 12k |
| C:featherloop | 4.5 | 199 | 1.7k | 1% | 2.4k / 13k |
| D1:featherloop | 4.4 | 198 | 1.7k | 3% | 2.6k / 8.8k |
| D2:featherloop | 4.8 | 211 | 1.3k | 1% | 2.2k / 12k |

## Iterating

Tests passing at each test run, and what moved them: does a run build on what passes, or lose it? Fell: a test run passing fewer than the one before. Lost: runs whose last test run passed fewer than their best. Rewrites: whole-file writes to a file already written, once some tests passed. Cut: test commands piped through head or tail, which can hide the failures and the summary.

|  | runs with 2+ test runs | fell / run | lost | best − last, median | rewrites / run | cut test commands |
|---|---:|---:|---:|---:|---:|---:|
| A:featherloop | 53 | 1.8 | 12 | 10 | 8.8 | 230 of 432 (53%) |
| C:featherloop | 51 | 1.5 | 11 | 4 | 9.3 | 245 of 436 (56%) |
| D1:featherloop | 53 | 1.9 | 12 | 3 | 6.7 | 279 of 484 (58%) |
| D2:featherloop | 52 | 1.8 | 13 | 4 | 10.5 | 278 of 472 (59%) |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| A:featherloop | 1 | 0% | 0.8 |
| C:featherloop | 0 | 0% | 0.7 |
| D1:featherloop | 0 | 0% | 0.7 |
| D2:featherloop | 0 | 0% | 0.7 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| A:featherloop | 0.00 | 0 | – | – |
| C:featherloop | 0.00 | 0 | – | – |
| D1:featherloop | 0.02 | 1 | github.com 1 | python/connect: https://github.com/exercism/problem-specifications/raw/main/exercises/connect/canonical-data.json |
| D2:featherloop | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

(none)
