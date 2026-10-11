
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | O:featherloop | O:opencode-stock | O:opencode-custom | O:nanocode | P:featherloop | P:opencode-stock | P:opencode-custom | P:nanocode | P:pi |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| out of budget: iterating | 2 | 7 | 9 | 5 | 6 | 7 | 9 | 4 | 5 |
| out of budget: runaway response | 7 | 6 | 6 | 6 | 2 | 2 | 4 | 4 | 2 |
| passed | 70 | 68 | 66 | 70 | 73 | 73 | 68 | 69 | 73 |
| passed, then out of budget | 3 | 1 | 1 | 1 | 1 | 0 | 1 | 1 | 0 |
| passed, then timed out | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| timeout: mostly in tools | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 1 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| O:featherloop vs O:opencode-stock | 10 / 6 | 0.45 |
| O:featherloop vs O:opencode-custom | 9 / 3 | 0.15 |
| O:featherloop vs O:nanocode | 6 / 4 | 0.75 |
| O:featherloop vs P:featherloop | 4 / 5 | 1.00 |
| O:featherloop vs P:opencode-stock | 4 / 4 | 1.00 |
| O:featherloop vs P:opencode-custom | 9 / 5 | 0.42 |
| O:featherloop vs P:nanocode | 7 / 5 | 0.77 |
| O:featherloop vs P:pi | 4 / 5 | 1.00 |
| O:opencode-stock vs O:opencode-custom | 11 / 9 | 0.82 |
| O:opencode-stock vs O:nanocode | 6 / 8 | 0.79 |
| O:opencode-stock vs P:featherloop | 5 / 10 | 0.30 |
| O:opencode-stock vs P:opencode-stock | 3 / 7 | 0.34 |
| O:opencode-stock vs P:opencode-custom | 7 / 7 | 1.00 |
| O:opencode-stock vs P:nanocode | 6 / 8 | 0.79 |
| O:opencode-stock vs P:pi | 4 / 9 | 0.27 |
| O:opencode-custom vs O:nanocode | 6 / 10 | 0.45 |
| O:opencode-custom vs P:featherloop | 3 / 10 | 0.09 |
| O:opencode-custom vs P:opencode-stock | 4 / 10 | 0.18 |
| O:opencode-custom vs P:opencode-custom | 8 / 10 | 0.81 |
| O:opencode-custom vs P:nanocode | 4 / 7 | 0.55 |
| O:opencode-custom vs P:pi | 3 / 10 | 0.09 |
| O:nanocode vs P:featherloop | 2 / 5 | 0.45 |
| O:nanocode vs P:opencode-stock | 2 / 4 | 0.69 |
| O:nanocode vs P:opencode-custom | 7 / 5 | 0.77 |
| O:nanocode vs P:nanocode | 5 / 5 | 1.00 |
| O:nanocode vs P:pi | 2 / 5 | 0.45 |
| P:featherloop vs P:opencode-stock | 4 / 3 | 1.00 |
| P:featherloop vs P:opencode-custom | 8 / 3 | 0.23 |
| P:featherloop vs P:nanocode | 5 / 2 | 0.45 |
| P:featherloop vs P:pi | 3 / 3 | 1.00 |
| P:opencode-stock vs P:opencode-custom | 8 / 4 | 0.39 |
| P:opencode-stock vs P:nanocode | 5 / 3 | 0.73 |
| P:opencode-stock vs P:pi | 3 / 4 | 1.00 |
| P:opencode-custom vs P:nanocode | 6 / 8 | 0.79 |
| P:opencode-custom vs P:pi | 3 / 8 | 0.23 |
| P:nanocode vs P:pi | 4 / 7 | 0.55 |

## Test score

The share of its tests a run passed at the end, averaged: partial credit, so a run that gets 29 of 31 counts for more than one that gets 3. Differences between columns: a stratified permutation test, shuffling runs between the two columns within each case, so case mix cancels out.

