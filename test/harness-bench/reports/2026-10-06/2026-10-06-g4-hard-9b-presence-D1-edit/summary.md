# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 5 slots.
Bench model qwen3.5-9b-presence. 19 cases × 3 reps, up to 2 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-06T02:54:31.156Z.
Versions: featherloop 14f2a39.

## Harnesses

- **featherloop** 14f2a39: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **29/57 (51%)** |
| 95% interval | 38%–63% |
| ↳ python | 25/45 |
| ↳ javascript | 4/12 |
| Tests passed (partial credit) | 83% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 28 |
| Wall clock, median (p90) | 566s (859s) |
| Share waiting on the model | 93% |
| Model requests / run | 34.8 |
| Tokens / run | 1030k |
| ↳ prompt (all) | 1004k |
| ↳ prompt (processed, not cached) | 16k |
| ↳ completion | 26k |
| Tokens / pass | 2024k |
| Output cut off uncounted, at least | 348 |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 50k (79k) |
| Tool calls / run | 34.6 |
| ↳ read | 3.3 |
| ↳ edit | 14.1 |
| ↳ shell | 17.0 |
| ↳ search | 0.2 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Requests resent after a closed connection | 3 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.02 |
| Fetches from solution sources | 1 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 158 |

## Tools called, per run

- **featherloop**: shell 17.0, write 8.1, update 6.1, read 3.3, glob 0.2

## Hosts fetched

- **featherloop**: github.com 1. From solution sources: python/connect: https://github.com/exercism/problem-specifications/raw/main/exercises/connect/canonical-data.json

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"presence_penalty":1.5}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/hangman | 2/3 (5/7🪙) |
| python/dominoes | ✓ |
| python/book-store | 1/3 (13/20🪙, 18/20🪙) |
| python/paasio | 2/3 (20/25🪙) |
| python/poker | ✓ |
| python/rest-api | ✓ |
| python/robot-name | ✓ |
| python/pov | 1/3 (13/15🪙, 10/15🪙) |
| python/bowling | ✗ (22/31🪙, 8/31🪙, 29/31🪙) |
| python/connect | ✗ (7/10🪙, 8/10🪙, 6/10🪙) |
| python/scale-generator | ✓ |
| javascript/book-store | 2/3 (12/17🪙) |
| javascript/complex-numbers | 2/3 (30/31🪙) |
| python/react | 1/3 (13/14🪙, 7/14🪙) |
| python/sgf-parsing | ✗ (5/23🪙, 14/23🪙, 12/23🪙) |
| python/forth | 2/3 (0/54🪙) |
| python/transpose | 1/3 (11/12🪙, 8/12🪙) |
| javascript/bowling | ✗ (17/30🪙, 17/30🪙, 11/30🪙) |
| javascript/connect | ✗ (9/10🪙, 7/10🪙, 6/10🪙) |
