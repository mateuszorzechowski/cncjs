import events from 'events';
import fs from 'fs';
import path from 'path';

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
 */

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

class Library extends events.EventEmitter {
    dir = null;

    watcher = null;

    timer = null;

    /** Make the directory if it is not there, and start noticing changes. */
    open({ dir }) {
      this.close();
      fs.mkdirSync(dir, { recursive: true });
      this.dir = dir;

      try {
        this.watcher = fs.watch(dir, () => this.changed());
        this.watcher.on('error', () => this.stopWatching());
      } catch (err) {
        // A filesystem that cannot be watched still lists, writes and
        // deletes; only a file copied in by hand waits for the next look.
        this.watcher = null;
      }
    }

    close() {
      this.stopWatching();
      clearTimeout(this.timer);
      this.timer = null;
      this.dir = null;
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
      }, SETTLE_MS);
    }

    resolve(name) {
      if (!isSafeName(name)) {
        throw nameError();
      }
      return path.join(this.dir, name);
    }

    /** The files, newest first, and how much room the disk has left. */
    async list() {
      const entries = await fs.promises.readdir(this.dir, { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        if (!entry.isFile() || !isSafeName(entry.name)) {
          continue;
        }
        try {
          const stat = await fs.promises.stat(path.join(this.dir, entry.name));
          files.push({ name: entry.name, size: stat.size, mtime: stat.mtime.toISOString() });
        } catch (err) {
          // Removed between the listing and the look: it is not there.
        }
      }

      files.sort((a, b) => b.mtime.localeCompare(a.mtime));

      return { files, disk: await this.disk() };
    }

    async disk() {
      const stat = await fs.promises.statfs(this.dir);

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
      const { free } = await this.disk();

      if (Buffer.byteLength(data, 'utf8') >= free) {
        throw Object.assign(new Error('No room on the disk'), { code: 'no-space' });
      }

      const temporary = path.join(this.dir, `.${name}.${process.pid}.part`);
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
      this.changed();
    }
}

export default Library;
