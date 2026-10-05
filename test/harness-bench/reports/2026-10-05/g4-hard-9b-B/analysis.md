
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop |
|---|---:|
| out of budget: iterating | 20 |
| out of budget: runaway response | 12 |
| passed | 24 |
| passed, then out of budget | 1 |

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
| featherloop | 436 | 5.6k | 2% | 2 | 3.4k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 3.4 | 167 | 2.9k | 13% | 4.1k / 16k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 14 | 0% | 1.6 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | python/book-store | 3 | 10 | 143k | 95% | another tool result |
| featherloop | python/react | 2 | 20 | 177k | 81% | another tool result |
| featherloop | javascript/bowling | 2 | 17 | 200k | 80% | another tool result |
| featherloop | javascript/connect | 15 | 10 | 68k | 34% | failing tests |
| featherloop | python/bowling | 6 | 16 | 135k | 82% | failing tests |
| featherloop | python/transpose | 14 | 8 | 72k | 65% | failing tests |
| featherloop | javascript/complex-numbers | 6 | 13 | 149k | 92% | failing tests |
| featherloop | javascript/connect | 4 | 12 | 156k | 70% | failing tests |
| featherloop | python/book-store | 8 | 6 | 97k | 91% | another tool result |
| featherloop | python/paasio | 6 | 7 | 103k | 80% | failing tests |
| featherloop | python/transpose | 27 | 4 | 61k | 79% | another tool result |
| featherloop | javascript/complex-numbers | 8 | 11 | 145k | 93% | failing tests |
