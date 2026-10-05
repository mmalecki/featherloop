# Harness bench

Model: Qwen/Qwen3.5-9B-4 (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.5-9b. 19 cases × 3 reps, 4 at a time, 30 min timeout. Started 2026-10-04T09:47:18.123Z.
Versions: featherloop 63ed62b.

## Harnesses

- **featherloop** 63ed62b: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **28/57 (49%)** |
| 95% interval | 37%–62% |
| ↳ python | 25/45 |
| ↳ javascript | 3/12 |
| Tests passed (partial credit) | 77% |
| Timeouts / crashes | 29 / 0 |
| Wall clock, median (p90) | 1800s (1800s) |
| Share waiting on the model | 99% |
| Model requests / run | 20.1 |
| Tokens / run | 513k |
| ↳ prompt (all) | 493k |
| ↳ prompt (processed, not cached) | 20k |
| ↳ completion | 20k |
| Tokens / pass | 1044k |
| Output cut off uncounted, at least | 7.1k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 31k (79k) |
| Tool calls / run | 20.0 |
| ↳ read | 2.5 |
| ↳ edit | 7.4 |
| ↳ shell | 10.0 |
| ↳ search | 0.1 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | – |
| Fetches from solution sources | – |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 98 |

## Tools called, per run

- **featherloop**: shell 10.0, write 7.1, read 2.5, update 0.3, glob 0.1, grep 0.0

## Hosts fetched

- **featherloop**: not tracked

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/dominoes | ✓ |
| python/book-store | 1/3 (0/20⏱, 1/20⏱) |
| python/connect | ✗ (8/10⏱, 8/10⏱, 6/10⏱) |
| python/bowling | ✗ (0/31⏱, 28/31⏱, 17/31⏱) |
| python/forth | ✗ (44/54⏱, 45/54⏱, 51/54⏱) |
| python/paasio | ✓ |
| python/poker | ✓ |
| python/hangman | ✓ |
| python/robot-name | ✓ |
| python/rest-api | ✓ |
| python/pov | ✗ (13/15⏱, 9/15⏱, 9/15⏱) |
| python/react | 1/3 (4/14⏱, 13/14⏱) |
| python/scale-generator | ✓ |
| python/sgf-parsing | ✗ (13/23⏱, 4/23⏱, 4/23⏱) |
| python/transpose | 2/3 (8/12⏱) |
| javascript/book-store | 1/3 (16/17⏱, 0/17⏱) |
| javascript/bowling | ✗ (5/30⏱, 16/30⏱, 0/30⏱) |
| javascript/complex-numbers | 1/3 (30/31⏱, 30/31⏱) |
| javascript/connect | 1/3 (7/10⏱, 6/10⏱) |
