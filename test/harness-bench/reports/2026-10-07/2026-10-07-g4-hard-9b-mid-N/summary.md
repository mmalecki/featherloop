# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 5 slots.
Bench model qwen3.5-9b. 9 cases × 10 reps, up to 2 at a time per server, on 3 servers, 120 min timeout. Started 2026-10-07T23:16:48.872Z.
Versions: featherloop fc6fdc7.

## Harnesses

- **featherloop** fc6fdc7: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **47/90 (52%)** |
| 95% interval | 42%–62% |
| ↳ python | 33/70 |
| ↳ javascript | 14/20 |
| Tests passed (partial credit) | 85% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 42 |
| Wall clock, median (p90) | 685s (851s) |
| Share waiting on the model | 95% |
| Model requests / run | 36.2 |
| Tokens / run | 922k |
| ↳ prompt (all) | 893k |
| ↳ prompt (processed, not cached) | 34k |
| ↳ completion | 28k |
| Tokens / pass | 1765k |
| Output cut off uncounted, at least | 1.2k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 42k (76k) |
| Tool calls / run | 36.0 |
| ↳ read | 2.8 |
| ↳ edit | 14.9 |
| ↳ shell | 18.0 |
| ↳ search | 0.3 |
| ↳ web | 0.0 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Requests resent after a closed connection | 5 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.07 |
| Fetches from solution sources | 6 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 111 |

## Tools called, per run

- **featherloop**: shell 18.0, write 13.5, read 2.8, update 1.4, grep 0.1, glob 0.1, webfetch 0.0

## Hosts fetched

- **featherloop**: github.com 5, raw.githubusercontent.com 1. From solution sources: python/connect: https://github.com/exercism/problem-specifications/tree/main/exercises/connect/canonical-data.json; python/connect: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/connect/canonical-data.json; python/paasio: https://github.com/pytest-dev/pytest-mock/blob/main/docs/source/reference.rst; javascript/complex-numbers: https://github.com/exercism/javascript; javascript/complex-numbers: https://github.com/exercism/javascript; python/transpose: https://github.com/exercism/problem-specifications/blob/main/exercises/transpose/canonical-data.json

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":1.5,"frequency_penalty":0,"repeat_penalty":1,"dry_multiplier":0,"xtc_probability":0,"typical_p":1,"top_n_sigma":-1,"mirostat":0}

- **featherloop**: {"presence_penalty":1.5}; {"presence_penalty":1.5,"reasoning_effort":"none"}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/pov | 4/10 (14/15🪙, 13/15🪙, 12/15🪙, 0/15🪙, 11/15🪙, 10/15🪙) |
| python/paasio | 5/10 (22/25🪙, 23/25🪙, 11/25🪙, 20/25🪙, 24/25🪙) |
| python/forth | 4/10 (35/54🪙, 43/54🪙, 42/54🪙, 51/54🪙, 52/54🪙, 47/54🪙) |
| python/connect | 1/10 (6/10🪙, 7/10🪙, 7/10🪙, 8/10🪙, 6/10🪙, 8/10🪙, 7/10🪙, 8/10🪙, 8/10🪙) |
| python/book-store | 8/10 (6/20🪙, 17/20🪙) |
| python/react | 3/10 (5/14🪙, 13/14🪙, 13/14🪙, 13/14🪙, 13/14🪙, 13/14🪙, 4/14🪙) |
| javascript/book-store | 5/10 (12/17🪙, 0/17🪙, 12/17🪙, 0/17, 0/17🪙) |
| python/transpose | 8/10 (8/12🪙, 11/12🪙) |
| javascript/complex-numbers | 9/10 (30/31🪙) |
