# Harness bench

Model: Qwen/Qwen3.5-9B-5 (Qwen_Qwen3.5-9B-Q5_K_M.gguf), llama.cpp b11371-99b95488c, 4 slots.
Bench model qwen3.5-9b. 30 cases × 1 reps, 4 at a time, 30 min timeout. Started 2026-10-04T09:52:43.909Z.
Versions: claude-code 2.1.289 (Claude Code).

## Harnesses

- **claude-code** 2.1.289 (Claude Code): Claude Code, headless (-p), with permissions skipped. headless (-p), --dangerously-skip-permissions; its background model set to the model under test; telemetry and updates off; on llama.cpp, its mid-conversation system messages are folded into the user turn before them (the chat template takes one, first).

## Results

| | claude-code |
|---|---:|
| **Passed** | **28/30 (93%)** |
| 95% interval | 79%–98% |
| ↳ python | 14/15 |
| ↳ javascript | 14/15 |
| Tests passed (partial credit) | 96% |
| Timeouts / crashes | 2 / 0 |
| Wall clock, median (p90) | 259s (1646s) |
| Share waiting on the model | 98% |
| Model requests / run | 10.9 |
| Tokens / run | 261k |
| ↳ prompt (all) | 256k |
| ↳ prompt (processed, not cached) | 33k |
| ↳ completion | 5.0k |
| Tokens / pass | 280k |
| Output cut off uncounted, at least | 0 |
| First prompt (system + tools + task) | 16k |
| Peak context, median (max) | 22k (50k) |
| Tool calls / run | 10.5 |
| ↳ read | 2.6 |
| ↳ edit | 4.9 |
| ↳ shell | 2.9 |
| ↳ other | 0.0 |
| Unparsed tool calls | 0 |
| Calls to tools not offered | 0 |
| Output cut off at limit | 0 |
| API errors | 0 |
| Runs that changed the tests | 0 |
| Runs that reached the bench cache | 0 |
| Web fetches / run | 0.00 |
| Fetches from solution sources | 0 |
| Runs that may hardcode test answers | 0 |
| Lines changed / run | 53 |

## Tools called, per run

- **claude-code**: Edit 3.2, Bash 2.9, Read 2.6, Write 1.7, ExitWorktree 0.0

## Hosts fetched

- **claude-code**: none

## Sampling settings sent

Server defaults: {"temperature":0.6000000238418579,"top_k":20,"top_p":0.949999988079071,"min_p":0,"presence_penalty":0,"repeat_penalty":1}

- **claude-code**: {"thinking":{"type":"adaptive","display":"updates"}}; output limit 32000

## By case

Passes out of reps; tests passed in brackets for runs that failed. ⏱ timed out, 🪙 out of output budget, 💥 crashed (graded all the same).

| case | claude-code |
|---|:---:|
| python/pig-latin | ✓ |
| python/proverb | ✓ |
| python/grade-school | ✓ |
| python/robot-name | ✓ |
| python/list-ops | ✓ |
| python/bottle-song | ✓ |
| python/affine-cipher | ✓ |
| python/tree-building | ✓ |
| python/grep | ✓ |
| python/phone-number | ✓ |
| python/wordy | ✓ |
| python/food-chain | ✓ |
| python/simple-linked-list | ✓ |
| javascript/sum-of-multiples | ✓ |
| javascript/binary | ✓ |
| javascript/pig-latin | ✓ |
| javascript/space-age | ✓ |
| javascript/grade-school | ✓ |
| python/hangman | ✓ |
| javascript/triangle | ✓ |
| javascript/phone-number | ✓ |
| python/variable-length-quantity | ✗ (0/26⏱) |
| javascript/bottle-song | ✓ |
| javascript/twelve-days | ✓ |
| javascript/simple-linked-list | ✓ |
| javascript/resistor-color-trio | ✓ |
| javascript/say | ✓ |
| javascript/complex-numbers | ✓ |
| javascript/wordy | ✓ |
| javascript/queen-attack | ✗ (16/19⏱) |
