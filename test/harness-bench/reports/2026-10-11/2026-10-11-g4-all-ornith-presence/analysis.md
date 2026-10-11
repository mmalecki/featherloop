
## Failure modes

Runs by how they ended. API-error runs are left out of everything below; rerun them first.

|  | featherloop | opencode-stock | opencode-custom | nanocode | pi |
|---|---:|---:|---:|---:|---:|
| out of budget: iterating | 6 | 7 | 9 | 4 | 5 |
| out of budget: runaway response | 2 | 2 | 4 | 4 | 2 |
| passed | 73 | 73 | 68 | 69 | 73 |
| passed, then out of budget | 1 | 0 | 1 | 1 | 0 |
| passed, then timed out | 0 | 0 | 0 | 0 | 1 |
| timeout: mostly in tools | 0 | 0 | 0 | 3 | 1 |

## Paired comparisons

Cases both ran cleanly, where exactly one passed: wins each way, and an exact two-sided sign test.

|  | wins | p |
|---|---:|---:|
| featherloop vs opencode-stock | 4 / 3 | 1.00 |
| featherloop vs opencode-custom | 8 / 3 | 0.23 |
| featherloop vs nanocode | 5 / 2 | 0.45 |
| featherloop vs pi | 3 / 3 | 1.00 |
| opencode-stock vs opencode-custom | 8 / 4 | 0.39 |
| opencode-stock vs nanocode | 5 / 3 | 0.73 |
| opencode-stock vs pi | 3 / 4 | 1.00 |
| opencode-custom vs nanocode | 6 / 8 | 0.79 |
| opencode-custom vs pi | 3 / 8 | 0.23 |
| nanocode vs pi | 4 / 7 | 0.55 |

## Test score

The share of its tests a run passed at the end, averaged: partial credit, so a run that gets 29 of 31 counts for more than one that gets 3. Differences between columns: a stratified permutation test, shuffling runs between the two columns within each case, so case mix cancels out.

|  | runs | mean score |
|---|---:|---:|
| featherloop | 82 | 94% |
| opencode-stock | 82 | 91% |
| opencode-custom | 82 | 91% |
| nanocode | 81 | 90% |
| pi | 82 | 94% |
|  | second minus first | p |
|---|---:|---:|
| featherloop vs opencode-stock | -2.8 points | 0.353 |
| featherloop vs opencode-custom | -2.9 points | 0.284 |
| featherloop vs nanocode | -3.6 points | 0.212 |
| featherloop vs pi | +0.4 points | 0.813 |
| opencode-stock vs opencode-custom | -0.1 points | 0.979 |
| opencode-stock vs nanocode | -0.8 points | 0.804 |
| opencode-stock vs pi | +3.3 points | 0.311 |
| opencode-custom vs nanocode | -0.7 points | 0.840 |
| opencode-custom vs pi | +3.4 points | 0.270 |
| nanocode vs pi | +4.1 points | 0.186 |

## Split cases

Cases some columns passed and others failed, with how each failure ended.

