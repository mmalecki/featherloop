
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop |
|---|---:|
| passed | 19 |
| timeout: iterating | 1 |
| timeout: runaway response | 4 |

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
| featherloop | 162 | 36k | 14% | 3 | 55k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 1.8 | 23 | 3.4k | 35% | 3.2k / 9.2k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 24 | 94% | 9.6 |

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
| featherloop | python/connect | 6 | 24 | 101k | 24% | failing tests |
| featherloop | javascript/connect | 2 | 30 | 111k | 29% | another tool result |
| featherloop | python/connect | 8 | 12 | 52k | 32% | failing tests |
| featherloop | javascript/connect | 2 | 30 | 251k | 92% | another tool result |
