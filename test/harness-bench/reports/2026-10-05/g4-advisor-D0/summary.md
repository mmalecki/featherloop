# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 8 slots.
Bench model qwen3.5-9b. 6 cases × 3 reps, 1 at a time, 60 min timeout. Started 2026-10-04T19:20:47.161Z.
Versions: featherloop-advisor 65117f1.

## Harnesses

- **featherloop-advisor** 65117f1: This repository, from source, with --shell and --advisor; config: harnesses/featherloop, plus the advisor. --shell --advisor, advised by claude-sonnet-5-5; no subagent.

## Results

| | featherloop-advisor |
|---|---:|
| **Passed** | **3/9 (33%)** |
| 95% interval | 12%–65% |
| ↳ python | 3/9 |
| Tests passed (partial credit) | 85% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 6 |
| Wall clock, median (p90) | 1237s (1335s) |
| Share waiting on the model | 97% |
| Model requests / run | 26.8 |
| Tokens / run | 843k |
| ↳ prompt (all) | 813k |
| ↳ prompt (processed, not cached) | 63k |
| ↳ completion | 31k |
| Tokens / pass | 2529k |
| Advisor calls / run | 0.0 |
| Runs that asked the advisor | 0/9 |
| Advisor cost, all runs | $0.00 |
| Cost / run | $0.000 |
| Cost / pass | $0.000 |
| Cost, all runs | $0.00 |
| Output cut off uncounted, at least | 1.4k |
| First prompt (system + tools + task) | 2.0k |
| Peak context, median (max) | 58k (91k) |
| Tool calls / run | 27.0 |
| ↳ read | 2.9 |
| ↳ edit | 11.3 |
| ↳ shell | 12.7 |
| ↳ search | 0.1 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 152 |

## Tools called, per run

- **featherloop-advisor**: shell 12.7, write 11.1, read 2.9, update 0.2, glob 0.1

## Hosts fetched

- **featherloop-advisor**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop-advisor**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop-advisor |
|---|:---:|
| python/bowling | ✗ (28/31🪙, 28/31🪙) |
| python/forth | ✓ |
| python/pov | ✗ (8/15🪙, 10/15🪙) |
| python/react | ✗ (13/14🪙) |
| python/sgf-parsing | ✗ (16/23🪙) |
| python/transpose | ✓ |
