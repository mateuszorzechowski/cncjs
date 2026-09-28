import events from 'events';

/**
 * The server's copy of the controller's settings, and every change to them.
 *
 * Mateusz, 2026-09-26: *"zapis idzie przez serwer, serwer ma kopie i historię
 * zmian i przekazuje sterownikowi"*. The copy is what `$$` last said; the
 * history is what differed from the copy when `$$` said it again.
 *
 * Changes are found by comparison rather than recorded at the write, so one
 * made anywhere else — typed into a console, made by another sender while
 * this server was away — is in the history too, the next time `$$` is read.
 * A write from the panel says beforehand which settings it expects to change
 * (`expect`), and the changes that follow are put down to that device.
 *
 * **One entry is one write** (settings handoff, 2026-09-28): `{ id, time,
 * source, device, changes }`, a change being `{ name, from, to }`. The
 * changes one reading of `$$` finds are gathered and put down when the
 * reading is over:
 * - the ones a panel write expected, as that write — `source: 'panel'`;
 * - any others in the same reading join that write, marked `expected:
 *   false`. Grbl turns `$20` off by itself when `$22` is (measured on COM3,
 *   2026-09-26), and that is the write's doing, not somebody else's — and
 *   "restore the state before" has to put both back;
 * - a reading no write expected is one `source: 'external'` entry.
 *
 * Kept in `.cncrc` by `index.js`, as `devices` is. `change` is said once per
 * burst: `$$` is some thirty lines, and the file is written once for them.
 * `entry` is still said for each value, for the journal, which keeps codes.
 */

/** The most entries the history keeps; a year of tuning is a few dozen writes. */
export const MOST = 200;

/**
 * How long a burst of `$$` lines is waited out before it is put down.
 * Shorter than the Grbl controller's wait before it sends the view again,
 * so the view it sends has this reading's entry in it.
 */
const SETTLE_MS = 250;

/**
 * Old entries this close were one reading of `$$`. From the history on the
 * bench's `.cncrc`: the changes of one reading came 1–20 ms apart, and the
 * quickest write after a write came 111 ms after it (a test writing a value
 * and putting it back).
 */
const ONE_READING_MS = 100;

/**
 * History kept before 2026-09-28, one value an entry, as entries of the
 * shape above: consecutive values close together were one reading, and a
 * reading with a device in it was that device's write.
 */
const regroup = (old) => {
  const entries = [];
  for (const { time, name, from, to, device } of old) {
    const last = entries[entries.length - 1];
    const joins = last && (Date.parse(time) - Date.parse(last.until)) <= ONE_READING_MS &&
      (!device || !last.device || device === last.device);
    const entry = joins ? last : { time, until: time, device: null, changes: [] };
    if (!joins) {
      entries.push(entry);
    }
    entry.until = time;
    entry.device = entry.device || device || null;
    entry.changes.push({ name, from, to, ...(device ? {} : { expected: false }) });
  }
  return entries.map(({ time, device, changes }, i) => ({
    id: i + 1,
    time,
    source: device ? 'panel' : 'external',
    device,
    // An external reading expected nothing, so nothing in it is unexpected.
    changes: device ? changes : changes.map(({ name, from, to }) => ({ name, from, to })),
  }));
};

const isOld = (entry) => entry && typeof entry.name === 'string' && !Array.isArray(entry.changes);

class MachineSettings extends events.EventEmitter {
  copy = { values: {}, time: null };

  history = [];

  // Which write each setting is expected from, until `$$` says the new value.
  expected = {};

  // The changes of the reading under way, put down when it is over.
  burst = [];

  /*
   * The changes typed on some panel and not yet written, by setting:
   * `{ text, raw }`, as a panel typed them — `raw` for Grbl's own figure,
   * otherwise in the server's units. One set for every panel, kept in
   * `.cncrc`: a reload or another device sees the same bar of changes
   * (Mateusz, 2026-09-28: *"odświeżenie nie usuwa wprowadzonych zmian,
   * zmiany pending są współdzielone"*).
   */
  drafts = {};

  writes = 0;

  timer = null;

