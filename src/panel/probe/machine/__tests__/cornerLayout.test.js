import { buildSides, foundOf, layoutOf, sideGroups } from '../edgeMoves';
import { sizeCycle } from '../sizeCycle';

describe('a corner in one cycle, drawn (Sonda v2)', () => {
  test('the part\'s front-left: the left edge, then the front, each first across from the start and then on away from the corner', () => {
    const { moves, order } = buildSides('corner-out-front-left');
    const { start } = layoutOf('corner-out-front-left');
    // The left edge (X, touched moving +X) at two heights, rising; the front (Y) at two places along X, rising.
    expect(moves.x1mAlong.to[1]).toBe(start[1]);
    expect(moves.x2mAlong.to[1]).toBeGreaterThan(start[1]);
    expect(moves.y1mAlong.to[0]).toBe(start[0]);
    expect(moves.y2mAlong.to[0]).toBeGreaterThan(start[0]);
    expect(order.at(-1)).toBe('zero');
    expect(foundOf('corner-out-front-left')).toBe('corner');
  });

  test('the far corners mirror it: the back-right\'s second points go down and to the left', () => {
    const { moves } = buildSides('corner-out-back-right');
    const { start } = layoutOf('corner-out-back-right');
    // Rising, as the server goes: the second point is the one further along each axis, so the first is the far one.
    expect(moves.x1pAlong.to[1]).toBeLessThan(start[1]);
    expect(moves.x2pAlong.to[1]).toBe(start[1]);
  });

  test('a pocket\'s: off each wall straight back to the middle line, as the server goes since the audit (K4)', () => {
    const { moves } = buildSides('corner-in-front-left');
    const { start } = layoutOf('corner-in-front-left');
    expect(moves.x1mOff.frames.at(-1)[1][0]).toBe(start[0]);
    expect(moves.y2mOff.frames.at(-1)[1][1]).toBe(start[1]);
    // Its way along each wall is the guarded one.
    expect(moves.x2mAlong.code).toBe('probe2.edge.alongGuardedCode');
  });

  test('every corner has its cycle, its bar ending in the corner', () => {
    for (const side of ['out', 'in']) {
      for (const corner of ['front-left', 'front-right', 'back-left', 'back-right']) {
        expect(sizeCycle('measure', `corner-${side}-${corner}`)).not.toBe(sizeCycle('measure', 'circle-inside'));
        expect(sideGroups(`corner-${side}-${corner}`).at(-1).key).toBe('probe2.bar.corner');
      }
    }
  });
});
