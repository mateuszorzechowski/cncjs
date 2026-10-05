import { drawnPasses, sizeCycle } from '../sizeCycle';

jest.mock('../controller', () => ({ __esModule: true, default: { command: jest.fn() } }));

describe('a size\'s drawing', () => {
  test('a width draws only its axis, and ends in the size, not a zero', () => {
    const groove = sizeCycle('measure', 'groove-y');
    expect(groove.order(1).filter((name) => name !== 'zero').every((name) => groove.moveOf(name).axis === 'y')).toBe(true);
    expect(groove.code('zero', {})).toEqual(['probe.size.codeHole']);
    expect(sizeCycle('measure', 'bar-x').code('zero', {})).toEqual(['probe.size.codeBoss']);
    expect(sizeCycle('z')).toBeNull();
  });

  test('a rectangle\'s size drawn across each axis, said as given', () => {
    const scene = sizeCycle('measure', 'rect-inside').scene('zero', 1, { sizes: { x: '24.012 mm' } });
    expect(scene.dims.map((dim) => [dim.axis, dim.text])).toEqual([['x', '24.012 mm'], ['y', 'Y']]);
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

  test('an edge: the top, then two points of one side, each along it first — every move once on the bar', () => {
    const front = sizeCycle('measure', 'edge-front');
    const order = front.order(1);
    expect(order.slice(0, 4)).toEqual(['zFast', 'zBack', 'zSlow', 'zOff']);
    expect(order.filter((name) => name.endsWith('Along'))).toEqual(['y1mAlong', 'y2mAlong']);
    expect(front.groups(1).flatMap((group) => group.subs.flatMap((sub) => sub.moves))).toEqual(order);
    expect(front.groups(1).map((group) => group.name || group.key)).toEqual(['Z', 'Y− · 1', 'Y− · 2', 'probe.bar.angle']);
    // Its search goes in by the clearance alone, from out past the edge to where the ball started.
    expect(front.code('y1mFast', { clear: '10', fast: '300' })).toBe('G38.2 Y+10 F300');
    expect(front.code('y1mAlong', {})).toEqual(['probe.edge.alongCode']);
    expect(front.code('y1mOut', {})).toEqual(['probe.edge.outCode']);
    expect(front.explain('y1mFast', { clear: '10' })).toBeNull();
    // The server's step names: `y2b-along` is the second point's way along the front.
    expect(front.moveOfPhase('y2b-along')).toBe('y2mAlong');
    expect(front.moveOfPhase('y1b')).toBe('y1mSlow');
    // The way between the points, along the edge, with its figure.
    expect(front.scene('y2mAlong', 0.5, { texts: { spacing: '30' } }).dims).toEqual([expect.objectContaining({ id: 'spacing', axis: 'x', text: '30' })]);
    expect(front.scene('zero', 1).dims).toEqual([]);
    // Its result: both touches, on the straight side.
    expect(front.scene('zero', 1).touched).toHaveLength(2);
    expect(front.scene('zero', 1).touched.map(([, y]) => y)).toEqual(['y1mFast', 'y2mFast'].map((name) => front.moveOf(name).rim));
    // The part drawn turned, the second touch higher on an edge turned anticlockwise; the angle from the first touch.
    expect(front.part.turn).toBeGreaterThan(0);
    expect(front.moveOf('y2mFast').rim).toBeGreaterThan(front.moveOf('y1mFast').rim);
    expect(front.scene('zero', 1, { sizes: { a: '3,005°' } }).angle).toMatchObject({ base: [1, 0], text: '3,005°' });
    // A result's part turned the way measured, enough to see; level when it is.
    expect(sizeCycle('measure', 'edge-front', -0.5).part.turn).toBe(-8);
    expect(sizeCycle('measure', 'edge-front', 0).part.turn).toBe(0);
    expect(sizeCycle('measure', 'edge-right').order(1).filter((name) => name.endsWith('Fast') && name !== 'zFast')).toEqual(['x1pFast', 'x2pFast']);
  });

  test('a pass past the second is drawn as the second', () => {
    expect(sizeCycle('measure', 'circle-inside').moveOfPhase('x4a-fast')).toBe('x2pFast');
    expect(sizeCycle('measure', 'circle-outside').moveOfPhase('y3-centre')).toBe('y2c');
  });

  test('passes drawn: the centring and the counted ones, at most two', () => {
    expect(drawnPasses(1, 1)).toBe(1);
    expect(drawnPasses(2, 1)).toBe(2);
    expect(drawnPasses(1, 3)).toBe(2);
  });
});
