# Harness bench

Model: Qwen/Qwen3.6-35B-A3B (Qwen_Qwen3.6-35B-A3B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.6-35b-a3b. 8 cases × 3 reps, 4 at a time, 30 min timeout. Started 2026-10-04T10:53:27.288Z.
Versions: featherloop dbe35c1.

## Harnesses

- **featherloop** dbe35c1: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **16/24 (67%)** |
| 95% interval | 47%–82% |
| ↳ python | 5/12 |
| ↳ javascript | 11/12 |
| Tests passed (partial credit) | 82% |
| Timeouts / crashes | 8 / 0 |
| Wall clock, median (p90) | 656s (1800s) |
| Share waiting on the model | 99% |
| Model requests / run | 6.8 |
| Tokens / run | 143k |
| ↳ prompt (all) | 123k |
| ↳ prompt (processed, not cached) | 6.9k |
| ↳ completion | 20k |
| Tokens / pass | 214k |
| Output cut off uncounted, at least | 7.6k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 20k (72k) |
| Tool calls / run | 7.0 |
| ↳ read | 2.7 |
| ↳ edit | 1.8 |
| ↳ shell | 2.4 |
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
| Lines changed / run | 77 |

## Tools called, per run

- **featherloop**: read 2.7, shell 2.4, write 1.4, update 0.4, glob 0.0

## Hosts fetched

- **featherloop**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/connect | 2/3 (0/10⏱) |
| python/pov | 2/3 (0/15⏱) |
| javascript/connect | 2/3 (0/10⏱) |
| javascript/rest-api | ✓ |
| javascript/bowling | ✓ |
| python/bowling | ✗ (30/31⏱, 30/31⏱, 6/31⏱) |
| javascript/variable-length-quantity | ✓ |
| python/paasio | 1/3 (22/25⏱, 14/25⏱) |
