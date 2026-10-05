
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | A:featherloop | B:featherloop | C:featherloop |
|---|---:|---:|---:|
| passed | 17 | 19 | 16 |
| timeout: iterating | 2 | 1 | 4 |
| timeout: runaway response | 5 | 4 | 4 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| A:featherloop vs B:featherloop | 2 / 4 | 0.69 |
| A:featherloop vs C:featherloop | 6 / 5 | 1.00 |
| B:featherloop vs C:featherloop | 6 / 3 | 0.51 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/paasio | A:featherloop, B:featherloop | C:featherloop (timeout: runaway response) |
| python/bowling | A:featherloop, B:featherloop | C:featherloop (timeout: iterating) |
| python/connect | C:featherloop | A:featherloop (timeout: iterating), B:featherloop (timeout: runaway response) |
| python/pov | B:featherloop, C:featherloop | A:featherloop (timeout: runaway response) |
| javascript/connect | A:featherloop, C:featherloop | B:featherloop (timeout: iterating) |
| python/bowling#2 | A:featherloop, B:featherloop | C:featherloop (timeout: iterating) |
| python/connect#2 | B:featherloop, C:featherloop | A:featherloop (timeout: runaway response) |
| javascript/connect#2 | A:featherloop | B:featherloop (timeout: runaway response), C:featherloop (timeout: runaway response) |
| python/pov#3 | A:featherloop, B:featherloop | C:featherloop (timeout: runaway response) |
| python/paasio#3 | A:featherloop, B:featherloop | C:featherloop (timeout: iterating) |
| python/bowling#3 | B:featherloop | A:featherloop (timeout: runaway response), C:featherloop (timeout: iterating) |
| javascript/bowling#3 | B:featherloop, C:featherloop | A:featherloop (timeout: iterating) |
| javascript/connect#3 | C:featherloop | A:featherloop (timeout: runaway response), B:featherloop (timeout: runaway response) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 325 | 26k | 12% | 2 | 39k |
| B:featherloop | 162 | 36k | 14% | 3 | 55k |
| C:featherloop | 335 | 33k | 14% | 2 | 31k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| A:featherloop | 1.8 | 24 | 17k | 42% | 2.6k / 11k |
| B:featherloop | 1.8 | 23 | 3.4k | 35% | 3.2k / 9.2k |
| C:featherloop | 1.8 | 27 | 16k | 37% | 2.6k / 20k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| A:featherloop | 21 | 80% | 7.1 |
| B:featherloop | 24 | 94% | 9.6 |
| C:featherloop | 28 | 86% | 7.4 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| A:featherloop | 0.04 | 1 | raw.githubusercontent.com 1 | python/connect: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/connect/canonical-data.json |
| B:featherloop | 0.00 | 0 | – | – |
| C:featherloop | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| A:featherloop | python/pov | 6 | 27 | 186k | 85% | failing tests |
| A:featherloop | python/connect | 13 | 12 | 52k | 28% | another tool result |
| A:featherloop | python/bowling | 2 | 30 | 159k | 46% | another tool result |
| A:featherloop | python/connect | 11 | 13 | 61k | 68% | failing tests |
| A:featherloop | javascript/connect | 2 | 30 | 136k | 38% | another tool result |
| B:featherloop | python/connect | 6 | 24 | 101k | 24% | failing tests |
| B:featherloop | javascript/connect | 2 | 30 | 111k | 29% | another tool result |
| B:featherloop | python/connect | 8 | 12 | 52k | 32% | failing tests |
| B:featherloop | javascript/connect | 2 | 30 | 251k | 92% | another tool result |
| C:featherloop | python/paasio | 8 | 10 | 66k | 87% | failing tests |
| C:featherloop | javascript/connect | 2 | 30 | 113k | 27% | another tool result |
| C:featherloop | python/connect | 2 | 30 | 117k | 35% | another tool result |
| C:featherloop | python/pov | 2 | 30 | 169k | 72% | another tool result |