|  | runs | mean score |
|---|---:|---:|
| O:featherloop | 82 | 91% |
| O:opencode-stock | 82 | 88% |
| O:opencode-custom | 82 | 87% |
| O:nanocode | 82 | 89% |
| P:featherloop | 82 | 94% |
| P:opencode-stock | 82 | 91% |
| P:opencode-custom | 82 | 91% |
| P:nanocode | 81 | 90% |
| P:pi | 82 | 94% |
|  | second minus first | p |
|---|---:|---:|
| O:featherloop vs O:opencode-stock | -2.5 points | 0.579 |
| O:featherloop vs O:opencode-custom | -4.2 points | 0.241 |
| O:featherloop vs O:nanocode | -1.9 points | 0.625 |
| O:featherloop vs P:featherloop | +3.0 points | 0.404 |
| O:featherloop vs P:opencode-stock | +0.1 points | 0.971 |
| O:featherloop vs P:opencode-custom | +0.0 points | 0.997 |
| O:featherloop vs P:nanocode | -0.7 points | 0.868 |
| O:featherloop vs P:pi | +3.4 points | 0.332 |
| O:opencode-stock vs O:opencode-custom | -1.8 points | 0.682 |
| O:opencode-stock vs O:nanocode | +0.5 points | 0.881 |
| O:opencode-stock vs P:featherloop | +5.4 points | 0.130 |
| O:opencode-stock vs P:opencode-stock | +2.6 points | 0.428 |
| O:opencode-stock vs P:opencode-custom | +2.5 points | 0.555 |
| O:opencode-stock vs P:nanocode | +1.8 points | 0.648 |
| O:opencode-stock vs P:pi | +5.8 points | 0.123 |
| O:opencode-custom vs O:nanocode | +2.3 points | 0.604 |
| O:opencode-custom vs P:featherloop | +7.2 points | 0.052 |
| O:opencode-custom vs P:opencode-stock | +4.4 points | 0.248 |
| O:opencode-custom vs P:opencode-custom | +4.3 points | 0.265 |
| O:opencode-custom vs P:nanocode | +3.6 points | 0.363 |
| O:opencode-custom vs P:pi | +7.6 points | 0.039 |
| O:nanocode vs P:featherloop | +4.9 points | 0.072 |
| O:nanocode vs P:opencode-stock | +2.0 points | 0.456 |
| O:nanocode vs P:opencode-custom | +1.9 points | 0.569 |
| O:nanocode vs P:nanocode | +1.2 points | 0.730 |
| O:nanocode vs P:pi | +5.3 points | 0.104 |
| P:featherloop vs P:opencode-stock | -2.8 points | 0.353 |
| P:featherloop vs P:opencode-custom | -2.9 points | 0.284 |
| P:featherloop vs P:nanocode | -3.6 points | 0.212 |
| P:featherloop vs P:pi | +0.4 points | 0.813 |
| P:opencode-stock vs P:opencode-custom | -0.1 points | 0.979 |
| P:opencode-stock vs P:nanocode | -0.8 points | 0.804 |
| P:opencode-stock vs P:pi | +3.3 points | 0.311 |
| P:opencode-custom vs P:nanocode | -0.7 points | 0.840 |
| P:opencode-custom vs P:pi | +3.4 points | 0.270 |
| P:nanocode vs P:pi | +4.1 points | 0.186 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | O:featherloop, O:opencode-stock, O:opencode-custom, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:nanocode (out of budget: iterating) |
| python/connect | O:featherloop, O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:pi | O:opencode-custom (out of budget: iterating) |
| python/go-counting | O:featherloop, O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:pi | O:opencode-custom (out of budget: iterating), P:nanocode (out of budget: iterating) |
| python/forth | O:featherloop, O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-custom (out of budget: runaway response) |
| python/paasio | O:featherloop, P:opencode-custom | O:opencode-stock (out of budget: iterating), O:opencode-custom (out of budget: iterating), O:nanocode (out of budget: runaway response), P:featherloop (out of budget: runaway response), P:opencode-stock (out of budget: iterating), P:nanocode (out of budget: runaway response), P:pi (out of budget: runaway response) |
| python/react | O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:featherloop (out of budget: runaway response), O:opencode-custom (out of budget: runaway response) |
| python/rest-api | O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:nanocode, P:pi | P:opencode-custom (out of budget: iterating) |
| python/transpose | O:featherloop, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-stock (out of budget: iterating) |
| python/two-bucket | O:featherloop, O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-custom (out of budget: runaway response) |
| python/wordy | O:featherloop, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-stock (out of budget: runaway response) |
| python/zebra-puzzle | O:featherloop, O:opencode-stock, O:opencode-custom, P:nanocode | O:nanocode (out of budget: iterating), P:featherloop (out of budget: iterating), P:opencode-stock (out of budget: iterating), P:opencode-custom (out of budget: iterating), P:pi (out of budget: iterating) |
| javascript/alphametics | O:featherloop, O:opencode-stock, O:opencode-custom, P:featherloop, P:opencode-stock, P:opencode-custom, P:pi | O:nanocode (out of budget: iterating), P:nanocode (timeout: mostly in tools) |
| javascript/book-store | O:featherloop, O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-custom (out of budget: iterating) |
| javascript/bowling | P:featherloop, P:nanocode, P:pi | O:featherloop (out of budget: iterating), O:opencode-stock (out of budget: runaway response), O:opencode-custom (out of budget: iterating), O:nanocode (out of budget: runaway response), P:opencode-stock (out of budget: runaway response), P:opencode-custom (out of budget: iterating) |
| javascript/connect | O:featherloop, O:opencode-stock, O:opencode-custom, P:opencode-stock, P:nanocode, P:pi | O:nanocode (out of budget: runaway response), P:featherloop (out of budget: iterating), P:opencode-custom (out of budget: iterating) |
| javascript/complex-numbers | O:featherloop, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:nanocode | O:opencode-stock (out of budget: iterating), P:opencode-custom (out of budget: runaway response), P:pi (out of budget: iterating) |
| javascript/forth | O:opencode-stock, O:opencode-custom, P:featherloop, P:opencode-custom, P:nanocode | O:featherloop (out of budget: runaway response), O:nanocode (out of budget: runaway response), P:opencode-stock (out of budget: iterating), P:pi (out of budget: iterating) |
| javascript/go-counting | O:opencode-stock, O:nanocode, P:opencode-custom, P:pi | O:featherloop (out of budget: runaway response), O:opencode-custom (out of budget: runaway response), P:featherloop (out of budget: iterating), P:opencode-stock (out of budget: iterating), P:nanocode (out of budget: iterating) |
| javascript/palindrome-products | O:opencode-stock, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:featherloop (out of budget: runaway response) |
| javascript/parallel-letter-frequency | O:featherloop, O:opencode-custom, O:nanocode, P:featherloop, P:pi | O:opencode-stock (out of budget: iterating), P:opencode-stock (out of budget: iterating), P:opencode-custom (out of budget: iterating), P:nanocode (timeout: mostly in tools) |
| javascript/queen-attack | O:featherloop, O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-custom (out of budget: iterating) |
| javascript/react | O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode, P:opencode-stock, P:opencode-custom, P:pi | P:featherloop (out of budget: iterating), P:nanocode (out of budget: runaway response) |
| javascript/rectangles | O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:nanocode, P:pi | P:opencode-custom (out of budget: iterating) |
| javascript/resistor-color-trio | O:opencode-stock, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:featherloop (out of budget: runaway response) |
| javascript/rest-api | O:featherloop, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-stock (out of budget: iterating) |
| javascript/robot-name | O:featherloop, O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode | O:opencode-custom (out of budget: runaway response), P:pi (timeout: mostly in tools) |
| javascript/state-of-tic-tac-toe | O:featherloop, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-stock (out of budget: runaway response) |
| javascript/tournament | O:featherloop, O:opencode-stock, O:nanocode, P:featherloop, P:opencode-stock, P:pi | O:opencode-custom (out of budget: iterating), P:opencode-custom (out of budget: runaway response), P:nanocode (out of budget: iterating) |
| javascript/transpose | O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:nanocode, P:pi | P:opencode-custom (out of budget: runaway response) |
| javascript/two-bucket | O:featherloop, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:opencode-custom, P:nanocode, P:pi | O:opencode-stock (out of budget: iterating) |
| javascript/variable-length-quantity | O:featherloop, O:opencode-custom, P:featherloop, P:opencode-custom, P:pi | O:opencode-stock (out of budget: runaway response), O:nanocode (out of budget: runaway response), P:opencode-stock (out of budget: runaway response), P:nanocode (out of budget: runaway response) |
| javascript/zipper | O:featherloop, O:opencode-custom, O:nanocode, P:featherloop, P:opencode-stock, P:nanocode, P:pi | O:opencode-stock (out of budget: iterating), P:opencode-custom (out of budget: iterating) |
| javascript/zebra-puzzle | O:opencode-stock, P:opencode-stock | O:featherloop (out of budget: iterating), O:opencode-custom (out of budget: iterating), O:nanocode (out of budget: iterating), P:featherloop (out of budget: iterating), P:opencode-custom (out of budget: iterating), P:nanocode (out of budget: iterating), P:pi (out of budget: iterating) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| O:featherloop | 281 | 4.9k | 3% | 2 | 11k |
| O:opencode-stock | 214 | 6.8k | 5% | 2 | 12k |
| O:opencode-custom | 192 | 8.3k | 5% | 3 | 21k |
| O:nanocode | 226 | 5.7k | 4% | 3 | 13k |
| P:featherloop | 420 | 5.1k | 4% | 3 | 12k |
| P:opencode-stock | 404 | 5.5k | 5% | 2 | 17k |
| P:opencode-custom | 311 | 7.0k | 4% | 3 | 19k |
| P:nanocode | 300 | 5.4k | 3% | 3 | 11k |
| P:pi | 377 | 2.3k | 1% | 2 | 1.5k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| O:featherloop | 2.4 | 108 | 1.6k | 4% | 897 / 2.1k |
| O:opencode-stock | 2.4 | 102 | 795 | 7% | 970 / 3.7k |
| O:opencode-custom | 2.5 | 101 | 2.1k | 4% | 1.0k / 2.5k |
| O:nanocode | 2.2 | 90 | 895 | 2% | 1.1k / 3.3k |
| P:featherloop | 2.6 | 126 | 1.2k | 5% | 1.0k / 2.0k |
| P:opencode-stock | 2.7 | 133 | 1.2k | 2% | 1.1k / 3.0k |
| P:opencode-custom | 2.3 | 98 | 1.8k | 8% | 1.1k / 2.5k |
| P:nanocode | 2.2 | 97 | 1.2k | 3% | 1.0k / 2.6k |
| P:pi | 3.7 | 192 | 457 | 1% | 697 / 1.6k |

