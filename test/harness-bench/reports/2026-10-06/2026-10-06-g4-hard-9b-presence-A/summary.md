# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 5 slots.
Bench model qwen3.5-9b-presence. 19 cases × 3 reps, up to 2 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-06T01:25:50.256Z.
Versions: featherloop 6371a53.

## Harnesses

- **featherloop** 6371a53: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **34/57 (60%)** |
| 95% interval | 47%–71% |
| ↳ python | 28/45 |
| ↳ javascript | 6/12 |
| Tests passed (partial credit) | 86% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 23 |
| Wall clock, median (p90) | 573s (792s) |
| Share waiting on the model | 97% |
| Model requests / run | 29.1 |
| Tokens / run | 778k |
| ↳ prompt (all) | 754k |
| ↳ prompt (processed, not cached) | 15k |
| ↳ completion | 24k |
| Tokens / pass | 1305k |
| Output cut off uncounted, at least | 278 |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 45k (64k) |
| Tool calls / run | 28.9 |
| ↳ read | 2.6 |
| ↳ edit | 11.8 |
| ↳ shell | 14.5 |
| ↳ search | 0.1 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Requests resent after a closed connection | 5 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 134 |

## Tools called, per run

- **featherloop**: shell 14.5, write 11.2, read 2.6, update 0.6, glob 0.1

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
| python/book-store | 1/3 (18/20🪙, 18/20🪙) |
| python/connect | 1/3 (6/10🪙, 7/10🪙) |
| python/dominoes | 2/3 (7/13🪙) |
| python/paasio | 2/3 (11/25🪙) |
| python/bowling | ✗ (14/31🪙, 23/31🪙, 28/31🪙) |
| python/forth | 2/3 (25/54🪙) |
| python/robot-name | ✓ |
| python/poker | ✓ |
| python/rest-api | ✓ |
| javascript/book-store | ✓ |
| python/transpose | 2/3 (9/12🪙) |
| python/scale-generator | ✓ |
| python/pov | 1/3 (14/15🪙, 13/15🪙) |
| python/react | 2/3 (13/14🪙) |
| python/sgf-parsing | ✗ (6/23🪙, 15/23🪙, 15/23🪙) |
| javascript/complex-numbers | ✓ |
| javascript/bowling | ✗ (18/30🪙, 4/30🪙, 13/30🪙) |
| javascript/connect | ✗ (5/10🪙, 8/10🪙, 8/10🪙) |
