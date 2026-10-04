"""Runs nanocode, unmodified, on one prompt and exits.

nanocode is an interactive REPL against a hard-coded Anthropic endpoint. This
points it at the bench's metering proxy (llama.cpp serves the Messages API too),
answers its first prompt with the task and its second with end of input, and
gives it a terminal size, which it asks for even when output isn't a terminal.

Environment: NANOCODE (path to nanocode.py), BENCH_BASE_URL (with /v1),
BENCH_MODEL, BENCH_PROMPT.
"""

import builtins
import os
import sys

# No __pycache__ in the bench's checkout.
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.environ["NANOCODE"]))
import nanocode  # noqa: E402

nanocode.API_URL = os.environ["BENCH_BASE_URL"].rstrip("/") + "/messages"
nanocode.MODEL = os.environ["BENCH_MODEL"]
os.get_terminal_size = lambda *_: os.terminal_size((80, 24))

prompts = [os.environ["BENCH_PROMPT"]]


def answer(_prompt=""):
    # Anything but EOFError (or KeyboardInterrupt) would be caught and asked again, forever.
    if not prompts:
        raise EOFError
    return prompts.pop(0)


builtins.input = answer
nanocode.main()
