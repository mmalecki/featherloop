# Harness bench

Model: Qwen/Qwen3.6-35B-A3B (Qwen_Qwen3.6-35B-A3B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.6-35b-a3b. 82 cases × 1 reps, 4 at a time, 30 min timeout. Started 2026-10-04T06:55:45.397Z.
Versions: featherloop 63ed62b.

## Harnesses

- **featherloop** 63ed62b: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **13/13 (100%)** |
| 95% interval | 77%–100% |
| ↳ python | 13/13 |
| Tests passed (partial credit) | 100% |
| Timeouts / crashes | 0 / 0 |
| Wall clock, median (p90) | 65s (206s) |
| Share waiting on the model | 99% |
| Model requests / run | 5.1 |
| Tokens / run | 32k |
| ↳ prompt (all) | 29k |
| ↳ prompt (processed, not cached) | 4.6k |
| ↳ completion | 3.3k |
| Tokens / pass | 32k |
| Output cut off uncounted, at least | 0 |
| First prompt (system + tools + task) | 1.5k |
| Peak context, median (max) | 5.6k (20k) |
| Tool calls / run | 5.2 |
| ↳ read | 2.4 |
| ↳ edit | 1.2 |
| ↳ shell | 1.4 |
| ↳ search | 0.2 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Lines changed / run | 43 |

## Tools called, per run

- **featherloop**: read 2.4, shell 1.4, write 1.2, glob 0.2, update 0.1

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/affine-cipher | ✓ |
| python/beer-song | ✓ |
| python/bottle-song | ✓ |
| python/connect | ✓ |
| python/dominoes | ✓ |
| python/food-chain | ✓ |
| python/dot-dsl | ✓ |
| python/book-store | ✓ |
| python/grade-school | ✓ |
| python/go-counting | ✓ |
| python/hangman | ✓ |
| python/list-ops | ✓ |
| python/grep | ✓ |
