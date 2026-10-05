import { drawnPasses, sizeCycle } from '../sizeCycle';
import { HOLE_CYCLE } from '../holeCycle';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

describe('a size\'s drawing', () => {
  test('a width draws only its axis, and ends in the size, not a zero', () => {
    const groove = sizeCycle('measure', 'groove-y');
    expect(groove.order(1).filter((name) => name !== 'zero').every((name) => groove.moveOf(name).axis === 'y')).toBe(true);
    expect(groove.code('zero', {})).toEqual(['probe.size.codeHole']);
    expect(groove.readout('zero').after).toBe(false);
    expect(sizeCycle('measure', 'bar-x').code('zero', {})).toEqual(['probe.size.codeBoss']);
    expect(sizeCycle('z')).toBeNull();
  });

  test('a rectangle\'s size drawn across each axis, said as given', () => {
    const scene = sizeCycle('measure', 'rect-inside').scene('zero', 1, { sizes: { x: '24.012 mm' } });
    expect(scene.dims.map((dim) => [dim.axis, dim.text])).toEqual([['x', '24.012 mm'], ['y', 'Y']]);
    expect(scene.zero).toBe(0);
  });

  test('a circle\'s once, its diameter', () => {
    expect(sizeCycle('measure', 'circle-outside').scene('zero', 1, { sizes: { d: 'Ø24.012 mm' } }).dims.map((dim) => dim.text)).toEqual(['Ø24.012 mm']);
    expect(sizeCycle('measure', 'circle-inside').scene('zero', 1).dims.map((dim) => dim.text)).toEqual(['Ø']);
  });

  test('a rectangle drawn square, a circle round', () => {
    expect(sizeCycle('measure', 'rect-outside').part.square).toBe(true);
    expect(sizeCycle('measure', 'circle-inside').part.square).toBe(false);
  });

  test('its rough size named for what it is, the field the same', () => {
    const named = (shape) => sizeCycle('measure', shape).params.find((group) => group.fields.length === 1 && /Size$/.test(group.fields[0]));
    expect(named('groove-x')).toMatchObject({ key: 'probe.group.groove', names: { holeSize: 'probe.field.grooveSize' } });
    expect(named('circle-outside')).toMatchObject({ key: 'probe.group.stud', names: { bossSize: 'probe.field.studSize' } });
    expect(named('circle-inside')).toMatchObject({ key: 'probe.group.hole', names: { holeSize: 'probe.field.holeSize' } });
  });

  test('a pass past the second is drawn as the second', () => {
    expect(sizeCycle('measure', 'circle-inside').moveOfPhase('x4a-fast')).toBe('x2pFast');
    expect(sizeCycle('measure', 'circle-outside').moveOfPhase('y3-centre')).toBe('y2c');
  });

  test('passes drawn: a centre\'s as asked, a size\'s centring and counted ones, at most two', () => {
    expect(drawnPasses(HOLE_CYCLE, 1, 5)).toBe(1);
    const size = sizeCycle('measure', 'circle-inside');
    expect(drawnPasses(size, 1, 1)).toBe(1);
    expect(drawnPasses(size, 2, 1)).toBe(2);
    expect(drawnPasses(size, 1, 3)).toBe(2);
  });
});
