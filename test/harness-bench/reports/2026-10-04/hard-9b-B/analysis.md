
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop |
|---|---:|
| passed | 28 |
| timeout: iterating | 20 |
| timeout: runaway response | 9 |

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
| featherloop | 308 | 4.9k | 2% | 2 | 2.4k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 3.6 | 175 | 2.1k | 6% | 3.2k / 16k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 30 | 39% | 3.0 |

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
| featherloop | python/book-store | 3 | 30 | 2.2k | 3% | another tool result |
| featherloop | python/bowling | 5 | 30 | 200k | 94% | another tool result |
| featherloop | javascript/complex-numbers | 10 | 25 | 183k | 99% | failing tests |
| featherloop | javascript/book-store | 2 | 30 | 175k | 87% | another tool result |
| featherloop | javascript/complex-numbers | 17 | 23 | 152k | 97% | another tool result |
| featherloop | python/book-store | 11 | 22 | 136k | 98% | another tool result |
| featherloop | python/forth | 20 | 11 | 70k | 90% | another tool result |
| featherloop | javascript/bowling | 2 | 30 | 223k | 89% | another tool result |
| featherloop | javascript/connect | 11 | 22 | 107k | 53% | another tool result |
