
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | Q:featherloop | Q:opencode-stock | Q:opencode-custom | Q:nanocode | O:featherloop | O:opencode-stock | O:opencode-custom | O:nanocode |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| out of budget: iterating | 11 | 13 | 11 | 14 | 2 | 7 | 9 | 5 |
| out of budget: runaway response | 0 | 0 | 0 | 0 | 7 | 6 | 6 | 6 |
| passed | 71 | 67 | 71 | 67 | 70 | 68 | 66 | 70 |
| passed, then out of budget | 0 | 0 | 0 | 0 | 3 | 1 | 1 | 1 |
| stopped: tests failing | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| Q:featherloop vs Q:opencode-stock | 7 / 3 | 0.34 |
| Q:featherloop vs Q:opencode-custom | 4 / 4 | 1.00 |
| Q:featherloop vs Q:nanocode | 5 / 1 | 0.22 |
| Q:featherloop vs O:featherloop | 5 / 7 | 0.77 |
| Q:featherloop vs O:opencode-stock | 9 / 7 | 0.80 |
| Q:featherloop vs O:opencode-custom | 9 / 5 | 0.42 |
| Q:featherloop vs O:nanocode | 6 / 6 | 1.00 |
| Q:opencode-stock vs Q:opencode-custom | 2 / 6 | 0.29 |
| Q:opencode-stock vs Q:nanocode | 6 / 6 | 1.00 |
| Q:opencode-stock vs O:featherloop | 3 / 9 | 0.15 |
| Q:opencode-stock vs O:opencode-stock | 9 / 11 | 0.82 |
| Q:opencode-stock vs O:opencode-custom | 6 / 6 | 1.00 |
| Q:opencode-stock vs O:nanocode | 4 / 8 | 0.39 |
| Q:opencode-custom vs Q:nanocode | 8 / 4 | 0.39 |
| Q:opencode-custom vs O:featherloop | 4 / 6 | 0.75 |
| Q:opencode-custom vs O:opencode-stock | 9 / 7 | 0.80 |
| Q:opencode-custom vs O:opencode-custom | 9 / 5 | 0.42 |
| Q:opencode-custom vs O:nanocode | 5 / 5 | 1.00 |
| Q:nanocode vs O:featherloop | 5 / 11 | 0.21 |
| Q:nanocode vs O:opencode-stock | 8 / 10 | 0.81 |
| Q:nanocode vs O:opencode-custom | 8 / 8 | 1.00 |
| Q:nanocode vs O:nanocode | 6 / 10 | 0.45 |
| O:featherloop vs O:opencode-stock | 10 / 6 | 0.45 |
| O:featherloop vs O:opencode-custom | 9 / 3 | 0.15 |
| O:featherloop vs O:nanocode | 6 / 4 | 0.75 |
| O:opencode-stock vs O:opencode-custom | 11 / 9 | 0.82 |
| O:opencode-stock vs O:nanocode | 6 / 8 | 0.79 |
| O:opencode-custom vs O:nanocode | 6 / 10 | 0.45 |

## Test score

The share of its tests a run passed at the end, averaged: partial credit, so a run that gets 29 of 31 counts for more than one that gets 3. Differences between columns: a stratified permutation test, shuffling runs between the two columns within each case, so case mix cancels out.

