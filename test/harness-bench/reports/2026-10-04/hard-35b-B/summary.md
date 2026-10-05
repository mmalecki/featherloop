# Harness bench

Model: Qwen/Qwen3.6-35B-A3B (Qwen_Qwen3.6-35B-A3B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.6-35b-a3b. 8 cases × 3 reps, 4 at a time, 30 min timeout. Started 2026-10-04T08:58:19.516Z.
Versions: featherloop 63ed62b.

## Harnesses

- **featherloop** 63ed62b: This repository, from source, with --shell; config: harnesses/featherloop. --shell; no advisor, no subagent.

## Results

| | featherloop |
|---|---:|
| **Passed** | **19/24 (79%)** |
| 95% interval | 60%–91% |
| ↳ python | 10/12 |
| ↳ javascript | 9/12 |
| Tests passed (partial credit) | 89% |
| Timeouts / crashes | 5 / 0 |
| Wall clock, median (p90) | 923s (1800s) |
| Share waiting on the model | 99% |
| Model requests / run | 6.9 |
| Tokens / run | 161k |
| ↳ prompt (all) | 139k |
| ↳ prompt (processed, not cached) | 9.5k |
| ↳ completion | 22k |
| Tokens / pass | 203k |
| Output cut off uncounted, at least | 8.0k |
| First prompt (system + tools + task) | 1.6k |
| Peak context, median (max) | 27k (64k) |
| Tool calls / run | 7.3 |
| ↳ read | 3.2 |
| ↳ edit | 1.8 |
| ↳ shell | 2.2 |
| ↳ search | 0.1 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | – |
| Fetches from solution sources | – |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 78 |

## Tools called, per run

- **featherloop**: read 3.2, shell 2.2, write 1.2, update 0.5, glob 0.1

## Hosts fetched

- **featherloop**: not tracked

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **featherloop**: server defaults; output limit 262144

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | featherloop |
|---|:---:|
| python/pov | ✓ |
| python/paasio | ✓ |
| python/bowling | ✓ |
| python/connect | 1/3 (7/10⏱, 7/10⏱) |
| javascript/rest-api | ✓ |
| javascript/variable-length-quantity | ✓ |
| javascript/bowling | ✓ |
| javascript/connect | ✗ (9/10⏱, 0/10⏱, 0/10⏱) |
