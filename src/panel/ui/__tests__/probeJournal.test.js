import { probeDetails, probeLine } from '../probeJournal';

jest.mock('../../machine/controller', () => ({ __esModule: true, default: { command: jest.fn() } }));
// The key and what fills it, so a sentence's parts can be read back.
jest.mock('../../i18n', () => ({ t: (key, params) => (params ? `${key}${JSON.stringify(params)}` : key) }));

const units = { figure: (mm) => mm.toFixed(3), length: 'mm' };
const entry = (code, data) => ({ event: 'probe', code, data });

describe('a probe entry in words', () => {
  test('a start names the method and its choice', () => {
    expect(probeLine(entry('start', { method: 'measure', shape: 'bar-x' }), units))
      .toBe('journal.probe.start{"method":"probe2.method.probe3d · probe2.shape.partX"}');
  });

  test('a zero measured: each axis where it goes and by how much; an older entry without the shift too', () => {
    expect(probeLine(entry('measured', { method: 'z', wcs: 'G54', offset: { z: -17.1 }, shift: { z: 12.9 } }), units))
      .toBe('journal.probe.measured{"method":"probe.method.z","axes":"Z -17.100 (journal.probe.by{\\"shift\\":\\"+12.900\\"})","unit":"mm"}');
    expect(probeLine(entry('measured', { method: 'z', z: -17.1 }), units)).toContain('"axes":"Z -17.100"');
  });

  test('a distance: each figure with its own unit, the first end said as measured', () => {
    const line = probeLine(entry('size', {
      method: 'measure', shape: 'distance', a: 'circle-inside', b: 'circle-inside', size: { dist: 50, dx: 40, dy: 30, a: 36.87 }, spread: null, passes: 1, ball: 2,
    }), units);
    expect(line).toContain('probe2.method.measure · probe.shape.distance');
    expect(line).toContain('"sizes":"journal.detail.dist 50.000 mm · journal.detail.angle 36.870° · ΔX 40.000 mm · ΔY 30.000 mm"');
    expect(line).toContain('"unit":""');
    expect(probeLine(entry('first', { method: 'measure', shape: 'distance', size: { d: 20 } }), units)).toContain('journal.probe.first');
  });

  test('a size with its spread and passes, and the ball', () => {
    const line = probeLine(entry('size', {
      method: 'measure', shape: 'rect-inside', size: { x: 24.012, y: 18.003 }, spread: { x: 0.004, y: 0.002 }, passes: 3, ball: 2,
    }), units);
    expect(line).toContain('"sizes":"X 24.012 · Y 18.003"');
    expect(line).toContain('journal.probe.spread{\\"list\\":\\"X 0.004 · Y 0.002\\",\\"n\\":3}');
    expect(line).toContain('"ball":"2.000"');
  });

  test('an edge by its angle, in degrees, with no length unit', () => {
    const line = probeLine(entry('size', {
      method: 'measure', shape: 'edge-front', size: { a: 0.5123 }, spread: null, centre: { y: -60 }, passes: 1, ball: 2,
    }), units);
    expect(line).toContain('"sizes":"journal.detail.angle 0.512°"');
    expect(line).toContain('"unit":""');
  });

  test('a circle by its diameter', () => {
    expect(probeLine(entry('size', {
      method: 'measure', shape: 'circle-inside', size: { d: 24.012 }, spread: null, passes: 1, ball: 2,
    }), units)).toContain('"sizes":"Ø 24.012"');
  });

  test('a failure as the result screen says it, with the method', () => {
    expect(probeLine(entry('touched', { method: 'measure', shape: 'bar-x', phase: 'x1a-down' }), units))
      .toContain('probe.failure.touched{\\"code\\":\\"touched\\",\\"axis\\":\\"X\\"}');
  });

  test('a map saved and a zero written', () => {
    expect(probeLine(entry('applied', { method: 'height-map' }), units)).toBe('journal.probe.mapSaved');
    expect(probeLine(entry('applied', { method: 'corner', wcs: 'G55' }), units)).toContain('"wcs":"G55"');
  });

  test('only probe entries; opened, a size lists its figures', () => {
    expect(probeLine({ event: 'alarm', code: 'ALARM:1' }, units)).toBeNull();
    expect(probeDetails(entry('size', {
      method: 'measure', shape: 'groove-y', size: { y: 12 }, spread: null, passes: 1, ball: 2,
    }), units).map(([label]) => label)).toEqual(['journal.detail.method', 'Y', 'journal.detail.passes', 'journal.detail.ball']);
    expect(probeDetails(entry('size', {
      method: 'measure', shape: 'circle-inside', wcs: 'G55', size: { d: 24 }, spread: null, off: 0.01, centre: { x: 1, y: 2 }, passes: 1, ball: 2,
    }), units).map(([label, value]) => `${label} ${value}`)).toEqual([
      'journal.detail.method probe2.method.probe3d · probe.shape.circleInside',
      'Ø 24.000 mm',
      'journal.detail.off 0.010 mm',
      'journal.detail.centre{"wcs":"G55"} X 1.000 · Y 2.000 mm',
      'journal.detail.passes 1',
      'journal.detail.ball 2.000 mm',
    ]);
  });
});
