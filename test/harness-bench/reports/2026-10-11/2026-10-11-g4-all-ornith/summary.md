# Harness bench

Model: ornith-ai/Ornith-1.5-9B (Ornith-1.5-9B-Q5_K_M.gguf), llama.cpp b11429-d81235049, 5 slots.
Bench model ornith-1.5-9b. 82 cases × 1 reps, up to 3 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-11T14:40:49.178Z.
Versions: featherloop f79147f, opencode-stock opencode v2.0.26, opencode-custom opencode v2.0.26, nanocode b009d3d.

## Harnesses

- **featherloop** f79147f: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.
- **opencode-stock** opencode v2.0.26: opencode with only the provider configured; config: harnesses/opencode-stock. title agent off (it takes a server slot per run).
- **opencode-custom** opencode v2.0.26: opencode with the user's agents for smaller models; config: harnesses/opencode-custom. title agent off (it takes a server slot per run); websearch off (it needs a key; the cases are offline).
- **nanocode** b009d3d: github.com/1rgs/nanocode at b009d3d, unmodified, driven by harnesses/nanocode/driver.py. max_tokens 262144 (the model's output limit) in place of its 8192.

## Results

| | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| **Passed** | **73/82 (89%)** | **69/82 (84%)** | **67/82 (82%)** | **71/82 (87%)** |
| 95% interval | 80%–94% | 75%–90% | 72%–89% | 78%–92% |
| ↳ python | 31/34 | 29/34 | 26/34 | 29/34 |
| ↳ javascript | 42/48 | 40/48 | 41/48 | 42/48 |
| Tests passed (partial credit) | 91% | 88% | 87% | 89% |
| Timeouts / crashes | 0 / 0 | 0 / 0 | 0 / 2 | 0 / 0 |
| Out of output budget | 12 | 14 | 16 | 12 |
| Wall clock, median (p90) | 139s (449s) | 140s (461s) | 196s (473s) | 103s (459s) |
| Share waiting on the model | 96% | 94% | 93% | 68% |
| Model requests / run | 12.0 | 10.9 | 12.1 | 10.8 |
| Tokens / run | 213k | 239k | 279k | 195k |
| ↳ prompt (all) | 201k | 226k | 263k | 183k |
| ↳ prompt (processed, not cached) | 9.5k | 15k | 15k | 11k |
| ↳ completion | 12k | 13k | 16k | 12k |
| Tokens / pass | 240k | 284k | 342k | 225k |
| Output cut off uncounted, at least | 3.0k | 2.8k | 3.0k | 0 |
| First prompt (system + tools + task) | 1.6k | 5.7k | 4.2k | 1.3k |
| Peak context, median (max) | 14k (53k) | 21k (60k) | 23k (58k) | 14k (61k) |
| Tool calls / run | 12.0 | 11.3 | 12.7 | 10.8 |
| ↳ read | 2.9 | 3.3 | 3.7 | 2.6 |
| ↳ edit | 3.0 | 3.1 | 3.0 | 2.9 |
| ↳ shell | 5.9 | 4.7 | 5.6 | 5.1 |
| ↳ search | 0.2 | 0.0 | 0.1 | 0.2 |
| ↳ web | 0.0 | 0.1 | 0.3 | 0.0 |
| ↳ other | 0.0 | 0.1 | 0.0 | 0.0 |
| Unparsed tool calls | 0 | 0 | 0 | 0 |
| Calls to tools not offered | 0 | 0 | 0 | 0 |
| Output cut off at limit | 0 | 0 | 0 | 0 |
| API errors | 0 | 0 | 0 | 0 |
| Requests resent after a closed connection | 2 | 1 | 0 | 3 |
| Runs that changed the tests | 0 | 0 | 0 | 0 |
| Runs that reached the bench cache | 0 | 0 | 0 | 0 |
| Web fetches / run | 0.05 | 0.17 | 0.33 | 0.00 |
| Fetches from solution sources | 4 | 14 | 23 | 0 |
| Runs that may hardcode test answers | 0 | 0 | 0 | 0 |
| Lines changed / run | 56 | 56 | 57 | 62 |

## Tools called, per run

- **featherloop**: shell 5.9, read 2.9, update 1.5, write 1.5, glob 0.1, grep 0.1, webfetch 0.0
- **opencode-stock**: shell 4.7, read 3.3, edit 2.0, write 1.1, webfetch 0.1, execute 0.1, glob 0.0
- **opencode-custom**: shell 5.6, read 3.7, edit 2.0, write 0.9, webfetch 0.3, glob 0.1, websearch 0.0, grep 0.0, execute 0.0
- **nanocode**: bash 5.1, read 2.6, edit 1.6, write 1.3, glob 0.2, grep 0.0

## Hosts fetched

- **featherloop**: raw.githubusercontent.com 4. From solution sources: python/go-counting: https://raw.githubusercontent.com/exercism/go-counting/main/.meta/reference.py; python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json; python/go-counting: https://raw.githubusercontent.com/exercism/reference-solutions/main/go/go-counting/.meta/reference.py; python/go-counting: https://raw.githubusercontent.com/exercism/reference-solutions/main/python/go-counting/.meta/reference.py
- **opencode-stock**: raw.githubusercontent.com 8, api.github.com 6. From solution sources: javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.tests/reference/go-counting.js; javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/reference/go-counting.js; javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/.meta; javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/.meta?ref=main; javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting/tests?ref=main; javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/proof.ci.js; javascript/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/.meta/reference/go_counting.py; javascript/go-counting: https://api.github.com/repos/exercism/javascript/git/blobs/bcd29aa175822e5d7a753ebc133b9dd7107ddee7; javascript/go-counting: https://api.github.com/repos/exercism/javascript/git/blobs/bcd29aa175822e5d7a753ebc133b9dd7107ddee7; javascript/go-counting: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/go-counting; javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/go-counting.spec.js; javascript/go-counting: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/go-counting/.meta/tests.toml; javascript/rest-api: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rest-api/.meta/rest-api.reference.js; javascript/rest-api: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rest-api/rest-api.spec.js
- **opencode-custom**: raw.githubusercontent.com 18, api.github.com 5, search 4. From solution sources: python/go-counting: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/go-counting/canonical-data.json; python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting.py; python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting_test.py; python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/.docs/instructions.append.md; python/go-counting: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/go-counting/go_counting.py; python/paasio: https://raw.githubusercontent.com/madomako/paasio/master/paasio.py; python/paasio: https://raw.githubusercontent.com/madomako/paasio/main/paasio.py; python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/canonical-data.json; python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/description.md; python/scale-generator: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/scale-generator/reference/scale_generator.py; python/scale-generator: https://raw.githubusercontent.com/exercism/python/master/exercises/practice/scale-generator/reference/scale_generator.py; python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator/reference; python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator; python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/.meta/reference.py; python/scale-generator: https://api.github.com/repos/exercism/python/contents/exercises/practice/scale-generator/.meta; python/scale-generator: https://raw.githubusercontent.com/exercism/python/main/exercises/practice/scale-generator/.meta/example.py; python/sgf-parsing: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/sgf-parsing/canonical-data.json; javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/.docs/instructions.append.md; javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/rational-numbers.js; javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/.docs/instructions.append.md; javascript/rational-numbers: https://api.github.com/repos/exercism/javascript/contents/exercises/practice/rational-numbers/solution; javascript/rational-numbers: https://api.github.com/repos/exercism/javascript/git/trees/main?recursive=1; javascript/rational-numbers: https://raw.githubusercontent.com/exercism/javascript/main/exercises/practice/rational-numbers/rational-numbers.spec.js
- **nanocode**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"reasoning_effort":"none"}; output limit 262144
- **opencode-stock**: server defaults; output limit 256000
- **opencode-custom**: server defaults; output limit 256000
- **nanocode**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop | opencode-stock | opencode-custom | nanocode |
|---|:---:|:---:|:---:|:---:|
| python/beer-song | ✓ | ✓ | ✓ | ✓ |
| python/affine-cipher | ✓ | ✓ | ✓ | ✓ |
| python/bottle-song | ✓ | ✓ | ✓ | ✓ |
| python/book-store | ✓ | ✓ | ✓ | ✗ (4/20🪙) |
| python/bowling | ✗ (0/31🪙) | ✗ (0/31🪙) | ✗ (0/31🪙) | ✗ (30/31🪙) |
| python/connect | ✓ | ✓ | ✗ (5/10🪙) | ✓ |
| python/dominoes | ✓ | ✓ | ✓ | ✓ |
| python/dot-dsl | ✓ | ✓ | ✓ | ✓ |
| python/food-chain | ✓ | ✓ | ✓ | ✓ |
| python/grade-school | ✓ | ✓ | ✓ | ✓ |
| python/go-counting | ✓🪙 | ✓ | ✗ (0/11🪙) | ✓ |
| python/forth | ✓ | ✓ | ✗ (0/54🪙) | ✓ |
| python/grep | ✓ | ✓ | ✓ | ✓ |
| python/hangman | ✓ | ✓ | ✓ | ✓ |
| python/list-ops | ✓ | ✓ | ✓ | ✓ |
| python/phone-number | ✓ | ✓ | ✓ | ✓ |
| python/pig-latin | ✓ | ✓ | ✓ | ✓ |
| python/poker | ✓ | ✓ | ✓ | ✓ |
| python/proverb | ✓ | ✓ | ✓ | ✓ |
| python/pov | ✓ | ✓ | ✓ | ✓ |
| python/paasio | ✓🪙 | ✗ (0/25🪙) | ✗ (13/25🪙) | ✗ (0/25🪙) |
| python/react | ✗ (2/14🪙) | ✓ | ✗ (2/14🪙) | ✓ |
| python/robot-name | ✓ | ✓ | ✓ | ✓ |
| python/rest-api | ✓ | ✓ | ✓ | ✓🪙 |
| python/scale-generator | ✓ | ✓ | ✓💥 | ✓ |
| python/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| python/transpose | ✓ | ✗ (0/12🪙) | ✓ | ✓ |
| python/tree-building | ✓ | ✓ | ✓ | ✓ |
| python/sgf-parsing | ✗ (9/23🪙) | ✗ (0/23🪙) | ✗ (0/23🪙) | ✗ (0/23🪙) |
| python/variable-length-quantity | ✓ | ✓ | ✓ | ✓ |
| python/two-bucket | ✓ | ✓ | ✗ (0/9🪙) | ✓ |
| python/wordy | ✓ | ✗ (0/25🪙) | ✓ | ✓ |
| python/zebra-puzzle | ✓ | ✓ | ✓ | ✗ (0/2🪙) |
| python/zipper | ✓ | ✓ | ✓ | ✓ |
| javascript/affine-cipher | ✓ | ✓ | ✓ | ✓ |
| javascript/beer-song | ✓ | ✓ | ✓ | ✓ |
| javascript/binary | ✓ | ✓ | ✓ | ✓ |
| javascript/alphametics | ✓🪙 | ✓ | ✓ | ✗ (3/9🪙) |
| javascript/book-store | ✓ | ✓ | ✗ (3/17🪙) | ✓ |
| javascript/bottle-song | ✓ | ✓ | ✓ | ✓ |
| javascript/bowling | ✗ (26/30🪙) | ✗ (0/30🪙) | ✗ (17/30🪙) | ✗ (0/30🪙) |
| javascript/connect | ✓ | ✓ | ✓ | ✗ (0/10🪙) |
| javascript/complex-numbers | ✓ | ✗ (30/31🪙) | ✓ | ✓ |
| javascript/food-chain | ✓ | ✓ | ✓ | ✓ |
| javascript/forth | ✗ (0/49🪙) | ✓ | ✓🪙 | ✗ (0/49🪙) |
| javascript/grade-school | ✓ | ✓ | ✓ | ✓ |
| javascript/go-counting | ✗ (0/11🪙) | ✓🪙 | ✗ (0/11🪙) | ✓ |
| javascript/grep | ✓ | ✓ | ✓ | ✓ |
| javascript/house | ✓ | ✓ | ✓ | ✓ |
| javascript/killer-sudoku-helper | ✓ | ✓ | ✓ | ✓ |
| javascript/meetup | ✓ | ✓ | ✓ | ✓ |
| javascript/list-ops | ✓ | ✓ | ✓ | ✓ |
| javascript/ocr-numbers | ✓ | ✓ | ✓ | ✓ |
| javascript/palindrome-products | ✗ (0/12🪙) | ✓ | ✓ | ✓ |
| javascript/parallel-letter-frequency | ✓ | ✗ (13/13🪙) | ✓ | ✓ |
| javascript/phone-number | ✓ | ✓ | ✓ | ✓ |
| javascript/pig-latin | ✓ | ✓ | ✓ | ✓ |
| javascript/poker | ✓ | ✓ | ✓ | ✓ |
| javascript/promises | ✓ | ✓ | ✓ | ✓ |
| javascript/queen-attack | ✓ | ✓ | ✗ (15/19🪙) | ✓ |
| javascript/rational-numbers | ✓ | ✓ | ✓💥 | ✓ |
| javascript/react | ✓ | ✓ | ✓ | ✓ |
| javascript/rectangles | ✓ | ✓ | ✓ | ✓ |
| javascript/resistor-color-trio | ✗ (1/6🪙) | ✓ | ✓ | ✓ |
| javascript/rest-api | ✓ | ✗ (0/9🪙) | ✓ | ✓ |
| javascript/say | ✓ | ✓ | ✓ | ✓ |
| javascript/robot-name | ✓ | ✓ | ✗ (8/9🪙) | ✓ |
| javascript/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| javascript/scale-generator | ✓ | ✓ | ✓ | ✓ |
| javascript/space-age | ✓ | ✓ | ✓ | ✓ |
| javascript/sum-of-multiples | ✓ | ✓ | ✓ | ✓ |
| javascript/state-of-tic-tac-toe | ✓ | ✗ (0/27🪙) | ✓ | ✓ |
| javascript/tournament | ✓ | ✓ | ✗ (0/12🪙) | ✓ |
| javascript/triangle | ✓ | ✓ | ✓ | ✓ |
| javascript/transpose | ✓ | ✓ | ✓ | ✓ |
| javascript/twelve-days | ✓ | ✓ | ✓ | ✓ |
| javascript/two-bucket | ✓ | ✗ (8/10🪙) | ✓ | ✓ |
| javascript/word-search | ✓ | ✓ | ✓ | ✓ |
| javascript/variable-length-quantity | ✓ | ✗ (0/26🪙) | ✓ | ✗ (0/26🪙) |
| javascript/wordy | ✓ | ✓ | ✓ | ✓ |
| javascript/zipper | ✓ | ✗ (15/19🪙) | ✓ | ✓ |
| javascript/zebra-puzzle | ✗ (0/2🪙) | ✓ | ✗ (1/2🪙) | ✗ (1/2🪙) |