## Iterating

Tests passing at each test run, and what moved them: does a run build on what passes, or lose it? Fell: a test run passing fewer than the one before. Lost: runs whose last test run passed fewer than their best. Rewrites: whole-file writes to a file already written, once some tests passed. Cut: test commands piped through head or tail, which can hide the failures and the summary.

|  | runs with 2+ test runs | fell / run | lost | best − last, median | rewrites / run | cut test commands |
|---|---:|---:|---:|---:|---:|---:|
| O:featherloop | 37 | 0.5 | 1 | 26 | 0.3 | 204 of 272 (75%) |
| O:opencode-stock | 40 | 0.7 | 2 | 30 | 0.1 | 170 of 252 (67%) |
| O:opencode-custom | 47 | 0.4 | 3 | 8 | 0.1 | 204 of 260 (78%) |
| O:nanocode | 37 | 0.3 | 0 | 0 | 0.1 | 151 of 235 (64%) |
| P:featherloop | 42 | 0.4 | 3 | 1 | 0.3 | 219 of 268 (82%) |
| P:opencode-stock | 42 | 0.7 | 2 | 9 | 0.2 | 188 of 273 (69%) |
| P:opencode-custom | 45 | 0.3 | 2 | 29 | 0.1 | 190 of 235 (81%) |
| P:nanocode | 41 | 0.3 | 2 | 9 | 0.2 | 175 of 214 (82%) |
| P:pi | 40 | 0.9 | 1 | 30 | 0.5 | 337 of 451 (75%) |

