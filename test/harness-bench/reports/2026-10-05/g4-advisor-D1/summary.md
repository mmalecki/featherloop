# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 8 slots.
Bench model qwen3.5-9b. 6 cases × 3 reps, 1 at a time, 60 min timeout. Started 2026-10-04T19:22:16.653Z.
Versions: featherloop-advisor e317660.

## Harnesses

- **featherloop-advisor** e317660: This repository, from source, with --shell and --advisor; config: harnesses/featherloop, plus the advisor. --shell --advisor, advised by claude-sonnet-5-5; no subagent.

## Results

| | featherloop-advisor |
|---|---:|
| **Passed** | **0/9 (0%)** |
| 95% interval | 0%–30% |
| ↳ python | 0/9 |
| Tests passed (partial credit) | 63% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 9 |
| Wall clock, median (p90) | 1178s (1347s) |
| Share waiting on the model | 98% |
| Model requests / run | 18.7 |
| Tokens / run | 457k |
| ↳ prompt (all) | 437k |
| ↳ prompt (processed, not cached) | 30k |
| ↳ completion | 20k |
| Tokens / pass | – |
| Advisor calls / run | 0.0 |
| Runs that asked the advisor | 0/9 |
| Advisor cost, all runs | $0.00 |
| Cost / run | $0.000 |
| Cost / pass | – |
| Cost, all runs | $0.00 |
| Output cut off uncounted, at least | 20k |
| First prompt (system + tools + task) | 2.0k |
| Peak context, median (max) | 27k (68k) |
| Tool calls / run | 18.7 |
| ↳ read | 2.6 |
| ↳ edit | 7.0 |
| ↳ shell | 8.9 |
| ↳ search | 0.2 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 122 |

## Tools called, per run

- **featherloop-advisor**: shell 8.9, write 7.0, read 2.6, glob 0.2

## Hosts fetched

- **featherloop-advisor**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop-advisor**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop-advisor |
|---|:---:|
| python/bowling | ✗ (17/31🪙, 4/31🪙) |
| python/forth | ✗ (45/54🪙, 43/54🪙) |
| python/pov | ✗ (6/15🪙, 10/15🪙) |
| python/react | ✗ (13/14🪙) |
| python/sgf-parsing | ✗ (17/23🪙) |
| python/transpose | ✗ (8/12🪙) |
