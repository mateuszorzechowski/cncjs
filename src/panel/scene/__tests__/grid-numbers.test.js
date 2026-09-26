import { fineStep } from '../grid-lines';
import { axisTitles, gridLabels, labelStep, nearSides } from '../grid-numbers';

/**
 * What the grid says, as opposed to how it is drawn.
 *
 * Split from `grid.test.js` alongside the module it covers: the other file is
 * about geometry the renderer consumes, this one about which round number to
 * count in, where to put it, and which one gives way when two collide.
 */

describe('gridLabels', () => {
  const COM3 = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };
  const figures = (labels) => labels.filter((l) => !l.title);

  test('runs along the edges nearest the default view: X along the front, Y up the right', () => {
    const labels = figures(gridLabels(COM3, 20));
    const alongX = labels.filter((l) => l.key.startsWith('x'));
    const alongY = labels.filter((l) => l.key.startsWith('y'));

    expect(alongX.length).toBeGreaterThan(0);
    expect(alongY.length).toBeGreaterThan(0);
    expect(alongX.every((l) => l.y === -200)).toBe(true);
    expect(alongY.every((l) => l.x === 0)).toBe(true);

    /*
     * Pushed clear of the work rather than into it — and how far is the
     * caller's business, because it has to be a fixed distance on screen. As
     * a fraction of the label spacing the figures marched away from their
     * line every time the numbers coarsened.
     */
    expect(alongX.every((l) => l.push.x === 0 && l.push.y === -1)).toBe(true);
    expect(alongY.every((l) => l.push.x === 1 && l.push.y === 0)).toBe(true);
  });

  test('stops at the machine and does not number the fade', () => {
    // Out there the grid is a hint that the floor continues. A number would
    // be a measurement of nothing.
    const values = figures(gridLabels(COM3, 20)).map((l) => Number(l.text));

    expect(Math.min(...values)).toBe(-200);
    expect(Math.max(...values)).toBe(0);
  });

  test('is capped however fine the spacing gets', () => {
    // 1mm squares over 200mm is two hundred lines. `labelStep` is what
    // normally keeps the figures apart; this cap is the backstop behind it,
    // because every label is a painted canvas and a texture.
    const dense = figures(gridLabels(COM3, 1));

    expect(dense.length).toBeLessThanOrEqual(2 * 40);
    // And what survives is still on round numbers.
    expect(dense.every((l) => Number.isInteger(Number(l.text)))).toBe(true);
  });

  test('says the unit in the two titles and in no figure', () => {
    const labels = gridLabels(COM3, 20);

    expect(labels.filter((l) => l.title).map((l) => l.text)).toEqual(['X [mm]', 'Y [mm]']);
    expect(figures(labels).some((l) => /mm/.test(l.text))).toBe(false);
  });

  test('the titles do not move when the counting coarsens', () => {
    const at = (step) => gridLabels(COM3, step).filter((l) => l.title).map((l) => [l.x, l.y]);

    expect(at(100)).toEqual(at(20));
  });

  test('where the rulers meet, each says its own figure', () => {
    // The corner is X 0 on the X row and Y -200 on the Y column: two
    // different numbers, pushed apart, one down and one out.
    const labels = figures(gridLabels(COM3, 20));

    expect(labels.find((l) => l.key === 'x0')).toMatchObject({ x: 0, y: -200 });
    expect(labels.find((l) => l.key === 'y-200')).toMatchObject({ x: 0, y: -200 });
  });

  test('gives every label a key of its own', () => {
    const labels = gridLabels(COM3, 20);
    expect(new Set(labels.map((l) => l.key)).size).toBe(labels.length);
  });
});

