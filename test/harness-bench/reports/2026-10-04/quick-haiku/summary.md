# Harness bench

Model: claude-haiku-4-5-20251001, hosted API.
Bench model claude-haiku-4-5. 30 cases × 1 reps, 4 at a time, 30 min timeout. Started 2026-10-04T08:30:11.952Z.
Versions: featherloop 9173bc0, opencode-stock opencode v2.0.22, opencode-custom opencode v2.0.22, nanocode b009d3d.

## Harnesses

- **featherloop** 9173bc0: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.
- **opencode-stock** opencode v2.0.22: opencode with only the provider configured; config: harnesses/opencode-stock. title agent off (it takes a server slot per run).
- **opencode-custom** opencode v2.0.22: opencode with the user's agents for smaller models; config: harnesses/opencode-custom. title agent off (it takes a server slot per run); websearch off (it needs a key; the cases are offline).
- **nanocode** b009d3d: github.com/1rgs/nanocode at b009d3d, unmodified, driven by harnesses/nanocode/driver.py. max_tokens 64000 (the model's output limit) in place of its 8192.

## Results

| | featherloop | opencode-stock | opencode-custom | nanocode |
|---|---:|---:|---:|---:|
| **Passed** | **30/30 (100%)** | **30/30 (100%)** | **30/30 (100%)** | **29/30 (97%)** |
| 95% interval | 89%–100% | 89%–100% | 89%–100% | 83%–99% |
| ↳ python | 15/15 | 15/15 | 15/15 | 15/15 |
| ↳ javascript | 15/15 | 15/15 | 15/15 | 14/15 |
| Tests passed (partial credit) | 100% | 100% | 100% | 97% |
| Timeouts / crashes | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Wall clock, median (p90) | 16s (34s) | 20s (49s) | 18s (48s) | 17s (36s) |
| Share waiting on the model | 91% | 85% | 86% | 91% |
| Model requests / run | 7.8 | 8.6 | 9.3 | 9.4 |
| Tokens / run | 42k | 99k | 94k | 65k |
| ↳ prompt (all) | 40k | 97k | 91k | 63k |
| ↳ prompt (processed, not cached) | 16k | 13k | 11k | 63k |
| ↳ completion | 2.0k | 2.6k | 2.5k | 2.3k |
| Tokens / pass | 42k | 99k | 94k | 67k |
| Cost / run | $0.030 | $0.038 | $0.035 | $0.074 |
| Cost / pass | $0.030 | $0.038 | $0.035 | $0.077 |
| Cost, all runs | $0.90 | $1.14 | $1.05 | $2.22 |
| Output cut off uncounted, at least | 0 | 0 | 0 | 0 |
| First prompt (system + tools + task) | 1.8k | 6.3k | 4.6k | 1.5k |
| Peak context, median (max) | 6.6k (18k) | 13k (26k) | 9.9k (36k) | 6.8k (26k) |
| Tool calls / run | 8.4 | 8.9 | 9.0 | 9.5 |
| ↳ read | 3.9 | 4.0 | 4.0 | 3.9 |
| ↳ edit | 1.7 | 2.3 | 2.1 | 1.8 |
| ↳ shell | 1.9 | 2.6 | 2.9 | 3.3 |
| ↳ search | 0.8 | 0.0 | 0.0 | 0.5 |
| Unparsed tool calls | 0 | 0 | 0 | 0 |
| Calls to tools not offered | 0 | 0 | 1 | 0 |
| Output cut off at limit | 0 | 0 | 0 | 0 |
| API errors | 0 | 0 | 0 | 1 |
| Runs that changed the tests | 0 | 0 | 0 | 0 |
| Runs that reached the bench cache | 0 | 0 | 0 | 0 |
| Web fetches / run | 0.00 | 0.00 | 0.00 | 0.00 |
| Fetches from solution sources | 0 | 0 | 0 | 0 |
| Runs that may hardcode test answers | 0 | 0 | 0 | 0 |
| Lines changed / run | 63 | 51 | 56 | 59 |

## Tools called, per run

- **featherloop**: read 3.9, shell 1.9, write 1.1, glob 0.8, update 0.6
- **opencode-stock**: read 4.0, shell 2.6, edit 2.1, write 0.1
- **opencode-custom**: read 4.0, shell 2.8, edit 1.9, write 0.3, bash 0.0
- **nanocode**: read 3.9, bash 3.3, write 1.0, edit 0.8, glob 0.5

## Hosts fetched

- **featherloop**: none
- **opencode-stock**: none
- **opencode-custom**: none
- **nanocode**: none

## Sampling settings sent

Server defaults: {}

- **featherloop**: server defaults; output limit 64000
- **opencode-stock**: server defaults; output limit 64000
- **opencode-custom**: server defaults; output limit 64000
- **nanocode**: server defaults; output limit 64000

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop | opencode-stock | opencode-custom | nanocode |
|---|:---:|:---:|:---:|:---:|
| python/proverb | ✓ | ✓ | ✓ | ✓ |
| python/pig-latin | ✓ | ✓ | ✓ | ✓ |
| python/list-ops | ✓ | ✓ | ✓ | ✓ |
| python/variable-length-quantity | ✓ | ✓ | ✓ | ✓ |
| python/grade-school | ✓ | ✓ | ✓ | ✓ |
| python/bottle-song | ✓ | ✓ | ✓ | ✓ |
| python/robot-name | ✓ | ✓ | ✓ | ✓ |
| python/affine-cipher | ✓ | ✓ | ✓ | ✓ |
| python/tree-building | ✓ | ✓ | ✓ | ✓ |
| python/grep | ✓ | ✓ | ✓ | ✓ |
| python/wordy | ✓ | ✓ | ✓ | ✓ |
| python/phone-number | ✓ | ✓ | ✓ | ✓ |
| python/hangman | ✓ | ✓ | ✓ | ✓ |
| python/food-chain | ✓ | ✓ | ✓ | ✓ |
| python/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| javascript/sum-of-multiples | ✓ | ✓ | ✓ | ✓ |
| javascript/binary | ✓ | ✓ | ✓ | ✗ (0/10) |
| javascript/pig-latin | ✓ | ✓ | ✓ | ✓ |
| javascript/space-age | ✓ | ✓ | ✓ | ✓ |
| javascript/grade-school | ✓ | ✓ | ✓ | ✓ |
| javascript/triangle | ✓ | ✓ | ✓ | ✓ |
| javascript/phone-number | ✓ | ✓ | ✓ | ✓ |
| javascript/bottle-song | ✓ | ✓ | ✓ | ✓ |
| javascript/wordy | ✓ | ✓ | ✓ | ✓ |
| javascript/complex-numbers | ✓ | ✓ | ✓ | ✓ |
| javascript/simple-linked-list | ✓ | ✓ | ✓ | ✓ |
| javascript/twelve-days | ✓ | ✓ | ✓ | ✓ |
| javascript/queen-attack | ✓ | ✓ | ✓ | ✓ |
| javascript/resistor-color-trio | ✓ | ✓ | ✓ | ✓ |
| javascript/say | ✓ | ✓ | ✓ | ✓ |
