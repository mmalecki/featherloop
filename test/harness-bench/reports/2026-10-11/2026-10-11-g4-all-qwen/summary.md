# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11429-d81235049, 5 slots.
Bench model qwen3.5-9b. 82 cases × 1 reps, up to 3 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-11T14:41:36.184Z.
Versions: featherloop f79147f, opencode-stock opencode v2.0.26, opencode-custom opencode v2.0.26, nanocode b009d3d.

## Harnesses

- **featherloop** f79147f: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.
- **opencode-stock** opencode v2.0.26: opencode with only the provider configured; config: harnesses/opencode-stock. title agent off (it takes a server slot per run).
- **opencode-custom** opencode v2.0.26: opencode with the user's agents for smaller models; config: harnesses/opencode-custom. title agent off (it takes a server slot per run); websearch off (it needs a key; the cases are offline).
- **nanocode** b009d3d: github.com/1rgs/nanocode at b009d3d, unmodified, driven by harnesses/nanocode/driver.py. max_tokens 262144 (the model's output limit) in place of its 8192.

## Results

| | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| **Passed** | **71/82 (87%)** | **67/82 (82%)** | **71/82 (87%)** | **67/82 (82%)** |
| 95% interval | 78%–92% | 72%–89% | 78%–92% | 72%–89% |
| ↳ python | 28/34 | 27/34 | 27/34 | 25/34 |
| ↳ javascript | 43/48 | 40/48 | 44/48 | 42/48 |
| Tests passed (partial credit) | 94% | 91% | 93% | 96% |
| Timeouts / crashes | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Out of output budget | 11 | 13 | 11 | 14 |
| Wall clock, median (p90) | 91s (578s) | 82s (650s) | 98s (680s) | 106s (619s) |
| Share waiting on the model | 92% | 88% | 87% | 92% |
| Model requests / run | 19.5 | 19.2 | 19.5 | 20.4 |
| Tokens / run | 447k | 542k | 509k | 506k |
| ↳ prompt (all) | 434k | 528k | 496k | 493k |
| ↳ prompt (processed, not cached) | 11k | 17k | 17k | 13k |
| ↳ completion | 13k | 14k | 13k | 13k |
| Tokens / pass | 516k | 663k | 588k | 620k |
| Output cut off uncounted, at least | 105 | 117 | 81 | 0 |
| First prompt (system + tools + task) | 1.6k | 5.7k | 4.2k | 1.3k |
| Peak context, median (max) | 13k (67k) | 23k (90k) | 23k (80k) | 15k (89k) |
| Tool calls / run | 18.9 | 18.7 | 19.2 | 19.8 |
| ↳ read | 2.5 | 3.2 | 3.7 | 2.6 |
| ↳ edit | 7.5 | 7.4 | 7.5 | 6.1 |
| ↳ shell | 8.8 | 7.7 | 7.3 | 11.0 |
| ↳ search | 0.1 | 0.0 | 0.0 | 0.0 |
| ↳ web | 0.0 | 0.0 | 0.0 | 0.0 |
| ↳ other | 0.0 | 0.4 | 0.7 | 0.0 |
| Unparsed tool calls | 0 | 0 | 0 | 0 |
| Calls to tools not offered | 0 | 0 | 0 | 0 |
| Output cut off at limit | 0 | 0 | 0 | 0 |
| API errors | 0 | 0 | 0 | 0 |
| Requests resent after a closed connection | 9 | 5 | 6 | 6 |
| Runs that changed the tests | 1 | 0 | 0 | 0 |
| Runs that reached the bench cache | 0 | 0 | 0 | 0 |
| Web fetches / run | 0.00 | 0.02 | 0.02 | 0.00 |
| Fetches from solution sources | 0 | 2 | 1 | 0 |
| Runs that may hardcode test answers | 0 | 0 | 0 | 0 |
| Lines changed / run | 88 | 84 | 89 | 89 |

## Tools called, per run

- **featherloop**: shell 8.8, write 6.9, read 2.5, update 0.7, glob 0.1, grep 0.0
- **opencode-stock**: shell 7.7, edit 4.6, read 3.2, write 2.8, execute 0.3, skill 0.0, webfetch 0.0, grep 0.0, glob 0.0
- **opencode-custom**: shell 7.3, edit 4.4, read 3.7, write 3.0, execute 0.7, webfetch 0.0
- **nanocode**: bash 11.0, write 5.4, read 2.6, edit 0.7, glob 0.0

## Hosts fetched

- **featherloop**: none
- **opencode-stock**: github.com 1, raw.githubusercontent.com 1. From solution sources: python/zebra-puzzle: https://github.com/exercism/problem-specifications/blob/main/exercises/zebra-puzzle/canonical-data.json; python/zebra-puzzle: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/zebra-puzzle/canonical-data.json
- **opencode-custom**: en.wikipedia.org 1, raw.githubusercontent.com 1. From solution sources: javascript/variable-length-quantity: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/variable-length-quantity/variable-length-quantity.spec.js
- **nanocode**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":1.5,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"presence_penalty":1.5}; output limit 262144
- **opencode-stock**: server defaults; output limit 256000
- **opencode-custom**: server defaults; output limit 256000
- **nanocode**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop | opencode-stock | opencode-custom | nanocode |
|---|:---:|:---:|:---:|:---:|
| python/beer-song | ✓ | ✓ | ✓ | ✓ |
| python/affine-cipher | ✓ | ✓ | ✓ | ✓ |
| python/book-store | ✓ | ✗ (0/20🪙) | ✗ (1/20🪙) | ✓ |
| python/bottle-song | ✓ | ✓ | ✓ | ✓ |
| python/bowling | ✗ (5/31🪙) | ✗ (12/31🪙) | ✗ (5/31🪙) | ✗ (24/31🪙) |
| python/connect | ✗ (6/10🪙) | ✗ (7/10🪙) | ✗ (7/10🪙) | ✗ (7/10🪙) |
| python/dominoes | ✓ | ✓ | ✓ | ✓ |
| python/dot-dsl | ✓ | ✓ | ✓ | ✓ |
| python/food-chain | ✓ | ✓ | ✓ | ✓ |
| python/go-counting | ✓ | ✓ | ✓ | ✓ |
| python/grade-school | ✓ | ✓ | ✓ | ✓ |
| python/grep | ✓ | ✓ | ✓ | ✓ |
| python/hangman | ✓ | ✓ | ✓ | ✓ |
| python/list-ops | ✓ | ✓ | ✓ | ✓ |
| python/phone-number | ✓ | ✓ | ✓ | ✓ |
| python/paasio | ✗ (21/25🪙) | ✓ | ✓ | ✗ (24/25🪙) |
| python/forth | ✓ | ✗ (42/54🪙) | ✓ | ✗ (30/54🪙) |
| python/pig-latin | ✓ | ✓ | ✓ | ✓ |
| python/poker | ✓ | ✓ | ✓ | ✓ |
| python/pov | ✗ (10/15🪙) | ✗ (8/15🪙) | ✓ | ✗ (13/15🪙) |
| python/proverb | ✓ | ✓ | ✓ | ✓ |
| python/rest-api | ✓ | ✓ | ✗ (7/9🪙) | ✓ |
| python/robot-name | ✓ | ✓ | ✓ | ✓ |
| python/react | ✗ (6/14🪙) | ✗ (13/14🪙) | ✗ (12/14🪙) | ✗ (7/14🪙) |
| python/scale-generator | ✓ | ✓ | ✓ | ✗ (15/17🪙) |
| python/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| python/transpose | ✓ | ✓ | ✓ | ✓ |
| python/tree-building | ✓ | ✓ | ✓ | ✓ |
| python/sgf-parsing | ✗ (13/23🪙) | ✗ (20/23🪙) | ✗ (9/23🪙) | ✗ (21/23🪙) |
| python/two-bucket | ✓ | ✓ | ✓ | ✓ |
| python/variable-length-quantity | ✓ | ✓ | ✓ | ✓ |
| python/zebra-puzzle | ✓ | ✓ | ✓ | ✓ |
| python/wordy | ✓ | ✓ | ✗ (15/25🪙) | ✓ |
| python/zipper | ✓ | ✓ | ✓ | ✗ (5/14🪙) |
| javascript/affine-cipher | ✓ | ✓ | ✓ | ✓ |
| javascript/alphametics | ✓ | ✓ | ✓ | ✓ |
| javascript/beer-song | ✓ | ✓ | ✓ | ✓ |
| javascript/binary | ✓ | ✓ | ✓ | ✓ |
| javascript/book-store | ✓ | ✗ (3/17🪙) | ✓ | ✓ |
| javascript/bottle-song | ✓ | ✓ | ✓ | ✓ |
| javascript/complex-numbers | ✓ | ✓ | ✓ | ✓ |
| javascript/bowling | ✗ (21/30🪙) | ✗ (10/30🪙) | ✗ (19/30🪙) | ✗ (28/30🪙) |
| javascript/food-chain | ✓ | ✓ | ✓ | ✓ |
| javascript/connect | ✗ (8/10🪙) | ✗ (6/10🪙) | ✗ (6/10🪙) | ✗ (9/10🪙) |
| javascript/go-counting | ✓ | ✓ | ✓ | ✓ |
| javascript/forth | ✓ | ✓ | ✓ | ✓ |
| javascript/grade-school | ✓ | ✓ | ✓ | ✓ |
| javascript/grep | ✓ | ✓ | ✓ | ✓ |
| javascript/house | ✓ | ✓ | ✓ | ✓ |
| javascript/killer-sudoku-helper | ✓ | ✓ | ✓ | ✓ |
| javascript/list-ops | ✓ | ✓ | ✓ | ✓ |
| javascript/meetup | ✓ | ✓ | ✓ | ✓ |
| javascript/ocr-numbers | ✗ (12/16🪙) | ✓ | ✓ | ✓ |
| javascript/palindrome-products | ✓ | ✓ | ✓ | ✓ |
| javascript/phone-number | ✓ | ✓ | ✓ | ✗ (17/18🪙) |
| javascript/pig-latin | ✓ | ✓ | ✓ | ✓ |
| javascript/parallel-letter-frequency | ✓ | ✓ | ✓ | ✗ (13/13) |
| javascript/poker | ✓ | ✓ | ✓ | ✓ |
| javascript/promises | ✓ | ✓ | ✓ | ✓ |
| javascript/queen-attack | ✓ | ✓ | ✓ | ✓ |
| javascript/rational-numbers | ✓ | ✓ | ✓ | ✓ |
| javascript/rectangles | ✓ | ✓ | ✓ | ✓ |
| javascript/resistor-color-trio | ✓ | ✗ (1/6) | ✓ | ✓ |
| javascript/react | ✗ (4/13🪙) | ✗ (5/13🪙) | ✗ (11/13🪙) | ✗ (11/13🪙) |
| javascript/robot-name | ✓ | ✗ (8/9) | ✓ | ✓ |
| javascript/rest-api | ✓ | ✓ | ✓ | ✓ |
| javascript/say | ✓ | ✓ | ✓ | ✓ |
| javascript/scale-generator | ✓ | ✓ | ✓ | ✓ |
| javascript/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| javascript/space-age | ✓ | ✓ | ✓ | ✓ |
| javascript/state-of-tic-tac-toe | ✓ | ✓ | ✓ | ✓ |
| javascript/sum-of-multiples | ✓ | ✓ | ✓ | ✓ |
| javascript/tournament | ✓ | ✓ | ✓ | ✓ |
| javascript/transpose | ✗ (8/13🪙) | ✓ | ✓ | ✗ (9/13🪙) |
| javascript/triangle | ✓ | ✓ | ✓ | ✓ |
| javascript/twelve-days | ✓ | ✓ | ✓ | ✓ |
| javascript/two-bucket | ✓ | ✓ | ✓ | ✓ |
| javascript/word-search | ✓ | ✓ | ✓ | ✓ |
| javascript/variable-length-quantity | ✓ | ✗ (20/26🪙) | ✓ | ✓ |
| javascript/wordy | ✓ | ✓ | ✓ | ✓ |
| javascript/zipper | ✓ | ✓ | ✓ | ✓ |
| javascript/zebra-puzzle | ✓ | ✗ (0/2🪙) | ✗ (0/2🪙) | ✓ |
