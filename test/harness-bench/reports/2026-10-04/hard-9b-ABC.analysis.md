
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | A:featherloop | B:featherloop | C-partial:featherloop |
|---|---:|---:|---:|
| API errors | 0 | 0 | 30 |
| passed | 24 | 28 | 11 |
| timeout: iterating | 17 | 20 | 9 |
| timeout: runaway response | 16 | 9 | 3 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| A:featherloop vs B:featherloop | 4 / 8 | 0.39 |
| A:featherloop vs C-partial:featherloop | 3 / 4 | 1.00 |
| B:featherloop vs C-partial:featherloop | 2 / 2 | 1.00 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | A:featherloop | B:featherloop (timeout: runaway response), C-partial:featherloop (timeout: iterating) |
| python/paasio | A:featherloop, B:featherloop | C-partial:featherloop (timeout: iterating) |
| python/poker | B:featherloop, C-partial:featherloop | A:featherloop (timeout: runaway response) |
| python/scale-generator | A:featherloop, B:featherloop | C-partial:featherloop (timeout: iterating) |
| javascript/book-store | C-partial:featherloop | A:featherloop (timeout: runaway response), B:featherloop (timeout: iterating) |
| javascript/complex-numbers | C-partial:featherloop | A:featherloop (timeout: runaway response), B:featherloop (timeout: runaway response) |
| python/book-store#2 | B:featherloop, C-partial:featherloop | A:featherloop (timeout: runaway response) |
| python/poker#2 | B:featherloop | A:featherloop (timeout: iterating) |
| python/react#2 | B:featherloop | A:featherloop (timeout: iterating) |
| python/scale-generator#2 | B:featherloop | A:featherloop (timeout: runaway response) |
| python/book-store#3 | A:featherloop | B:featherloop (timeout: runaway response) |
| javascript/connect#2 | B:featherloop | A:featherloop (timeout: iterating) |
| python/paasio#3 | B:featherloop | A:featherloop (timeout: runaway response) |
| python/react#3 | A:featherloop | B:featherloop (timeout: iterating) |
| javascript/bowling#3 | A:featherloop | B:featherloop (timeout: runaway response) |
| javascript/book-store#3 | B:featherloop | A:featherloop (timeout: runaway response) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 626 | 5.6k | 2% | 2 | 3.5k |
| B:featherloop | 308 | 4.9k | 2% | 2 | 2.4k |
| C-partial:featherloop | 632 | 5.7k | 2% | 2 | 3.8k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 3.2 | 150 | 2.5k | 15% | 4.4k / 17k |
| B:featherloop | 3.6 | 175 | 2.1k | 6% | 3.2k / 16k |
| C-partial:featherloop | 3.4 | 66 | 2.3k | 12% | 3.6k / 17k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| A:featherloop | 29 | 48% | 2.7 |
| B:featherloop | 30 | 39% | 3.0 |
| C-partial:featherloop | 14 | 29% | 4.1 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| A:featherloop | 0.00 | 0 | – | – |
| B:featherloop | 0.00 | 0 | – | – |
| C-partial:featherloop | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| A:featherloop | python/connect | 4 | 28 | 263k | 93% | failing tests |
| A:featherloop | python/poker | 6 | 24 | 127k | 90% | another tool result |
| A:featherloop | javascript/book-store | 1 | 30 | 197k | 97% | the task |
| A:featherloop | javascript/bowling | 8 | 22 | 179k | 91% | failing tests |
| A:featherloop | javascript/complex-numbers | 4 | 29 | 203k | 95% | failing tests |
| A:featherloop | javascript/connect | 4 | 28 | 144k | 0% | failing tests |
| A:featherloop | python/bowling | 7 | 26 | 160k | 86% | another tool result |
| A:featherloop | python/book-store | 6 | 25 | 151k | 88% | another tool result |
| A:featherloop | python/connect | 6 | 23 | 110k | 70% | failing tests |
| A:featherloop | python/forth | 10 | 27 | 121k | 99% | another tool result |
| A:featherloop | python/scale-generator | 8 | 25 | 109k | 80% | another tool result |
| A:featherloop | javascript/book-store | 1 | 30 | 160k | 91% | the task |
| A:featherloop | javascript/complex-numbers | 7 | 28 | 186k | 93% | another tool result |
| A:featherloop | python/connect | 6 | 26 | 177k | 86% | another tool result |
| A:featherloop | python/paasio | 8 | 19 | 102k | 97% | failing tests |
| A:featherloop | javascript/book-store | 11 | 15 | 97k | 86% | failing tests |
| B:featherloop | python/book-store | 3 | 30 | 2.2k | 3% | another tool result |
| B:featherloop | python/bowling | 5 | 30 | 200k | 94% | another tool result |
| B:featherloop | javascript/complex-numbers | 10 | 25 | 183k | 99% | failing tests |
| B:featherloop | javascript/book-store | 2 | 30 | 175k | 87% | another tool result |
| B:featherloop | javascript/complex-numbers | 17 | 23 | 152k | 97% | another tool result |
| B:featherloop | python/book-store | 11 | 22 | 136k | 98% | another tool result |
| B:featherloop | python/forth | 20 | 11 | 70k | 90% | another tool result |
| B:featherloop | javascript/bowling | 2 | 30 | 223k | 89% | another tool result |
| B:featherloop | javascript/connect | 11 | 22 | 107k | 53% | another tool result |
| C-partial:featherloop | python/bowling | 11 | 21 | 55k | 6% | another tool result |
| C-partial:featherloop | python/forth | 15 | 16 | 83k | 88% | another tool result |
| C-partial:featherloop | python/sgf-parsing | 10 | 11 | 50k | 78% | another tool result |
