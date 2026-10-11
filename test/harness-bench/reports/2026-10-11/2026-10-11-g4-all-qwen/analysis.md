Fetching https://github.com/Aider-AI/polyglot-benchmark

## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| out of budget: iterating | 11 | 13 | 11 | 14 |
| passed | 71 | 67 | 71 | 67 |
| stopped: tests failing | 0 | 2 | 0 | 1 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| featherloop vs opencode-stock | 7 / 3 | 0.34 |
| featherloop vs opencode-custom | 4 / 4 | 1.00 |
| featherloop vs nanocode | 5 / 1 | 0.22 |
| opencode-stock vs opencode-custom | 2 / 6 | 0.29 |
| opencode-stock vs nanocode | 6 / 6 | 1.00 |
| opencode-custom vs nanocode | 8 / 4 | 0.39 |

## Test score

The share of its tests a run passed at the end, averaged: partial credit, so a run that gets 29 of 31 counts for more than one that gets 3. Differences between columns: a stratified permutation test, shuffling runs between the two columns within each case, so case mix cancels out.

|  | runs | mean score |
|---|---:|---:|
| featherloop | 82 | 94% |
| opencode-stock | 82 | 91% |
| opencode-custom | 82 | 93% |
| nanocode | 82 | 96% |
|  | second minus first | p |
|---|---:|---:|
| featherloop vs opencode-stock | -3.6 points | 0.160 |
| featherloop vs opencode-custom | -1.0 points | 0.655 |
| featherloop vs nanocode | +1.7 points | 0.293 |
| opencode-stock vs opencode-custom | +2.6 points | 0.196 |
| opencode-stock vs nanocode | +5.3 points | 0.054 |
| opencode-custom vs nanocode | +2.7 points | 0.273 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | featherloop, nanocode | opencode-stock (out of budget: iterating), opencode-custom (out of budget: iterating) |
| python/paasio | opencode-stock, opencode-custom | featherloop (out of budget: iterating), nanocode (out of budget: iterating) |
| python/forth | featherloop, opencode-custom | opencode-stock (out of budget: iterating), nanocode (out of budget: iterating) |
| python/pov | opencode-custom | featherloop (out of budget: iterating), opencode-stock (out of budget: iterating), nanocode (out of budget: iterating) |
| python/rest-api | featherloop, opencode-stock, nanocode | opencode-custom (out of budget: iterating) |
| python/scale-generator | featherloop, opencode-stock, opencode-custom | nanocode (out of budget: iterating) |
| python/wordy | featherloop, opencode-stock, nanocode | opencode-custom (out of budget: iterating) |
| python/zipper | featherloop, opencode-stock, opencode-custom | nanocode (out of budget: iterating) |
| javascript/book-store | featherloop, opencode-custom, nanocode | opencode-stock (out of budget: iterating) |
| javascript/ocr-numbers | opencode-stock, opencode-custom, nanocode | featherloop (out of budget: iterating) |
| javascript/phone-number | featherloop, opencode-stock, opencode-custom | nanocode (out of budget: iterating) |
| javascript/parallel-letter-frequency | featherloop, opencode-stock, opencode-custom | nanocode (stopped: tests failing) |
| javascript/resistor-color-trio | featherloop, opencode-custom, nanocode | opencode-stock (stopped: tests failing) |
| javascript/robot-name | featherloop, opencode-custom, nanocode | opencode-stock (stopped: tests failing) |
| javascript/transpose | opencode-stock, opencode-custom | featherloop (out of budget: iterating), nanocode (out of budget: iterating) |
| javascript/variable-length-quantity | featherloop, opencode-custom, nanocode | opencode-stock (out of budget: iterating) |
| javascript/zebra-puzzle | featherloop, nanocode | opencode-stock (out of budget: iterating), opencode-custom (out of budget: iterating) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| featherloop | 366 | 2.7k | 0% | 2 | 2.5k |
| opencode-stock | 331 | 2.9k | 0% | 3 | 3.0k |
| opencode-custom | 146 | 2.7k | 0% | 3 | 2.8k |
| nanocode | 370 | 2.4k | 0% | 3 | 2.8k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 3.3 | 185 | 1.6k | 1% | 2.4k / 13k |
| opencode-stock | 3.5 | 209 | 1.7k | 1% | 3.4k / 13k |
| opencode-custom | 3.6 | 213 | 1.5k | 2% | 3.0k / 15k |
| nanocode | 3.9 | 235 | 996 | 0% | 2.5k / 14k |

## Iterating

Tests passing at each test run, and what moved them: does a run build on what passes, or lose it? Fell: a test run passing fewer than the one before. Lost: runs whose last test run passed fewer than their best. Rewrites: whole-file writes to a file already written, once some tests passed. Cut: test commands piped through head or tail, which can hide the failures and the summary.

|  | runs with 2+ test runs | fell / run | lost | best − last, median | rewrites / run | cut test commands |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | 64 | 1.1 | 5 | 5 | 5.3 | 240 of 491 (49%) |
| opencode-stock | 63 | 0.7 | 9 | 6 | 2.0 | 150 of 410 (37%) |
| opencode-custom | 64 | 0.8 | 4 | 1 | 2.2 | 148 of 412 (36%) |
| nanocode | 67 | 0.8 | 7 | 7 | 4.2 | 143 of 438 (33%) |

## Repeats

Notes: shell results saying "[Same output as …]", the repeat sensor. Again: notes after which the model ran the same command again within its next 3 shell calls, still doing what didn't work. Mid-run: user messages after the task that aren't the harness's events (a nudge, if one runs).

|  | notes / run | runs with any | again | mid-run user messages / run |
|---|---:|---:|---:|---:|
| featherloop | 0.6 | 14 | 28 of 49 (57%) | 0.0 |
| opencode-stock | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| opencode-custom | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| nanocode | 0.0 | 0 | 0 of 0 (0%) | 19.4 |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 0 | 0% | 0.4 |
| opencode-stock | 0 | 0% | 0.4 |
| opencode-custom | 0 | 0% | 0.4 |
| nanocode | 0 | 0% | 0.4 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.00 | 0 | – | – |
| opencode-stock | 0.02 | 1 | github.com 1, raw.githubusercontent.com 1 | python/zebra-puzzle: https://github.com/exercism/problem-specifications/blob/main/exercises/zebra-puzzle/canonical-data.json<br>python/zebra-puzzle: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/zebra-puzzle/canonical-data.json |
| opencode-custom | 0.02 | 1 | en.wikipedia.org 1, raw.githubusercontent.com 1 | javascript/variable-length-quantity: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/variable-length-quantity/variable-length-quantity.spec.js |
| nanocode | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

(none)
