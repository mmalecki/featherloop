# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 5 slots.
Bench model qwen3.5-9b-presence. 19 cases × 3 reps, up to 2 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-06T02:54:31.227Z.
Versions: featherloop a8803ad.

## Harnesses

- **featherloop** a8803ad: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **33/57 (58%)** |
| 95% interval | 45%–70% |
| ↳ python | 29/45 |
| ↳ javascript | 4/12 |
| Tests passed (partial credit) | 87% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 24 |
| Wall clock, median (p90) | 533s (838s) |
| Share waiting on the model | 98% |
| Model requests / run | 29.4 |
| Tokens / run | 844k |
| ↳ prompt (all) | 821k |
| ↳ prompt (processed, not cached) | 15k |
| ↳ completion | 23k |
| Tokens / pass | 1458k |
| Output cut off uncounted, at least | 385 |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 43k (89k) |
| Tool calls / run | 29.2 |
| ↳ read | 2.3 |
| ↳ edit | 12.7 |
| ↳ shell | 14.2 |
| ↳ search | 0.1 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Requests resent after a closed connection | 8 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 132 |

## Tools called, per run

- **featherloop**: shell 14.2, write 12.2, read 2.3, update 0.4, glob 0.1

## Hosts fetched

- **featherloop**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"presence_penalty":1.5}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/hangman | ✓ |
| python/book-store | ✓ |
| python/dominoes | ✓ |
| python/poker | ✓ |
| python/bowling | ✗ (29/31🪙, 11/31🪙, 28/31🪙) |
| python/react | 1/3 (13/14🪙, 11/14🪙) |
| python/robot-name | ✓ |
| python/connect | ✗ (9/10🪙, 9/10🪙, 6/10🪙) |
| python/pov | 2/3 (7/15🪙) |
| python/forth | 1/3 (43/54🪙, 52/54🪙) |
| python/paasio | 2/3 (24/25🪙) |
| python/scale-generator | ✓ |
| python/transpose | 2/3 (7/12🪙) |
| javascript/book-store | 2/3 (12/17🪙) |
| python/rest-api | ✓ |
| python/sgf-parsing | ✗ (3/23🪙, 5/23🪙, 15/23🪙) |
| javascript/bowling | ✗ (17/30🪙, 21/30🪙, 8/30🪙) |
| javascript/connect | ✗ (8/10🪙, 7/10🪙, 6/10🪙) |
| javascript/complex-numbers | 2/3 (28/31🪙) |