describe('labelStep', () => {
  // A 100mm grid, which is what a metre of travel produces.
  const GRID = 100;

  test('counts in coarser numbers as the view pulls back', () => {
    // The figures thin out rather than shrinking. Zoomed out to a fifth of a
    // pixel per millimetre, a label every 100mm would be 20px apart.
    expect(labelStep(GRID, 0.2)).toBeGreaterThan(GRID);
    expect(labelStep(GRID, 0.2)).toBe(500);
  });

  test('counts in finer ones as it closes in', () => {
    // Closing in, the coarse spacing leaves acres between figures. At four
    // pixels per millimetre a 20mm square is 80px across, which is room for
    // a figure — so that is what it counts in.
    expect(labelStep(GRID, 4)).toBeLessThan(GRID);
    expect(labelStep(GRID, 4)).toBe(20);
  });

  test('leaves room for the widest figure it will ever print', () => {
    // Whatever rung it lands on, two neighbouring numbers have to be further
    // apart on screen than one of them is wide — four digits at the label
    // size is about 45px.
    for (let zoom = 0.05; zoom < 40; zoom *= 1.13) {
      expect(labelStep(10, zoom) * zoom).toBeGreaterThanOrEqual(45);
    }
  });

  test('never goes finer than the lines there are to point at', () => {
    // Closed right in, the finest it may count in is the sub-grid — which for
    // a 100mm square is 20mm. A number against empty floor points at nothing.
    expect(labelStep(GRID, 1000)).toBe(fineStep(GRID));
    expect(labelStep(GRID, 1000)).toBe(20);
  });

  test('only ever lands on numbers a machinist counts in', () => {
    const rungs = new Set();
    for (let zoom = 0.05; zoom < 40; zoom *= 1.08) {
      rungs.add(labelStep(10, zoom));
    }
    // Every value that comes out is from the table the grid is spaced from —
    // including below the grid's own square, down as far as the sub-grid.
    const table = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    expect([...rungs].every((r) => table.includes(r))).toBe(true);
  });

  test('is stable, not jittery, across a zoom sweep', () => {
    // It may only ever coarsen as the view pulls back. A step that went up
    // and down again would flicker the numbers on and off mid-gesture.
    let previous = 0;
    for (let zoom = 20; zoom > 0.05; zoom /= 1.05) {
      const now = labelStep(10, zoom);
      expect(now).toBeGreaterThanOrEqual(previous);
      previous = now;
    }
  });
});

