import events from 'events';
import fs from 'fs';

/**
 * What happened, as records rather than prose — for the panel's Dziennik.
 *
 * Asked for by Mateusz on 2026-09-24, after a program stopped on an error the
 * operator could not see: the answer was in the server's log, which nobody at
 * the machine reads. His terms: a structured entry, not a wall of text; the
 * server's journal and the controller's; levels from debug to error; and
 * filtering.
 *
 * **An entry is facts, and a code rather than a sentence.** `{ event: 'error',
 * code: 'error:33', program: { line: 700 } }` — the panel words it in its own
 * language, so yesterday's journal reads in Polish and English alike and a
 * corrected translation corrects the past too. The same rule as refusals.
 *
 * **Kept by the server**, because the server's truth is what is shared: a
 * phone and a laptop see one journal, and a reload loses nothing. On disk as
 * JSON Lines, appended to and never rewritten. Renaming once per file on
 * rotation rather than on every write is deliberate: the session store's
 * rename-per-write is what fills this machine's log with `EPERM`.
 */

export const LEVELS = ['debug', 'info', 'warn', 'error'];

const rank = (level) => LEVELS.indexOf(level);

export const isLevel = (level) => rank(level) >= 0;

/** Five megabytes a file, two files: months at `info`. */
const MAX_BYTES = 5 * 1024 * 1024;

/** A ceiling on what is held in memory, whatever the files hold. */
const MAX_ENTRIES = 50000;

/**
 * Whether an entry passes a filter.
 *
 * Every field optional; a missing one lets everything through. `level` is a
 * floor — `warn` means warn and error — because that is how a level filter
 * is read everywhere else.
 *
 * `q` looks at every value the entry stored — code, program, port, device,
 * the line sent. What the operator reads, though, is the panel's sentence for
 * the code, which the server never had: so the panel works out which codes
 * its sentences for `q` belong to and sends them as `said`, and an entry
 * with one of those codes matches too. *"Wyszukiwanie tekstowe, czy wpis
 * zawiera tekst"* (Mateusz, 2026-09-24).
 */
const values = (value) => (value && typeof value === 'object' ? Object.values(value).flatMap(values) : [value]);

export const matches = (entry, { level, source, event, device, since, until, q, said = [] } = {}) => {
  if (level && rank(entry.level) < rank(level)) {
    return false;
  }
  if (source && entry.source !== source) {
    return false;
  }
  if (event && entry.event !== event) {
    return false;
  }
  if (device && entry.device !== device) {
    return false;
  }
  if (since && entry.time < since) {
    return false;
  }
  if (until && entry.time > until) {
    return false;
  }
  if (q && !said.includes(entry.code)) {
    const needle = String(q).toLowerCase();
    const stored = [entry.event, entry.code, entry.port, entry.device, entry.program, entry.data];
    const haystack = values(stored).filter((v) => v !== undefined && v !== null).join('\n').toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }
  return true;
};

const readEntries = (file) => {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return [];
  }
  // A line cut short by a crash mid-write is dropped, not fatal: one entry
  // lost is the honest cost of an append that did not finish.
  return text.split('\n').flatMap((line) => {
    if (!line) {
      return [];
    }
    try {
      return [JSON.parse(line)];
    } catch (err) {
      return [];
    }
  });
};

class Journal extends events.EventEmitter {
  entries = [];

  nextId = 1;

  threshold = 'info';

  file = null;

  maxBytes = MAX_BYTES;

  stream = null;

  bytes = 0;

  // The id the current file starts at. Entries before it are in `.1`.
  fileStartId = 1;

  // Lines written while a rotation is closing the old file.
  pending = null;

