# Harness bench

Model: ornith-ai/Ornith-1.5-9B (Ornith-1.5-9B-Q5_K_M.gguf), llama.cpp b11429-d81235049, 5 slots.
Bench model ornith-1.5-9b. 82 cases × 1 reps, up to 3 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-11T18:24:21.585Z.
Versions: featherloop 9ec374a, opencode-stock opencode v2.0.26, opencode-custom opencode v2.0.26, nanocode b009d3d, pi 1.1.0.

## Harnesses

- **featherloop** 9ec374a: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.
- **opencode-stock** opencode v2.0.26: opencode with only the provider configured; config: harnesses/opencode-stock. title agent off (it takes a server slot per run).
- **opencode-custom** opencode v2.0.26: opencode with the user's agents for smaller models; config: harnesses/opencode-custom. title agent off (it takes a server slot per run); websearch off (it needs a key; the cases are offline).
- **nanocode** b009d3d: github.com/1rgs/nanocode at b009d3d, unmodified, driven by harnesses/nanocode/driver.py. max_tokens 262144 (the model's output limit) in place of its 8192.
- **pi** 1.1.0: Pi (@earendil-works/pi-coding-agent@1.1.0), headless (--mode json), provider only. --mode json; no other flags: headless, it asks for no approvals, and keeps its session in the run's home; the model without `reasoning` (Pi's default for a model it doesn't know): no thinking controls sent, whatever its thinking level; max_completion_tokens its own: the model's output limit, less the context in use; it reads AGENTS.md and CLAUDE.md from the workspace and above (none).

## Results

| | featherloop | opencode-stock | opencode-custom | nanocode | pi |
|---|---:|---:|---:|---:|---:|
| **Passed** | **74/82 (90%)** | **73/82 (89%)** | **69/82 (84%)** | **70/81 (86%)** | **74/82 (90%)** |
| 95% interval | 82%–95% | 80%–94% | 75%–90% | 77%–92% | 82%–95% |
| ↳ python | 30/34 | 30/34 | 30/34 | 29/33 | 30/34 |
| ↳ javascript | 44/48 | 43/48 | 39/48 | 41/48 | 44/48 |
| Tests passed (partial credit) | 94% | 91% | 91% | 90% | 94% |
| Timeouts / crashes | 0 / 0 | 0 / 2 | 0 / 1 | 3 / 0 | 2 / 0 |
| Out of output budget | 9 | 9 | 14 | 9 | 7 |
| Wall clock, median (p90) | 99s (398s) | 119s (471s) | 141s (468s) | 99s (404s) | 79s (468s) |
| Share waiting on the model | 90% | 89% | 90% | 36% | 39% |
| Model requests / run | 12.7 | 12.1 | 12.4 | 10.7 | 17.3 |
| Tokens / run | 223k | 271k | 272k | 171k | 278k |
| ↳ prompt (all) | 210k | 258k | 257k | 160k | 269k |
| ↳ prompt (processed, not cached) | 11k | 18k | 15k | 11k | 9.1k |
| ↳ completion | 13k | 14k | 15k | 11k | 9.4k |
| Tokens / pass | 247k | 305k | 323k | 198k | 308k |
| Output cut off uncounted, at least | 1.0k | 1.0k | 1.9k | 0 | 1.0k |
| First prompt (system + tools + task) | 1.6k | 5.7k | 4.2k | 1.3k | 2.2k |
| Peak context, median (max) | 14k (50k) | 20k (73k) | 19k (54k) | 14k (49k) | 12k (65k) |
| Tool calls / run | 12.6 | 12.6 | 13.1 | 10.7 | 16.9 |
| ↳ read | 2.7 | 3.7 | 3.9 | 2.6 | 1.6 |
| ↳ edit | 3.6 | 3.1 | 3.2 | 3.0 | 4.7 |
| ↳ shell | 5.9 | 5.5 | 5.7 | 4.7 | 10.6 |
| ↳ search | 0.3 | 0.0 | 0.1 | 0.4 | 0.0 |
| ↳ web | 0.0 | 0.1 | 0.1 | 0.0 | 0.0 |
| ↳ other | 0.0 | 0.1 | 0.1 | 0.0 | 0.0 |
| Unparsed tool calls | 0 | 0 | 0 | 0 | 0 |
| Calls to tools not offered | 0 | 0 | 0 | 0 | 0 |
| Output cut off at limit | 0 | 0 | 0 | 0 | 0 |
| API errors | 0 | 0 | 0 | 0 | 0 |
| Requests resent after a closed connection | 8 | 3 | 13 | 13 | 5 |
| Runs that changed the tests | 0 | 0 | 0 | 0 | 0 |
| Runs that reached the bench cache | 2 | 4 | 2 | 0 | 2 |
| Web fetches / run | 0.04 | 0.13 | 0.09 | 0.00 | 0.00 |
| Fetches from solution sources | 3 | 9 | 6 | 0 | 0 |
| Runs that may hardcode test answers | 0 | 0 | 0 | 0 | 0 |
| Lines changed / run | 62 | 58 | 82 | 62 | 64 |

## Tools called, per run

- **featherloop**: shell 5.9, read 2.7, update 1.9, write 1.7, glob 0.3, webfetch 0.0, grep 0.0
- **opencode-stock**: shell 5.5, read 3.7, edit 1.9, write 1.2, webfetch 0.1, execute 0.1, glob 0.0, websearch 0.0
- **opencode-custom**: shell 5.7, read 3.9, edit 1.9, write 1.3, execute 0.1, webfetch 0.0, glob 0.0, grep 0.0, websearch 0.0
- **nanocode**: bash 4.7, read 2.6, write 1.5, edit 1.5, glob 0.3, grep 0.0
- **pi**: bash 10.6, edit 2.8, write 1.9, read 1.6

## Hosts fetched

- **featherloop**: raw.githubusercontent.com 2, github.com 1. From solution sources: python/dominoes: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/dominoes/canonical-data.json; python/rest-api: https://github.com/exercism/problem-specifications/tree/main/exercises/rest-api/canonical-data.json; python/rest-api: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/rest-api/canonical-data.json
- **opencode-stock**: raw.githubusercontent.com 9, search 2. From solution sources: python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json; python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/tracks/python/go-counting/.docs/instructions.md; python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/tracks/python/go-counting/go_counting.py; python/paasio: https://raw.githubusercontent.com/getmoto/paasio/main/paasio.py; python/paasio: https://raw.githubusercontent.com/getmoto/paasio/master/paasio.py; javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/exemplar.js; javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/go-counting.spec.js; javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/master/exercises/practice/go-counting/.meta/exemplar.js; javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/proof.ci.js
- **opencode-custom**: raw.githubusercontent.com 5, search 1, api.github.com 1. From solution sources: python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json; python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json; python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json; python/paasio: https://raw.githubusercontent.com/ionelmc/python-paasio/master/paasio.py; python/paasio: https://raw.githubusercontent.com/ionelmc/python-paasio/main/paasio.py; python/paasio: https://api.github.com/repos/ionelmc/python-paasio/contents/paasio.py
- **nanocode**: none
- **pi**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":1.5,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"reasoning_effort":"none"}; output limit 262144
- **opencode-stock**: server defaults; output limit 256000
- **opencode-custom**: server defaults; output limit 256000
- **nanocode**: server defaults; output limit 262144
- **pi**: server defaults; output limit 256252

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop | opencode-stock | opencode-custom | nanocode | pi |
|---|:---:|:---:|:---:|:---:|:---:|
| python/affine-cipher | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/beer-song | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/book-store | ✓ | ✓ | ✓ | ✓ | ✓⏱ |
| python/bottle-song | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/connect | ✓ | ✓ | ✓ | – | ✓ |
| python/bowling | ✗ (24/31🪙) | ✗ (11/31🪙) | ✗ (9/31🪙) | ✗ (25/31⏱) | ✗ (28/31🪙) |
| python/dominoes | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/dot-dsl | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/food-chain | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/forth | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/go-counting | ✓ | ✓💥 | ✓ | ✗ (9/11🪙) | ✓ |
| python/grade-school | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/grep | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/hangman | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/list-ops | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/phone-number | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/paasio | ✗ (0/25🪙) | ✗ (0/25🪙) | ✓💥 | ✗ (0/25🪙) | ✗ (0/25🪙) |
| python/pig-latin | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/poker | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/pov | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/proverb | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/react | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/rest-api | ✓ | ✓ | ✗ (8/9🪙) | ✓ | ✓ |
| python/robot-name | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/scale-generator | ✓ | ✓ | ✓ | ✓🪙 | ✓ |
| python/simple-linked-list | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/sgf-parsing | ✗ (0/23🪙) | ✗ (7/23🪙) | ✗ (7/23🪙) | ✗ (0/23🪙) | ✗ (0/23🪙) |
| python/transpose | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/tree-building | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/two-bucket | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/variable-length-quantity | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/wordy | ✓ | ✓ | ✓ | ✓ | ✓ |
| python/zebra-puzzle | ✗ (1/2🪙) | ✗ (0/2🪙) | ✗ (0/2🪙) | ✓ | ✗ (1/2🪙) |
| python/zipper | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/affine-cipher | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/beer-song | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/alphametics | ✓ | ✓ | ✓ | ✗ (0/9⏱) | ✓ |
| javascript/binary | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/book-store | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/bottle-song | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/bowling | ✓ | ✗ (0/30🪙) | ✗ (15/30🪙) | ✓ | ✓ |
| javascript/complex-numbers | ✓ | ✓ | ✗ (30/31🪙) | ✓ | ✗ (30/31🪙) |
| javascript/connect | ✗ (0/10🪙) | ✓ | ✗ (0/10🪙) | ✓ | ✓ |
| javascript/food-chain | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/forth | ✓ | ✗ (35/49🪙) | ✓ | ✓ | ✗ (48/49🪙) |
| javascript/go-counting | ✗ (10/11🪙) | ✗ (0/11🪙) | ✓ | ✗ (9/11🪙) | ✓ |
| javascript/grade-school | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/house | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/grep | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/killer-sudoku-helper | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/list-ops | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/meetup | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/ocr-numbers | ✓ | ✓ | ✓🪙 | ✓ | ✓ |
| javascript/palindrome-products | ✓🪙 | ✓ | ✓ | ✓ | ✓ |
| javascript/parallel-letter-frequency | ✓ | ✗ (4/13🪙) | ✗ (8/13🪙) | ✗ (1/13⏱) | ✓ |
| javascript/phone-number | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/pig-latin | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/poker | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/promises | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/queen-attack | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/rational-numbers | ✓ | ✓💥 | ✓ | ✓ | ✓ |
| javascript/react | ✗ (4/13🪙) | ✓ | ✓ | ✗ (0/13🪙) | ✓ |
| javascript/rectangles | ✓ | ✓ | ✗ (15/14🪙) | ✓ | ✓ |
| javascript/resistor-color-trio | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/rest-api | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/robot-name | ✓ | ✓ | ✓ | ✓ | ✗ (0/9⏱) |
| javascript/say | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/scale-generator | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/simple-linked-list | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/space-age | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/state-of-tic-tac-toe | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/sum-of-multiples | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/tournament | ✓ | ✓ | ✗ (0/12🪙) | ✗ (1/12🪙) | ✓ |
| javascript/transpose | ✓ | ✓ | ✗ (0/13🪙) | ✓ | ✓ |
| javascript/triangle | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/twelve-days | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/two-bucket | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/word-search | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/variable-length-quantity | ✓ | ✗ (0/26🪙) | ✓ | ✗ (0/26🪙) | ✓ |
| javascript/wordy | ✓ | ✓ | ✓ | ✓ | ✓ |
| javascript/zebra-puzzle | ✗ (1/2🪙) | ✓ | ✗ (0/2🪙) | ✗ (1/2🪙) | ✗ (0/2🪙) |
| javascript/zipper | ✓ | ✓ | ✗ (18/19🪙) | ✓ | ✓ |