  open(saved) {
    const values = saved?.copy?.values;
    this.copy = {
      values: values && typeof values === 'object' ? { ...values } : {},
      time: saved?.copy?.time || null,
    };
    const history = Array.isArray(saved?.history) ? saved.history : [];
    this.history = (isOld(history[0]) ? regroup(history.filter(isOld)) : history).slice(-MOST);
    this.expected = {};
    this.burst = [];
    this.drafts = {};
    this.draft({ set: saved?.drafts });
    clearTimeout(this.timer);
    this.timer = null;
  }

  /**
   * Change the waiting changes: `set` is `{ name: draft | null }`, null
   * taking one back; `clear` empties them first. Anything that is not a `$`
   * setting with a text is left out. Kept with the next `change`.
   */
  draft({ set, clear = false } = {}) {
    const next = clear ? {} : { ...this.drafts };
    for (const [name, value] of Object.entries(set && typeof set === 'object' ? set : {})) {
      if (/^\$\d+$/.test(name) && value && typeof value.text === 'string') {
        next[name] = { text: value.text, raw: Boolean(value.raw) };
      } else {
        delete next[name];
      }
    }
    this.drafts = next;
    this.settle();
    return this.drafts;
  }

  /**
   * Drop the waiting changes `keep(name, draft)` says no longer change
   * anything — written, or a setting the controller no longer reports.
   * Returns whether any went.
   */
  prune(keep) {
    const names = Object.keys(this.drafts).filter((name) => !keep(name, this.drafts[name]));
    if (names.length === 0) {
      return false;
    }
    const next = { ...this.drafts };
    names.forEach((name) => delete next[name]);
    this.drafts = next;
    this.settle();
    return true;
  }

  /** A write of `names` is on its way from `device`. */
  expect(names, device) {
    this.writes += 1;
    for (const name of names) {
      this.expected[name] = { device: device || null, write: this.writes };
    }
  }

  /** A write that the controller refused: nothing is on its way after all. */
  forget(name) {
    delete this.expected[name];
  }

  /**
   * A value the controller reported. Returns the change when it is one —
   * `{ time, name, from, to, device }`, which is also said as `entry`.
   */
  observe(name, value, now = new Date()) {
    const from = this.copy.values[name];
    const to = String(value);
    this.copy = { values: { ...this.copy.values, [name]: to }, time: now.toISOString() };
    let change = null;
    if (from !== undefined && from !== to) {
      const { device = null, write = null } = this.expected[name] || {};
      change = { time: now.toISOString(), name, from, to, device };
      this.burst.push({ ...change, write });
      this.emit('entry', change);
    }
    delete this.expected[name];
    this.settle();
    return change;
  }

  settle() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SETTLE_MS);
  }

  /** Put the reading down, and say `change`, now rather than after the burst. */
  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    this.putDown();
    this.emit('change', this.saved());
  }

  putDown() {
    const burst = this.burst;
    this.burst = [];
    if (burst.length === 0) {
      return;
    }
    const writes = [...new Set(burst.map(({ write }) => write).filter((write) => write !== null))];
    let id = this.history.reduce((most, entry) => Math.max(most, entry.id || 0), 0);
    const change = ({ name, from, to }) => ({ name, from, to });
    const entries = writes.length === 0
      ? [{ source: 'external', device: null, changes: burst.map(change), time: burst[0].time }]
      : writes.map((write, i) => {
        const own = burst.filter((c) => c.write === write);
        // The rest of the reading goes with the first write in it.
        const rest = i === 0 ? burst.filter((c) => c.write === null) : [];
        return {
          source: 'panel',
          device: own[0].device,
          changes: [...own.map(change), ...rest.map((c) => ({ ...change(c), expected: false }))],
          time: own[0].time,
        };
      });
    const numbered = entries.map(({ time, source, device, changes }) => {
      id += 1;
      return { id, time, source, device, changes };
    });
    this.history = [...this.history, ...numbered].slice(-MOST);
  }

  /** What `.cncrc` keeps, and what a client is sent. */
  saved() {
    return { copy: this.copy, history: this.history, drafts: this.drafts };
  }
}

const machineSettings = new MachineSettings();

export { MachineSettings };

export default machineSettings;
