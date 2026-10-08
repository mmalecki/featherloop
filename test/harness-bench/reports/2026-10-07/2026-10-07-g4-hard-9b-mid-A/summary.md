# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 5 slots.
Bench model qwen3.5-9b. 9 cases × 10 reps, up to 2 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-07T23:16:49.419Z.
Versions: featherloop 6051ea1.

## Harnesses

- **featherloop** 6051ea1: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **51/90 (57%)** |
| 95% interval | 46%–66% |
| ↳ python | 36/70 |
| ↳ javascript | 15/20 |
| Tests passed (partial credit) | 87% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 41 |
| Wall clock, median (p90) | 683s (857s) |
| Share waiting on the model | 94% |
| Model requests / run | 40.8 |
| Tokens / run | 1238k |
| ↳ prompt (all) | 1212k |
| ↳ prompt (processed, not cached) | 20k |
| ↳ completion | 27k |
| Tokens / pass | 2185k |
| Output cut off uncounted, at least | 1.1k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 50k (73k) |
| Tool calls / run | 40.6 |
| ↳ read | 3.0 |
| ↳ edit | 14.8 |
| ↳ shell | 22.6 |
| ↳ search | 0.1 |
| ↳ web | 0.0 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Requests resent after a closed connection | 9 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.02 |
| Fetches from solution sources | 2 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 99 |

## Tools called, per run

- **featherloop**: shell 22.6, write 12.5, read 3.0, update 2.3, glob 0.1, grep 0.0, webfetch 0.0

## Hosts fetched

- **featherloop**: github.com 1, raw.githubusercontent.com 1. From solution sources: python/forth: https://github.com/exercism/problem-specifications/tree/main/exercises/forth/canonical-data.json; python/forth: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/forth/canonical-data.json

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":1.5,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"presence_penalty":1.5}; {"presence_penalty":1.5,"reasoning_effort":"none"}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/book-store | ✓🪙 |
| python/transpose | 8/10 (11/12🪙, 11/12🪙) |
| python/paasio | 8/10 (23/25🪙, 22/25🪙) |
| python/connect | 1/10 (7/10🪙, 6/10🪙, 7/10🪙, 6/10🪙, 8/10🪙, 7/10🪙, 8/10🪙, 8/10🪙, 6/10🪙) |
| python/pov | 3/10 (10/15🪙, 8/15🪙, 13/15🪙, 10/15🪙, 13/15🪙, 0/15🪙, 10/15🪙) |
| python/forth | 5/10🪙 (45/54🪙, 51/54🪙, 52/54🪙, 41/54🪙, 0/54🪙) |
| python/react | 1/10 (6/14🪙, 5/14🪙, 13/14🪙, 4/14🪙, 13/14🪙, 11/14🪙, 13/14🪙, 10/14🪙, 13/14🪙) |
| javascript/book-store | 7/10 (0/17🪙, 16/17🪙, 3/17🪙) |
| javascript/complex-numbers | 8/10 (30/31🪙, 30/31🪙) |
