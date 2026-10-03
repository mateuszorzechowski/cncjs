import { probeDetails, probeLine } from '../probeJournal';

jest.mock('../../machine/controller', () => ({ __esModule: true, default: { command: jest.fn() } }));
// The key and what fills it, so a sentence's parts can be read back.
jest.mock('../../i18n', () => ({ t: (key, params) => (params ? `${key}${JSON.stringify(params)}` : key) }));

const units = { figure: (mm) => mm.toFixed(3), length: 'mm' };
const entry = (code, data) => ({ event: 'probe', code, data });

describe('a probe entry in words', () => {
  test('a start names the method and its choice', () => {
    expect(probeLine(entry('start', { method: 'width', shape: 'bar-x' }), units))
      .toBe('journal.probe.start{"method":"probe.method.width · probe.shape.barX"}');
  });

  test('a zero measured: each axis where it goes and by how much; an older entry without the shift too', () => {
    expect(probeLine(entry('measured', { method: 'z', wcs: 'G54', offset: { z: -17.1 }, shift: { z: 12.9 } }), units))
      .toBe('journal.probe.measured{"method":"probe.method.z","axes":"Z -17.100 (journal.probe.by{\\"shift\\":\\"+12.900\\"})","unit":"mm"}');
    expect(probeLine(entry('measured', { method: 'z', z: -17.1 }), units)).toContain('"axes":"Z -17.100"');
  });

  test('a size with its spread and passes, and the ball', () => {
    const line = probeLine(entry('size', {
      method: 'hole-size', size: { x: 24.012, y: 18.003 }, spread: { x: 0.004, y: 0.002 }, passes: 3, ball: 2,
    }), units);
    expect(line).toContain('"sizes":"X 24.012 · Y 18.003"');
    expect(line).toContain('journal.probe.spread{\\"list\\":\\"X 0.004 · Y 0.002\\",\\"n\\":3}');
    expect(line).toContain('"ball":"2.000"');
  });

  test('a failure as the result screen says it, with the method', () => {
    expect(probeLine(entry('touched', { method: 'width', shape: 'bar-x', phase: 'x1a-down' }), units))
      .toContain('probe.failure.touched{\\"code\\":\\"touched\\",\\"axis\\":\\"X\\"}');
  });

  test('a map saved and a zero written', () => {
    expect(probeLine(entry('applied', { method: 'height-map' }), units)).toBe('journal.probe.mapSaved');
    expect(probeLine(entry('applied', { method: 'corner', wcs: 'G55' }), units)).toContain('"wcs":"G55"');
  });

  test('only probe entries; opened, a size lists its figures', () => {
    expect(probeLine({ event: 'alarm', code: 'ALARM:1' }, units)).toBeNull();
    expect(probeDetails(entry('size', {
      method: 'width', shape: 'groove-y', size: { y: 12 }, spread: null, passes: 1, ball: 2,
    }), units).map(([label]) => label)).toEqual(['journal.detail.method', 'Y', 'journal.detail.passes', 'journal.detail.ball']);
  });
});
