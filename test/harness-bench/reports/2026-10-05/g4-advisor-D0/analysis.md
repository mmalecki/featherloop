
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop-advisor |
|---|---:|
| out of budget: iterating | 6 |
| passed | 3 |

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
| featherloop-advisor | 372 | 5.9k | 1% | 2 | 3.2k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop-advisor | 6.8 | 50 | 2.0k | 10% | 5.7k / 19k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop-advisor | 0 | 0% | 2.3 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop-advisor | 0.00 | 0 | – | – |

## Advisor

featherloop-advisor: whether the model asked for advice, when, and how the runs that asked did.

|  | runs | asked | calls / run | first call, median request | passed when asked | passed otherwise | advisor $ |
|---|---:|---:|---:|---:|---:|---:|---:|
| featherloop-advisor | 9 | 0 | 0.0 | 0 | – | 3/9 | $0.00 |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

(none)
