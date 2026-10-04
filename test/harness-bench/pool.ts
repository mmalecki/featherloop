import { EventEmitter } from 'node:events';
import { basename } from 'node:path';

/**
 * The bench's model servers, and the runs they pull. Servers come from a list that
 * can change (`--servers-cmd`, re-run every so often: e.g. a GCP managed instance
 * group of spot VMs) or a fixed one (`--base-url`). A server joins once it's healthy
 * and serves the model and build the pool started on, and takes as many runs at once
 * as it has slots (capped by `-j`). One queue feeds them all: whichever has a free
 * slot takes the next run. A server that fails its health checks leaves the pool, and
 * its runs go back on the queue, as do runs that hit infrastructure errors.
 */

/** What the pool compares servers on, so results stay comparable: the model file and llama.cpp's build. */
export interface Reference {
  model: string | null;
  build: string | null;
}

/** What a health check found: healthy or not, and llama.cpp's `/props` when it answers them. */
export interface Health {
  ok: boolean;
  /** Why not. */
  why?: string;
  props?: { modelPath?: string; build?: string; slots?: number };
}

export interface Server {
  /** Its base URL, with /v1. */
  url: string;
  /** `probing` until it first passes, `refused` while it serves another model or build, `down` after failing its checks. */
  state: 'probing' | 'up' | 'down' | 'refused';
  /** Still in the list: a server that left it takes no new runs, and is forgotten once its runs end. */
  listed: boolean;
  /** Runs it takes at once: its slots, capped by `-j`. */
  slots: number;
  /** Runs on it now. */
  busy: number;
  /** Health checks failed in a row. */
  failures: number;
  /** Why it isn't up. */
  why?: string;
  props?: Health['props'];
}

export interface PoolOptions {
  /** The servers' base URLs, with /v1. Throws to keep the last list (a failed `gcloud`, say). */
  list: () => Promise<string[]>;
  /** Milliseconds between lists; Infinity for a fixed list. */
  listEvery: number;
  /** Checks a server's health, and reads its props. */
  probe: (url: string) => Promise<Health>;
  /** Milliseconds between health checks; Infinity for none after the first. */
  checkEvery: number;
  /** Failed checks in a row that take a server out of the pool. */
  failures?: number;
  /** A cap on each server's runs at once (`-j`). */
  jobs?: number;
  /** What servers must match; by default, whatever the first to join serves. */
  reference?: Reference;
  log: (line: string) => void;
}

/** Events: `join` (a server is up, again or for the first time), `lost` (it went down, with runs on it or not), `change` (anything that may free a slot). */
export class ServerPool extends EventEmitter<{ join: [Server]; lost: [Server]; change: [] }> {
  readonly servers = new Map<string, Server>();
  reference: Reference | undefined;
  readonly #options: PoolOptions;
  #timers: NodeJS.Timeout[] = [];
  #checking = false;
  #listing = false;

  constructor(options: PoolOptions) {
    super();
    this.#options = options;
    this.reference = options.reference;
  }

