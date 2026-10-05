# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 8 slots.
Bench model qwen3.5-9b. 19 cases × 3 reps, 2 at a time, 60 min timeout. Started 2026-10-04T18:43:33.414Z.
Versions: featherloop 5984a13.

## Harnesses

- **featherloop** 5984a13: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **25/57 (44%)** |
| 95% interval | 32%–57% |
| ↳ python | 22/45 |
| ↳ javascript | 3/12 |
| Tests passed (partial credit) | 77% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 33 |
| Wall clock, median (p90) | 772s (1226s) |
| Share waiting on the model | 98% |
| Model requests / run | 19.2 |
| Tokens / run | 515k |
| ↳ prompt (all) | 494k |
| ↳ prompt (processed, not cached) | 26k |
| ↳ completion | 21k |
| Tokens / pass | 1174k |
| Output cut off uncounted, at least | 7.5k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 39k (81k) |
| Tool calls / run | 19.1 |
| ↳ read | 2.4 |
| ↳ edit | 7.6 |
| ↳ shell | 9.0 |
| ↳ search | 0.1 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 1 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 134 |

## Tools called, per run

- **featherloop**: shell 9.0, write 7.5, read 2.4, update 0.2, glob 0.1, grep 0.0

## Hosts fetched

- **featherloop**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/book-store | 1/3 (0/20🪙, 17/20🪙) |
| python/bowling | ✗ (14/31🪙, 3/31🪙, 5/31🪙) |
| python/dominoes | ✓ |
| python/forth | 1/3 (52/54🪙, 51/54🪙) |
| python/connect | ✗ (5/10🪙, 8/10🪙, 6/10🪙) |
| python/hangman | ✓ |
| python/poker | ✓ |
| python/paasio | 1/3 (24/25🪙, 24/25🪙) |
| python/pov | ✗ (10/15🪙, 7/15🪙, 8/15🪙) |
| python/rest-api | ✓ |
| python/robot-name | ✓ |
| python/react | 1/3🪙 (2/14🪙, 13/14🪙) |
| python/scale-generator | 2/3 (16/17🪙) |
| python/sgf-parsing | ✗ (3/23🪙, 16/23🪙, 6/23🪙) |
| python/transpose | 1/3 (11/12🪙, 8/12🪙) |
| javascript/book-store | 2/3 (12/17🪙) |
| javascript/complex-numbers | 1/3 (30/31🪙, 28/31🪙) |
| javascript/bowling | ✗ (0/30🪙, 4/30🪙, 20/30🪙) |
| javascript/connect | ✗ (7/10🪙, 6/10🪙, 8/10🪙) |
