import fs from 'fs';
import os from 'os';
import path from 'path';
import Library, { isSafeName } from '../Library';
import { machineTiming } from '../estimate';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'library-'));

let library;
let dir;

beforeEach(() => {
  dir = path.join(tmp(), 'files');
  library = new Library();
  library.open({ dir });
});

afterEach(() => {
  library.close();
});

describe('the directory', () => {
  test('is made on first use, so an unconfigured machine has a library', () => {
    expect(fs.statSync(dir).isDirectory()).toBe(true);
  });

  test('lists files newest first, with size and time', async () => {
    // Named so that the alphabet says the opposite of the clock.
    fs.writeFileSync(path.join(dir, 'a-old.nc'), 'G0 X0');
    fs.utimesSync(path.join(dir, 'a-old.nc'), new Date('2026-09-01'), new Date('2026-09-01'));
    fs.writeFileSync(path.join(dir, 'b-new.nc'), 'G0 X0\nG0 X1');

    const { files } = await library.list();

    expect(files.map(f => f.name)).toEqual(['b-new.nc', 'a-old.nc']);
    expect(files[0].size).toBe(11);
    expect(files[1].mtime).toBe('2026-09-01T00:00:00.000Z');
  });

  test('leaves out directories and hidden files, which include a write under way', async () => {
    fs.mkdirSync(path.join(dir, 'sub'));
    fs.writeFileSync(path.join(dir, '.part.nc.123.part'), 'G0');
    fs.writeFileSync(path.join(dir, 'part.nc'), 'G0');

    const { files } = await library.list();

    expect(files.map(f => f.name)).toEqual(['part.nc']);
  });

  test('closed halfway through a listing, the listing finishes and what comes after refuses', async () => {
    // `statfs(null)` is not an error in node 22 — it is a native assertion
    // that takes the whole server down, so no call may pick up a null
    // directory between two of its awaits.
    fs.writeFileSync(path.join(dir, 'part.nc'), 'G0');
    const listing = library.list();
    library.close();

    await expect(listing).resolves.toMatchObject({ files: [{ name: 'part.nc' }] });
    await expect(library.list()).rejects.toMatchObject({ code: 'closed' });
    await expect(library.disk()).rejects.toMatchObject({ code: 'closed' });
  });

  test('says how much room the disk has', async () => {
    const { disk } = await library.list();

    expect(disk.total).toBeGreaterThan(0);
    expect(disk.free).toBeGreaterThan(0);
    expect(disk.free).toBeLessThanOrEqual(disk.total);
  });
});

describe('a name is a name, never a path', () => {
  test.each([
    ['../outside.nc'],
    ['..\\outside.nc'],
    ['sub/part.nc'],
    ['C:part.nc'],
    ['..'],
    ['.hidden'],
    [''],
    ['part.nc '],
    ['a\0b'],
    ['x'.repeat(256)],
  ])('refuses %j', async (name) => {
    expect(isSafeName(name)).toBe(false);
    await expect(library.write(name, 'G0')).rejects.toMatchObject({ code: 'bad-name' });
    await expect(library.read(name)).rejects.toMatchObject({ code: 'bad-name' });
    await expect(library.remove(name)).rejects.toMatchObject({ code: 'bad-name' });
  });

  test('nothing lands beside the directory', async () => {
    await library.write('../outside.nc', 'G0').catch(() => {});

    expect(fs.existsSync(path.join(dir, '..', 'outside.nc'))).toBe(false);
  });

  test.each([['front-panel v3.nc'], ['łuk_ćwiczebny.gcode'], ['a.b.c.tap']])('keeps %j', (name) => {
    expect(isSafeName(name)).toBe(true);
  });
});