|  | runs | mean score |
|---|---:|---:|
| Q:featherloop | 82 | 94% |
| Q:opencode-stock | 82 | 91% |
| Q:opencode-custom | 82 | 93% |
| Q:nanocode | 82 | 96% |
| O:featherloop | 82 | 91% |
| O:opencode-stock | 82 | 88% |
| O:opencode-custom | 82 | 87% |
| O:nanocode | 82 | 89% |
|  | second minus first | p |
|---|---:|---:|
| Q:featherloop vs Q:opencode-stock | -3.6 points | 0.160 |
| Q:featherloop vs Q:opencode-custom | -1.0 points | 0.655 |
| Q:featherloop vs Q:nanocode | +1.7 points | 0.293 |
| Q:featherloop vs O:featherloop | -3.5 points | 0.248 |
| Q:featherloop vs O:opencode-stock | -5.9 points | 0.084 |
| Q:featherloop vs O:opencode-custom | -7.7 points | 0.016 |
| Q:featherloop vs O:nanocode | -5.4 points | 0.134 |
| Q:opencode-stock vs Q:opencode-custom | +2.6 points | 0.196 |
| Q:opencode-stock vs Q:nanocode | +5.3 points | 0.054 |
| Q:opencode-stock vs O:featherloop | +0.1 points | 0.985 |
| Q:opencode-stock vs O:opencode-stock | -2.4 points | 0.563 |
| Q:opencode-stock vs O:opencode-custom | -4.2 points | 0.274 |
| Q:opencode-stock vs O:nanocode | -1.8 points | 0.603 |
| Q:opencode-custom vs Q:nanocode | +2.7 points | 0.273 |
| Q:opencode-custom vs O:featherloop | -2.5 points | 0.407 |
| Q:opencode-custom vs O:opencode-stock | -5.0 points | 0.159 |
| Q:opencode-custom vs O:opencode-custom | -6.7 points | 0.055 |
| Q:opencode-custom vs O:nanocode | -4.4 points | 0.171 |
| Q:nanocode vs O:featherloop | -5.2 points | 0.099 |
| Q:nanocode vs O:opencode-stock | -7.6 points | 0.041 |
| Q:nanocode vs O:opencode-custom | -9.4 points | 0.003 |
| Q:nanocode vs O:nanocode | -7.1 points | 0.053 |
| O:featherloop vs O:opencode-stock | -2.5 points | 0.579 |
| O:featherloop vs O:opencode-custom | -4.2 points | 0.241 |
| O:featherloop vs O:nanocode | -1.9 points | 0.625 |
| O:opencode-stock vs O:opencode-custom | -1.8 points | 0.682 |
| O:opencode-stock vs O:nanocode | +0.5 points | 0.881 |
| O:opencode-custom vs O:nanocode | +2.3 points | 0.604 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/book-store | Q:featherloop, Q:nanocode, O:featherloop, O:opencode-stock, O:opencode-custom | Q:opencode-stock (out of budget: iterating), Q:opencode-custom (out of budget: iterating), O:nanocode (out of budget: iterating) |
| python/connect | O:featherloop, O:opencode-stock, O:nanocode | Q:featherloop (out of budget: iterating), Q:opencode-stock (out of budget: iterating), Q:opencode-custom (out of budget: iterating), Q:nanocode (out of budget: iterating), O:opencode-custom (out of budget: iterating) |
| python/go-counting | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:nanocode | O:opencode-custom (out of budget: iterating) |
| python/paasio | Q:opencode-stock, Q:opencode-custom, O:featherloop | Q:featherloop (out of budget: iterating), Q:nanocode (out of budget: iterating), O:opencode-stock (out of budget: iterating), O:opencode-custom (out of budget: iterating), O:nanocode (out of budget: runaway response) |
| python/forth | Q:featherloop, Q:opencode-custom, O:featherloop, O:opencode-stock, O:nanocode | Q:opencode-stock (out of budget: iterating), Q:nanocode (out of budget: iterating), O:opencode-custom (out of budget: runaway response) |
| python/pov | Q:opencode-custom, O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode | Q:featherloop (out of budget: iterating), Q:opencode-stock (out of budget: iterating), Q:nanocode (out of budget: iterating) |
| python/rest-api | Q:featherloop, Q:opencode-stock, Q:nanocode, O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode | Q:opencode-custom (out of budget: iterating) |
| python/react | O:opencode-stock, O:nanocode | Q:featherloop (out of budget: iterating), Q:opencode-stock (out of budget: iterating), Q:opencode-custom (out of budget: iterating), Q:nanocode (out of budget: iterating), O:featherloop (out of budget: runaway response), O:opencode-custom (out of budget: runaway response) |
| python/scale-generator | Q:featherloop, Q:opencode-stock, Q:opencode-custom, O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode | Q:nanocode (out of budget: iterating) |
| python/transpose | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-custom, O:nanocode | O:opencode-stock (out of budget: iterating) |
| python/two-bucket | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:nanocode | O:opencode-custom (out of budget: runaway response) |
| python/zebra-puzzle | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:opencode-custom | O:nanocode (out of budget: iterating) |
| python/wordy | Q:featherloop, Q:opencode-stock, Q:nanocode, O:featherloop, O:opencode-custom, O:nanocode | Q:opencode-custom (out of budget: iterating), O:opencode-stock (out of budget: runaway response) |
| python/zipper | Q:featherloop, Q:opencode-stock, Q:opencode-custom, O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode | Q:nanocode (out of budget: iterating) |
| javascript/alphametics | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:opencode-custom | O:nanocode (out of budget: iterating) |
| javascript/book-store | Q:featherloop, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:nanocode | Q:opencode-stock (out of budget: iterating), O:opencode-custom (out of budget: iterating) |
| javascript/complex-numbers | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-custom, O:nanocode | O:opencode-stock (out of budget: iterating) |
| javascript/connect | O:featherloop, O:opencode-stock, O:opencode-custom | Q:featherloop (out of budget: iterating), Q:opencode-stock (out of budget: iterating), Q:opencode-custom (out of budget: iterating), Q:nanocode (out of budget: iterating), O:nanocode (out of budget: runaway response) |
| javascript/go-counting | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:opencode-stock, O:nanocode | O:featherloop (out of budget: runaway response), O:opencode-custom (out of budget: runaway response) |
| javascript/forth | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:opencode-stock, O:opencode-custom | O:featherloop (out of budget: runaway response), O:nanocode (out of budget: runaway response) |
| javascript/ocr-numbers | Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode | Q:featherloop (out of budget: iterating) |
| javascript/palindrome-products | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:opencode-stock, O:opencode-custom, O:nanocode | O:featherloop (out of budget: runaway response) |
| javascript/phone-number | Q:featherloop, Q:opencode-stock, Q:opencode-custom, O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode | Q:nanocode (out of budget: iterating) |
| javascript/parallel-letter-frequency | Q:featherloop, Q:opencode-stock, Q:opencode-custom, O:featherloop, O:opencode-custom, O:nanocode | Q:nanocode (stopped: tests failing), O:opencode-stock (out of budget: iterating) |
| javascript/queen-attack | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:nanocode | O:opencode-custom (out of budget: iterating) |
| javascript/resistor-color-trio | Q:featherloop, Q:opencode-custom, Q:nanocode, O:opencode-stock, O:opencode-custom, O:nanocode | Q:opencode-stock (stopped: tests failing), O:featherloop (out of budget: runaway response) |
| javascript/react | O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode | Q:featherloop (out of budget: iterating), Q:opencode-stock (out of budget: iterating), Q:opencode-custom (out of budget: iterating), Q:nanocode (out of budget: iterating) |
| javascript/robot-name | Q:featherloop, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:nanocode | Q:opencode-stock (stopped: tests failing), O:opencode-custom (out of budget: runaway response) |
| javascript/rest-api | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-custom, O:nanocode | O:opencode-stock (out of budget: iterating) |
| javascript/state-of-tic-tac-toe | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-custom, O:nanocode | O:opencode-stock (out of budget: runaway response) |
| javascript/tournament | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-stock, O:nanocode | O:opencode-custom (out of budget: iterating) |
| javascript/transpose | Q:opencode-stock, Q:opencode-custom, O:featherloop, O:opencode-stock, O:opencode-custom, O:nanocode | Q:featherloop (out of budget: iterating), Q:nanocode (out of budget: iterating) |
| javascript/two-bucket | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-custom, O:nanocode | O:opencode-stock (out of budget: iterating) |
| javascript/variable-length-quantity | Q:featherloop, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-custom | Q:opencode-stock (out of budget: iterating), O:opencode-stock (out of budget: runaway response), O:nanocode (out of budget: runaway response) |
| javascript/zipper | Q:featherloop, Q:opencode-stock, Q:opencode-custom, Q:nanocode, O:featherloop, O:opencode-custom, O:nanocode | O:opencode-stock (out of budget: iterating) |
| javascript/zebra-puzzle | Q:featherloop, Q:nanocode, O:opencode-stock | Q:opencode-stock (out of budget: iterating), Q:opencode-custom (out of budget: iterating), O:featherloop (out of budget: iterating), O:opencode-custom (out of budget: iterating), O:nanocode (out of budget: iterating) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| Q:featherloop | 366 | 2.7k | 0% | 2 | 2.5k |
| Q:opencode-stock | 331 | 2.9k | 0% | 3 | 3.0k |
| Q:opencode-custom | 146 | 2.7k | 0% | 3 | 2.8k |
| Q:nanocode | 370 | 2.4k | 0% | 3 | 2.8k |
| O:featherloop | 281 | 4.9k | 3% | 2 | 11k |
| O:opencode-stock | 214 | 6.8k | 5% | 2 | 12k |
| O:opencode-custom | 192 | 8.3k | 5% | 3 | 21k |
| O:nanocode | 226 | 5.7k | 4% | 3 | 13k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| Q:featherloop | 3.3 | 185 | 1.6k | 1% | 2.4k / 13k |
| Q:opencode-stock | 3.5 | 209 | 1.7k | 1% | 3.4k / 13k |
| Q:opencode-custom | 3.6 | 213 | 1.5k | 2% | 3.0k / 15k |
| Q:nanocode | 3.9 | 235 | 996 | 0% | 2.5k / 14k |
| O:featherloop | 2.4 | 108 | 1.6k | 4% | 897 / 2.1k |
| O:opencode-stock | 2.4 | 102 | 795 | 7% | 970 / 3.7k |
| O:opencode-custom | 2.5 | 101 | 2.1k | 4% | 1.0k / 2.5k |
| O:nanocode | 2.2 | 90 | 895 | 2% | 1.1k / 3.3k |

