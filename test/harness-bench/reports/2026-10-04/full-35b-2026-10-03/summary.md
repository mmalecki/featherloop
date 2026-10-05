# Harness bench

Model: Qwen/Qwen3.6-35B-A3B (Qwen_Qwen3.6-35B-A3B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.6-35b-a3b. 82 cases × 1 reps, 4 at a time, 30 min timeout. Started 2026-10-03T23:17:20.859Z.
4 runs were run again after API errors (see meta.json's reruns).
Versions: featherloop ea13e32, opencode-stock opencode v2.0.22, opencode-custom opencode v2.0.22, nanocode b009d3d.

## Harnesses

- **featherloop** ea13e32: This repository, from source, with --shell; config: harnesses/featherloop.
- **opencode-stock** opencode v2.0.22: opencode with only the provider configured (and title generation off); config: harnesses/opencode-stock.
- **opencode-custom** opencode v2.0.22: opencode with the user's agents for smaller models; config: harnesses/opencode-custom.
- **nanocode** b009d3d: github.com/1rgs/nanocode at b009d3d, unmodified, driven by harnesses/nanocode/driver.py.

## Results

| | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| **Passed** | **77/82 (94%)** | **78/82 (95%)** | **81/82 (99%)** | **58/82 (71%)** |
| 95% interval | 87%–97% | 88%–98% | 93%–100% | 60%–79% |
| ↳ python | 32/34 | 31/34 | 33/34 | 23/34 |
| ↳ javascript | 45/48 | 47/48 | 48/48 | 35/48 |
| Tests passed (partial credit) | 97% | 98% | 100% | 76% |
| Timeouts / crashes | 4 / 0 | 4 / 0 | 1 / 0 | 1 / 0 |
| Wall clock, median (p90) | 140s (999s) | 107s (538s) | 122s (416s) | 131s (306s) |
| Share waiting on the model | 99% | 99% | 98% | 99% |
| Model requests / run | 6.7 | 6.0 | 6.7 | 4.9 |
| Tokens / run | 87k | 69k | 86k | 34k |
| ↳ prompt (all) | 79k | 64k | 81k | 29k |
| ↳ prompt (processed, not cached) | 7.2k | 8.5k | 9.8k | 5.3k |
| ↳ completion | 8.2k | 5.2k | 5.7k | 5.1k |
| Tokens / pass | 92k | 72k | 87k | 48k |
| Output cut off uncounted, at least | 1.6k | 1.4k | 290 | 0 |
| First prompt (system + tools + task) | 1.5k | 5.7k | 4.2k | 1.3k |
| Peak context, median (max) | 11k (50k) | 12k (48k) | 12k (86k) | 8.9k (46k) |
| Tool calls / run | 6.8 | 6.6 | 7.5 | 5.0 |
| ↳ read | 2.5 | 3.6 | 4.1 | 2.4 |
| ↳ edit | 1.8 | 1.5 | 1.6 | 1.1 |
| ↳ shell | 2.3 | 1.5 | 1.7 | 1.2 |
| ↳ search | 0.1 | 0.0 | 0.0 | 0.3 |
| ↳ other | 0.0 | 0.0 | 0.0 | 0.0 |
| Unparsed tool calls | 0 | 0 | 0 | 0 |
| Calls to tools not offered | 0 | 0 | 0 | 0 |
| Output cut off at limit | 0 | 0 | 0 | 23 |
| API errors | 0 | 0 | 0 | 0 |
| Runs that changed the tests | 0 | 0 | 0 | 0 |
| Runs that reached the bench cache | 0 | 0 | 0 | 0 |
| Web fetches / run | – | – | – | – |
| Fetches from solution sources | – | – | – | – |
| Runs that may hardcode test answers | 0 | 0 | 0 | 0 |
| Lines changed / run | 63 | 60 | 63 | 40 |

## Tools called, per run

- **featherloop**: read 2.5, shell 2.3, write 1.6, update 0.3, glob 0.1
- **opencode-stock**: read 3.6, shell 1.5, write 1.0, edit 0.5, glob 0.0
- **opencode-custom**: read 4.1, shell 1.7, write 1.2, edit 0.5, execute 0.0
- **nanocode**: read 2.4, bash 1.2, write 0.9, glob 0.3, edit 0.2

## Hosts fetched

- **featherloop**: not tracked
- **opencode-stock**: not tracked
- **opencode-custom**: not tracked
- **nanocode**: not tracked

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 262144
- **opencode-stock**: server defaults; output limit 256000
- **opencode-custom**: server defaults; output limit 256000
- **nanocode**: server defaults; output limit 8192

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop | opencode-stock | opencode-custom | nanocode |
|---|:---:|:---:|:---:|:---:|
| python/affine-cipher | ✓ | ✓ | ✓ | ✓ |
| python/beer-song | ✓ | ✓ | ✓ | ✓ |
| python/book-store | ✓ | ✓ | ✓ | ✗ (0/20) |
| python/bottle-song | ✓ | ✓ | ✓ | ✓ |
| python/bowling | ✓ | ✗ (24/31⏱) | ✗ (29/31⏱) | ✗ (0/31) |
| python/connect | ✗ (8/10⏱) | ✗ (8/10⏱) | ✓ | ✗ (9/10⏱) |
| python/dominoes | ✓ | ✓ | ✓ | ✗ (6/13) |
| python/dot-dsl | ✓ | ✓ | ✓ | ✓ |
| python/food-chain | ✓ | ✓ | ✓ | ✓ |
| python/forth | ✓ | ✓ | ✓ | ✗ (0/54) |
| python/go-counting | ✓ | ✓ | ✓ | ✓ |
| python/grade-school | ✓ | ✓ | ✓ | ✓ |
| python/grep | ✓ | ✓ | ✓ | ✓ |
| python/hangman | ✓ | ✓ | ✓ | ✓ |
| python/list-ops | ✓ | ✓ | ✓ | ✓ |
| python/paasio | ✓ | ✗ (23/25⏱) | ✓ | ✗ (23/25) |
| python/phone-number | ✓ | ✓ | ✓ | ✓ |
| python/pig-latin | ✓ | ✓ | ✓ | ✓ |
| python/poker | ✓ | ✓ | ✓ | ✓ |
| python/pov | ✗ (8/15⏱) | ✓ | ✓ | ✗ (0/15) |
| python/proverb | ✓ | ✓ | ✓ | ✓ |
| python/react | ✓ | ✓ | ✓ | ✗ (2/14) |
| python/rest-api | ✓ | ✓ | ✓ | ✓ |
| python/robot-name | ✓ | ✓ | ✓ | ✓ |
| python/scale-generator | ✓ | ✓ | ✓ | ✓ |
| python/sgf-parsing | ✓ | ✓ | ✓ | ✗ (15/23) |
| python/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| python/transpose | ✓ | ✓ | ✓ | ✓ |
| python/tree-building | ✓ | ✓ | ✓ | ✓ |
| python/two-bucket | ✓ | ✓ | ✓ | ✗ (0/9) |
| python/variable-length-quantity | ✓ | ✓ | ✓ | ✓ |
| python/wordy | ✓ | ✓ | ✓ | ✓ |
| python/zebra-puzzle | ✓ | ✓ | ✓ | ✓ |
| python/zipper | ✓ | ✓ | ✓ | ✗ (0/14) |
| javascript/affine-cipher | ✓ | ✓ | ✓ | ✓ |
| javascript/alphametics | ✓ | ✓ | ✓ | ✓ |
| javascript/beer-song | ✓ | ✓ | ✓ | ✓ |
| javascript/binary | ✓ | ✓ | ✓ | ✓ |
| javascript/book-store | ✓ | ✓ | ✓ | ✗ (0/17) |
| javascript/bottle-song | ✓ | ✓ | ✓ | ✓ |
| javascript/bowling | ✓ | ✗ (0/30⏱) | ✓ | ✗ (0/30) |
| javascript/complex-numbers | ✓ | ✓ | ✓ | ✓ |
| javascript/connect | ✗ (9/10⏱) | ✓ | ✓ | ✗ (0/10) |
| javascript/food-chain | ✓ | ✓ | ✓ | ✓ |
| javascript/forth | ✓ | ✓ | ✓ | ✗ (0/49) |
| javascript/go-counting | ✓ | ✓ | ✓ | ✗ (0/11) |
| javascript/grade-school | ✓ | ✓ | ✓ | ✓ |
| javascript/grep | ✓ | ✓ | ✓ | ✓ |
| javascript/house | ✓ | ✓ | ✓ | ✓ |
| javascript/killer-sudoku-helper | ✓ | ✓ | ✓ | ✓ |
| javascript/list-ops | ✓ | ✓ | ✓ | ✓ |
| javascript/meetup | ✓ | ✓ | ✓ | ✓ |
| javascript/ocr-numbers | ✓ | ✓ | ✓ | ✗ (0/16) |
| javascript/palindrome-products | ✓ | ✓ | ✓ | ✗ (0/12) |
| javascript/parallel-letter-frequency | ✓ | ✓ | ✓ | ✓ |
| javascript/phone-number | ✓ | ✓ | ✓ | ✓ |
| javascript/pig-latin | ✓ | ✓ | ✓ | ✓ |
| javascript/poker | ✓ | ✓ | ✓ | ✗ (0/28) |
| javascript/promises | ✓ | ✓ | ✓ | ✓ |
| javascript/queen-attack | ✓ | ✓ | ✓ | ✓ |
| javascript/rational-numbers | ✓ | ✓ | ✓ | ✓ |
| javascript/react | ✓ | ✓ | ✓ | ✗ (12/13) |
| javascript/rectangles | ✓ | ✓ | ✓ | ✓ |
| javascript/resistor-color-trio | ✓ | ✓ | ✓ | ✓ |
| javascript/rest-api | ✗ (6/9⏱) | ✓ | ✓ | ✗ (0/9) |
| javascript/robot-name | ✓ | ✓ | ✓ | ✓ |
| javascript/say | ✓ | ✓ | ✓ | ✓ |
| javascript/scale-generator | ✓ | ✓ | ✓ | ✓ |
| javascript/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| javascript/space-age | ✓ | ✓ | ✓ | ✓ |
| javascript/state-of-tic-tac-toe | ✓ | ✓ | ✓ | ✓ |
| javascript/sum-of-multiples | ✓ | ✓ | ✓ | ✓ |
| javascript/tournament | ✓ | ✓ | ✓ | ✓ |
| javascript/transpose | ✓ | ✓ | ✓ | ✓ |
| javascript/triangle | ✓ | ✓ | ✓ | ✓ |
| javascript/twelve-days | ✓ | ✓ | ✓ | ✓ |
| javascript/two-bucket | ✓ | ✓ | ✓ | ✗ (3/10) |
| javascript/variable-length-quantity | ✗ (0/26) | ✓ | ✓ | ✓ |
| javascript/word-search | ✓ | ✓ | ✓ | ✓ |
| javascript/wordy | ✓ | ✓ | ✓ | ✗ (0/23) |
| javascript/zebra-puzzle | ✓ | ✓ | ✓ | ✓ |
| javascript/zipper | ✓ | ✓ | ✓ | ✗ (0/19) |
