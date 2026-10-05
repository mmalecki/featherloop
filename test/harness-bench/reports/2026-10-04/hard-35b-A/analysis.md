
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop |
|---|---:|
| passed | 17 |
| timeout: iterating | 2 |
| timeout: runaway response | 5 |

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
| featherloop | 325 | 26k | 12% | 2 | 39k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 1.8 | 24 | 17k | 42% | 2.6k / 11k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 21 | 80% | 7.1 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.04 | 1 | raw.githubusercontent.com 1 | python/connect: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/connect/canonical-data.json |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | python/pov | 6 | 27 | 186k | 85% | failing tests |
| featherloop | python/connect | 13 | 12 | 52k | 28% | another tool result |
| featherloop | python/bowling | 2 | 30 | 159k | 46% | another tool result |
| featherloop | python/connect | 11 | 13 | 61k | 68% | failing tests |
| featherloop | javascript/connect | 2 | 30 | 136k | 38% | another tool result |