## Iterating

Tests passing at each test run, and what moved them: does a run build on what passes, or lose it? Fell: a test run passing fewer than the one before. Lost: runs whose last test run passed fewer than their best. Rewrites: whole-file writes to a file already written, once some tests passed. Cut: test commands piped through head or tail, which can hide the failures and the summary.

|  | runs with 2+ test runs | fell / run | lost | best − last, median | rewrites / run | cut test commands |
|---|---:|---:|---:|---:|---:|---:|
| Q:featherloop | 64 | 1.1 | 5 | 5 | 5.3 | 240 of 491 (49%) |
| Q:opencode-stock | 63 | 0.7 | 9 | 6 | 2.0 | 150 of 410 (37%) |
| Q:opencode-custom | 64 | 0.8 | 4 | 1 | 2.2 | 148 of 412 (36%) |
| Q:nanocode | 67 | 0.8 | 7 | 7 | 4.2 | 143 of 438 (33%) |
| O:featherloop | 37 | 0.5 | 1 | 26 | 0.3 | 204 of 272 (75%) |
| O:opencode-stock | 40 | 0.7 | 2 | 30 | 0.1 | 170 of 252 (67%) |
| O:opencode-custom | 47 | 0.4 | 3 | 8 | 0.1 | 204 of 260 (78%) |
| O:nanocode | 37 | 0.3 | 0 | 0 | 0.1 | 151 of 235 (64%) |

