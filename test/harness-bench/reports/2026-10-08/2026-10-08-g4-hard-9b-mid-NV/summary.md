# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 5 slots.
Bench model qwen3.5-9b. 9 cases × 10 reps, up to 4 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-08T10:23:12.508Z.
Versions: featherloop 21abb67, featherloop-advisor 21abb67.

## Harnesses

- **featherloop** 21abb67: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.
- **featherloop-advisor** 21abb67: This repository, from source, with --shell and --advisor; config: harnesses/featherloop, plus the advisor. --shell --advisor, advised by claude-sonnet-5-5; no subagent.

## Results

| | featherloop | featherloop-advisor |
|---|---:|---:|
| **Passed** | **45/90 (50%)** | **73/90 (81%)** |
| 95% interval | 40%–60% | 72%–88% |
| ↳ python | 29/70 | 56/70 |
| ↳ javascript | 16/20 | 17/20 |
| Tests passed (partial credit) | 84% | 95% |
| Timeouts / crashes | 0 / 0 | 0 / 0 |
| Out of output budget | 44 | 17 |
| Wall clock, median (p90) | 653s (807s) | 365s (842s) |
| Share waiting on the model | 95% | 85% |
| Model requests / run | 35.9 | 30.4 |
| Tokens / run | 903k | 773k |
| ↳ prompt (all) | 875k | 752k |
| ↳ prompt (processed, not cached) | 26k | 30k |
| ↳ completion | 28k | 21k |
| Tokens / pass | 1806k | 953k |
| Advisor calls / run | – | 0.0 |
| Runs that asked the advisor | – | 3/90 |
| Advisor cost, all runs | – | $5.56 |
| Cost / run | – | $0.062 |
| Cost / pass | – | $0.076 |
| Cost, all runs | – | $5.56 |
| Output cut off uncounted, at least | 353 | 89 |
| First prompt (system + tools + task) | 1.6k | 1.8k |
| Peak context, median (max) | 43k (70k) | 30k (94k) |
| Tool calls / run | 35.8 | 30.1 |
| ↳ read | 2.8 | 2.7 |
| ↳ edit | 16.9 | 11.5 |
| ↳ shell | 15.8 | 15.6 |
| ↳ search | 0.1 | 0.2 |
| ↳ web | 0.0 | 0.0 |
| ↳ other | 0.0 | 0.0 |
| Unparsed tool calls | 0 | 0 |
| Calls to tools not offered | 0 | 0 |
| Output cut off at limit | 0 | 0 |
| API errors | 0 | 0 |
| Requests resent after a closed connection | 5 | 8 |
| Runs that changed the tests | 0 | 0 |
| Runs that reached the bench cache | 0 | 0 |
| Web fetches / run | 0.01 | 0.04 |
| Fetches from solution sources | 1 | 4 |
| Runs that may hardcode test answers | 0 | 0 |
| Lines changed / run | 135 | 93 |

## Tools called, per run

- **featherloop**: shell 15.8, write 15.4, read 2.8, update 1.5, glob 0.1, grep 0.0, webfetch 0.0
- **featherloop-advisor**: shell 15.6, write 10.3, read 2.7, update 1.2, glob 0.1, webfetch 0.0, subagent 0.0, grep 0.0

## Hosts fetched

- **featherloop**: raw.githubusercontent.com 1. From solution sources: javascript/complex-numbers: https://raw.githubusercontent.com/exercism/javascript/main/babel-preset-javascript/src/index.js
- **featherloop-advisor**: github.com 2, raw.githubusercontent.com 2. From solution sources: python/connect: https://github.com/exercism/problem-specifications/tree/main/exercises/connect/canonical-data.json; python/transpose: https://github.com/exercism/problem-specifications/tree/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":1.5,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"presence_penalty":1.5}; output limit 262144
- **featherloop-advisor**: {"presence_penalty":1.5}; {"presence_penalty":1.5,"reasoning_effort":"none"}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop | featherloop-advisor |
|---|:---:|:---:|
| python/book-store | 6/10 (18/20🪙, 0/20🪙, 15/20🪙, 8/20🪙) | ✓ |
| python/pov | 4/10 (10/15🪙, 10/15🪙, 10/15🪙, 5/15🪙, 11/15🪙, 13/15🪙) | 5/10 (6/15🪙, 12/15🪙, 9/15🪙, 13/15🪙, 10/15🪙) |
| python/transpose | 5/10 (11/12🪙, 7/12🪙, 8/12🪙, 9/12🪙, 8/12🪙) | ✓ |
| python/paasio | 7/10 (20/25🪙, 13/25🪙, 23/25🪙) | ✓ |
| python/react | 2/10 (13/14🪙, 11/14🪙, 12/14🪙, 7/14🪙, 13/14🪙, 13/14🪙, 5/14🪙, 5/14🪙) | 8/10 (12/14🪙, 11/14🪙) |
| javascript/complex-numbers | 7/10 (30/31🪙, 0/31🪙, 30/31) | ✓ |
| javascript/book-store | 9/10 (9/17🪙) | 7/10 (6/17🪙, 14/17🪙, 12/17🪙) |
| python/connect | 1/10 (8/10🪙, 6/10🪙, 9/10🪙, 8/10🪙, 7/10🪙, 0/10🪙, 8/10🪙, 8/10🪙, 8/10🪙) | 8/10 (8/10🪙, 6/10🪙) |
| python/forth | 4/10 (51/54🪙, 52/54🪙, 50/54🪙, 45/54🪙, 0/54🪙, 43/54🪙) | 5/10 (43/54🪙, 51/54🪙, 52/54🪙, 51/54🪙, 48/54🪙) |
