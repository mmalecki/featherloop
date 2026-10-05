"""Generation throughput of a llama-server: N concurrent requests, fixed output length.

usage: throughput-probe.py <base-url> <label>
Runs: 1 x short, 8 x short, 8 x long (~50k-token prompts, distinct prefixes).
Every request generates exactly MAX tokens (ignore_eos), with the server's sampling.
"""
import json, sys, time, threading, urllib.request, urllib.error

BASE, LABEL = sys.argv[1], sys.argv[2]
MAX = 1500
TASK = 'Write a Python implementation of a bowling score calculator with full validation, then explain it.'
FILLER = open(__file__).read() + '\n'  # some code to pad long prompts with

def request(prompt):
    body = json.dumps({
        'model': 'x', 'messages': [{'role': 'user', 'content': prompt}],
        'max_tokens': MAX, 'ignore_eos': True, 'cache_prompt': False,
    }).encode()
    req = urllib.request.Request(BASE + '/v1/chat/completions', body, {'content-type': 'application/json'})
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=1800) as res:
            data = json.load(res)
    except urllib.error.HTTPError as e:
        print(f'  HTTP {e.code}: {e.read()[:300]!r}', flush=True)
        raise
    t = data.get('timings', {})
    return {'start': start, 'end': time.time(), 'n': t.get('predicted_n', 0), 'gen_ms': t.get('predicted_ms', 0),
            'prompt_n': t.get('prompt_n', 0), 'prompt_ms': t.get('prompt_ms', 0)}

def batch(name, prompts):
    out = [None] * len(prompts)
    def go(i):
        out[i] = request(prompts[i])
    threads = [threading.Thread(target=go, args=(i,)) for i in range(len(prompts))]
    t0 = time.time()
    for t in threads: t.start()
    for t in threads: t.join()
    wall = time.time() - t0
    per = [r['n'] / (r['gen_ms'] / 1000) for r in out if r['gen_ms']]
    gen_total = sum(r['n'] for r in out)
    # Aggregate generation rate: tokens over the span when all were generating, approximated by
    # the slowest request's generation time (prompts are processed before generation starts).
    slowest_gen = max(r['gen_ms'] for r in out) / 1000
    print(f"{LABEL:10s} {name:22s} prompt {out[0]['prompt_n']:>6} tok | per request {sum(per)/len(per):6.1f} tok/s "
          f"(min {min(per):.1f}) | aggregate {gen_total/slowest_gen:7.1f} tok/s | wall {wall:6.1f}s", flush=True)

long = [f'Request {i}. Read this code, then do the task at the end.\n\n' + FILLER * 75 + '\n' + TASK for i in range(8)]
if '--long-only' not in sys.argv:
    batch('1 x short', [TASK])
    batch('8 x short', [f'Request {i}. {TASK}' for i in range(8)])
batch('8 x long', long)
