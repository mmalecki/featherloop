# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
82 cases × 1 reps, 4 at a time, 30 min timeout. Started 2026-10-03T22:19:04.143Z.
15 runs were run again after API errors (see meta.json's reruns).
Versions: featherloop dd9f314, opencode-stock opencode v2.0.22, opencode-custom opencode v2.0.22, nanocode b009d3d.

## Harnesses

- **featherloop** dd9f314: This repository, from source, with --shell; config: harnesses/featherloop.
- **opencode-stock** opencode v2.0.22: opencode with only the provider configured (and title generation off); config: harnesses/opencode-stock.
- **opencode-custom** opencode v2.0.22: opencode with the user's agents for smaller models; config: harnesses/opencode-custom.
- **nanocode** b009d3d: github.com/1rgs/nanocode at b009d3d, unmodified, driven by harnesses/nanocode/driver.py.

## Results

| | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| **Passed** | **57/82 (70%)** | **65/82 (79%)** | **58/82 (71%)** | **62/82 (76%)** |
| 95% interval | 59%–78% | 69%–87% | 60%–79% | 65%–84% |
| ↳ python | 19/34 | 26/34 | 21/34 | 26/34 |
| ↳ javascript | 38/48 | 39/48 | 37/48 | 36/48 |
| Tests passed (partial credit) | 87% | 92% | 86% | 89% |
| Timeouts / crashes | 25 / 0 | 18 / 0 | 24 / 0 | 7 / 0 |
| Wall clock, median (p90) | 315s (1800s) | 295s (1800s) | 260s (1800s) | 237s (1379s) |
| Share waiting on the model | 98% | 96% | 97% | 94% |
| Model requests / run | 10.4 | 13.6 | 15.5 | 12.3 |
| Tokens / run | 160k | 321k | 368k | 239k |
| ↳ prompt (all) | 152k | 310k | 357k | 230k |
| ↳ prompt (processed, not cached) | 8.9k | 20k | 24k | 15k |
| ↳ completion | 8.6k | 10k | 11k | 9.2k |
| Tokens / pass | 231k | 404k | 521k | 316k |
| Output cut off uncounted, at least | 1.2k | 0 | 0 | 0 |
| First prompt (system + tools + task) | 1.5k | 5.7k | 4.2k | 1.3k |
| Peak context, median (max) | 9.8k (61k) | 18k (82k) | 17k (85k) | 13k (98k) |
| Tool calls / run | 10.0 | 13.2 | 15.2 | 11.9 |
| ↳ read | 2.2 | 2.9 | 3.4 | 2.5 |
| ↳ edit | 3.8 | 5.3 | 6.0 | 3.7 |
| ↳ shell | 3.9 | 4.8 | 5.6 | 5.7 |
| ↳ search | 0.1 | 0.0 | 0.0 | 0.0 |
| ↳ other | 0.0 | 0.3 | 0.2 | 0.0 |
| Unparsed tool calls | 0 | 0 | 0 | 0 |
| Calls to tools not offered | 0 | 0 | 0 | 0 |
| Output cut off at limit | 0 | 0 | 0 | 13 |
| API errors | 0 | 0 | 0 | 0 |
| Runs that changed the tests | 0 | 0 | 0 | 0 |
| Runs that reached the bench cache | 0 | 0 | 0 | 0 |
| Web fetches / run | 0.00 | 0.00 | 0.00 | 0.00 |
| Fetches from solution sources | 0 | 0 | 0 | 0 |
| Runs that may hardcode test answers | 0 | 0 | 0 | 0 |
| Lines changed / run | 74 | 83 | 83 | 84 |

## Tools called, per run

- **featherloop**: shell 3.9, write 3.5, read 2.2, update 0.3, glob 0.0, grep 0.0
- **opencode-stock**: shell 4.8, edit 3.5, read 2.9, write 1.7, execute 0.3, grep 0.0
- **opencode-custom**: shell 5.6, edit 3.8, read 3.4, write 2.2, execute 0.2, grep 0.0
- **nanocode**: bash 5.7, write 3.3, read 2.5, edit 0.4

## Hosts fetched

- **featherloop**: none
- **opencode-stock**: none
- **opencode-custom**: none
- **nanocode**: none

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
| python/book-store | ✗ (0/20⏱) | ✓ | ✗ (1/20⏱) | ✗ (0/20⏱) |
| python/bottle-song | ✓ | ✓ | ✓ | ✓ |
| python/bowling | ✗ (26/31⏱) | ✗ (4/31⏱) | ✗ (4/31⏱) | ✓ |
| python/connect | ✗ (5/10⏱) | ✗ (7/10⏱) | ✗ (7/10⏱) | ✗ (7/10) |
| python/dominoes | ✗ (12/13⏱) | ✓ | ✓ | ✓ |
| python/dot-dsl | ✓ | ✓ | ✓ | ✓ |
| python/food-chain | ✓ | ✓ | ✓ | ✓ |
| python/forth | ✗ (50/54⏱) | ✗ (47/54⏱) | ✗ (0/54⏱) | ✗ (52/54⏱) |
| python/go-counting | ✓ | ✓ | ✓ | ✓ |
| python/grade-school | ✓ | ✓ | ✓ | ✓ |
| python/grep | ✓ | ✓ | ✓ | ✓ |
| python/hangman | ✗ (4/7⏱) | ✓ | ✗ (4/7⏱) | ✓ |
| python/list-ops | ✓ | ✓ | ✓ | ✓ |
| python/paasio | ✗ (22/25⏱) | ✗ (0/25⏱) | ✓ | ✓ |
| python/phone-number | ✓ | ✓ | ✓ | ✓ |
| python/pig-latin | ✓ | ✓ | ✓ | ✓ |
| python/poker | ✗ (0/37⏱) | ✓ | ✓ | ✓ |
| python/pov | ✗ (10/15⏱) | ✓ | ✗ (11/15⏱) | ✗ (10/15) |
| python/proverb | ✓ | ✓ | ✓ | ✓ |
| python/react | ✗ (13/14⏱) | ✗ (11/14⏱) | ✗ (11/14⏱) | ✗ (13/14) |
| python/rest-api | ✗ (8/9⏱) | ✗ (6/9⏱) | ✗ (6/9⏱) | ✓ |
| python/robot-name | ✗ (3/4⏱) | ✓ | ✓ | ✓ |
| python/scale-generator | ✗ (6/17⏱) | ✓ | ✗ (10/17⏱) | ✗ (11/17⏱) |
| python/sgf-parsing | ✗ (14/23⏱) | ✗ (7/23⏱) | ✗ (5/23⏱) | ✗ (0/23⏱) |
| python/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| python/transpose | ✗ (9/12⏱) | ✓⏱ | ✗ (8/12⏱) | ✗ (3/12) |
| python/tree-building | ✓ | ✓ | ✓ | ✓ |
| python/two-bucket | ✓ | ✓ | ✓ | ✓ |
| python/variable-length-quantity | ✓ | ✓ | ✓ | ✓ |
| python/wordy | ✓ | ✓ | ✓ | ✓ |
| python/zebra-puzzle | ✓ | ✓ | ✗ (0/2⏱) | ✓ |
| python/zipper | ✓ | ✗ (12/14⏱) | ✗ (5/14⏱) | ✓ |
| javascript/affine-cipher | ✓ | ✓ | ✓ | ✓ |
| javascript/alphametics | ✓ | ✓ | ✓ | ✓ |
| javascript/beer-song | ✓ | ✓ | ✓ | ✓ |
| javascript/binary | ✓ | ✓ | ✓ | ✓ |
| javascript/book-store | ✗ (2/17⏱) | ✓ | ✗ (6/17⏱) | ✗ (0/17) |
| javascript/bottle-song | ✓ | ✓ | ✓ | ✓ |
| javascript/bowling | ✗ (0/30⏱) | ✗ (20/30⏱) | ✗ (4/30⏱) | ✗ (29/30⏱) |
| javascript/complex-numbers | ✗ (30/31⏱) | ✗ (30/31⏱) | ✗ (28/31⏱) | ✗ (30/31) |
| javascript/connect | ✗ (8/10⏱) | ✗ (6/10⏱) | ✗ (6/10⏱) | ✗ (8/10⏱) |
| javascript/food-chain | ✓ | ✓ | ✓ | ✓ |
| javascript/forth | ✓ | ✗ (48/49⏱) | ✗ (39/49⏱) | ✗ (39/49) |
| javascript/go-counting | ✗ (6/11⏱) | ✓ | ✗ (9/11⏱) | ✓ |
| javascript/grade-school | ✓ | ✓ | ✓ | ✓ |
| javascript/grep | ✓ | ✓ | ✓ | ✓ |
| javascript/house | ✓ | ✓ | ✓ | ✗ (0/14) |
| javascript/killer-sudoku-helper | ✓ | ✓ | ✓ | ✓ |
| javascript/list-ops | ✓ | ✓ | ✓ | ✓ |
| javascript/meetup | ✓ | ✓ | ✓ | ✗ (40/95⏱) |
| javascript/ocr-numbers | ✓ | ✓ | ✓ | ✗ (11/16) |
| javascript/palindrome-products | ✓ | ✓ | ✓ | ✓ |
| javascript/parallel-letter-frequency | ✓ | ✓ | ✓ | ✓ |
| javascript/phone-number | ✗ (0/18⏱) | ✓ | ✓ | ✓ |
| javascript/pig-latin | ✓ | ✓ | ✓ | ✓ |
| javascript/poker | ✓ | ✓ | ✓ | ✓ |
| javascript/promises | ✓ | ✗ (8/27⏱) | ✓ | ✓ |
| javascript/queen-attack | ✓ | ✓ | ✓ | ✓ |
| javascript/rational-numbers | ✓ | ✓ | ✓ | ✓ |
| javascript/react | ✗ (11/13⏱) | ✗ (12/13⏱) | ✗ (12/13⏱) | ✗ (9/13) |
| javascript/rectangles | ✓ | ✗ (10/14⏱) | ✓ | ✓ |
| javascript/resistor-color-trio | ✓ | ✓ | ✓ | ✓ |
| javascript/rest-api | ✓ | ✗ (8/9⏱) | ✗ (8/9⏱) | ✓ |
| javascript/robot-name | ✓ | ✓ | ✗ (3/9⏱) | ✓ |
| javascript/say | ✓ | ✓ | ✓ | ✓ |
| javascript/scale-generator | ✓ | ✓ | ✓ | ✓ |
| javascript/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| javascript/space-age | ✓ | ✓ | ✓ | ✓ |
| javascript/state-of-tic-tac-toe | ✓ | ✓ | ✓ | ✓ |
| javascript/sum-of-multiples | ✓ | ✓ | ✓ | ✓ |
| javascript/tournament | ✓ | ✓ | ✓ | ✗ (1/12) |
| javascript/transpose | ✓ | ✓ | ✗ (9/13⏱) | ✗ (9/13) |
| javascript/triangle | ✓ | ✓ | ✓ | ✓ |
| javascript/twelve-days | ✓ | ✓ | ✓ | ✓ |
| javascript/two-bucket | ✓ | ✓ | ✓ | ✓ |
| javascript/variable-length-quantity | ✗ (6/26⏱) | ✓ | ✓ | ✓ |
| javascript/word-search | ✓ | ✓ | ✓ | ✓ |
| javascript/wordy | ✗ (13/23⏱) | ✓ | ✗ (7/23⏱) | ✓ |
| javascript/zebra-puzzle | ✓ | ✗ (0/2⏱) | ✓ | ✓ |
| javascript/zipper | ✗ (11/19⏱) | ✓ | ✓ | ✗ (13/19) |
