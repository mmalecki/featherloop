
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| API errors | 0 | 0 | 0 | 1 |
| passed | 30 | 30 | 30 | 29 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| featherloop vs opencode-stock | 0 / 0 | 1.00 |
| featherloop vs opencode-custom | 0 / 0 | 1.00 |
| featherloop vs nanocode | 0 / 0 | 1.00 |
| opencode-stock vs opencode-custom | 0 / 0 | 1.00 |
| opencode-stock vs nanocode | 0 / 0 | 1.00 |
| opencode-custom vs nanocode | 0 / 0 | 1.00 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

(none)

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| featherloop | 0 | 0 | 0% | 3 | 0 |
| opencode-stock | 0 | 0 | 0% | 3 | 0 |
| opencode-custom | 0 | 0 | 0% | 3 | 0 |
| nanocode | 0 | 0 | 0% | 4 | 0 |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 1.6 | 16 | 0 | 0% | 1.8k / 4.4k |
| opencode-stock | 2.3 | 34 | 0 | 0% | 2.4k / 3.8k |
| opencode-custom | 2.0 | 20 | 0 | 0% | 1.8k / 4.0k |
| nanocode | 2.1 | 23 | 0 | 0% | 2.0k / 5.8k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 0 | 0% | 0.1 |
| opencode-stock | 0 | 0% | 0.1 |
| opencode-custom | 0 | 0% | 0.1 |
| nanocode | 0 | 0% | 0.1 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.00 | 0 | – | – |
| opencode-stock | 0.00 | 0 | – | – |
| opencode-custom | 0.00 | 0 | – | – |
| nanocode | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

(none)
