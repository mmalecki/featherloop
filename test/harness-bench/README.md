# Harness bench

Runs coding-agent harnesses on the same model, on the same tasks, and measures them
the same way: from the wire.

```sh
npm run bench -- -j 4                       # every harness on every case, 4 runs at a time
npm run bench -- -j 4 --set quick -r 3      # the quick set, 3 reps each
npm run bench -- -H featherloop python/wordy
npm run bench -- --list                     # harnesses and cases
npm run validate-cases                      # prove the grading, no model needed
node test/harness-bench/report.ts test/harness-bench/results/<run>   # re-summarize
```

Results land in `results/<timestamp>/`: `summary.md` and `summary.json`, `results.jsonl`
(a line per run), `meta.json` (versions, server, settings), `prompts/` and, per run,
`runs/<harness>/<case>-r<rep>/` with `requests.jsonl` (a line per model request),
`transcript.json` (the last request and its response: the whole conversation),
`stdout.log`, `stderr.log`, `changes.diff` and `test.log`.

## Harnesses

| name | what runs | config |
|---|---|---|
| `featherloop` | this repository, from source, `--shell` | `harnesses/featherloop/config.yaml` |
| `opencode-stock` | `opencode run --standalone --auto`, provider only | `harnesses/opencode-stock/opencode.json` |
| `opencode-custom` | the same, with the agents for smaller models | `harnesses/opencode-custom/` |
| `nanocode` | [1rgs/nanocode](https://github.com/1rgs/nanocode) at `b009d3d`, unmodified | `harnesses/nanocode/driver.py` |

The configs are copies of the user's (`~/.config/featherloop`, `~/.config/opencode`),
pointed at the bench, with only the model under test. Both opencode configs turn off
the title agent, which would otherwise take a server slot per run, so the two differ
only in `agents/`. `opencode-custom` leaves out websearch (it needs a key; the cases
are offline). featherloop runs without its advisor.

nanocode is an interactive REPL against a hard-coded Anthropic endpoint. The driver
imports it as it is and patches its endpoint (llama.cpp serves the Messages API too),
its `input()` (the task, then end of input) and `os.get_terminal_size`, which it calls
even with no terminal. It sends `max_tokens: 8192`, as shipped.

## Isolation

Each run gets a fresh temporary directory with its own `HOME`, `XDG_CONFIG_HOME`,
`XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CACHE_HOME`, `XDG_RUNTIME_DIR` and `TMPDIR`; the
harness's config is copied in, and the directory is deleted afterwards (`--keep` keeps
it). Sessions, databases, caches and the user's own instructions (`~/.config/*/AGENTS.md`,
`~/.claude/CLAUDE.md`) don't carry over between runs or in from the user.

The environment loses API keys (`OPENAI_*`, `ANTHROPIC_*`, `OPENROUTER_*`, `PARALLEL_*`),
`OPENCODE_*`, `MODEL` (featherloop and nanocode read it), npm's script variables
(`INIT_CWD` among them) and `PWD`, which is set to the workspace: opencode trusts it
over its real working directory. Harnesses run in their own process group, killed at the
timeout and after exit, with anything they left running.

Harnesses aren't sandboxed: their shell tools can reach the whole machine. A run whose
conversation mentions the exercises' checkout (where the reference solutions are) is
flagged in the results.

## Cases

From [Aider's polyglot benchmark](https://github.com/Aider-AI/polyglot-benchmark) at a
pinned commit, fetched into `cache/` on first use, with pytest and jest. `cases.json`
holds the sets and why they are what they are:

- `all` (default): all 82 Python and JavaScript exercises that grade correctly.
- `quick`: 30 of the easier ones, for iterating.

Each run's workspace is the exercise's stub, tests and support files (never `.meta`,
`.docs` or `.approaches`), committed to a fresh git repository. Jest's skipped tests are
un-skipped first, as Aider's runner does. The prompt is Aider's (the exercise's docs,
then which files to change), plus where the tests are and how to run them: agents can
run their own check loop, as they would on real work. After the run, tests and support
files are put back as shipped and the tests are run; a run passes when they all do.
Changed tests are reported.

Only Python and JavaScript: the bench assumes no go, rust, java or cmake toolchains.

## Metrics

A metering proxy sits between every harness and the server; each run gets its own
prefix on it. It parses both API dialects, streamed or not, as they pass.

- **Passed**, with a Wilson 95% interval, and **tests passed** (partial credit).
- **Wall clock**, and the share of it spent waiting on the model; the rest is the
  harness and its tools.
- **Tokens**: all prompt tokens over all requests, the uncached part of them (what the
  server had to process), and completion tokens. Streams that don't ask for usage are
  counted from llama.cpp's `timings`. **Tokens per pass** puts cost and success together.
- **First prompt**: the first request's prompt tokens, i.e. the harness's system prompt
  and tool definitions plus the task, which is the same for all harnesses.
- **Peak context**: the most of the context window any one request filled.
- **Requests** and **tool calls**, by tool and by kind (read, edit, shell, search, web).
- Small-model failure signals: **unparsed tool calls** (tool-call markup in the text,
  which the server couldn't parse), **calls to tools not offered**, **output cut off at
  the limit**, **API errors**, **timeouts** and **crashes**.
- **Sampling settings** each harness sent, against the server's defaults, since they
  differ between harnesses and move pass rates.
- **Lines changed**, and runs that **changed the tests** or **reached the bench cache**.

## Caveats

- Wall clock depends on load. Jobs are ordered case by case, harness by harness, so at
  `-j` equal to the harness count (4) each case's runs share the server at once. Above
  the server's slot count, requests queue, and that counts as model time.
- The timeout and `-j` are coupled: busy slots share the GPU, so each run generates more
  slowly. Measured on short prompts: 59 tokens/s alone, 38 per stream with 4 at once
  (141 in all, 2.7× the throughput); long contexts slow it further. A run gets less done
  before the timeout at `-j 4`, so compare harnesses only from runs at the same `-j`.
- nanocode catches every error and exits 0, so it never shows as crashed: its API
  failures show as failed runs.
- Some exercises can be answered from memory (zebra-puzzle's tests check two names);
  they're kept, as every harness gets the same chance at them.
- A 9B model varies a lot from run to run; use `-r 3` or more before reading much into
  a few points' difference.
- Partial credit counts tests in the source; a suite that fails to load scores 0.
