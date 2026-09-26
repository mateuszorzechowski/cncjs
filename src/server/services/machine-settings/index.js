import events from 'events';

/**
 * The server's copy of the controller's settings, and every change to them.
 *
 * Mateusz, 2026-09-26: *"zapis idzie przez serwer, serwer ma kopie i historię
 * zmian i przekazuje sterownikowi"*. The copy is what `$$` last said; the
 * history is each value that differed from the copy when `$$` said it again.
 *
 * Changes are found by comparison rather than recorded at the write, so one
 * made anywhere else — typed into a console, made by another sender while
 * this server was away — is in the history too, the next time `$$` is read.
 * A write from the panel says beforehand which setting it expects to change
 * (`expect`), and the change that follows is put down to that device.
 *
 * Kept in `.cncrc` by `index.js`, as `devices` is. `change` is said once per
 * burst: `$$` is some thirty lines, and the file is written once for them.
 */

/** The most entries the history keeps; a year of tuning is a few dozen. */
export const MOST = 200;

/** How long a burst of `$$` lines is waited out before `change`. */
const SETTLE_MS = 250;

class MachineSettings extends events.EventEmitter {
  copy = { values: {}, time: null };

  history = [];

  // Who asked for a write, by setting, until `$$` says the new value.
  expected = {};

  timer = null;

  open(saved) {
    const values = saved?.copy?.values;
    this.copy = {
      values: values && typeof values === 'object' ? { ...values } : {},
      time: saved?.copy?.time || null,
    };
    this.history = Array.isArray(saved?.history) ? saved.history.slice(-MOST) : [];
    this.expected = {};
  }

  /** A write of `name` is on its way from `device`. */
  expect(name, device) {
    this.expected[name] = { device: device || null };
  }

  /** A write that the controller refused: nothing is on its way after all. */
  forget(name) {
    delete this.expected[name];
  }

  /** A value the controller reported. Returns the history entry when it is a change. */
  observe(name, value, now = new Date()) {
    const from = this.copy.values[name];
    const to = String(value);
    this.copy = { values: { ...this.copy.values, [name]: to }, time: now.toISOString() };
    let entry = null;
    if (from !== undefined && from !== to) {
      const { device = null } = this.expected[name] || {};
      entry = { time: now.toISOString(), name, from, to, device };
      this.history = [...this.history, entry].slice(-MOST);
      this.emit('entry', entry);
    }
    delete this.expected[name];
    this.settle();
    return entry;
  }

  settle() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SETTLE_MS);
  }

  /** Say `change` now rather than after the burst. */
  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    this.emit('change', this.saved());
  }

  /** What `.cncrc` keeps, and what a client is sent. */
  saved() {
    return { copy: this.copy, history: this.history };
  }
}

const machineSettings = new MachineSettings();

export { MachineSettings };

export default machineSettings;
