import events from 'events';
import fs from 'fs';
import path from 'path';
import isEqual from 'lodash/isEqual';
import analyse from './analyse';

/**
 * The panel's files — programs kept on the server, for the Pliki screen.
 *
 * Asked for by Mateusz on 2026-09-25: a library on the server, with the disk
 * space shown beside it. One flat directory, beside the configuration unless
 * `.cncrc` names another, and made on first use, so the screen works on a
 * machine nobody has configured.
 *
 * **Not the watch directory.** That one belongs to the old application and
 * leaves with it — see `server-backlog.md`. This one is read from disk on
 * every listing rather than cached, so a file copied in by hand is there on
 * the next look; `fs.watch` only says *when* to look again.
 *
 * **A name is a name, never a path.** Every call takes the bare file name
 * and refuses anything that could reach outside the directory.
 *
 * **Every file is analysed as it arrives** — lines, bounds, tools, time; see
 * `analyse`. One at a time, in the background, and again for every file when
 * the machine's limits change, since the time is the machine's — and when
 * the start events do, since the check reads what they set. A listing
 * carries what is ready; `change` is said again when more is.
 */

/**
 * Where the controller's checks (`$C`) are kept, in the directory itself:
 * hidden, so neither the listing nor a file name can reach it, and read back
 * on open, so a check outlives a restart (Mateusz, 2026-09-25).
 */
const CHECKS_FILE = '.checks.json';

/** How long a burst of changes is gathered before one `change` is said. */
const SETTLE_MS = 100;

/** A name the directory can hold and nothing outside it can be reached by. */
export const isSafeName = (name) => (
  typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 255 &&
    !name.startsWith('.') &&
    !/[\\/:*?"<>|\0]/.test(name) &&
    name.trim() === name
);

const nameError = () => Object.assign(new Error('Not a file name'), { code: 'bad-name' });

/**
 * The directory a call starts with, which it keeps to the end: a library
 * closed between two awaits must not hand the next one `null` — `statfs(null)`
 * does not throw, it aborts node.
 */
const opened = (dir) => {
  if (!dir) {
    throw Object.assign(new Error('The library is not open'), { code: 'closed' });
  }
  return dir;
};

/**
 * One word for a file's row, from both checks: `incompatible` when either
 * found what Grbl will not take, `warnings` when the server's has something
 * to say, `verified` once Grbl read it through and took every line, `ok` when
 * only the server's has passed, and null while it is still being analysed.
 */
export const statusOf = (analysis, controllerCheck) => {
  if (!analysis) {
    return null;
  }
  const c = controllerCheck;
  if (analysis.check.verdict === 'incompatible' || (c && (c.errors.length > 0 || c.alarm || c.refused))) {
    return 'incompatible';
  }
  if (analysis.check.verdict === 'warnings') {
    return 'warnings';
  }
  return c?.complete ? 'verified' : 'ok';
};

/** The kept checks, or none: a file that is missing or unreadable is no checks, not a failure. */
const readChecks = (dir) => {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(path.join(dir, CHECKS_FILE), 'utf8'))));
  } catch (err) {
    return new Map();
  }
};

class Library extends events.EventEmitter {
    dir = null;

    watcher = null;

    timer = null;

    /** The limits times are worked out with — `estimate.machineTiming`. */
    machine = null;

    /** The G-code the `gcode:start` events send before every program — `analyse`'s `start`. */
    start = '';

    /** Name to `{ mtime, size, machine, start, analysis }`, for as long as all four still hold. */
    analyses = new Map();

    /** Name to `{ mtime, size, result }`: the last `$C` of the file as it then was. */
    checks = new Map();

    queue = [];

    analysing = false;

    /** Make the directory if it is not there, and start noticing changes. */
    open({ dir, machine = null, start = '' }) {
      this.close();
      fs.mkdirSync(dir, { recursive: true });
      this.dir = dir;
      this.machine = machine;
      this.start = start;
      this.checks = readChecks(dir);

      try {
        this.watcher = fs.watch(dir, () => this.changed());
        this.watcher.on('error', () => this.stopWatching());
      } catch (err) {
        // A filesystem that cannot be watched still lists, writes and
        // deletes; only a file copied in by hand waits for the next look.
        this.watcher = null;
      }

      this.refresh();
    }

    close() {
      this.stopWatching();
      clearTimeout(this.timer);
      this.timer = null;
      this.dir = null;
      this.analyses.clear();
      this.checks = new Map();
      this.queue = [];
    }

    /**
     * The machine has said its limits. When they differ from the last ones,
     * every time is stale: say so (the server keeps them, so a time is there
     * before the port is next opened) and work them all out again. The old
     * times stay on show until the new ones replace them.
     */
    setMachine(machine) {
      if (!machine || isEqual(machine, this.machine)) {
        return;
      }
      this.machine = machine;
      this.emit('machine', machine);
      this.refresh();
    }

    /** The start events changed: every check is stale, as every time is in `setMachine`. */
    setStart(start) {
      if (start === this.start) {
        return;
      }
      this.start = start;
      this.refresh();
    }

