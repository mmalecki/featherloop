import { EventEmitter } from 'node:events';
import { clearScreenDown, createInterface, cursorTo, moveCursor, type Interface } from 'node:readline';
import repl, { type REPLServer } from 'node:repl';
import { Transform, Writable, type TransformCallback } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { styleText } from 'node:util';

export interface ChatInputOptions {
  input: NodeJS.ReadableStream;
  output: NodeJS.WriteStream;
  prompt: string;
}

interface ChatInputEvents {
  /** A message, newlines and all; in a terminal, with pastes expanded. */
  line: [line: string];
  SIGINT: [];
  close: [];
}

/** A terminal input stream, as readline's terminal mode needs it. */
type TTYInput = NodeJS.ReadableStream & { isTTY?: boolean; isRaw?: boolean; setRawMode(mode: boolean): unknown };

const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';
/** Bracketed paste, and level 1 of the kitty keyboard protocol for Shift+Enter: on, and back off. */
const MODES_ON = '\x1b[?2004h\x1b[>1u';
const MODES_OFF = '\x1b[<u\x1b[?2004l';
/** Pastes longer than this are folded (and than half the terminal's height). */
const FOLD_LINES = 20;
const PLACEHOLDER = /\[paste #\d+ \+\d+ lines\]/g;
/** Put before lines starting with ".", so the REPL doesn't take them for its commands (.help, .exit, …). */
const DOT = '\u0000';

/**
 * Reads chat messages. In a terminal it's an editor that holds several lines,
 * on node:repl: Enter sends, while Shift+Enter (with the kitty keyboard protocol),
 * Alt+Enter, Ctrl+J or a `\` at the end of the line start a new one. Pastes land
 * as lines to edit, or as `[paste #1 +120 lines]` when long. Output written with
 * `write` goes above the input, which stays below it as typed so far.
 *
 * Elsewhere (e.g. piped input), each line is a message, as read by node:readline.
 */
export class ChatInput extends EventEmitter<ChatInputEvents> {
  readonly #output: NodeJS.WriteStream;
  readonly #rl: Interface | undefined;
  readonly #server: REPLServer | undefined;
  readonly #source: TTYInput | undefined;
  readonly #filter: InputFilter | undefined;
  readonly #replOutput: Output | undefined;
  readonly #pastes = new Pastes();
  /** Whether the input is on screen, below all output. */
  #shown = false;
  /** Whether output written while the input wasn't shown ended mid-line. */
  #midLine = false;
  /** Output held while the input is shown: the start of a line, written once it's whole. */
  #pending = '';
  #pasting = false;
  /** The next line break is a newline in the message, not a send. */
  #newline = false;
  /** A message eval let through, sent once the REPL is done with it. */
  #sent: string | undefined;
  #closed = false;

  constructor({ input, output, prompt }: ChatInputOptions) {
    super();
    this.#output = output;
    const tty = input as TTYInput;
    if (!tty.isTTY || !output.isTTY || typeof tty.setRawMode !== 'function' || process.env.TERM === 'dumb') {
      const rl = (this.#rl = createInterface({ input, output }));
      rl.setPrompt(prompt);
      rl.on('line', (line) => this.emit('line', line));
      rl.on('SIGINT', () => this.emit('SIGINT'));
      rl.on('close', () => this.#close());
      return;
    }

    this.#source = tty;
    const filter = (this.#filter = new InputFilter(tty, (text) => this.#fold(text)));
    tty.pipe(filter);
    const server = (this.#server = repl.start({
      // The REPL shows its prompt right away; ours waits for `prompt()`.
      prompt: '',
      input: filter,
      output: (this.#replOutput = new Output(output, this.#pastes)),
      terminal: true,
      // No evaluating as you type: off anyway with an eval of our own, but not by accident.
      preview: false,
      // Passed on to readline, though not in the REPL's types; its default is 30.
      ...({ historySize: 1000 } as object),
      // Decides whether a line break sends. It runs in the REPL's domain, which would
      // take over the run's errors: the message goes out after (see the line listener).
      eval: (cmd, _context, _file, done) => {
        // The whole message at once, line breaks as "\r", and a "\n" after it.
        const text = cmd.replace(/\n$/, '').replace(DOT, '').replace(/\r\n?/g, '\n');
        const more = this.#pasting || this.#newline || text.endsWith('\\');
        this.#newline = false;
        if (more) return done(new repl.Recoverable(new Error('More lines to come')), undefined);
        // Expanded last, so a pasted line ending in `\` keeps it.
        this.#sent = this.#pastes.expand(text.replace(/\\\n/g, '\n'));
        // Without a result: given one, even `undefined`, the REPL prints it.
        (done as (err: null) => void)(null);
      },
    }));
    // Prompting is ours: when the UI wants it, not after each eval.
    server.displayPrompt = () => {};
    server.setPrompt(prompt);
    // Tabs are text, not JavaScript completion.
    (server as unknown as { isCompletionEnabled: boolean }).isCompletionEnabled = false;

    // The REPL's line listener (its only one) calls eval: wrapped, to keep lines starting
    // with "." from its commands, and to send what eval lets through once out of its domain.
    const [onLine] = server.listeners('line') as ((line: string) => void)[];
    server.removeListener('line', onLine!);
    server.on('line', (line: string) => {
      onLine!.call(server, /^\s*\./.test(line) ? DOT + line : line);
      const sent = this.#sent;
      this.#sent = undefined;
      if (sent !== undefined) this.#submit(sent);
    });
    // The REPL's own clears the line, or asks for a second Ctrl+C to exit.
    server.removeAllListeners('SIGINT');
    server.on('SIGINT', () => this.emit('SIGINT'));
    // With a listener, readline leaves Ctrl+Z to us: the terminal's modes go off first.
    server.on('SIGTSTP', this.#suspend);
    server.on('close', () => this.#close());

    // Before readline's own listener, so these are set when it handles the key.
    filter.prependListener('keypress', (_s: string | undefined, key: Key = {}) => {
      // Set for one key only: readline may not break the line on it (an \n right after
      // an \r is taken as part of the same Enter), and the next Enter must still send.
      this.#newline = false;
      if (key.name === 'paste-start') this.#pasting = true;
      else if (key.name === 'paste-end') this.#pasting = false;
      // Enter is \r ("return"); Ctrl+J is \n ("enter").
      else if (key.name === 'enter' && !this.#pasting) this.#newline = true;
      // Alt+Enter, and Shift+Enter (see InputFilter): readline ignores it, so break the line ourselves.
      else if (key.name === 'return' && key.meta) {
        this.#newline = true;
        server.write('\r');
      }
      // Typing while the input isn't shown (e.g. during a run) shows it first.
      if (!this.#shown && !(key.ctrl && (key.name === 'c' || key.name === 'd'))) this.prompt();
    });

    output.write(MODES_ON);
    process.on('exit', this.#restore);
    process.once('SIGTERM', this.#terminate);
  }

  /** The text being edited. */
  get line(): string {
    return (this.#server ?? this.#rl)?.line ?? '';
  }

  /** Shows the input below the output, as typed so far. */
  prompt(): void {
    if (this.#rl) return this.#rl.prompt();
    if (!this.#server || this.#shown || this.#closed) return;
    if (this.#midLine) this.#output.write('\n');
    this.#midLine = false;
    this.#shown = true;
    this.#redraw();
  }

  /**
   * Writes output above the input. While the input is shown, it's erased, the
   * output written and the input drawn again below it; an unfinished line is held
   * until it's whole, as there's no going back up to finish it.
   */
  write(text: string): void {
    if (!this.#server || !this.#shown || this.#closed) {
      this.#output.write(text);
      if (text) this.#midLine = !text.endsWith('\n');
      return;
    }
    this.#pending += text;
    const end = this.#pending.lastIndexOf('\n') + 1;
    if (!end) return;
    const lines = this.#pending.slice(0, end);
    this.#pending = this.#pending.slice(end);
    moveCursor(this.#output, 0, -this.#server.getCursorPos().rows);
    cursorTo(this.#output, 0);
    clearScreenDown(this.#output);
    this.#output.write(lines);
    this.#redraw();
  }

  /** Empties the input; Ctrl+Y brings the text back. */
  clear(): void {
    const target = this.#server ?? this.#rl;
    target?.write(null as unknown as string, { ctrl: true, name: 'e' });
    target?.write(null as unknown as string, { ctrl: true, name: 'u' });
  }

  close(): void {
    (this.#server ?? this.#rl)?.close();
  }

  /** Draws the input from the cursor's row: readline would first go up as many rows as it last drew. */
  #redraw(): void {
    (this.#server as unknown as { prevRows: number }).prevRows = 0;
    this.#server!.prompt(true);
  }

  #submit(text: string): void {
    // Readline has moved past the input, which stays on screen as sent.
    this.#shown = false;
    this.#midLine = false;
    if (this.#pending) this.write(this.#pending);
    this.#pending = '';
    this.emit('line', text);
  }

  /** A paste as the input gets it: as pasted, between its markers, or folded into a placeholder. */
  #fold(text: string): string {
    // A final line break doesn't start another line.
    const lines = text.replace(/(\r\n?|\n)$/, '').split(/\r\n?|\n/).length;
    if (lines <= Math.min(FOLD_LINES, Math.floor((this.#output.rows || 48) / 2))) return PASTE_START + text + PASTE_END;
    // Readline echoes it a key at a time, too piecemeal for Output to color: draw it whole once it's in.
    setImmediate(() => this.#shown && !this.#closed && this.#server!.prompt(true));
    return this.#pastes.add(text.replace(/\r\n?/g, '\n'), lines);
  }

  /** Ctrl+Z: suspends with the terminal as it was, and sets it up again on `fg`. */
  #suspend = (): void => {
    this.#output.write(MODES_OFF);
    this.#source!.setRawMode(false);
    process.once('SIGCONT', this.#resume);
    process.kill(process.pid, 'SIGTSTP');
  };

  #resume = (): void => {
    if (this.#closed) return;
    // As readline does it: reading restarted, to catch keys again.
    this.#source!.pause();
    this.#source!.resume();
    this.#source!.setRawMode(true);
    this.#output.write(MODES_ON);
    // The shell has written below whatever was there.
    this.#midLine = false;
    if (this.#shown) this.#redraw();
  };

  /** Leaves the terminal as it found it, on any exit. */
  #restore = (): void => {
    this.#output.write(MODES_OFF);
  };

  /** SIGTERM ends the process without an exit event: restore, then let it. */
  #terminate = (): void => {
    this.#restore();
    process.kill(process.pid, 'SIGTERM');
  };

  #close(): void {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#server) {
      this.#restore();
      process.off('exit', this.#restore);
      process.off('SIGTERM', this.#terminate);
      process.off('SIGCONT', this.#resume);
      // Or stdin keeps the process alive.
      this.#source!.unpipe(this.#filter!);
      this.#source!.pause();
      this.#filter!.destroy();
      this.#replOutput!.destroy();
      // Below the input, if it's on screen, and then what was held back.
      if (this.#shown) this.#output.write('\n');
      this.#shown = false;
      if (this.#pending) this.#output.write(this.#pending);
      this.#pending = '';
    }
    this.emit('close');
  }
}

interface Key {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

/** Folded pastes by their placeholders; only these exact placeholders are colored and expanded. */
class Pastes {
  readonly #texts = new Map<string, string>();

  add(text: string, lines: number): string {
    const placeholder = `[paste #${this.#texts.size + 1} +${lines} lines]`;
    this.#texts.set(placeholder, text);
    return placeholder;
  }

  has(placeholder: string): boolean {
    return this.#texts.has(placeholder);
  }

  /** Placeholders replaced by their pastes; edited ones stay as typed. */
  expand(text: string): string {
    return text.replace(PLACEHOLDER, (placeholder) => this.#texts.get(placeholder) ?? placeholder);
  }
}

/**
 * Between the terminal and the REPL. Pastes go through `fold`, and keys sent the
 * kitty keyboard protocol's way go back to the legacy bytes readline knows.
 * Stands in for the terminal too: raw mode is the terminal's.
 */
export class InputFilter extends Transform {
  readonly isTTY = true;
  readonly #tty: TTYInput | undefined;
  readonly #fold: (text: string) => string;
  readonly #decoder = new StringDecoder('utf8');
  /** The paste being read, if any. */
  #paste: string | undefined;
  /** The end of the last chunk, if it may be the start of a marker split across chunks. */
  #carry = '';

  constructor(tty: TTYInput | undefined, fold: (text: string) => string) {
    super();
    this.#tty = tty;
    this.#fold = fold;
  }

  get isRaw(): boolean {
    return this.#tty?.isRaw ?? false;
  }

  setRawMode(mode: boolean): this {
    this.#tty?.setRawMode(mode);
    return this;
  }

  override _transform(chunk: Buffer | string, _encoding: BufferEncoding, done: TransformCallback): void {
    let data = this.#carry + (typeof chunk === 'string' ? chunk : this.#decoder.write(chunk));
    this.#carry = '';
    let out = '';
    while (data) {
      const marker = this.#paste === undefined ? PASTE_START : PASTE_END;
      const at = data.indexOf(marker);
      if (at === -1) {
        // Outside a paste, a chunk that's all prefix is a key (e.g. Escape), not half a marker.
        let keep = partialMarker(data, marker);
        if (this.#paste === undefined && keep === data.length) keep = 0;
        this.#carry = data.slice(data.length - keep);
        data = data.slice(0, data.length - keep);
        if (this.#paste === undefined) out += legacyKeys(data);
        else this.#paste += data;
        break;
      }
      if (this.#paste === undefined) {
        out += legacyKeys(data.slice(0, at));
        this.#paste = '';
      } else {
        out += this.#fold(this.#paste + data.slice(0, at));
        this.#paste = undefined;
      }
      data = data.slice(at + marker.length);
    }
    done(null, out);
  }

  override _flush(done: TransformCallback): void {
    const rest = this.#carry + this.#decoder.end();
    done(null, this.#paste === undefined ? legacyKeys(rest) : this.#fold(this.#paste + rest));
  }
}

/** The length of the longest end of `data` that `marker` starts with. */
function partialMarker(data: string, marker: string): number {
  for (let length = Math.min(marker.length - 1, data.length); length > 0; length--) {
    if (data.endsWith(marker.slice(0, length))) return length;
  }
  return 0;
}

/**
 * Keys as the kitty keyboard protocol sends them (at level 1) when legacy bytes are
 * ambiguous: `CSI code[:alternates][;modifiers[:event]][;text] u`. Shift+Enter becomes
 * Alt+Enter (`\x1b\r`), a newline; the rest go back to legacy bytes, e.g. Ctrl+C
 * from `\x1b[99;5u` to `\x03`. Other terminals never send these.
 */
const KITTY_KEY = /\x1b\[(\d+)(?::\d*)*(?:;(\d+)(?::\d+)?)?(?:;[\d:]*)?u/g;
const KP_ENTER = 57414;

/**
 * Arrows, Home/End, F1-F4 and the `~` keys as kitty sends them: with colon sub-parameters
 * (`CSI 1;modifiers:event D`, `CSI 1:alternate D`), or with Caps/Num Lock in the modifiers
 * (Num Lock is 128: `CSI 1;129 D`). Readline reads one digit of modifiers and types out the
 * rest (a Left arrow as "29D"), so what it can't use is dropped: sub-parameters and the
 * lock and meta bits, leaving Shift, Alt and Ctrl. Key releases are dropped whole.
 */
const KITTY_CSI = /\x1b\[([\d:;]*)([A-DFHPQS~])/g;

export function legacyKeys(data: string): string {
  data = data.replace(KITTY_CSI, (_sequence, params: string, final: string) => {
    const [first = '', second = ''] = params.split(';');
    const number = first.split(':')[0];
    const [modifiers, event] = second.split(':');
    if (event === '3') return '';
    const bits = ((Number(modifiers) || 1) - 1) & 7;
    return bits ? `\x1b[${number || '1'};${bits + 1}${final}` : `\x1b[${number}${final}`;
  });
  return data.replace(KITTY_KEY, (_sequence, code: string, modifiers = '1') => {
    // The keypad's Enter is Enter; other private-use codes are keys with no legacy
    // bytes (e.g. F13, media keys). A sequence split across reads isn't put back
    // together, as paste markers are: keys come whole, in practice.
    const point = Number(code) === KP_ENTER ? 13 : Number(code);
    if (point >= 0xe000 && point <= 0xf8ff) return '';
    const bits = Number(modifiers) - 1;
    const [shift, alt, ctrl] = [bits & 1, bits & 2, bits & 4];
    let key = String.fromCodePoint(point);
    if (key === '\r' && shift) return '\x1b\r';
    if (ctrl) key = control(key);
    else if (shift) key = key.toUpperCase();
    return alt ? `\x1b${key}` : key;
  });
}

/** The control character for Ctrl+key, e.g. 3 for Ctrl+C; keys without one stay as they are. */
function control(key: string): string {
  const code = key.toUpperCase().charCodeAt(0);
  if (code >= 0x40 && code <= 0x5f) return String.fromCharCode(code - 0x40);
  if (key === ' ') return '\0';
  if (key === '?') return '\x7f';
  return key;
}

/**
 * Between the REPL and the terminal: colors placeholders as readline draws the
 * input. The input itself stays plain, so the cursor and the message are unaffected;
 * readline redraws the line on edits before its end, so an edited placeholder
 * loses its color on the spot.
 */
class Output extends Writable {
  readonly isTTY = true;
  readonly #out: NodeJS.WriteStream;
  readonly #pastes: Pastes;
  readonly #resize = () => this.emit('resize');

  constructor(out: NodeJS.WriteStream, pastes: Pastes) {
    super({ decodeStrings: false });
    this.#out = out;
    this.#pastes = pastes;
    out.on('resize', this.#resize);
    this.once('close', () => out.off('resize', this.#resize));
  }

  get columns(): number {
    return this.#out.columns;
  }

  get rows(): number {
    return this.#out.rows;
  }

  override _write(chunk: string | Buffer, _encoding: BufferEncoding, done: (error?: Error | null) => void): void {
    const pastes = this.#pastes;
    this.#out.write(String(chunk).replace(PLACEHOLDER, (p) => (pastes.has(p) ? styleText('magenta', p, { stream: this.#out }) : p)));
    // Synchronously, so nothing queues behind it: in order with the UI's own writes.
    done();
  }
}