  /**
   * Start keeping the journal in `file`, reading back what is already there.
   *
   * Without a call to this the journal still works, in memory only — which is
   * what the controller tests use, and what a server started without a home
   * directory would get.
   */
  open({ file, level = 'info', maxBytes = MAX_BYTES }) {
    this.file = file;
    this.maxBytes = maxBytes;
    this.setLevel(level);

    const previous = readEntries(`${file}.1`);
    const current = readEntries(file);
    this.entries = [...previous, ...current].slice(-MAX_ENTRIES);

    const last = this.entries[this.entries.length - 1];
    this.nextId = last ? last.id + 1 : 1;
    this.fileStartId = current.length ? current[0].id : this.nextId;
    try {
      this.bytes = fs.statSync(file).size;
    } catch (err) {
      this.bytes = 0;
    }
    this.stream = fs.createWriteStream(file, { flags: 'a' });
  }

  close(callback = () => {}) {
    const stream = this.stream;
    this.stream = null;
    if (stream) {
      stream.end(callback);
    } else {
      callback();
    }
  }

  /** The lowest level that is kept. Anything below it is not recorded at all. */
  setLevel(level) {
    if (isLevel(level)) {
      this.threshold = level;
    }
  }

  /**
   * Keep one entry, and tell whoever is listening.
   *
   * @param {object} fields `{ level, source, event, code, port, device,
   *   program, data }` — `level`, `source` and `event` always, the rest when
   *   there is something to say.
   * @returns the entry, or null when its level is below the threshold.
   */
  record(fields) {
    if (rank(fields.level) < rank(this.threshold)) {
      return null;
    }

    const entry = { id: this.nextId, time: new Date().toISOString(), ...fields };
    this.nextId += 1;

    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    }

    this.write(`${JSON.stringify(entry)}\n`);
    this.emit('entry', entry);

    return entry;
  }

  write(line) {
    if (this.pending) {
      this.pending.push(line);
      return;
    }
    if (!this.stream) {
      return;
    }

    this.stream.write(line);
    this.bytes += Buffer.byteLength(line);
    if (this.bytes > this.maxBytes) {
      this.rotate();
    }
  }

  /**
   * The current file becomes `.1`, the old `.1` goes, and a new file starts.
   *
   * The stream is closed before the rename, because Windows will not rename a
   * file something still holds open; what is recorded meanwhile waits in
   * `pending` and goes into the new file, in order.
   */
  rotate() {
    const stream = this.stream;
    this.stream = null;
    this.pending = [];

    // What the file being retired held is what `.1` holds from now on.
    this.entries = this.entries.filter((entry) => entry.id >= this.fileStartId);
    this.fileStartId = this.nextId;

    stream.end(() => {
      try {
        fs.rmSync(`${this.file}.1`, { force: true });
        fs.renameSync(this.file, `${this.file}.1`);
      } catch (err) {
        // Keep writing to the same file rather than stop keeping a journal.
      }
      const pending = this.pending;
      this.pending = null;
      this.bytes = 0;
      this.stream = fs.createWriteStream(this.file, { flags: 'a' });
      pending.forEach((line) => this.write(line));
    });
  }

  /**
   * The entries that pass `filter`, newest first, a page at a time.
   *
   * `before` is the id to continue below — the `next` of the previous page —
   * so a page does not shift when new entries arrive while somebody reads.
   *
   * With the page come the numbers the filter bar shows: `counts` per level
   * with every other filter applied — what each level button would show —
   * `matched` for the whole filter, and `kept` for the journal as a whole.
   * One pass over what is held, which is at most `MAX_ENTRIES`.
   */
  query(filter = {}, { before, limit = 100 } = {}) {
    const { level, ...rest } = filter;
    const records = [];
    const counts = { debug: 0, info: 0, warn: 0, error: 0 };
    let matched = 0;
    let next = null;
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const entry = this.entries[i];
      if (matches(entry, rest)) {
        counts[entry.level] = (counts[entry.level] || 0) + 1;
        if (!level || rank(entry.level) >= rank(level)) {
          matched += 1;
          if (before === undefined || entry.id < before) {
            if (records.length < limit) {
              records.push(entry);
            } else if (next === null) {
              next = records[records.length - 1].id;
            }
          }
        }
      }
    }
    return { records, next, counts, matched, kept: this.entries.length };
  }
}

export default Journal;
