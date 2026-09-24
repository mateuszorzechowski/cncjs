import { activeWcsNumber, zeroLine } from '../zero';

describe('which coordinate system a zero writes', () => {
  test('is the one the machine says it is working in', () => {
    // Not a hard-coded P1. Zeroing G54 while the job runs in G55 is silent,
    // and it is discovered by a tool moving to the wrong place under power.
    expect(zeroLine({ modal: { wcs: 'G55' }, axes: ['z'] })).toBe('G10 L20 P2 Z0');
    expect(zeroLine({ modal: { wcs: 'G59' }, axes: ['x', 'y'] })).toBe('G10 L20 P6 X0 Y0');
  });

  test('is nothing at all when the machine has not said', () => {
    // A parser state that has not arrived, and a modal word that is not one of
    // the six. Both mean the same thing here: there is no system to name.
    expect(activeWcsNumber({})).toBe(0);
    expect(activeWcsNumber({ wcs: 'G92' })).toBe(0);
    expect(zeroLine({ modal: {}, axes: ['z'] })).toBeNull();
  });
});

describe('the line itself', () => {
  test('names every axis asked for, and only those', () => {
    expect(zeroLine({ modal: { wcs: 'G54' }, axes: ['x', 'y', 'z'] })).toBe('G10 L20 P1 X0 Y0 Z0');
    expect(zeroLine({ modal: { wcs: 'G54' }, axes: ['z'] })).toBe('G10 L20 P1 Z0');
  });

  test('is null when nothing was asked for', () => {
    // `G10 L20 P1` on its own is a line the machine accepts and that changes
    // nothing — which is the silence this whole command exists to remove.
    expect(zeroLine({ modal: { wcs: 'G54' }, axes: [] })).toBeNull();
    expect(zeroLine({ modal: { wcs: 'G54' } })).toBeNull();
    expect(zeroLine({ modal: { wcs: 'G54' }, axes: ['', ' '] })).toBeNull();
  });
});
