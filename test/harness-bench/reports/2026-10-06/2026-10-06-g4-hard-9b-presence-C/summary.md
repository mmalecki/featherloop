# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 5 slots.
Bench model qwen3.5-9b-presence. 19 cases × 3 reps, up to 2 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-06T01:25:50.255Z.
Versions: featherloop c17d56c.

## Harnesses

- **featherloop** c17d56c: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **32/57 (56%)** |
| 95% interval | 43%–68% |
| ↳ python | 28/45 |
| ↳ javascript | 4/12 |
| Tests passed (partial credit) | 85% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 24 |
| Wall clock, median (p90) | 536s (861s) |
| Share waiting on the model | 91% |
| Model requests / run | 31.4 |
| Tokens / run | 876k |
| ↳ prompt (all) | 851k |
| ↳ prompt (processed, not cached) | 19k |
| ↳ completion | 25k |
| Tokens / pass | 1561k |
| Output cut off uncounted, at least | 283 |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 47k (76k) |
| Tool calls / run | 31.3 |
| ↳ read | 2.8 |
| ↳ edit | 11.8 |
| ↳ shell | 16.6 |
| ↳ search | 0.2 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Requests resent after a closed connection | 5 |
| Runs that changed the tests | 1 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 160 |

## Tools called, per run

- **featherloop**: shell 16.6, write 11.1, read 2.8, update 0.6, glob 0.1, grep 0.0

## Hosts fetched

- **featherloop**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"presence_penalty":1.5}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/dominoes | ✓ |
| python/paasio | 1/3 (24/25🪙, 22/25🪙) |
| python/hangman | ✓ |
| python/poker | ✓ |
| python/book-store | 1/3 (18/20🪙, 1/20🪙) |
| python/connect | 1/3 (6/10🪙, 9/10🪙) |
| python/robot-name | ✓ |
| python/bowling | ✗ (24/31🪙, 29/31🪙, 8/31🪙) |
| python/forth | 2/3 (39/54🪙) |
| python/rest-api | ✓ |
| python/pov | 1/3 (7/15🪙, 10/15🪙) |
| python/transpose | ✓ |
| javascript/complex-numbers | 2/3 (30/31) |
| python/react | 1/3 (13/14🪙, 5/14🪙) |
| python/scale-generator | ✓ |
| javascript/book-store | 2/3 (12/17🪙) |
| javascript/connect | ✗ (9/10🪙, 7/10🪙, 9/10🪙) |
| python/sgf-parsing | ✗ (0/23🪙, 13/23🪙, 10/23🪙) |
| javascript/bowling | ✗ (17/30🪙, 28/30🪙, 9/30🪙) |
