# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 8 slots.
Bench model qwen3.5-9b. 19 cases × 3 reps, 2 at a time, 60 min timeout. Started 2026-10-04T18:43:33.458Z.
Versions: featherloop db328aa.

## Harnesses

- **featherloop** db328aa: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **29/57 (51%)** |
| 95% interval | 38%–63% |
| ↳ python | 25/45 |
| ↳ javascript | 4/12 |
| Tests passed (partial credit) | 81% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 28 |
| Wall clock, median (p90) | 800s (1230s) |
| Share waiting on the model | 95% |
| Model requests / run | 20.0 |
| Tokens / run | 528k |
| ↳ prompt (all) | 507k |
| ↳ prompt (processed, not cached) | 30k |
| ↳ completion | 22k |
| Tokens / pass | 1038k |
| Output cut off uncounted, at least | 5.2k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 40k (98k) |
| Tool calls / run | 19.9 |
| ↳ read | 2.5 |
| ↳ edit | 7.5 |
| ↳ shell | 9.8 |
| ↳ search | 0.1 |
| ↳ web | 0.0 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 1 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.04 |
| Fetches from solution sources | 2 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 128 |

## Tools called, per run

- **featherloop**: shell 9.8, write 7.3, read 2.5, update 0.2, glob 0.1, webfetch 0.0

## Hosts fetched

- **featherloop**: github.com 1, raw.githubusercontent.com 1. From solution sources: python/scale-generator: https://github.com/exercism/problem-specifications/tree/main/exercises/scale-generator/canonical-data.json; python/scale-generator: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/scale-generator/canonical-data.json

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: {"reasoning_effort":"none"}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/book-store | ✓ |
| python/bowling | ✗ (11/31🪙, 4/31🪙, 22/31🪙) |
| python/dominoes | ✓ |
| python/connect | ✗ (9/10🪙, 9/10🪙, 6/10🪙) |
| python/hangman | ✓ |
| python/forth | 1/3 (0/54🪙, 45/54🪙) |
| python/paasio | 1/3 (12/25🪙, 24/25🪙) |
| python/poker | ✓ |
| python/pov | 1/3 (9/15🪙, 9/15🪙) |
| python/react | ✗ (13/14🪙, 2/14🪙, 13/14🪙) |
| python/rest-api | ✓ |
| python/robot-name | 2/3 (3/4🪙) |
| python/scale-generator | ✓ |
| python/transpose | 2/3 (8/12🪙) |
| python/sgf-parsing | ✗ (12/23🪙, 2/23🪙, 18/23🪙) |
| javascript/book-store | ✓ |
| javascript/bowling | ✗ (3/30🪙, 16/30🪙, 5/30🪙) |
| javascript/complex-numbers | ✗ (30/31🪙, 30/31🪙, 30/31🪙) |
| javascript/connect | 1/3 (7/10🪙, 8/10🪙) |