describe('naming the far end of the travel', () => {
  // 700mm counted in five-hundreds stops at -500, leaving the one figure an
  // operator most wants — how far the machine goes — unsaid.
  const AWKWARD = { min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };
  const numbersOn = (labels, axis) => labels
    .filter((l) => !l.title && l.key.startsWith(axis))
    .map((l) => Number(l.text));

  test('says the reach even when the step does not divide it', () => {
    const labels = gridLabels(AWKWARD, 500);

    expect(numbersOn(labels, 'y')).toContain(-700);
    expect(numbersOn(labels, 'y')).toContain(0);
  });

  test('keeps the neighbour when there is room for both', () => {
    // -500 and -700 are 200 apart against a 500 step: two fifths, which is
    // not a collision.
    expect(numbersOn(gridLabels(AWKWARD, 500), 'y')).toContain(-500);
  });

  test('drops the neighbour when the two would share a space', () => {
    const tight = { min: { x: -1050, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };
    const x = numbersOn(gridLabels(tight, 500), 'x');

    expect(x).toContain(-1050);
    expect(x).not.toContain(-1000);
  });

  test('adds nothing when the step already lands on the end', () => {
    const x = numbersOn(gridLabels(AWKWARD, 500), 'x');

    expect(x.filter((v) => v === -1000)).toHaveLength(1);
  });

  test('follows the reach to the other end on an inverted machine', () => {
    const flipped = { min: { x: 0, y: 0, z: 0 }, max: { x: 1000, y: 700, z: 150 } };
    expect(numbersOn(gridLabels(flipped, 500), 'y')).toContain(700);
  });
});

describe('gridLabels, when zero is inside what is drawn', () => {
  // A program with its zero in the middle of the part, as the calibration
  // file is: -25 to 25 on both axes. The rulers stand on the nearest edges
  // whatever zero does, so the part stands behind its figures, not on them.
  const PART = { min: { x: -25, y: -25, z: -10 }, max: { x: 25, y: 25, z: 1 } };
  const on = (labels, axis) => labels.filter((l) => !l.title && l.key.startsWith(axis));

  test('the rulers are on the front and right edges, off the part', () => {
    const labels = gridLabels(PART, 10);

    expect(on(labels, 'x').every((l) => l.y === -25 && l.push.y === -1)).toBe(true);
    expect(on(labels, 'y').every((l) => l.x === 25 && l.push.x === 1)).toBe(true);
  });

  test('names both ends of each ruler, not the round number short of one', () => {
    // 50 × 50 about its middle, counted in twenties: ±20 are a quarter of a
    // square from the ends and give way to them.
    const labels = gridLabels(PART, 20);

    expect(on(labels, 'x').map((l) => Number(l.text))).toEqual([-25, 0, 25]);
    expect(on(labels, 'y').map((l) => Number(l.text))).toEqual([-25, 0, 25]);
  });
});

describe('a figure', () => {
  test('is printed to a tenth at most, so the far end of a program is not the widest thing on the ruler', () => {
    // jsdc's reach in Y, exactly as the file has it.
    const area = { min: { x: 0, y: -58.1149, z: -1 }, max: { x: 102.3526, y: 0, z: 1 } };
    const texts = gridLabels(area, 10).filter((l) => !l.title).map((l) => l.text);

    expect(texts).toContain('-58.1');
    expect(texts).toContain('102.4');
    expect(texts.some((text) => /\.\d\d/.test(text))).toBe(false);
  });
});

describe('in inches', () => {
  // The server's inch rule, the part the rulers read.
  const INCH = { factor: 1 / 25.4, length: 'in' };
  // Ten inches square, from the origin into the machine's negative quarter.
  const TEN = { min: { x: -254, y: -254 }, max: { x: 0, y: 0 } };

  test('counts round inches, on lines drawn every 25.4 mm', () => {
    const labels = gridLabels(TEN, 25.4, INCH).filter((label) => !label.title && label.key.startsWith('x'));
    expect(labels.map((label) => label.text)).toEqual(
      ['-10', '-9', '-8', '-7', '-6', '-5', '-4', '-3', '-2', '-1', '0'],
    );
  });

  test('names its unit in the titles, as the millimetre ruler does', () => {
    const titles = gridLabels(TEN, 25.4, INCH).filter((label) => label.title).map((label) => label.text);
    expect(titles).toEqual(['X [in]', 'Y [in]']);
  });

  test('widens its count in round inches, handed back in millimetres', () => {
    // At a zoom where an inch is 10 pixels, 64 pixels between figures wants
    // 10 inches — 254 mm in the world.
    expect(labelStep(25.4, 10 / 25.4, INCH.factor)).toBeCloseTo(254, 6);
  });
});

describe('rulers along the edges nearest the camera (design 03a, every scene)', () => {
  const TRAVEL = { min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };
  const ISO = { x: 1, y: -1, z: 1 };

  test('from the default view: X along the front, Y up the right — not along zero at the back', () => {
    expect(nearSides(TRAVEL, ISO)).toMatchObject({ axisY: -700, outY: -1, axisX: 0, outX: 1 });
  });

  test('turned round, they move to the other two edges', () => {
    expect(nearSides(TRAVEL, { x: -1, y: 1, z: 1 })).toMatchObject({ axisY: 0, outY: 1, axisX: -1000, outX: -1 });
  });

  test('level with an edge — from above — the front and the right win', () => {
    expect(nearSides(TRAVEL, { x: 0, y: 0, z: 1 })).toMatchObject({ axisY: -700, axisX: 0 });
  });

  test('the unit is in a title per axis, not in the far figure', () => {
    const labels = gridLabels(TRAVEL, 200, { factor: 1, length: 'mm' }, ISO);

    expect(labels.filter((l) => l.title).map((l) => l.text)).toEqual(['X [mm]', 'Y [mm]']);
    expect(labels.filter((l) => !l.title).every((l) => !l.text.includes('mm'))).toBe(true);
    // Every X figure on the front edge, every Y figure on the right one.
    expect(labels.filter((l) => l.key.startsWith('x')).every((l) => l.y === -700)).toBe(true);
    expect(labels.filter((l) => l.key.startsWith('y')).every((l) => l.x === 0)).toBe(true);
  });

  test('each title lies along its axis, at the middle, outside its row of figures', () => {
    const [x, y] = axisTitles(TRAVEL, nearSides(TRAVEL, ISO), 'in');

    // Mateusz, 2026-09-26: `X [mm]` centred under `0 50 100 … 300`.
    expect(x).toMatchObject({ text: 'X [in]', along: 'x', beyond: 'x', x: -500, y: -700, push: { x: 0, y: -1 } });
    expect(y).toMatchObject({ text: 'Y [in]', along: 'y', beyond: 'y', x: 0, y: -350, push: { x: 1, y: 0 } });
  });
});
