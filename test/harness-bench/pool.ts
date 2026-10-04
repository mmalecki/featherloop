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
  /** When its state last changed, as the pool counts (`#tick`): checks that started before say nothing of it now. */
  changed: number;
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
  /** What servers must match; by default, what most of the first healthy ones serve. */
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
  #suspects = new Set<Server>();
  #ticks = 0;

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
        const server: Server = { url, state: 'probing', listed: true, slots: 0, busy: 0, failures: 0, changed: 0 };
        this.servers.set(url, server);
        fresh.push(server);
      }
      for (const server of this.servers.values()) {
        if (urls.includes(server.url) || !server.listed) continue;
        server.listed = false;
        this.#options.log(`server ${server.url}: no longer listed${server.busy ? `, finishing its ${server.busy} runs` : ''}`);
        this.release(server);
      }
      await this.#round(fresh);
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
      await this.#round([...this.servers.values()]);
      this.emit('change');
    } finally {
      this.#checking = false;
    }
  }

  /**
   * The up server with the most free slots, if any has one; of those, the least busy.
   * Not `avoid` (where a run last failed), unless no other has a free slot; none being checked after a run failed on it.
   */
  free(avoid?: Server): Server | undefined {
    let best: Server | undefined;
    for (const server of this.servers.values()) {
      if (server.state !== 'up' || !server.listed || server.busy >= server.slots || this.#suspects.has(server)) continue;
      if (best && (best === avoid) !== (server === avoid)) {
        if (server !== avoid) best = server;
        continue;
      }
      const free = server.slots - server.busy;
      if (!best || free > best.slots - best.busy || (free === best.slots - best.busy && server.busy < best.busy)) best = server;
    }
    return best;
  }

  /**
   * A run on the server just hit infrastructure errors: checks it now, and if it
   * fails, it's out at once rather than after the usual run of checks, so it can't
   * fail one run after another (a server that's gone refuses connections in no time).
   */
  async suspect(server: Server): Promise<void> {
    if (server.state !== 'up' || this.#suspects.has(server)) return;
    this.#suspects.add(server);
    const at = this.#tick();
    const health = await this.#probe(server);
    this.#suspects.delete(server);
    if (server.state === 'up') this.#take(server, health, at, true);
    this.emit('change');
  }

  /** Servers up and listed: those that take runs. */
  up(): Server[] {
    return [...this.servers.values()].filter((server) => server.state === 'up' && server.listed);
  }

  /** Forgets a server no longer listed once it has no runs. */
  release(server: Server): void {
    if (!server.listed && server.busy === 0 && this.servers.get(server.url) === server) this.servers.delete(server.url);
  }

  /**
   * Checks servers at once, and takes what each says as it answers: one that doesn't
   * answer doesn't hold up the rest. With no reference yet, it waits for all, and the
   * one most of the healthy serve is it (the first listed's, on a tie), not whichever
   * answered first: one odd server can't set it for the rest.
   */
  async #round(servers: Server[]): Promise<void> {
    const voting = !this.reference;
    const results = await Promise.all(
      servers.map(async (server) => {
        const at = this.#tick();
        const health = await this.#probe(server);
        if (!voting) this.#take(server, health, at);
        return { server, health, at };
      }),
    );
    if (!voting) return;
    if (!this.reference) {
      const votes = new Map<string, { reference: Reference; count: number }>();
      for (const { health } of results) {
        if (!health.ok) continue;
        const found = reference(health);
        const key = JSON.stringify(found);
        votes.set(key, { reference: found, count: (votes.get(key)?.count ?? 0) + 1 });
      }
      // Insertion order: the first listed wins a tie.
      let best: { reference: Reference; count: number } | undefined;
      for (const vote of votes.values()) if (!best || vote.count > best.count) best = vote;
      if (best) this.reference = best.reference;
    }
    for (const { server, health, at } of results) this.#take(server, health, at);
  }

  /** Orders checks and state changes: clocks can't, within a millisecond. */
  #tick(): number {
    return ++this.#ticks;
  }

  #probe(server: Server): Promise<Health> {
    return this.#options.probe(server.url).catch((err: unknown): Health => ({ ok: false, why: (err as Error).message }));
  }

  /**
   * Takes what a check that started `at` found, unless the server changed state
   * since (a check from before it went down says nothing of it now). `suspect`: a
   * run just failed on the server, so one failed check takes it out.
   */
  #take(server: Server, health: Health, at: number, suspect = false): void {
    // Forgotten meanwhile, or stale.
    if (this.servers.get(server.url) !== server || at < server.changed) return;
    const log = (line: string) => this.#options.log(`server ${server.url}: ${line}`);
    if (!health.ok) {
      server.failures++;
      const why = health.why ?? 'unhealthy';
      if (server.state === 'up' && (suspect || server.failures >= (this.#options.failures ?? 2))) {
        server.state = 'down';
        server.changed = this.#tick();
        server.why = why;
        const checks = `${server.failures} failed check${server.failures === 1 ? '' : 's'}${suspect ? ' after a run failed on it' : ''}`;
        log(`down after ${checks} (${why})${server.busy ? `; requeueing its ${server.busy} runs` : ''}`);
        this.emit('lost', server);
      } else if (server.state !== 'up' && server.why !== why) {
        server.why = why;
        log(`not ready: ${why}`);
      }
      return;
    }
    server.failures = 0;
    const found = reference(health);
    const expected = (this.reference ??= found);
    if (found.model !== expected.model || found.build !== expected.build) {
      const why = `serves ${found.model} (build ${found.build}), not the pool's ${expected.model} (build ${expected.build})`;
      if (server.state !== 'refused' || server.why !== why) log(`refused: ${why}`);
      if (server.state !== 'refused') server.changed = this.#tick();
      server.state = 'refused';
      server.why = why;
      return;
    }
    if (server.state === 'up') return;
    const jobs = this.#options.jobs ?? Infinity;
    server.slots = Math.max(1, Math.min(health.props?.slots ?? (Number.isFinite(jobs) ? jobs : 1), jobs));
    server.state = 'up';
    server.changed = this.#tick();
    delete server.why;
    log(`joined, ${server.slots} run${server.slots === 1 ? '' : 's'} at once`);
    this.emit('join', server);
  }
}

/** What a healthy server serves: its model file, wherever it is, and build. */
function reference(health: Health): Reference {
  return { model: health.props?.modelPath ? basename(health.props.modelPath) : null, build: health.props?.build ?? null };
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
  /** `last`: the server its last attempt failed on. */
  readonly pending: { job: J; attempt: number; last?: Server }[];
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
      const server = this.#pool.free(this.pending[0]!.last);
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
    const entry = { job: item.job, attempt: item.attempt, server, controller };
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
      if (again !== undefined && !attempt.final) {
        this.pending.unshift({ job: item.job, attempt: item.attempt + 1, last: server });
        this.#emptySaid = false;
        this.#options.requeued?.(attempt, again);
      }
      server.busy--;
      this.#pool.release(server);
      // Failed by the infrastructure: the server takes no more runs until a check says it's there.
      if (again !== undefined) void this.#pool.suspect(server);
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
