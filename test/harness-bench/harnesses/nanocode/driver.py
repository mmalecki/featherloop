"""Runs nanocode, unmodified, on one prompt and exits.

nanocode is an interactive REPL against a hard-coded Anthropic endpoint. This
points it at the bench's metering proxy (llama.cpp serves the Messages API too),
answers its first prompt with the task and its second with end of input, and
gives it a terminal size, which it asks for even when output isn't a terminal.

nanocode asks for at most 8192 output tokens, where the other harnesses ask for
the model's output limit, as their configs have it. With BENCH_MAX_TOKENS, its
requests ask for that instead: a request field the server stops at, which the
model never sees.

Environment: NANOCODE (path to nanocode.py), BENCH_BASE_URL (with /v1),
BENCH_MODEL, BENCH_PROMPT, and optionally BENCH_MAX_TOKENS.
"""

import builtins
import json
import os
import sys
import urllib.request

# No __pycache__ in the bench's checkout.
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.environ["NANOCODE"]))
import nanocode  # noqa: E402

nanocode.API_URL = os.environ["BENCH_BASE_URL"].rstrip("/") + "/messages"
nanocode.MODEL = os.environ["BENCH_MODEL"]
os.get_terminal_size = lambda *_: os.terminal_size((80, 24))

if os.environ.get("BENCH_MAX_TOKENS"):
    urlopen = urllib.request.urlopen

    def uncapped(request, *args, **kwargs):
        body = json.loads(request.data)
        body["max_tokens"] = int(os.environ["BENCH_MAX_TOKENS"])
        request.data = json.dumps(body).encode()
        return urlopen(request, *args, **kwargs)

    urllib.request.urlopen = uncapped

prompts = [os.environ["BENCH_PROMPT"]]


def answer(_prompt=""):
    # Anything but EOFError (or KeyboardInterrupt) would be caught and asked again, forever.
    if not prompts:
        raise EOFError
    return prompts.pop(0)


builtins.input = answer
nanocode.main()