## Repeats

Notes: shell results saying "[Same output as …]", the repeat sensor. Again: notes after which the model ran the same command again within its next 3 shell calls, still doing what didn't work. Mid-run: user messages after the task that aren't the harness's events (a nudge, if one runs).

|  | notes / run | runs with any | again | mid-run user messages / run |
|---|---:|---:|---:|---:|
| Q:featherloop | 0.6 | 14 | 28 of 49 (57%) | 0.0 |
| Q:opencode-stock | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| Q:opencode-custom | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| Q:nanocode | 0.0 | 0 | 0 of 0 (0%) | 19.4 |
| O:featherloop | 0.2 | 11 | 0 of 13 (0%) | 0.0 |
| O:opencode-stock | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| O:opencode-custom | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| O:nanocode | 0.0 | 0 | 0 of 0 (0%) | 9.8 |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| Q:featherloop | 0 | 0% | 0.4 |
| Q:opencode-stock | 0 | 0% | 0.4 |
| Q:opencode-custom | 0 | 0% | 0.4 |
| Q:nanocode | 0 | 0% | 0.4 |
| O:featherloop | 8 | 0% | 0.7 |
| O:opencode-stock | 9 | 0% | 1.0 |
| O:opencode-custom | 10 | 0% | 1.1 |
| O:nanocode | 6 | 0% | 0.9 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| Q:featherloop | 0.00 | 0 | – | – |
| Q:opencode-stock | 0.02 | 1 | github.com 1, raw.githubusercontent.com 1 | python/zebra-puzzle: https://github.com/exercism/problem-specifications/blob/main/exercises/zebra-puzzle/canonical-data.json<br>python/zebra-puzzle: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/zebra-puzzle/canonical-data.json |
| Q:opencode-custom | 0.02 | 1 | en.wikipedia.org 1, raw.githubusercontent.com 1 | javascript/variable-length-quantity: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/variable-length-quantity/variable-length-quantity.spec.js |
| Q:nanocode | 0.00 | 0 | – | – |
| O:featherloop | 0.05 | 1 | raw.githubusercontent.com 4 | python/go-counting: https://raw.githubusercontent.com/exercism/go-counting/main/.meta/reference.py<br>python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json<br>python/go-counting: https://raw.githubusercontent.com/exercism/reference-solutions/main/go/go-counting/.meta/reference.py<br>python/go-counting: https://raw.githubusercontent.com/exercism/reference-solutions/main/python/go-counting/.meta/reference.py |
| O:opencode-stock | 0.17 | 2 | raw.githubusercontent.com 8, api.github.com 6 | javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.tests/reference/go-counting.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/reference/go-counting.js<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/.meta<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/.meta?ref=main<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/tests?ref=main<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/proof.ci.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/.meta/reference/go_counting.py<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/git/blobs/bcd29aa175822e5d7a753ebc133b9dd7107ddee7<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/git/blobs/bcd29aa175822e5d7a753ebc133b9dd7107ddee7<br>javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/go-counting.spec.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/tests.toml<br>javascript/rest-api: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rest-api/.meta/rest-api.reference.js<br>javascript/rest-api: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rest-api/rest-api.spec.js |
| O:opencode-custom | 0.33 | 5 | raw.githubusercontent.com 18, api.github.com 5, search: exercism go counting python reference solution territories flood fill owner 1, search: paasio MeteredFile MeteredSocket source code github madomako 1, search: exercism scale-generator reference solution flat sharp tonic determination 1, search: exercism javascript rational numbers solution expreal Math.pow 1 | python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting.py<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting_test.py<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/.docs/instructions.append.md<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting.py<br>python/paasio: https://raw.githubusercontent.com/madomako/paasio/master/paasio.py<br>python/paasio: https://raw.githubusercontent.com/madomako/paasio/main/paasio.py<br>python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/canonical-data.json<br>python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/description.md<br>python/scale-generator: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/scale-generator/reference/scale_generator.py<br>python/scale-generator: https://raw.githubusercontent.com/exercism/python/master/exercises/practice/scale-generator/reference/scale_generator.py<br>python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator/reference<br>python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator<br>python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/.meta/reference.py<br>python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator/.meta<br>python/scale-generator: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/scale-generator/.meta/example.py<br>python/sgf-parsing: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/sgf-parsing/canonical-data.json<br>javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/.docs/instructions.append.md<br>javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/rational-numbers.js<br>javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/.docs/instructions.append.md<br>javascript/rational-numbers: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/rational-numbers/solution<br>javascript/rational-numbers: https://api.github.com/repos/exercism/javascript/git/trees/main?recursive=1<br>javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/rational-numbers.spec.js |
| O:nanocode | 0.00 | 0 | – | – |

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
