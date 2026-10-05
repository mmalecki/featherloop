# Harness bench

Model: Qwen/Qwen3.5-9B (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 8 slots.
Bench model qwen3.5-9b. 19 cases × 3 reps, 2 at a time, 60 min timeout. Started 2026-10-04T18:43:33.433Z.
Versions: featherloop 65117f1.

## Harnesses

- **featherloop** 65117f1: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **24/57 (42%)** |
| 95% interval | 30%–55% |
| ↳ python | 21/45 |
| ↳ javascript | 3/12 |
| Tests passed (partial credit) | 77% |
| Timeouts / crashes | 0 / 0 |
| Out of output budget | 32 |
| Wall clock, median (p90) | 814s (1244s) |
| Share waiting on the model | 94% |
| Model requests / run | 18.3 |
| Tokens / run | 457k |
| ↳ prompt (all) | 437k |
| ↳ prompt (processed, not cached) | 33k |
| ↳ completion | 20k |
| Tokens / pass | 1084k |
| Output cut off uncounted, at least | 8.7k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 30k (77k) |
| Tool calls / run | 18.0 |
| ↳ read | 2.4 |
| ↳ edit | 7.2 |
| ↳ shell | 8.2 |
| ↳ search | 0.1 |
| ↳ web | 0.1 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.19 |
| Fetches from solution sources | 10 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 114 |

## Tools called, per run

- **featherloop**: shell 8.2, write 6.4, read 2.4, update 0.8, webfetch 0.1, glob 0.0, grep 0.0

## Hosts fetched

- **featherloop**: raw.githubusercontent.com 9, github.com 1, en.wikipedia.org 1. From solution sources: python/connect: https://github.com/exercism/problem-specifications/tree/main/exercises/connect/canonical-data.json; python/connect: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/connect/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json; python/transpose: https://raw.githubusercontent.com/exercism/problem-specifications/main/exercises/transpose/canonical-data.json

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: {"reasoning_effort":"none"}; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/book-store | 1/3 (13/20🪙, 12/20🪙) |
| python/bowling | ✗ (8/31🪙, 4/31🪙, 26/31🪙) |
| python/dominoes | ✓ |
| python/connect | 1/3 (6/10🪙, 7/10🪙) |
| python/hangman | ✓ |
| python/forth | 1/3 (0/54🪙, 41/54🪙) |
| python/poker | ✓ |
| python/paasio | 1/3 (23/25🪙, 23/25🪙) |
| python/pov | ✗ (10/15🪙, 5/15🪙, 5/15🪙) |
| python/react | ✗ (13/14🪙, 7/14🪙, 12/14🪙) |
| python/rest-api | 2/3 (3/9🪙) |
| python/robot-name | 2/3 (3/4🪙) |
| python/scale-generator | ✓ |
| python/sgf-parsing | ✗ (5/23🪙, 13/23🪙, 12/23🪙) |
| python/transpose | 1/3 (9/12🪙, 9/12) |
| javascript/book-store | 1/3 (15/17🪙, 2/17🪙) |
| javascript/bowling | ✗ (26/30🪙, 15/30🪙, 13/30🪙) |
| javascript/complex-numbers | 1/3 (30/31🪙, 30/31🪙) |
| javascript/connect | 1/3 (8/10🪙, 6/10🪙) |
