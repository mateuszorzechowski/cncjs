import { sizeCycle } from '../sizeCycle';
import { levelAt, pairLayout } from '../../ui/pairLayout';

describe('a distance as one film', () => {
  test('both features in the scenes around and between their own cycles, each own move once on the bar', () => {
    const film = sizeCycle('measure', 'distance:circle-inside:edge-front');
    const order = film.order(2);
    expect(order[0]).toBe('start');
    expect(order.at(-1)).toBe('end');
    expect(order.filter((name) => name === 'jog')).toHaveLength(1);
    expect(order.indexOf('jog')).toBeGreaterThan(order.indexOf('a:zero'));
    expect(order.indexOf('jog')).toBeLessThan(order.indexOf('b:zFast'));
    expect(film.groups(2).flatMap((group) => group.subs.flatMap((sub) => sub.moves))).toEqual(order);
    expect(film.timeline(2).map((item) => item.name)).toEqual(order);
  });

  test('each feature ends at what the distance is measured from: a middle, or an edge\'s line', () => {
    const film = sizeCycle('measure', 'distance:circle-inside:edge-front');
    expect(film.titleOf('a:zero')).toEqual(['probe2.pair.move.centreA']);
    expect(film.titleOf('b:zero')).toEqual(['probe2.pair.move.edgeB']);
    const middle = film.scene('a:zero', 1, {});
    expect(middle).toMatchObject({ dims: [], dia: null, centre: middle.tool });
    expect(film.scene('b:zero', 1, {}).angle).toBeNull();
    expect(film.usesAt('a:zero')).toEqual([]);
    // A scene of both is drawn apart; a feature's move by its own cycle, with its own part.
    expect(film.overview('jog')).toBe('jog');
    expect(film.overview('a:x1pFast')).toBeNull();
    expect(film.partOf('b:zFast')).toBe(sizeCycle('measure', 'edge-front').part);
  });

  test('the features where they were picked: along X, or across Y for a front edge, the part behind it', () => {
    expect(pairLayout({ a: 'circle-inside', b: 'circle-outside' })).toMatchObject({ axis: 'x', kind: 'centres', ends: { a: { u: -50 }, b: { u: 50 } } });
    const fromEdge = pairLayout({ a: 'circle-inside', b: 'edge-front' });
    expect(fromEdge).toMatchObject({ axis: 'y', kind: 'fromEdge' });
    // The hole in the part, the edge in front of it; the edge's cycle begins over the part.
    expect(levelAt(fromEdge.regions, fromEdge.ends.a.u)).toBe(0);
    expect(levelAt(fromEdge.regions, fromEdge.ends.b.u + 10)).toBeLessThan(0);
    expect(fromEdge.ends.b.start.u).toBeLessThan(fromEdge.ends.b.u);
    // Two edges facing apart: the part between them; alike: a step, the first edge the lower step's.
    const apart = pairLayout({ a: 'edge-left', b: 'edge-right' });
    expect([apart.ends.a.u, apart.ends.b.u]).toEqual([-55, 55]);
    const alike = pairLayout({ a: 'edge-front', b: 'edge-front' });
    expect(levelAt(alike.regions, alike.ends.a.start.u)).toBeLessThan(levelAt(alike.regions, alike.ends.b.start.u));
  });
});
