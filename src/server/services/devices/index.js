import events from 'events';

/**
 * The devices that have talked to this server, by the id each keeps for
 * itself (`panel/machine/device.js`) — so the journal can say *who* did a
 * thing in words a person knows: a name, an address, a system and a browser,
 * never a UUID (Mateusz, 2026-09-26: *"urządzenie musi być identyfikowalne
 * bez znajomości UUID-ów i randomowych stringów"*).
 *
 * The name is the device's own: detected by the panel as specifically as its
 * browser allows (`deviceName.js`), or what somebody typed in Settings. The
 * address is the server's reading of the connection. Kept in `.cncrc`, the
 * most recent `MOST` only, and written when something a reader would see
 * changes — not on every reconnect.
 */
export const MOST = 50;

const clean = (value, most = 80) => (typeof value === 'string' ? value.trim().slice(0, most) : '');

/** `::ffff:192.168.0.23` is `192.168.0.23`; `::1` is the computer itself. */
export const readableAddress = (address) => {
  const bare = clean(address, 64).replace(/^::ffff:/, '');
  return bare === '::1' ? '127.0.0.1' : bare;
};

class Devices extends events.EventEmitter {
  known = {};

  open(saved) {
    this.known = saved && typeof saved === 'object' ? { ...saved } : {};
  }

  /**
   * A device seen: `{ name, system, browser, model, ip }`, any of them. What
   * it said replaces what was known; what it did not say is kept.
   */
  seen(id, said = {}, now = new Date()) {
    if (!clean(id, 128)) {
      return null;
    }
    const had = this.known[id] || {};
    const next = { ...had };
    for (const key of ['name', 'system', 'browser', 'model']) {
      if (clean(said[key])) {
        next[key] = clean(said[key]);
      }
    }
    if (said.ip) {
      next.ip = readableAddress(said.ip);
    }
    next.seen = now.toISOString();
    const changed = ['name', 'system', 'browser', 'model', 'ip'].some((key) => next[key] !== had[key]);
    this.known[id] = next;
    this.trim();
    if (changed) {
      this.emit('change', this.known);
    }
    return next;
  }

  /** The most recently seen `MOST`, the rest forgotten. */
  trim() {
    const ids = Object.keys(this.known);
    if (ids.length <= MOST) {
      return;
    }
    ids.sort((a, b) => String(this.known[b].seen).localeCompare(String(this.known[a].seen)));
    for (const id of ids.slice(MOST)) {
      delete this.known[id];
    }
  }

  /** What is known of these ids, for a page of the journal. */
  describe(ids) {
    const out = {};
    for (const id of ids) {
      if (id && this.known[id]) {
        out[id] = this.known[id];
      }
    }
    return out;
  }

  all() {
    return this.known;
  }
}

const devices = new Devices();

export default devices;