describe('writing', () => {
  test('keeps the text, and replaces a file of the same name', async () => {
    await library.write('part.nc', 'G0 X0');
    await library.write('part.nc', 'G0 X1');

    expect(await library.read('part.nc')).toBe('G0 X1');
    expect(fs.readdirSync(dir)).toEqual(['part.nc']);
  });

  test('refuses what the disk has no room for, and leaves the old file whole', async () => {
    await library.write('part.nc', 'G0 X0');
    jest.spyOn(library, 'disk').mockResolvedValue({ total: 100, free: 4 });

    await expect(library.write('part.nc', 'G0 X1')).rejects.toMatchObject({ code: 'no-space' });
    expect(await library.read('part.nc')).toBe('G0 X0');
  });

  test('a write that fails halfway leaves no temporary behind', async () => {
    jest.spyOn(fs.promises, 'rename').mockRejectedValueOnce(Object.assign(new Error('full'), { code: 'ENOSPC' }));

    await expect(library.write('part.nc', 'G0')).rejects.toMatchObject({ code: 'ENOSPC' });
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe('deleting', () => {
  test('removes the file', async () => {
    await library.write('part.nc', 'G0');
    await library.remove('part.nc');

    expect((await library.list()).files).toEqual([]);
  });

  test('a file that is not there says so', async () => {
    await expect(library.remove('none.nc')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

const nextChange = () => new Promise((resolve) => library.once('change', resolve));

/** The listing once every file in it has its analysis. */
const analysed = async () => {
  for (;;) {
    const listing = await library.list();
    if (listing.files.every(file => file.analysis)) {
      return listing;
    }
    await nextChange();
  }
};

const MACHINE = machineTiming({
  $11: '0.010', $12: '0.002',
  $110: '6000', $111: '6000', $112: '3000',
  $120: '500', $121: '500', $122: '500',
});

describe('analysis', () => {
  test('arrives with the listing once a file is in, without being asked for', async () => {
    await library.write('part.nc', 'G21 G90\nT3 M6\nG0 X10 Y5\nG1 Z-2 F300\n');

    const { files } = await analysed();

    expect(files[0].analysis).toEqual({
      lines: 4,
      bounds: { min: { x: 10, y: 5, z: -2 }, max: { x: 10, y: 5, z: 0 } },
      tools: [3],
      wcs: [],
      units: ['G21'],
      seconds: null,
      check: {
        verdict: 'warnings',
        issues: [{ code: 'tool-change', severity: 'warning', word: 'M6', line: 2, count: 1 }],
      },
    });
  });

  test('covers what was already in the directory when it opened', async () => {
    library.close();
    fs.writeFileSync(path.join(dir, 'before.nc'), 'G0 X1');
    library.open({ dir });

    const { files } = await analysed();

    expect(files[0]).toMatchObject({ name: 'before.nc', analysis: { lines: 1 } });
  });

  test('is worked out again when the file changes', async () => {
    await library.write('part.nc', 'G0 X1');
    await analysed();
    await library.write('part.nc', 'G0 X1\nG0 X2');

    const { files } = await analysed();

    expect(files[0].analysis.lines).toBe(2);
  });

  test('has a time once a machine has said its limits, and says the machine was new', async () => {
    const said = jest.fn();
    library.on('machine', said);
    await library.write('part.nc', 'G21 G90\nG1 X100 F600\n');
    await analysed();

    library.setMachine(MACHINE);
    for (;;) {
      const { files } = await analysed();
      if (files[0].analysis.seconds !== null) {
        expect(files[0].analysis.seconds).toBeCloseTo(10.02, 6);
        break;
      }
      await nextChange();
    }
    expect(said).toHaveBeenCalledWith(MACHINE);

    // The same limits again are not news.
    library.setMachine({ ...MACHINE });
    expect(said).toHaveBeenCalledTimes(1);
  });

  test('starts from the machine it was opened with', async () => {
    library.close();
    library.open({ dir, machine: MACHINE });
    await library.write('part.nc', 'G21 G90\nG1 X100 F600\n');

    const { files } = await analysed();

    expect(files[0].analysis.seconds).toBeCloseTo(10.02, 6);
  });

  test('is checked again when the start events change what they set', async () => {
    await library.write('part.nc', 'G0 X1\n');
    expect((await analysed()).files[0].analysis.check.verdict).toBe('warnings');

    library.setStart('G21 G90');
    for (;;) {
      const { files } = await analysed();
      if (files[0].analysis.check.verdict === 'ok') {
        break;
      }
      await nextChange();
    }
  });

  test('of a file replaced while it was being read is not kept', async () => {
    await library.write('part.nc', 'G0 X1');
    await analysed();

    const real = fs.promises.readFile;
    jest.spyOn(fs.promises, 'readFile').mockImplementationOnce(async (...args) => {
      const text = await real(...args);
      fs.writeFileSync(path.join(dir, 'part.nc'), 'G0 X1\nG0 X2\nG0 X3');
      return text;
    });
    await library.write('part.nc', 'G0 X1\nG0 X2');

    const { files } = await analysed();

    expect(files[0].analysis.lines).toBe(3);
  });
});

describe("the controller's check", () => {
  const RESULT = { complete: true, total: 1, errors: [], alarm: null, stoppedAt: null };

  test('is kept with the file, and outlives a restart', async () => {
    await library.write('part.nc', 'G0 X1');
    await library.setControllerCheck('part.nc', await library.stamp('part.nc'), RESULT);

    expect((await library.list()).files[0].controllerCheck).toEqual(RESULT);

    library.close();
    library.open({ dir });
    expect((await library.list()).files[0].controllerCheck).toEqual(RESULT);
  });

  test('is not listed as a file, and cannot be reached by name', async () => {
    await library.write('part.nc', 'G0 X1');
    await library.setControllerCheck('part.nc', await library.stamp('part.nc'), RESULT);

    expect((await library.list()).files.map(file => file.name)).toEqual(['part.nc']);
    await expect(library.read('.checks.json')).rejects.toMatchObject({ code: 'bad-name' });
  });

  test('belongs to the file as it was: a changed file has none', async () => {
    await library.write('part.nc', 'G0 X1');
    const stamp = await library.stamp('part.nc');
    await library.write('part.nc', 'G0 X1\nG0 X2');
    await library.setControllerCheck('part.nc', stamp, RESULT);

    expect((await library.list()).files[0].controllerCheck).toBeNull();
  });

  test('goes with the file', async () => {
    await library.write('part.nc', 'G0 X1');
    await library.setControllerCheck('part.nc', await library.stamp('part.nc'), RESULT);
    await library.remove('part.nc');
    await library.write('part.nc', 'G0 X1');

    expect((await library.list()).files[0].controllerCheck).toBeNull();
    library.close();
    library.open({ dir });
    expect(library.checks.size).toBe(0);
  });

  test('a kept file that cannot be read is no checks, not a failure', () => {
    library.close();
    fs.writeFileSync(path.join(dir, '.checks.json'), '{ not json');
    library.open({ dir });

    expect(library.checks.size).toBe(0);
  });
});

describe('change', () => {
  test('is said once for a burst of writes, and once more when their analyses are in', async () => {
    const said = jest.fn();
    library.on('change', said);

    await library.write('a.nc', 'G0');
    await library.write('b.nc', 'G0');
    await nextChange();
    expect(said).toHaveBeenCalledTimes(1);

    await analysed();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(said).toHaveBeenCalledTimes(2);
  });

  test('is said for a file copied in by hand', async () => {
    const changed = nextChange();

    fs.writeFileSync(path.join(dir, 'by-hand.nc'), 'G0');

    await changed;
  });
});
