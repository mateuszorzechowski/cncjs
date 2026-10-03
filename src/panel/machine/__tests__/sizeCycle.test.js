import { drawnPasses, sizeCycle } from '../sizeCycle';
import { HOLE_CYCLE } from '../holeCycle';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

describe('a size\'s drawing', () => {
  test('a width draws only its axis, and ends in the size, not a zero', () => {
    const groove = sizeCycle('width', 'groove-y');
    expect(groove.order(1).filter((name) => name !== 'zero').every((name) => groove.moveOf(name).axis === 'y')).toBe(true);
    expect(groove.code('zero', {})).toEqual(['probe.size.codeHole']);
    expect(groove.readout('zero').after).toBe(false);
    expect(sizeCycle('width', 'bar-x').code('zero', {})).toEqual(['probe.size.codeBoss']);
    expect(sizeCycle('z')).toBeNull();
  });

  test('the size drawn across each axis measured, said as given', () => {
    const scene = sizeCycle('hole-size').scene('zero', 1, { sizes: { x: '24.012 mm' } });
    expect(scene.dims.map((dim) => [dim.axis, dim.text])).toEqual([['x', '24.012 mm'], ['y', 'Y']]);
    expect(scene.zero).toBe(0);
  });

  test('a pass past the second is drawn as the second', () => {
    expect(sizeCycle('hole-size').moveOfPhase('x4a-fast')).toBe('x2pFast');
    expect(sizeCycle('boss-size').moveOfPhase('y3-centre')).toBe('y2c');
  });

  test('passes drawn: a centre\'s as asked, a size\'s centring and counted ones, at most two', () => {
    expect(drawnPasses(HOLE_CYCLE, 1, 5)).toBe(1);
    const size = sizeCycle('hole-size');
    expect(drawnPasses(size, 1, 1)).toBe(1);
    expect(drawnPasses(size, 2, 1)).toBe(2);
    expect(drawnPasses(size, 1, 3)).toBe(2);
  });
});
