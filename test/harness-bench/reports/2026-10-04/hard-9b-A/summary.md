# Harness bench

Model: Qwen/Qwen3.5-9B-2 (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.5-9b. 19 cases × 3 reps, 4 at a time, 30 min timeout. Started 2026-10-04T08:13:46.095Z.
Versions: featherloop 6ff4981.

## Harnesses

- **featherloop** 6ff4981: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **24/57 (42%)** |
| 95% interval | 30%–55% |
| ↳ python | 22/45 |
| ↳ javascript | 2/12 |
| Tests passed (partial credit) | 76% |
| Timeouts / crashes | 33 / 0 |
| Wall clock, median (p90) | 1800s (1800s) |
| Share waiting on the model | 99% |
| Model requests / run | 15.7 |
| Tokens / run | 390k |
| ↳ prompt (all) | 372k |
| ↳ prompt (processed, not cached) | 16k |
| ↳ completion | 18k |
| Tokens / pass | 925k |
| Output cut off uncounted, at least | 12k |
| First prompt (system + tools + task) | 1.5k |
| Peak context, median (max) | 23k (76k) |
| Tool calls / run | 15.5 |
| ↳ read | 2.1 |
| ↳ edit | 6.7 |
| ↳ shell | 6.6 |
| ↳ search | 0.0 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 110 |

## Tools called, per run

- **featherloop**: shell 6.6, write 6.3, read 2.1, update 0.4, glob 0.0

## Hosts fetched

- **featherloop**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/dominoes | ✓ |
| python/book-store | 2/3 (0/20⏱) |
| python/hangman | ✓ |
| python/paasio | 2/3 (24/25⏱) |
| python/bowling | ✗ (25/31⏱, 3/31⏱, 5/31⏱) |
| python/connect | ✗ (7/10⏱, 7/10⏱, 9/10⏱) |
| python/forth | ✗ (47/54⏱, 47/54⏱, 47/54⏱) |
| python/rest-api | ✓ |
| python/robot-name | ✓ |
| python/poker | 1/3 (14/37⏱, 6/37⏱) |
| python/pov | ✗ (8/15⏱, 10/15⏱, 10/15⏱) |
| python/react | 1/3 (13/14⏱, 13/14⏱) |
| python/scale-generator | 2/3 (2/17⏱) |
| python/sgf-parsing | ✗ (17/23⏱, 13/23⏱, 11/23⏱) |
| python/transpose | 2/3 (9/12⏱) |
| javascript/book-store | ✗ (0/17⏱, 0/17⏱, 16/17⏱) |
| javascript/bowling | 1/3 (14/30⏱, 8/30⏱) |
| javascript/complex-numbers | 1/3 (30/31⏱, 30/31⏱) |
| javascript/connect | ✗ (4/10⏱, 8/10⏱, 8/10⏱) |
