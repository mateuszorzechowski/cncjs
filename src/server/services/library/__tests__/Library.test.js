import fs from 'fs';
import os from 'os';
import path from 'path';
import Library, { isSafeName } from '../Library';

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

describe('change', () => {
  const nextChange = () => new Promise((resolve) => library.once('change', resolve));

  test('is said once for a burst of its own writes', async () => {
    const said = jest.fn();
    library.on('change', said);

    await library.write('a.nc', 'G0');
    await library.write('b.nc', 'G0');
    await nextChange();

    expect(said).toHaveBeenCalledTimes(1);
  });

  test('is said for a file copied in by hand', async () => {
    const changed = nextChange();

    fs.writeFileSync(path.join(dir, 'by-hand.nc'), 'G0');

    await changed;
  });
});