  /** Lists and checks the servers once, then keeps at it. */
  async start(): Promise<void> {
    await this.refresh();
    const every = (ms: number, fn: () => Promise<void>) => {
      if (Number.isFinite(ms)) this.#timers.push(setInterval(() => void fn(), ms));
    };
    every(this.#options.listEvery, () => this.refresh());
    every(this.#options.checkEvery, () => this.check());
  }

  stop(): void {
    for (const timer of this.#timers) clearInterval(timer);
    this.#timers = [];
  }

  /** Re-reads the list: new servers are checked, and join if they pass; those gone from it take no new runs. */
  async refresh(): Promise<void> {
    if (this.#listing) return;
    this.#listing = true;
    try {
      let urls: string[];
      try {
        urls = [...new Set((await this.#options.list()).map((url) => url.trim()).filter((url) => url && !url.startsWith('#')))];
      } catch (err) {
        this.#options.log(`servers: listing failed, keeping the last list: ${(err as Error).message.trim()}`);
        return;
      }
      const fresh: Server[] = [];
      for (const url of urls) {
        const known = this.servers.get(url);
        if (known) {
          if (!known.listed) this.#options.log(`server ${url}: listed again`);
          known.listed = true;
          continue;
        }
        const server: Server = { url, state: 'probing', listed: true, slots: 0, busy: 0, failures: 0 };
        this.servers.set(url, server);
        fresh.push(server);
      }
      for (const server of this.servers.values()) {
        if (urls.includes(server.url) || !server.listed) continue;
        server.listed = false;
        this.#options.log(`server ${server.url}: no longer listed${server.busy ? `, finishing its ${server.busy} runs` : ''}`);
        this.release(server);
      }
      await Promise.all(fresh.map((server) => this.#check(server)));
      this.emit('change');
    } finally {
      this.#listing = false;
    }
  }

  /** Checks every server's health. */
  async check(): Promise<void> {
    if (this.#checking) return;
    this.#checking = true;
    try {
      await Promise.all([...this.servers.values()].map((server) => this.#check(server)));
      this.emit('change');
    } finally {
      this.#checking = false;
    }
  }

  /** The up server with the most free slots, if any has one; of those, the least busy. */
  free(): Server | undefined {
    let best: Server | undefined;
    for (const server of this.servers.values()) {
      if (server.state !== 'up' || !server.listed || server.busy >= server.slots) continue;
      const free = server.slots - server.busy;
      if (!best || free > best.slots - best.busy || (free === best.slots - best.busy && server.busy < best.busy)) best = server;
    }
    return best;
  }

  /** Servers up and listed: those that take runs. */
  up(): Server[] {
    return [...this.servers.values()].filter((server) => server.state === 'up' && server.listed);
  }

  /** Forgets a server no longer listed once it has no runs. */
  release(server: Server): void {
    if (!server.listed && server.busy === 0 && this.servers.get(server.url) === server) this.servers.delete(server.url);
  }

  async #check(server: Server): Promise<void> {
    let health: Health;
    try {
      health = await this.#options.probe(server.url);
    } catch (err) {
      health = { ok: false, why: (err as Error).message };
    }
    // Forgotten meanwhile.
    if (this.servers.get(server.url) !== server) return;
    const log = (line: string) => this.#options.log(`server ${server.url}: ${line}`);
    if (!health.ok) {
      server.failures++;
      const why = health.why ?? 'unhealthy';
      if (server.state === 'up' && server.failures >= (this.#options.failures ?? 2)) {
        server.state = 'down';
        server.why = why;
        log(`down after ${server.failures} failed checks (${why})${server.busy ? `; requeueing its ${server.busy} runs` : ''}`);
        this.emit('lost', server);
      } else if (server.state !== 'up' && server.why !== why) {
        server.why = why;
        log(`not ready: ${why}`);
      }
      return;
    }
    server.failures = 0;
    const found: Reference = {
      model: health.props?.modelPath ? basename(health.props.modelPath) : null,
      build: health.props?.build ?? null,
    };
    const reference = (this.reference ??= found);
    if (found.model !== reference.model || found.build !== reference.build) {
      const why = `serves ${found.model} (build ${found.build}), not the pool's ${reference.model} (build ${reference.build})`;
      if (server.state !== 'refused' || server.why !== why) log(`refused: ${why}`);
      server.state = 'refused';
      server.why = why;
      return;
    }
    if (server.state === 'up') return;
    const jobs = this.#options.jobs ?? Infinity;
    server.slots = Math.max(1, Math.min(health.props?.slots ?? (Number.isFinite(jobs) ? jobs : 1), jobs));
    server.state = 'up';
    delete server.why;
    log(`joined, ${server.slots} run${server.slots === 1 ? '' : 's'} at once`);
    this.emit('join', server);
  }
}

/** One go at a job, on a server. */
export interface Attempt<J> {
  job: J;
  /** From 1. */
  attempt: number;
  /** The last the queue allows: its outcome stands, whatever it is. */
  final: boolean;
  server: Server;
  /** Aborted, with `SERVER_LOST`-style reason, when the server leaves the pool mid-run. */
  signal: AbortSignal;
}

export interface QueueOptions<J> {
  /** Runs an attempt; resolves to why it should run again (infrastructure errors, its server lost), or nothing. */
  run: (attempt: Attempt<J>) => Promise<string | undefined>;
  /** Attempts per job, the first included. */
  attempts?: number;
  /** Whether to start more runs (not past `--max-cost`, not interrupted). */
  canStart?: () => boolean;
  /** Told of each requeue. */
  requeued?: (attempt: Attempt<J>, why: string) => void;
  log: (line: string) => void;
}

/** Why a run's server was lost, as its abort reason. */
export const LOST = 'server lost';

/**
 * One queue of jobs, pulled by whichever server in the pool has a free slot. A job
 * whose attempt asks to run again goes back on the front of the queue, up to
 * `attempts`; when its server leaves the pool, its attempt is aborted first.
 */
export class WorkQueue<J> {
  readonly pending: { job: J; attempt: number }[];
  readonly running = new Set<{ job: J; attempt: number; server: Server; controller: AbortController }>();
  /** Resolves once nothing runs and nothing more will start: with how many jobs never ran. */
  readonly done: Promise<{ left: number }>;
  readonly #pool: ServerPool;
  readonly #options: QueueOptions<J>;
  #resolve!: (value: { left: number }) => void;
  #settled = false;
  #emptySaid = false;
  #waitingSaid = 0;

  constructor(pool: ServerPool, jobs: J[], options: QueueOptions<J>) {
    this.#pool = pool;
    this.#options = options;
    this.pending = jobs.map((job) => ({ job, attempt: 1 }));
    this.done = new Promise((resolve) => (this.#resolve = resolve));
    pool.on('change', () => this.pump());
    pool.on('join', () => this.pump());
    pool.on('lost', (server) => this.#lost(server));
  }

  /** Starts what the free slots take, and says when the queue is done. */
  pump(): void {
    if (this.#settled) return;
    const canStart = this.#options.canStart ?? (() => true);
    while (this.pending.length && canStart()) {
      const server = this.#pool.free();
      if (!server) break;
      this.#start(this.pending.shift()!, server);
    }
    if (!this.pending.length && this.running.size && !this.#emptySaid) {
      this.#emptySaid = true;
      this.#options.log(`queue empty: ${this.running.size} run${this.running.size === 1 ? '' : 's'} in flight`);
    }
    if (this.pending.length && canStart() && !this.running.size && !this.#pool.up().length && Date.now() - this.#waitingSaid > 60_000) {
      this.#waitingSaid = Date.now();
      this.#options.log(`waiting for a server: ${this.pending.length} runs queued`);
    }
    if (!this.running.size && (!this.pending.length || !canStart())) {
      this.#settled = true;
      this.#resolve({ left: this.pending.length });
    }
  }

  #start(item: { job: J; attempt: number }, server: Server): void {
    const controller = new AbortController();
    const entry = { ...item, server, controller };
    this.running.add(entry);
    server.busy++;
    const attempt: Attempt<J> = {
      job: item.job,
      attempt: item.attempt,
      final: item.attempt >= (this.#options.attempts ?? 3),
      server,
      signal: controller.signal,
    };
    const finish = (again: string | undefined) => {
      this.running.delete(entry);
      server.busy--;
      this.#pool.release(server);
      if (again !== undefined && !attempt.final) {
        this.pending.unshift({ job: item.job, attempt: item.attempt + 1 });
        this.#emptySaid = false;
        this.#options.requeued?.(attempt, again);
      }
      this.pump();
    };
    this.#options.run(attempt).then(finish, (err: unknown) => {
      this.#options.log(`run failed: ${(err as Error).stack ?? String(err)}`);
      finish(undefined);
    });
  }

  #lost(server: Server): void {
    for (const entry of this.running) if (entry.server === server) entry.controller.abort(LOST);
  }
}
