import { randomUUID } from 'node:crypto';
import { appendFileSync, linkSync, mkdirSync, readFileSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { join } from 'node:path';
import type { Message, ToolMessage } from './provider.ts';

/** The model a session runs on, as the user named it (a ref, alias or bare id), so resuming resolves it again. */
export interface SessionModel {
  ref: string;
  variant?: string;
}

/** A `SessionModel`, without a `variant` key when there's none. */
export function sessionModel(ref: string, variant?: string): SessionModel {
  return variant === undefined ? { ref } : { ref, variant };
}

/**
 * One line of a session file. The first is the header; the conversation is the
 * `message` records in order, with `truncate` dropping all but the first `length`
 * (a run that failed or was interrupted, which the UI discards).
 */
export type SessionRecord = { time: string } & (
  | { type: 'session'; version: number; id: string; created: string; cwd: string; model?: SessionModel }
  | { type: 'message'; message: Message }
  | { type: 'truncate'; length: number }
  | ({ type: 'model' } & SessionModel)
);

/** A session that can't be resumed: a bad id, a missing or unreadable file, or one open elsewhere. */
export class SessionError extends Error {
  override name = 'SessionError';
}

const VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** For a call that was running when the process died: the conversation needs a result for it. */
const NO_RESULT = 'Error: no result; the session ended while this call ran, so it may or may not have taken effect';

/** `$XDG_STATE_HOME/featherloop/sessions`, by default `~/.local/state/featherloop/sessions`. */
export function sessionsDir(): string {
  return join(process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state'), 'featherloop', 'sessions');
}

export interface SessionOptions {
  /** Where sessions are kept; `sessionsDir()` by default. */
  root?: string;
}

/**
 * A conversation saved as it goes, as newline-delimited JSON in
 * `<root>/<id>/session.jsonl` (a directory, so later data such as subagent
 * transcripts can sit beside it). `messages` is always what replaying the file
 * gives. Nothing is written until the first message, so an unused session
 * leaves no trace. Writes are synchronous: whatever was appended survives a crash.
 *
 * One process at a time writes a session: it holds `<root>/<id>/lock` from its
 * first write, or from `open()`, until `close()` or exit. `read()` only looks.
 */
export class Session {
  readonly id: string;
  readonly root: string;
  readonly dir: string;
  readonly file: string;
  /** Where the session started; tools may now run elsewhere. */
  readonly cwd: string;
  readonly created: string;
  #messages: Message[] = [];
  #model: SessionModel | undefined;
  #stored: boolean;
  /** Fixes for what a crash left behind, found on opening; written with the next record, so just looking changes nothing. */
  #repair: (() => void) | undefined;
  /** The lock file, while this session holds it. */
  #lock: string | undefined;
  /** Why it can't write: opened with `read()`, or closed. */
  #readOnly: string | undefined;

  private constructor(id: string, root: string, cwd: string, created: string, model: SessionModel | undefined, stored: boolean) {
    this.id = id;
    this.root = root;
    this.dir = join(root, id);
    this.file = join(this.dir, 'session.jsonl');
    this.cwd = cwd;
    this.created = created;
    this.#model = model;
    this.#stored = stored;
  }

  /** A new, empty session. */
  static create(options: SessionOptions & { cwd?: string; model?: SessionModel } = {}): Session {
    const { root = sessionsDir(), cwd = process.cwd(), model } = options;
    return new Session(randomUUID(), root, cwd, new Date().toISOString(), model, false);
  }

  /**
   * A saved session, by id, to continue: it's locked until `close()` or exit, and
   * refused while another process has it. A torn last line (the process died
   * mid-write) is cut off, and calls left without a result get an error result,
   * so the conversation can go on. Those fixes reach the file with the next write.
   */
  static open(id: string, options: SessionOptions = {}): Session {
    const { root = sessionsDir() } = options;
    id = sessionId(id);
    const lockFile = join(root, id, 'lock');
    try {
      lock(lockFile, id);
    } catch (err) {
      if (err instanceof SessionError) throw err;
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new SessionError(`No session ${id} in ${root}`);
      throw new SessionError(`Can't lock session ${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      const session = Session.#load(id, root);
      session.#lock = lockFile;
      return session;
    } catch (err) {
      unlock(lockFile);
      throw err;
    }
  }

  /** A saved session as it is, without locking it, e.g. while another process has it. It can't be written. */
  static read(id: string, options: SessionOptions = {}): Session {
    const { root = sessionsDir() } = options;
    const session = Session.#load(sessionId(id), root);
    session.#readOnly = 'was opened with read()';
    return session;
  }

  static #load(id: string, root: string): Session {
    const file = join(root, id, 'session.jsonl');
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new SessionError(`No session ${id} in ${root}`);
      throw new SessionError(`Can't read ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }

    const records: SessionRecord[] = [];
    const lines = text.split('\n');
    let good = 0;
    for (const [i, line] of lines.entries()) {
      if (!line) continue;
      try {
        records.push(JSON.parse(line) as SessionRecord);
        good = i + 1;
      } catch {
        if (lines.slice(i + 1).some(Boolean)) throw new SessionError(`${file}:${i + 1}: not JSON`);
      }
    }
    const header = records[0];
    if (header?.type !== 'session') throw new SessionError(`${file}: no session header`);
    if (header.version > VERSION) throw new SessionError(`${file}: format version ${header.version}; this featherloop reads ${VERSION}`);

    const session = new Session(id, root, header.cwd, header.created, header.model, true);
    for (const record of records.slice(1)) session.#replay(record);
    const answers = unanswered(session.#messages);
    session.#messages.push(...answers);

    // Appends must start on a fresh line. The write may have stopped just before the newline.
    const intact = lines.slice(0, good).join('\n') + '\n';
    if (intact !== text || answers.length) {
      session.#repair = () => {
        if (intact.length > text.length) appendFileSync(file, '\n');
        else if (intact !== text) truncateSync(file, Buffer.byteLength(intact));
        for (const message of answers) session.#append({ type: 'message', message });
      };
    }
    return session;
  }

  /** The conversation so far. */
  get messages(): readonly Message[] {
    return this.#messages;
  }

  /** The model the session last ran on. */
  get model(): SessionModel | undefined {
    return this.#model;
  }

  /** Whether the session has been written, i.e. can be resumed. */
  get stored(): boolean {
    return this.#stored;
  }

  append(...messages: Message[]): void {
    for (const message of messages) this.#write({ type: 'message', message });
  }

  /** Drops all but the first `length` messages. */
  truncate(length: number): void {
    if (length < this.#messages.length) this.#write({ type: 'truncate', length });
  }

  setModel(model: SessionModel): void {
    // Before the first write, the header will carry it.
    if (this.#stored) this.#write({ type: 'model', ...model });
    else this.#model = model;
  }

  /** Lets other processes open the session; this one can't write it any more. */
  close(): void {
    if (this.#lock) unlock(this.#lock);
    this.#lock = undefined;
    this.#readOnly ??= 'is closed';
  }

  /** A new, empty session kept beside this one, on the same model, starting in the current directory. */
  fresh(): Session {
    return Session.create({ root: this.root, ...(this.#model ? { model: this.#model } : {}) });
  }

  #write(record: DistributiveOmit<SessionRecord, 'time'>): void {
    if (this.#readOnly) throw new SessionError(`Session ${this.id} ${this.#readOnly}`);
    if (!this.#stored) {
      // Tool output may hold secrets: only the user can read sessions.
      mkdirSync(this.dir, { recursive: true, mode: 0o700 });
      const lockFile = join(this.dir, 'lock');
      lock(lockFile, this.id);
      this.#lock = lockFile;
      const { id, created, cwd } = this;
      this.#append({ type: 'session', version: VERSION, id, created, cwd, ...(this.#model ? { model: this.#model } : {}) });
      this.#stored = true;
    }
    const repair = this.#repair;
    this.#repair = undefined;
    repair?.();
    this.#append(record);
    this.#replay(record);
  }

  #append(record: DistributiveOmit<SessionRecord, 'time'>): void {
    appendFileSync(this.file, `${JSON.stringify({ time: new Date().toISOString(), ...record })}\n`, { mode: 0o600 });
  }

  #replay(record: DistributiveOmit<SessionRecord, 'time'>): void {
    switch (record.type) {
      case 'message':
        this.#messages.push(record.message);
        break;
      case 'truncate':
        this.#messages.length = Math.min(record.length, this.#messages.length);
        break;
      case 'model': {
        this.#model = sessionModel(record.ref, record.variant);
        break;
      }
      // Unknown records come from newer versions with the same format version: skip them.
    }
  }
}

function sessionId(id: string): string {
  if (!UUID.test(id)) throw new SessionError(`Not a session id: ${id}`);
  return id.toLowerCase();
}

/** What a lock file holds. */
interface LockHolder {
  pid: number;
  host: string;
}

/** Lock files this process holds, removed on exit. */
const held = new Set<string>();
let releasesOnExit = false;

/**
 * Takes a session's lock, or says who has it. A lock whose process is gone (on
 * this host) is taken over; one from another host is left alone, as there's no
 * telling whether its process runs.
 */
function lock(path: string, id: string): void {
  const mine = JSON.stringify({ pid: process.pid, host: hostname() } satisfies LockHolder);
  for (let attempt = 0; attempt < 3; attempt++) {
    // Written aside and linked into place: linking fails if there's a lock, and a lock is never half-written.
    const temp = `${path}.${randomUUID()}`;
    writeFileSync(temp, mine, { mode: 0o600 });
    try {
      linkSync(temp, path);
      if (!releasesOnExit) process.once('exit', () => held.forEach(unlock));
      releasesOnExit = true;
      held.add(path);
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    } finally {
      rmSync(temp, { force: true });
    }

    const seen = readLock(path);
    if (seen === undefined) continue; // Released meanwhile.
    const holder = parseLock(seen);
    if (holder && holder.host !== hostname()) {
      throw new SessionError(`Session ${id} is open on ${holder.host} (pid ${holder.pid}); if it isn't any more, delete ${path}`);
    }
    if (holder && running(holder.pid)) {
      throw new SessionError(
        holder.pid === process.pid ? `Session ${id} is already open in this process` : `Session ${id} is open in another featherloop (pid ${holder.pid})`,
      );
    }
    // Its process is gone: take over, unless another process just did.
    if (readLock(path) === seen) rmSync(path, { force: true });
  }
  throw new SessionError(`Couldn't lock session ${id}: ${path} keeps changing`);
}

/** Removes a lock this process holds; best-effort, as it may be gone already. */
function unlock(path: string): void {
  held.delete(path);
  try {
    const holder = parseLock(readLock(path) ?? '');
    if (holder?.pid === process.pid && holder.host === hostname()) rmSync(path, { force: true });
  } catch {
    // Left behind, it's taken over as stale.
  }
}

function readLock(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw err;
  }
}

/** Unreadable content (written by hand, or damaged) counts as a lock whose process is gone. */
function parseLock(text: string): LockHolder | undefined {
  try {
    const value = JSON.parse(text) as Partial<LockHolder>;
    return typeof value.pid === 'number' && typeof value.host === 'string' ? { pid: value.pid, host: value.host } : undefined;
  } catch {
    return undefined;
  }
}

function running(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: it runs, as another user.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Error results for the last assistant message's calls that have none; tool results only ever follow it. */
function unanswered(messages: readonly Message[]): ToolMessage[] {
  const last = messages.findLastIndex((message) => message.role === 'assistant');
  const calls = (messages[last] as { tool_calls?: { id: string }[] } | undefined)?.tool_calls ?? [];
  const answered = new Set(messages.slice(last + 1).flatMap((message) => (message.role === 'tool' ? [message.tool_call_id] : [])));
  return calls
    .filter((call) => !answered.has(call.id))
    .map((call) => ({ role: 'tool', tool_call_id: call.id, content: NO_RESULT, is_error: true }));
}
