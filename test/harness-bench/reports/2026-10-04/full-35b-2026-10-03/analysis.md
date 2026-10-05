
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| passed | 77 | 78 | 81 | 58 |
| stopped: output limit | 0 | 0 | 0 | 23 |
| stopped: tests failing | 1 | 0 | 0 | 0 |
| timeout: iterating | 1 | 1 | 0 | 1 |
| timeout: runaway response | 3 | 3 | 1 | 0 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| featherloop vs opencode-stock | 3 / 4 | 1.00 |
| featherloop vs opencode-custom | 1 / 5 | 0.22 |
| featherloop vs nanocode | 20 / 1 | 0.00 |
| opencode-stock vs opencode-custom | 0 / 3 | 0.25 |
| opencode-stock vs nanocode | 20 / 0 | 0.00 |
| opencode-custom vs nanocode | 23 / 0 | 0.00 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| python/bowling | featherloop | opencode-stock (timeout: runaway response), opencode-custom (timeout: runaway response), nanocode (stopped: output limit) |
| python/connect | opencode-custom | featherloop (timeout: iterating), opencode-stock (timeout: iterating), nanocode (timeout: iterating) |
| python/dominoes | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| python/forth | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| python/paasio | featherloop, opencode-custom | opencode-stock (timeout: runaway response), nanocode (stopped: output limit) |
| python/pov | opencode-stock, opencode-custom | featherloop (timeout: runaway response), nanocode (stopped: output limit) |
| python/react | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| python/sgf-parsing | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| python/two-bucket | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| python/zipper | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/book-store | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/bowling | featherloop, opencode-custom | opencode-stock (timeout: runaway response), nanocode (stopped: output limit) |
| javascript/connect | opencode-stock, opencode-custom | featherloop (timeout: runaway response), nanocode (stopped: output limit) |
| javascript/forth | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/go-counting | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/ocr-numbers | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/palindrome-products | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/poker | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/react | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/rest-api | opencode-stock, opencode-custom | featherloop (timeout: runaway response), nanocode (stopped: output limit) |
| javascript/two-bucket | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/variable-length-quantity | opencode-stock, opencode-custom, nanocode | featherloop (stopped: tests failing) |
| javascript/wordy | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/zipper | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| featherloop | 227 | 3.6k | 4% | 2 | 4.3k |
| opencode-stock | 91 | 2.9k | 2% | 3 | 2.1k |
| opencode-custom | 88 | 2.2k | 3% | 3 | 1.3k |
| nanocode | 142 | 9.7k | 6% | 3 | 4.3k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 1.7 | 60 | 1.5k | 7% | 1.9k / 8.4k |
| opencode-stock | 1.4 | 34 | 2.8k | 12% | 1.7k / 6.0k |
| opencode-custom | 1.5 | 46 | 1.6k | 7% | 2.2k / 12k |
| nanocode | 1.0 | 25 | 3.0k | 12% | 1.5k / 5.6k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 25 | 92% | 1.1 |
| opencode-stock | 15 | 90% | 1.0 |
| opencode-custom | 12 | 54% | 0.9 |
| nanocode | 7 | 18% | 1.3 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.00 | 0 | – | – |
| opencode-stock | 0.00 | 0 | – | – |
| opencode-custom | 0.00 | 0 | – | – |
| nanocode | 0.01 | 1 | github.com 1 | python/connect: https://github.com/exercism/problem-specifications/tree/main/exercises/connect/canonical-data.json |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

| column | case | passed | literals |
|---|---:|---:|---:|
| opencode-stock | python/zebra-puzzle | yes | Norwegian, Japanese |

## Runaway responses

Timeouts that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| opencode-stock | python/bowling | 4 | 29 | 122k | 44% | failing tests |
| opencode-custom | python/bowling | 25 | 16 | 86k | 80% | another tool result |
| opencode-stock | python/paasio | 5 | 9 | 67k | 27% | failing tests |
| featherloop | python/pov | 6 | 27 | 179k | 81% | another tool result |
| opencode-stock | javascript/bowling | 3 | 30 | 138k | 32% | another tool result |
| featherloop | javascript/connect | 4 | 22 | 78k | 26% | failing tests |
| featherloop | javascript/rest-api | 4 | 27 | 144k | 70% | failing tests |