| case | passed | failed |
|---|---:|---:|
| python/go-counting | featherloop, opencode-stock, opencode-custom, pi | nanocode (out of budget: iterating) |
| python/paasio | opencode-custom | featherloop (out of budget: runaway response), opencode-stock (out of budget: iterating), nanocode (out of budget: runaway response), pi (out of budget: runaway response) |
| python/rest-api | featherloop, opencode-stock, nanocode, pi | opencode-custom (out of budget: iterating) |
| python/zebra-puzzle | nanocode | featherloop (out of budget: iterating), opencode-stock (out of budget: iterating), opencode-custom (out of budget: iterating), pi (out of budget: iterating) |
| javascript/alphametics | featherloop, opencode-stock, opencode-custom, pi | nanocode (timeout: mostly in tools) |
| javascript/bowling | featherloop, nanocode, pi | opencode-stock (out of budget: runaway response), opencode-custom (out of budget: iterating) |
| javascript/complex-numbers | featherloop, opencode-stock, nanocode | opencode-custom (out of budget: runaway response), pi (out of budget: iterating) |
| javascript/connect | opencode-stock, nanocode, pi | featherloop (out of budget: iterating), opencode-custom (out of budget: iterating) |
| javascript/forth | featherloop, opencode-custom, nanocode | opencode-stock (out of budget: iterating), pi (out of budget: iterating) |
| javascript/go-counting | opencode-custom, pi | featherloop (out of budget: iterating), opencode-stock (out of budget: iterating), nanocode (out of budget: iterating) |
| javascript/parallel-letter-frequency | featherloop, pi | opencode-stock (out of budget: iterating), opencode-custom (out of budget: iterating), nanocode (timeout: mostly in tools) |
| javascript/react | opencode-stock, opencode-custom, pi | featherloop (out of budget: iterating), nanocode (out of budget: runaway response) |
| javascript/rectangles | featherloop, opencode-stock, nanocode, pi | opencode-custom (out of budget: iterating) |
| javascript/robot-name | featherloop, opencode-stock, opencode-custom, nanocode | pi (timeout: mostly in tools) |
| javascript/tournament | featherloop, opencode-stock, pi | opencode-custom (out of budget: runaway response), nanocode (out of budget: iterating) |
| javascript/transpose | featherloop, opencode-stock, nanocode, pi | opencode-custom (out of budget: runaway response) |
| javascript/variable-length-quantity | featherloop, opencode-custom, pi | opencode-stock (out of budget: runaway response), nanocode (out of budget: runaway response) |
| javascript/zebra-puzzle | opencode-stock | featherloop (out of budget: iterating), opencode-custom (out of budget: iterating), nanocode (out of budget: iterating), pi (out of budget: iterating) |
| javascript/zipper | featherloop, opencode-stock, nanocode, pi | opencode-custom (out of budget: iterating) |

## Reasoning

Characters of reasoning per finished response, and before the first edit: how much a harness has the model think, and how early.

|  | median / response | p90 | over 20k | turns to first edit | reasoning before it (median) |
|---|---:|---:|---:|---:|---:|
| featherloop | 420 | 5.1k | 4% | 3 | 12k |
| opencode-stock | 404 | 5.5k | 5% | 2 | 17k |
| opencode-custom | 311 | 7.0k | 4% | 3 | 19k |
| nanocode | 300 | 5.4k | 3% | 3 | 11k |
| pi | 377 | 2.3k | 1% | 2 | 1.5k |

## After failing tests

The response right after a tool result with failing tests: does the model act, or deliberate?

|  | test runs / run | failing results | next response: median reasoning | over 20k | test output chars (median / p90) |
|---|---:|---:|---:|---:|---:|
| featherloop | 2.6 | 126 | 1.2k | 5% | 1.0k / 2.0k |
| opencode-stock | 2.7 | 133 | 1.2k | 2% | 1.1k / 3.0k |
| opencode-custom | 2.3 | 98 | 1.8k | 8% | 1.1k / 2.5k |
| nanocode | 2.2 | 97 | 1.2k | 3% | 1.0k / 2.6k |
| pi | 3.7 | 192 | 457 | 1% | 697 / 1.6k |

## Iterating

Tests passing at each test run, and what moved them: does a run build on what passes, or lose it? Fell: a test run passing fewer than the one before. Lost: runs whose last test run passed fewer than their best. Rewrites: whole-file writes to a file already written, once some tests passed. Cut: test commands piped through head or tail, which can hide the failures and the summary.

|  | runs with 2+ test runs | fell / run | lost | best − last, median | rewrites / run | cut test commands |
|---|---:|---:|---:|---:|---:|---:|
| featherloop | 42 | 0.4 | 3 | 1 | 0.3 | 219 of 268 (82%) |
| opencode-stock | 42 | 0.7 | 2 | 9 | 0.2 | 188 of 273 (69%) |
| opencode-custom | 45 | 0.3 | 2 | 29 | 0.1 | 190 of 235 (81%) |
| nanocode | 41 | 0.3 | 2 | 9 | 0.2 | 175 of 214 (82%) |
| pi | 40 | 0.9 | 1 | 30 | 0.5 | 337 of 451 (75%) |

## Repeats

Notes: shell results saying "[Same output as …]", the repeat sensor. Again: notes after which the model ran the same command again within its next 3 shell calls, still doing what didn't work. Mid-run: user messages after the task that aren't the harness's events (a nudge, if one runs).

