import { BOSS_CYCLE, moveOf as bossMove } from '../bossCycle';
import { heightOf, scaleAt } from '../bossSide';
import { HOLE_CYCLE } from '../holeCycle';

describe('the centres from the front', () => {
  test('the part: always along X; Y is depth — larger at the front, dashed behind the part', () => {
    expect(heightOf(0.4)).toBe(0);
    expect(heightOf(0)).toBeLessThan(0);
    expect(scaleAt(-40)).toBeGreaterThan(1);
    expect(scaleAt(40)).toBeLessThan(1);
    // Down beside the back side (+Y): hidden; beside the front: not.
    expect(BOSS_CYCLE.side('y1p', 0.5).hidden).toBe(true);
    expect(BOSS_CYCLE.side('y1m', 0.5).hidden).toBe(false);
    // A way along Y has no arrow; across X it has.
    expect(BOSS_CYCLE.side('y1p', 0.2).motion).toBeNull();
    expect(BOSS_CYCLE.side('x1p', 0.2).motion).toMatchObject({ dir: 'h', kind: 'rapid' });
    expect(BOSS_CYCLE.side('x1p', 0.36).motion).toMatchObject({ dir: 'v', kind: 'probe' });
  });

  test('the part: the depth beside the side away from the ball, the touch at the ball\'s side', () => {
    const side = BOSS_CYCLE.side('x1p', 0.56, { texts: { depth: '5' } });
    expect(side.depth).toMatchObject({ text: '5' });
    expect(side.depth.at).toBeLessThan(0);
    expect(side.contact[0]).toBeCloseTo(bossMove('x1p').wall[0] - side.r);
  });

  test('the hole: cut through, the ball in it seen; a few millimetres once in place', () => {
    expect(HOLE_CYCLE.side('x1p', 0.3).hidden).toBeFalsy();
    expect(HOLE_CYCLE.side('x1p', 0.3).motion).toMatchObject({ dir: 'h', kind: 'probe' });
    expect(HOLE_CYCLE.side('y1p', 0.3).motion).toBeNull();
    expect(HOLE_CYCLE.sidePlace({ tool: [0, 0], level: 1 }).gap).toBeNull();
    expect(HOLE_CYCLE.sidePlace({ tool: [0, 0], level: 0 }).gap).toMatchObject({ key: 'probe.position.few' });
    expect(BOSS_CYCLE.sidePlace({ tool: [0, 0], level: 1 }).gap).toMatchObject({ key: 'probe.position.few' });
  });
});