    stopWatching() {
      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }
    }

    /** Say `change` once, however many things moved at once. */
    changed() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.emit('change');
        this.refresh();
      }, SETTLE_MS);
    }

    /** Queue every file whose analysis is missing or out of date, and forget the gone. */
    async refresh() {
      const dir = this.dir;
      let files;
      try {
        ({ files } = await this.listFiles(dir));
      } catch (err) {
        return;
      }
      if (dir !== this.dir) {
        return;
      }

      const present = new Set(files.map(file => file.name));
      for (const name of this.analyses.keys()) {
        if (!present.has(name)) {
          this.analyses.delete(name);
        }
      }
      for (const file of files) {
        const known = this.analyses.get(file.name);
        const current = known && known.mtime === file.mtime && known.size === file.size && known.machine === this.machine && known.start === this.start;
        if (!current && !this.queue.includes(file.name)) {
          this.queue.push(file.name);
        }
      }
      this.analyse();
    }

    /** One file at a time, so a directory of programs is not parsed at once. */
    async analyse() {
      if (this.analysing) {
        return;
      }
      this.analysing = true;

      while (this.queue.length > 0) {
        const dir = this.dir;
        const machine = this.machine;
        const start = this.start;
        const name = this.queue.shift();
        try {
          const file = path.join(opened(dir), name);
          const before = await fs.promises.stat(file);
          const analysis = await analyse(await fs.promises.readFile(file, 'utf8'), machine, start);
          const after = await fs.promises.stat(file);

          // Kept only if nothing moved while it was read; otherwise the
          // change that moved it has queued it again.
          if (dir === this.dir && after.mtimeMs === before.mtimeMs && after.size === before.size) {
            this.analyses.set(name, { mtime: after.mtime.toISOString(), size: after.size, machine, start, analysis });
            this.changed();
          }
        } catch (err) {
          // Gone, or unreadable: the listing says what is there.
        }
      }

      this.analysing = false;
    }

    resolve(name) {
      if (!isSafeName(name)) {
        throw nameError();
      }
      return path.join(opened(this.dir), name);
    }

    /**
     * The files, newest first, each with its analysis once it is ready, and
     * how much room the disk has left.
     */
    async list() {
      const { files, disk } = await this.listFiles(this.dir);

      return {
        files: files.map(file => {
          const known = this.analyses.get(file.name);
          const current = known && known.mtime === file.mtime && known.size === file.size;
          const checked = this.checks.get(file.name);
          const same = checked && checked.mtime === file.mtime && checked.size === file.size;
          const analysis = current ? known.analysis : null;
          const controllerCheck = same ? checked.result : null;
          return { ...file, analysis, controllerCheck, status: statusOf(analysis, controllerCheck) };
        }),
        disk,
      };
    }

    async listFiles(dir) {
      const entries = await fs.promises.readdir(opened(dir), { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        if (!entry.isFile() || !isSafeName(entry.name)) {
          continue;
        }
        try {
          const stat = await fs.promises.stat(path.join(dir, entry.name));
          files.push({ name: entry.name, size: stat.size, mtime: stat.mtime.toISOString() });
        } catch (err) {
          // Removed between the listing and the look: it is not there.
        }
      }

      files.sort((a, b) => b.mtime.localeCompare(a.mtime));

      return { files, disk: await this.disk(dir) };
    }

    async disk(dir = this.dir) {
      const stat = await fs.promises.statfs(opened(dir));

      return { total: stat.blocks * stat.bsize, free: stat.bavail * stat.bsize };
    }

    async read(name) {
      const text = await fs.promises.readFile(this.resolve(name), 'utf8');

      return text;
    }

    /**
     * Write through a hidden temporary and a rename, so a disk that fills
     * halfway leaves the old file whole rather than a truncated program.
     */
    async write(name, data) {
      const target = this.resolve(name);
      const dir = path.dirname(target);
      const { free } = await this.disk(dir);

      if (Buffer.byteLength(data, 'utf8') >= free) {
        throw Object.assign(new Error('No room on the disk'), { code: 'no-space' });
      }

      const temporary = path.join(dir, `.${name}.${process.pid}.part`);
      try {
        await fs.promises.writeFile(temporary, data, 'utf8');
        await fs.promises.rename(temporary, target);
      } catch (err) {
        await fs.promises.rm(temporary, { force: true });
        throw err;
      }
      this.changed();
    }

    async remove(name) {
      await fs.promises.unlink(this.resolve(name));
      if (this.checks.delete(name)) {
        await this.saveChecks();
      }
      this.changed();
    }

    /** The file as it is now — what a check made of it is kept against. */
    async stamp(name) {
      const stat = await fs.promises.stat(this.resolve(name));
      return { mtime: stat.mtime.toISOString(), size: stat.size };
    }

    /** Keep what `$C` said of a file, for as long as the file is the one it read. */
    async setControllerCheck(name, { mtime, size }, result) {
      this.resolve(name);
      this.checks.set(name, { mtime, size, result });
      await this.saveChecks();
      this.changed();
    }

    /** Written the way a program is: a temporary, then a rename. */
    async saveChecks() {
      const dir = opened(this.dir);
      const target = path.join(dir, CHECKS_FILE);
      const temporary = `${target}.${process.pid}.part`;
      await fs.promises.writeFile(temporary, JSON.stringify(Object.fromEntries(this.checks)), 'utf8');
      await fs.promises.rename(temporary, target);
    }

    /** Each analysed file's bounds, from work zero — what `files:fit` is worked out from. */
    bounds() {
      const bounds = {};
      for (const [name, { analysis }] of this.analyses) {
        if (analysis.bounds) {
          bounds[name] = analysis.bounds;
        }
      }
      return bounds;
    }
}

export default Library;
