import { canLoad, checkBlocker, diskLibrary, diskLow, diskUsed, durationParts, isLoaded, reasonOf, sizeParts, LOW_BYTES } from '../files';

describe('a size', () => {
  test.each([
    [0, 0, 'B'],
    [999, 999, 'B'],
    [17927, 17.927, 'kB'],
    [4579063, 4.579063, 'MB'],
    [269471469568, 269.471469568, 'GB'],
  ])('%d bytes is %d %s', (bytes, value, unit) => {
    expect(sizeParts(bytes)).toEqual({ value: expect.closeTo(value, 9), unit });
  });
});

describe('a duration', () => {
  test('is whole hours, minutes and seconds, rounded to the second', () => {
    expect(durationParts(1913.53)).toEqual({ hours: 0, minutes: 31, seconds: 54 });
    expect(durationParts(4361.6)).toEqual({ hours: 1, minutes: 12, seconds: 42 });
    expect(durationParts(59.6)).toEqual({ hours: 0, minutes: 1, seconds: 0 });
  });
});

describe('the disk', () => {
  test('is short under half a gigabyte, however large it is', () => {
    expect(diskLow({ total: 10e9, free: LOW_BYTES - 1 })).toBe(true);
    expect(diskLow({ total: 10e9, free: LOW_BYTES + 1 })).toBe(false);
  });

  test('is short under a twentieth of itself, however much that is', () => {
    expect(diskLow({ total: 1000e9, free: 49e9 })).toBe(true);
    expect(diskLow({ total: 1000e9, free: 51e9 })).toBe(false);
  });

  test('not yet known is not short', () => {
    expect(diskLow(null)).toBe(false);
    expect(diskUsed(null)).toBe(0);
  });

  test('used is a percentage of the whole', () => {
    expect(diskUsed({ total: 200, free: 50 })).toBe(75);
  });

  test('cncjs files are a share of what is used, not of the whole disk', () => {
    // 150 used, 30 of it ours: a fifth of the filled length.
    expect(diskLibrary({ total: 200, free: 50, library: 30 })).toBe(20);
    expect(diskLibrary({ total: 200, free: 50 })).toBe(0);
    expect(diskLibrary(null)).toBe(0);
  });
});

describe('loading', () => {
  const machine = (over) => ({ connected: true, workflow: 'idle', gcode: null, ...over });

  test('is for a connected machine with no program under way', () => {
    expect(canLoad(machine())).toBe(true);
    expect(canLoad(machine({ connected: false }))).toBe(false);
    expect(canLoad(machine({ workflow: 'running' }))).toBe(false);
    // A pause, a tool change included, is still the program's — the server's rule.
    expect(canLoad(machine({ workflow: 'paused' }))).toBe(false);
  });

  test('knows the loaded file by the name the sender keeps', () => {
    expect(isLoaded(machine({ gcode: { name: 'part.nc' } }), 'part.nc')).toBe(true);
    expect(isLoaded(machine({ gcode: { name: 'part.nc' } }), 'other.nc')).toBe(false);
    expect(isLoaded(machine(), 'part.nc')).toBe(false);
  });
});

describe('a refusal', () => {
  test('keeps the reason the screen has words for, and nothing else', () => {
    expect(reasonOf({ reason: 'no-space' })).toBe('no-space');
    expect(reasonOf({ reason: 'program-running' })).toBe('program-running');
    expect(reasonOf({ reason: 'something-new' })).toBe('failed');
    expect(reasonOf(new Error('Failed to fetch'))).toBe('failed');
  });
});

describe('why the controller check is greyed out', () => {
  const machine = (fields) => ({ connected: true, workflow: 'idle', fileCheck: null, canCheckFile: true, ...fields });

  test.each([
    [{}, null],
    [{ connected: false, canCheckFile: false }, 'notConnected'],
    [{ fileCheck: { name: 'a.nc' }, canCheckFile: false }, 'checking'],
    [{ workflow: 'paused', canCheckFile: false }, 'programRunning'],
    [{ canCheckFile: false }, 'notIdle'],
  ])('%o is %s', (fields, reason) => {
    expect(checkBlocker(machine(fields))).toBe(reason);
  });
});
