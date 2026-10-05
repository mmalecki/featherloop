# Harness bench

Model: Qwen/Qwen3.6-35B-A3B (Qwen_Qwen3.6-35B-A3B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.6-35b-a3b. 8 cases × 3 reps, 4 at a time, 30 min timeout. Started 2026-10-04T07:08:29.646Z.
Versions: featherloop b08c09c.

## Harnesses

- **featherloop** b08c09c: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **17/24 (71%)** |
| 95% interval | 51%–85% |
| ↳ python | 7/12 |
| ↳ javascript | 10/12 |
| Tests passed (partial credit) | 83% |
| Timeouts / crashes | 7 / 0 |
| Wall clock, median (p90) | 1011s (1800s) |
| Share waiting on the model | 100% |
| Model requests / run | 6.5 |
| Tokens / run | 121k |
| ↳ prompt (all) | 100k |
| ↳ prompt (processed, not cached) | 8.2k |
| ↳ completion | 21k |
| Tokens / pass | 171k |
| Output cut off uncounted, at least | 9.1k |
| First prompt (system + tools + task) | 1.5k |
| Peak context, median (max) | 30k (56k) |
| Tool calls / run | 6.8 |
| ↳ read | 2.5 |
| ↳ edit | 2.0 |
| ↳ shell | 2.2 |
| ↳ search | 0.1 |
| ↳ web | 0.0 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.04 |
| Fetches from solution sources | 1 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 79 |

## Tools called, per run

- **featherloop**: read 2.5, shell 2.2, write 1.6, update 0.4, glob 0.1, webfetch 0.0

## Hosts fetched

- **featherloop**: raw.githubusercontent.com 1. From solution sources: python/connect: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/connect/canonical-data.json

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: {"reasoning_effort":"none"}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/paasio | ✓ |
| python/bowling | 2/3 (0/31⏱) |
| javascript/bowling | 2/3 (13/30⏱) |
| python/connect | ✗ (8/10⏱, 6/10⏱, 8/10⏱) |
| python/pov | 2/3 (5/15⏱) |
| javascript/variable-length-quantity | ✓ |
| javascript/rest-api | ✓ |
| javascript/connect | 2/3 (0/10⏱) |