|  | notes / run | runs with any | again | mid-run user messages / run |
|---|---:|---:|---:|---:|
| featherloop | 0.0 | 3 | 0 of 3 (0%) | 0.0 |
| opencode-stock | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| opencode-custom | 0.0 | 0 | 0 of 0 (0%) | 0.0 |
| nanocode | 0.0 | 0 | 0 of 0 (0%) | 9.7 |
| pi | 0.0 | 0 | 0 of 0 (0%) | 0.0 |

## Long responses

Responses over 5 minutes, and the share of timed-out runs' time they took.

|  | count | share of timed-out time | longest finished response, median (min) |
|---|---:|---:|---:|
| featherloop | 2 | 0% | 0.6 |
| opencode-stock | 4 | 0% | 0.8 |
| opencode-custom | 5 | 0% | 0.9 |
| nanocode | 5 | 0% | 0.7 |
| pi | 3 | 0% | 0.3 |

## Web use

Fetches and searches, and URLs in shell commands. Solution sources are hosts where solutions to the cases are published: check what was fetched.

|  | fetches / run | runs with any | hosts | from solution sources |
|---|---:|---:|---:|---:|
| featherloop | 0.04 | 2 | raw.githubusercontent.com 2, github.com 1 | python/dominoes: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/dominoes/canonical-data.json<br>python/rest-api: https://github.com/exercism/problem-specifications/tree/main/exercises/rest-api/canonical-data.json<br>python/rest-api: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/rest-api/canonical-data.json |
| opencode-stock | 0.13 | 4 | raw.githubusercontent.com 9, search: exercism go-counting python reference solution Board territory territories 1, search: Exercism JavaScript rational numbers expreal reference solution Math.pow round 1 | python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/tracks/python/go-counting/.docs/instructions.md<br>python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/tracks/python/go-counting/go_counting.py<br>python/paasio: https://raw.githubusercontent.com/getmoto/paasio/main/paasio.py<br>python/paasio: https://raw.githubusercontent.com/getmoto/paasio/master/paasio.py<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/exemplar.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/go-counting.spec.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/master/exercises/practice/go-counting/.meta/exemplar.js<br>javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/proof.ci.js |
| opencode-custom | 0.09 | 2 | raw.githubusercontent.com 5, search: python-paasio paasio.py MeteredFile super function source ionelmc 1, api.github.com 1 | python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json<br>python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json<br>python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json<br>python/paasio: https://raw.githubusercontent.com/ionelmc/python-paasio/master/paasio.py<br>python/paasio: https://raw.githubusercontent.com/ionelmc/python-paasio/main/paasio.py<br>python/paasio: https://api.github.com/repos/ionelmc/python-paasio/contents/paasio.py |
| nanocode | 0.00 | 0 | – | – |
| pi | 0.00 | 0 | – | – |

## Possibly hardcoded

Short solutions returning literals from the tests (guards.ts): look before trusting the pass.

(none)

## Runaway responses

Timeouts and budget stops that ended inside one response. Repeated: the share of its reasoning lines (over 20 characters) that repeat an earlier one.

| column | case | turn | minutes | reasoning | repeated | after |
|---|---:|---:|---:|---:|---:|---:|
| opencode-custom | python/bowling | 4 | 6 | 113k | 10% | failing tests |
| featherloop | python/paasio | 11 | 3 | 83k | 44% | another tool result |
| pi | python/paasio | 2 | 6 | 152k | 85% | another tool result |
| nanocode | python/paasio | 4 | 6 | 136k | 80% | another tool result |
| featherloop | python/sgf-parsing | 2 | 6 | 136k | 61% | another tool result |
| nanocode | python/sgf-parsing | 2 | 7 | 136k | 16% | another tool result |
| pi | python/sgf-parsing | 2 | 7 | 139k | 10% | another tool result |
| opencode-stock | javascript/bowling | 3 | 6 | 136k | 76% | another tool result |
| opencode-custom | javascript/complex-numbers | 21 | 5 | 126k | 97% | failing tests |
| nanocode | javascript/react | 4 | 6 | 177k | 83% | another tool result |
| opencode-custom | javascript/transpose | 2 | 5 | 147k | 71% | another tool result |
| opencode-custom | javascript/tournament | 3 | 8 | 108k | 91% | another tool result |
| opencode-stock | javascript/variable-length-quantity | 3 | 6 | 83k | 2% | another tool result |
| nanocode | javascript/variable-length-quantity | 2 | 6 | 86k | 4% | another tool result |
