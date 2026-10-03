import events from 'events';
import fs from 'fs';
import path from 'path';

/**
 * The program loaded on a port, kept on the server's disk so it outlives the
 * port closing and the server restarting (Mateusz, 2026-10-03: the program
 * bent to the height map is "plik tymczasowy, który przeżyje (serwerowy)",
 * and the server loads it back by itself).
 *
 * Two files beside `.cncrc`: the program as written, and — while the height
 * map can bend it — the program as it will be cut. Which port and which name
 * are in `.cncrc` (`program`). Loaded back when that port opens; gone when
 * the program is unloaded.
 */
const AS_WRITTEN = 'program.nc';
const BENT = 'program-bent.nc';

class KeptProgram extends events.EventEmitter {
  dir = null;

  saved = null;

  /** Where the files are, and which program they are (`{ port, name, context }`), from `.cncrc`. */
  open({ dir, saved }) {
    this.dir = dir;
    this.saved = saved && typeof saved.port === 'string' && typeof saved.name === 'string' ? saved : null;
  }

  file(name) {
    return path.join(this.dir, name);
  }

  /** Keep the program loaded on `port`, as written. Nothing before `open`. */
  keep(port, { name, gcode, context }) {
    if (!this.dir) {
      return;
    }
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.file(AS_WRITTEN), gcode);
    fs.rmSync(this.file(BENT), { force: true });
    this.saved = { port, name, context: context || {} };
    this.emit('change', this.saved);
  }

  /** The program on `port` as it will be cut, or null: the map does not bend it. */
  keepBent(port, gcode) {
    if (!this.dir || this.saved?.port !== port) {
      return;
    }
    if (gcode === null) {
      fs.rmSync(this.file(BENT), { force: true });
      return;
    }
    fs.writeFileSync(this.file(BENT), gcode);
  }

  /** The program kept for `port` (`{ name, gcode, context }`), or null. */
  kept(port) {
    if (!this.dir || this.saved?.port !== port) {
      return null;
    }
    try {
      return { name: this.saved.name, gcode: fs.readFileSync(this.file(AS_WRITTEN), 'utf8'), context: this.saved.context };
    } catch (err) {
      return null;
    }
  }

  /** Unloaded on `port`: nothing to load back. */
  clear(port) {
    if (!this.dir || this.saved?.port !== port) {
      return;
    }
    fs.rmSync(this.file(AS_WRITTEN), { force: true });
    fs.rmSync(this.file(BENT), { force: true });
    this.saved = null;
    this.emit('change', null);
  }
}

const keptProgram = new KeptProgram();

export default keptProgram;
