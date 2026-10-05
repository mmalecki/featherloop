# Harness bench

Model: abenzerps/Spark-X2.5-4B-GGUF:Q8_0 (Spark-X2.5-4B-Q8_0.gguf), llama.cpp b11382-11fe02151, 4 slots.
Bench model spark-x2.5-4b. 3 cases × 1 reps, 3 at a time, 30 min timeout. Started 2026-10-04T22:15:38.057Z.
Versions: featherloop 65117f1.

## Harnesses

- **featherloop** 65117f1: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **1/3 (33%)** |
| 95% interval | 6%–79% |
| ↳ python | 1/3 |
| Tests passed (partial credit) | 49% |
| Timeouts / crashes | 3 / 0 |
| Wall clock, median (p90) | 1803s (1805s) |
| Share waiting on the model | 100% |
| Model requests / run | 9.3 |
| Tokens / run | 77k |
| ↳ prompt (all) | 67k |
| ↳ prompt (processed, not cached) | 3.9k |
| ↳ completion | 10k |
| Tokens / pass | 232k |
| Output cut off uncounted, at least | 9.1k |
| First prompt (system + tools + task) | 1.1k |
| Peak context, median (max) | 14k (26k) |
| Tool calls / run | 9.7 |
| ↳ read | 2.7 |
| ↳ edit | 0.3 |
| ↳ shell | 6.3 |
| ↳ search | 0.3 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 23 |

## Tools called, per run

- **featherloop**: shell 6.3, read 2.7, glob 0.3, write 0.3

## Hosts fetched

- **featherloop**: none

## Sampling settings sent

Server defaults: {"temperature":1,"top_k":-1,"top_p":0.949999988079071,"min_p":0.05000000074505806,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 131072

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/dominoes | ✗ (6/13⏱) |
| python/robot-name | ✓⏱ |
| python/hangman | ✗ (0/7⏱) |
