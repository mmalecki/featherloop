
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop |
|---|---:|
| passed | 24 |
| timeout: iterating | 17 |
| timeout: runaway response | 16 |

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
| featherloop | 626 | 5.6k | 2% | 2 | 3.5k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 3.2 | 150 | 2.5k | 15% | 4.4k / 17k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 29 | 48% | 2.7 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | python/connect | 4 | 28 | 263k | 93% | failing tests |
| featherloop | python/poker | 6 | 24 | 127k | 90% | another tool result |
| featherloop | javascript/book-store | 1 | 30 | 197k | 97% | the task |
| featherloop | javascript/bowling | 8 | 22 | 179k | 91% | failing tests |
| featherloop | javascript/complex-numbers | 4 | 29 | 203k | 95% | failing tests |
| featherloop | javascript/connect | 4 | 28 | 144k | 0% | failing tests |
| featherloop | python/bowling | 7 | 26 | 160k | 86% | another tool result |
| featherloop | python/book-store | 6 | 25 | 151k | 88% | another tool result |
| featherloop | python/connect | 6 | 23 | 110k | 70% | failing tests |
| featherloop | python/forth | 10 | 27 | 121k | 99% | another tool result |
| featherloop | python/scale-generator | 8 | 25 | 109k | 80% | another tool result |
| featherloop | javascript/book-store | 1 | 30 | 160k | 91% | the task |
| featherloop | javascript/complex-numbers | 7 | 28 | 186k | 93% | another tool result |
| featherloop | python/connect | 6 | 26 | 177k | 86% | another tool result |
| featherloop | python/paasio | 8 | 19 | 102k | 97% | failing tests |
| featherloop | javascript/book-store | 11 | 15 | 97k | 86% | failing tests |
