
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| passed | 57 | 64 | 58 | 62 |
| passed, then timed out | 0 | 1 | 0 | 0 |
| stopped: output limit | 0 | 0 | 0 | 13 |
| timeout: iterating | 11 | 12 | 16 | 4 |
| timeout: mostly in tools | 0 | 0 | 0 | 1 |
| timeout: runaway response | 14 | 5 | 8 | 2 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| featherloop vs opencode-stock | 6 / 14 | 0.12 |
| featherloop vs opencode-custom | 6 / 7 | 1.00 |
| featherloop vs nanocode | 6 / 11 | 0.33 |
| opencode-stock vs opencode-custom | 11 / 4 | 0.12 |
| opencode-stock vs nanocode | 11 / 8 | 0.65 |
| opencode-custom vs nanocode | 5 / 9 | 0.42 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | opencode-stock | featherloop (timeout: runaway response), opencode-custom (timeout: runaway response), nanocode (timeout: mostly in tools) |
| python/bowling | nanocode | featherloop (timeout: iterating), opencode-stock (timeout: iterating), opencode-custom (timeout: runaway response) |
| python/dominoes | opencode-stock, opencode-custom, nanocode | featherloop (timeout: runaway response) |
| python/hangman | opencode-stock, nanocode | featherloop (timeout: runaway response), opencode-custom (timeout: runaway response) |
| python/paasio | opencode-custom, nanocode | featherloop (timeout: runaway response), opencode-stock (timeout: iterating) |
| python/poker | opencode-stock, opencode-custom, nanocode | featherloop (timeout: runaway response) |
| python/pov | opencode-stock | featherloop (timeout: iterating), opencode-custom (timeout: iterating), nanocode (stopped: output limit) |
| python/rest-api | nanocode | featherloop (timeout: iterating), opencode-stock (timeout: iterating), opencode-custom (timeout: iterating) |
| python/robot-name | opencode-stock, opencode-custom, nanocode | featherloop (timeout: runaway response) |
| python/scale-generator | opencode-stock | featherloop (timeout: runaway response), opencode-custom (timeout: iterating), nanocode (timeout: iterating) |
| python/transpose | opencode-stock | featherloop (timeout: iterating), opencode-custom (timeout: runaway response), nanocode (stopped: output limit) |
| python/zebra-puzzle | featherloop, opencode-stock, nanocode | opencode-custom (timeout: iterating) |
| python/zipper | featherloop, nanocode | opencode-stock (timeout: runaway response), opencode-custom (timeout: runaway response) |
| javascript/book-store | opencode-stock | featherloop (timeout: iterating), opencode-custom (timeout: iterating), nanocode (stopped: output limit) |
| javascript/forth | featherloop | opencode-stock (timeout: iterating), opencode-custom (timeout: iterating), nanocode (stopped: output limit) |
| javascript/go-counting | opencode-stock, nanocode | featherloop (timeout: iterating), opencode-custom (timeout: iterating) |
| javascript/house | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/meetup | featherloop, opencode-stock, opencode-custom | nanocode (timeout: iterating) |
| javascript/ocr-numbers | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/phone-number | opencode-stock, opencode-custom, nanocode | featherloop (timeout: runaway response) |
| javascript/promises | featherloop, opencode-custom, nanocode | opencode-stock (timeout: iterating) |
| javascript/rectangles | featherloop, opencode-custom, nanocode | opencode-stock (timeout: iterating) |
| javascript/rest-api | featherloop, nanocode | opencode-stock (timeout: runaway response), opencode-custom (timeout: iterating) |
| javascript/robot-name | featherloop, opencode-stock, nanocode | opencode-custom (timeout: iterating) |
| javascript/tournament | featherloop, opencode-stock, opencode-custom | nanocode (stopped: output limit) |
| javascript/transpose | featherloop, opencode-stock | opencode-custom (timeout: iterating), nanocode (stopped: output limit) |
| javascript/variable-length-quantity | opencode-stock, opencode-custom, nanocode | featherloop (timeout: runaway response) |
| javascript/wordy | opencode-stock, nanocode | featherloop (timeout: runaway response), opencode-custom (timeout: iterating) |
| javascript/zebra-puzzle | featherloop, opencode-custom, nanocode | opencode-stock (timeout: iterating) |
| javascript/zipper | opencode-stock, opencode-custom | featherloop (timeout: runaway response), nanocode (stopped: output limit) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| featherloop | 381 | 4.3k | 1% | 2 | 3.4k |
| opencode-stock | 145 | 3.7k | 1% | 3 | 2.8k |
| opencode-custom | 113 | 3.3k | 1% | 3 | 3.3k |
| nanocode | 320 | 3.5k | 2% | 3 | 2.7k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 2.5 | 144 | 2.1k | 11% | 3.4k / 14k |
| opencode-stock | 3.4 | 213 | 2.0k | 6% | 3.7k / 14k |
| opencode-custom | 3.6 | 218 | 1.8k | 7% | 3.6k / 16k |
| nanocode | 2.9 | 170 | 1.7k | 6% | 3.5k / 17k |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 31 | 66% | 1.3 |
| opencode-stock | 19 | 35% | 1.5 |
| opencode-custom | 22 | 35% | 1.7 |
| nanocode | 12 | 15% | 1.3 |

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

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | python/book-store | 2 | 30 | 202k | 96% | another tool result |
| opencode-custom | python/book-store | 6 | 25 | 149k | 87% | another tool result |
| opencode-custom | python/bowling | 14 | 13 | 79k | 95% | another tool result |
| opencode-stock | python/connect | 14 | 17 | 110k | 72% | another tool result |
| opencode-custom | python/connect | 6 | 26 | 72k | 0% | another tool result |
| featherloop | python/dominoes | 6 | 28 | 151k | 87% | another tool result |
| nanocode | python/forth | 23 | 11 | 0 | 0% | another tool result |
| featherloop | python/hangman | 5 | 26 | 199k | 91% | another tool result |
| opencode-custom | python/hangman | 5 | 29 | 200k | 65% | failing tests |
| featherloop | python/paasio | 6 | 28 | 175k | 95% | another tool result |
| featherloop | python/poker | 2 | 30 | 814 | 0% | another tool result |
| opencode-stock | python/react | 13 | 15 | 68k | 79% | another tool result |
| featherloop | python/robot-name | 10 | 27 | 170k | 89% | failing tests |
| featherloop | python/scale-generator | 4 | 26 | 132k | 83% | failing tests |
| opencode-custom | python/transpose | 17 | 17 | 110k | 76% | failing tests |
| opencode-stock | python/zipper | 5 | 28 | 153k | 74% | failing tests |
| opencode-custom | python/zipper | 16 | 19 | 81k | 19% | failing tests |
| featherloop | javascript/bowling | 2 | 30 | 194k | 81% | another tool result |
| opencode-custom | javascript/bowling | 8 | 15 | 97k | 85% | another tool result |
| featherloop | javascript/complex-numbers | 9 | 22 | 142k | 98% | another tool result |
| opencode-stock | javascript/complex-numbers | 4 | 29 | 182k | 93% | failing tests |
| opencode-custom | javascript/complex-numbers | 38 | 16 | 116k | 94% | another tool result |
| nanocode | javascript/connect | 16 | 13 | 0 | 0% | another tool result |
| featherloop | javascript/phone-number | 3 | 30 | 147k | 97% | another tool result |
| featherloop | javascript/react | 19 | 19 | 106k | 88% | failing tests |
| opencode-stock | javascript/rest-api | 17 | 18 | 74k | 78% | another tool result |
| featherloop | javascript/variable-length-quantity | 5 | 26 | 106k | 57% | failing tests |
| featherloop | javascript/wordy | 9 | 24 | 106k | 87% | failing tests |
| featherloop | javascript/zipper | 6 | 28 | 237k | 83% | failing tests |