## Repeats

Notes: shell results saying "[Same output as …]", the repeat sensor. Again: notes after which the model ran the same command again within its next 3 shell calls, still doing what didn't work. Mid-run: user messages after the task that aren't the harness's events (a nudge, if one runs).

|  | notes / run | runs with any | again | mid-run user messages / run |
|---|---:|---:|---:|---:|
| O:featherloop | 0.2 | 11 | 0 of 13 (0%) | 0.0 |
| O:opencode-stock | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| O:opencode-custom | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| O:nanocode | 0.0 | 0 | 0 of 0 (0%) | 9.8 |
| P:featherloop | 0.0 | 3 | 0 of 3 (0%) | 0.0 |
| P:opencode-stock | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| P:opencode-custom | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| P:nanocode | 0.0 | 0 | 0 of 0 (0%) | 9.7 |
| P:pi | 0.0 | 0 | 0 of 0 (0%) | 0.0 |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| O:featherloop | 8 | 0% | 0.7 |
| O:opencode-stock | 9 | 0% | 1.0 |
| O:opencode-custom | 10 | 0% | 1.1 |
| O:nanocode | 6 | 0% | 0.9 |
| P:featherloop | 2 | 0% | 0.6 |
| P:opencode-stock | 4 | 0% | 0.8 |
| P:opencode-custom | 5 | 0% | 0.9 |
| P:nanocode | 5 | 0% | 0.7 |
| P:pi | 3 | 0% | 0.3 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| O:featherloop | 0.05 | 1 | raw.githubusercontent.com 4 | python/go-counting: https://raw.githubusercontent.com/exercism/go-counting/main/.meta/reference.py<br>python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json<br>python/go-counting: https://raw.githubusercontent.com/exercism/reference-solutions/main/go/go-counting/.meta/reference.py<br>python/go-counting: https://raw.githubusercontent.com/exercism/reference-solutions/main/python/go-counting/.meta/reference.py |
| O:opencode-stock | 0.17 | 2 | raw.githubusercontent.com 8, api.github.com 6 | javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.tests/reference/go-counting.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/reference/go-counting.js<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/.meta<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/.meta?ref=main<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/tests?ref=main<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/proof.ci.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/.meta/reference/go_counting.py<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/git/blobs/bcd29aa175822e5d7a753ebc133b9dd7107ddee7<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/git/blobs/bcd29aa175822e5d7a753ebc133b9dd7107ddee7<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/go-counting.spec.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/tests.toml<br>javascript/rest-api: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rest-api/.meta/rest-api.reference.js<br>javascript/rest-api: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rest-api/rest-api.spec.js |
| O:opencode-custom | 0.33 | 5 | raw.githubusercontent.com 18, api.github.com 5, search: exercism go counting python reference solution territories flood fill owner 1, search: paasio MeteredFile MeteredSocket source code github madomako 1, search: exercism scale-generator reference solution flat sharp tonic determination 1, search: exercism javascript rational numbers solution expreal Math.pow 1 | python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting.py<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting_test.py<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/.docs/instructions.append.md<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting.py<br>python/paasio: https://raw.githubusercontent.com/madomako/paasio/master/paasio.py<br>python/paasio: https://raw.githubusercontent.com/madomako/paasio/main/paasio.py<br>python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/canonical-data.json<br>python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/description.md<br>python/scale-generator: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/scale-generator/reference/scale_generator.py<br>python/scale-generator: https://raw.githubusercontent.com/exercism/python/master/exercises/practice/scale-generator/reference/scale_generator.py<br>python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator/reference<br>python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator<br>python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/.meta/reference.py<br>python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator/.meta<br>python/scale-generator: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/scale-generator/.meta/example.py<br>python/sgf-parsing: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/sgf-parsing/canonical-data.json<br>javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/.docs/instructions.append.md<br>javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/rational-numbers.js<br>javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/.docs/instructions.append.md<br>javascript/rational-numbers: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/rational-numbers/solution<br>javascript/rational-numbers: https://api.github.com/repos/exercism/javascript/git/trees/main?recursive=1<br>javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/rational-numbers.spec.js |
| O:nanocode | 0.00 | 0 | – | – |
| P:featherloop | 0.04 | 2 | raw.githubusercontent.com 2, github.com 1 | python/dominoes: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/dominoes/canonical-data.json<br>python/rest-api: https://github.com/exercism/problem-specifications/tree/main/exercises/rest-api/canonical-data.json<br>python/rest-api: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/rest-api/canonical-data.json |
| P:opencode-stock | 0.13 | 4 | raw.githubusercontent.com 9, search: exercism go-counting python reference solution Board territory territories 1, search: Exercism JavaScript rational numbers expreal reference solution Math.pow round 1 | python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/tracks/python/go-counting/.docs/instructions.md<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/tracks/python/go-counting/go_counting.py<br>python/paasio: https://raw.githubusercontent.com/getmoto/paasio/main/paasio.py<br>python/paasio: https://raw.githubusercontent.com/getmoto/paasio/master/paasio.py<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/exemplar.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/go-counting.spec.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/master/exercises/practice/go-counting/.meta/exemplar.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/proof.ci.js |
| P:opencode-custom | 0.09 | 2 | raw.githubusercontent.com 5, search: python-paasio paasio.py MeteredFile super function source ionelmc 1, api.github.com 1 | python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json<br>python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json<br>python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json<br>python/paasio: https://raw.githubusercontent.com/ionelmc/python-paasio/master/paasio.py<br>python/paasio: https://raw.githubusercontent.com/ionelmc/python-paasio/main/paasio.py<br>python/paasio: https://api.github.com/repos/ionelmc/python-paasio/contents/paasio.py |
| P:nanocode | 0.00 | 0 | – | – |
| P:pi | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| O:opencode-stock | python/bowling | 7 | 3 | 51k | 4% | another tool result |
| O:featherloop | python/bowling | 3 | 7 | 112k | 82% | another tool result |
| O:opencode-custom | python/forth | 2 | 7 | 164k | 84% | another tool result |
| O:nanocode | python/paasio | 3 | 6 | 107k | 88% | another tool result |
| O:featherloop | python/react | 4 | 7 | 157k | 43% | another tool result |
| O:opencode-custom | python/react | 2 | 7 | 158k | 45% | another tool result |
| O:featherloop | python/sgf-parsing | 4 | 4 | 66k | 20% | failing tests |
| O:opencode-stock | python/sgf-parsing | 3 | 8 | 126k | 20% | another tool result |
| O:opencode-custom | python/sgf-parsing | 3 | 4 | 58k | 25% | another tool result |
| O:nanocode | python/sgf-parsing | 5 | 6 | 111k | 53% | another tool result |
| O:opencode-custom | python/two-bucket | 2 | 8 | 126k | 76% | another tool result |
| O:opencode-stock | python/wordy | 2 | 7 | 145k | 69% | another tool result |
| O:opencode-stock | javascript/bowling | 2 | 8 | 122k | 19% | another tool result |
| O:nanocode | javascript/bowling | 11 | 6 | 78k | 9% | another tool result |
| O:nanocode | javascript/connect | 6 | 4 | 66k | 4% | another tool result |
| O:featherloop | javascript/forth | 2 | 8 | 128k | 70% | another tool result |
| O:nanocode | javascript/forth | 2 | 7 | 145k | 12% | another tool result |
| O:featherloop | javascript/go-counting | 3 | 7 | 120k | 69% | another tool result |
| O:opencode-custom | javascript/go-counting | 2 | 8 | 125k | 11% | another tool result |
| O:featherloop | javascript/palindrome-products | 2 | 7 | 108k | 13% | another tool result |
| O:featherloop | javascript/resistor-color-trio | 31 | 4 | 90k | 73% | failing tests |
| O:opencode-custom | javascript/robot-name | 25 | 4 | 67k | 13% | another tool result |
| O:opencode-stock | javascript/state-of-tic-tac-toe | 2 | 7 | 126k | 82% | another tool result |
| O:opencode-stock | javascript/variable-length-quantity | 2 | 7 | 80k | 5% | another tool result |
| O:nanocode | javascript/variable-length-quantity | 3 | 8 | 87k | 8% | another tool result |
| P:opencode-custom | python/bowling | 4 | 6 | 113k | 10% | failing tests |
| P:featherloop | python/paasio | 11 | 3 | 83k | 44% | another tool result |
| P:pi | python/paasio | 2 | 6 | 152k | 85% | another tool result |
| P:nanocode | python/paasio | 4 | 6 | 136k | 80% | another tool result |
| P:featherloop | python/sgf-parsing | 2 | 6 | 136k | 61% | another tool result |
| P:nanocode | python/sgf-parsing | 2 | 7 | 136k | 16% | another tool result |
| P:pi | python/sgf-parsing | 2 | 7 | 139k | 10% | another tool result |
| P:opencode-stock | javascript/bowling | 3 | 6 | 136k | 76% | another tool result |
| P:opencode-custom | javascript/complex-numbers | 21 | 5 | 126k | 97% | failing tests |
| P:nanocode | javascript/react | 4 | 6 | 177k | 83% | another tool result |
| P:opencode-custom | javascript/transpose | 2 | 5 | 147k | 71% | another tool result |
| P:opencode-custom | javascript/tournament | 3 | 8 | 108k | 91% | another tool result |
| P:opencode-stock | javascript/variable-length-quantity | 3 | 6 | 83k | 2% | another tool result |
| P:nanocode | javascript/variable-length-quantity | 2 | 6 | 86k | 4% | another tool result |
