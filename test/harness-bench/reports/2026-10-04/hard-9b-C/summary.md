# Harness bench

Model: Qwen/Qwen3.5-9B-3 (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.5-9b. 19 cases × 3 reps, 4 at a time, 30 min timeout. Started 2026-10-04T09:47:43.361Z.
49 runs were run again after API errors (see meta.json's reruns).
Versions: featherloop ee7f180.

## Harnesses

- **featherloop** ee7f180: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **11/53 (21%)** |
| 95% interval | 12%–33% |
| ↳ python | 9/45 |
| ↳ javascript | 2/8 |
| Tests passed (partial credit) | 36% |
| Timeouts / crashes | 12 / 0 |
| Wall clock, median (p90) | 4s (1800s) |
| Share waiting on the model | 99% |
| Model requests / run | 9.7 |
| Tokens / run | 199k |
| ↳ prompt (all) | 190k |
| ↳ prompt (processed, not cached) | 8.9k |
| ↳ completion | 9.3k |
| Tokens / pass | 959k |
| Output cut off uncounted, at least | 1.6k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 0 (72k) |
| Tool calls / run | 7.8 |
| ↳ read | 0.9 |
| ↳ edit | 3.5 |
| ↳ shell | 3.4 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 90 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 44 |

## Tools called, per run

- **featherloop**: shell 3.4, write 3.3, read 0.9, update 0.2

## Hosts fetched

- **featherloop**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/dominoes | 2/3 (6/13) |
| python/book-store | 1/3 (13/20⏱, 0/20) |
| python/connect | ✗ (8/10⏱, 0/10, 0/10) |
| python/bowling | ✗ (5/31⏱, 4/31⏱, 0/31) |
| python/forth | ✗ (46/54⏱, 0/54, 0/54) |
| python/hangman | 2/3 (0/7) |
| python/poker | 1/3 (0/37, 0/37) |
| python/paasio | ✗ (24/25⏱, 0/25, 0/25) |
| python/pov | ✗ (9/15⏱, 0/15, 0/15) |
| python/react | ✗ (13/14⏱, 2/14, 2/14) |
| python/rest-api | 1/3 (0/9, 0/9) |
| python/robot-name | 1/3 (0/4, 0/4) |
| python/scale-generator | ✗ (15/17⏱, 0/17, 0/17) |
| python/sgf-parsing | ✗ (6/23⏱, 0/23, 0/23) |
| python/transpose | 1/3 (0/12, 0/12) |
| javascript/book-store | 1/2 (0/17) |
| javascript/bowling | ✗ (4/30⏱, 0/30) |
| javascript/complex-numbers | 1/2 (0/31) |
| javascript/connect | ✗ (8/10⏱, 0/10) |
