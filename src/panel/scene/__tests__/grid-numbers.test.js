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

  test('runs along the zero lines of the machine, not the far edges', () => {
    // COM3 homes to the maximum, so zero is the top-right corner of the
    // travel and both rows of figures start from it.
    const labels = gridLabels(COM3, 20);
    const alongX = labels.filter((l) => l.key.startsWith('x'));
    const alongY = labels.filter((l) => l.key.startsWith('y'));

    expect(alongX.length).toBeGreaterThan(0);
    expect(alongY.length).toBeGreaterThan(0);
    expect(alongX.every((l) => l.y === 0)).toBe(true);
    expect(alongY.every((l) => l.x === 0)).toBe(true);

    /*
     * Pushed clear of the work rather than into it — and how far is the
     * caller's business, because it has to be a fixed distance on screen. As
     * a fraction of the label spacing the figures marched away from their
     * line every time the numbers coarsened.
     */
    expect(alongX.every((l) => l.push.x === 0 && l.push.y === 1)).toBe(true);
    expect(alongY.every((l) => l.push.x === 1 && l.push.y === 0)).toBe(true);
  });

  test('follows zero to the other end when the machine homes that way', () => {
    // With the axis bit set in `$23` the travel is [0, range] and zero is the
    // bottom-left corner instead. The figures have to follow it.
    const flipped = { min: { x: 0, y: 0, z: 0 }, max: { x: 200, y: 200, z: 200 } };
    const labels = gridLabels(flipped, 20);

    expect(labels.filter((l) => l.key.startsWith('x')).every((l) => l.y === 0)).toBe(true);
    expect(labels.filter((l) => l.key.startsWith('x')).every((l) => l.push.y === -1)).toBe(true);
  });

  test('stops at the machine and does not number the fade', () => {
    // Out there the grid is a hint that the floor continues. A number would
    // be a measurement of nothing.
    const values = gridLabels(COM3, 20).map((l) => Number(l.text.replace(/ mm$/, '')));

    expect(Math.min(...values)).toBe(-200);
    expect(Math.max(...values)).toBe(0);
  });

  test('is capped however fine the spacing gets', () => {
    // 1mm squares over 200mm is two hundred lines. `labelStep` is what
    // normally keeps the figures apart; this cap is the backstop behind it,
    // because every label is a painted canvas and a texture.
    const dense = gridLabels(COM3, 1);

    expect(dense.length).toBeLessThanOrEqual(2 * 40);
    // And what survives is still on round numbers.
    expect(dense.every((l) => Number.isInteger(Number(l.text.replace(/ mm$/, ''))))).toBe(true);
  });

  test('says the unit once, on the far end of the X ruler', () => {
    // Beside the zero it moved with wherever the rulers met, which depends
    // on the program; the end of the X ruler does not.
    const units = gridLabels(COM3, 20).filter((l) => l.text.endsWith(' mm'));

    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ text: '-200 mm', x: -200, y: 0 });
    expect(units[0].key.startsWith('x')).toBe(true);
  });

  test('the unit does not move when the counting coarsens', () => {
    const coarse = gridLabels(COM3, 100).filter((l) => l.text.endsWith(' mm'));
    const fine = gridLabels(COM3, 20).filter((l) => l.text.endsWith(' mm'));

    expect(coarse.map((l) => [l.x, l.y])).toEqual(fine.map((l) => [l.x, l.y]));
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
    .filter((l) => l.key.startsWith(axis))
    .map((l) => Number(l.text.replace(/ mm$/, '')));

  test('says the reach even when the step does not divide it', () => {
    const labels = gridLabels(AWKWARD, 500);

    expect(numbersOn(labels, 'y')).toContain(-700);
    // Zero is the shared origin now, so it is not in either row.
    expect(labels.some((l) => l.key === 'origin' && l.text === '0')).toBe(true);
  });

  test('keeps the neighbour when there is room for both', () => {
    // -500 and -700 are 200 apart against a 500 step: two fifths, which is
    // not a collision.
    expect(numbersOn(gridLabels(AWKWARD, 500), 'y')).toContain(-500);
  });

  test('drops the neighbour when the two would share a space', () => {
    // 1000 counted in five-hundreds lands on -1000 exactly, so nothing is
    // added; make the range awkward by a hair instead.
    const tight = { min: { x: -1050, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };
    const x = numbersOn(gridLabels(tight, 500), 'x');

    expect(x).toContain(-1050);
    expect(x).not.toContain(-1000);
  });

  test('adds nothing when the step already lands on the end', () => {
    const x = numbersOn(gridLabels(AWKWARD, 500), 'x');

    // -1000 is a multiple of 500, so it is there once and only once.
    expect(x.filter((v) => v === -1000)).toHaveLength(1);
  });

  test('follows the reach to the other end on an inverted machine', () => {
    const flipped = { min: { x: 0, y: 0, z: 0 }, max: { x: 1000, y: 700, z: 150 } };
    expect(numbersOn(gridLabels(flipped, 500), 'y')).toContain(700);
  });
});

describe('the shared origin', () => {
  const COM3 = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };

  test('zero is written once, not once per axis', () => {
    // Both rows meet at the same corner on a machine that homes to the
    // maximum, so two zeros land a few pixels apart and read as a fault.
    const zeros = gridLabels(COM3, 20).filter((l) => l.text === '0');

    expect(zeros).toHaveLength(1);
    expect([zeros[0].x, zeros[0].y]).toEqual([0, 0]);
  });

  test('it leaves both rows along the diagonal', () => {
    const [origin] = gridLabels(COM3, 20).filter((l) => l.text === '0');

    expect(origin.push.x).not.toBe(0);
    expect(origin.push.y).not.toBe(0);
  });

  test('the unit is written into the far figure, never beside the zero', () => {
    const labels = gridLabels(COM3, 20);

    expect(labels.some((l) => l.text === 'mm')).toBe(false);
    expect(labels.find((l) => l.key === 'origin').text).toBe('0');
  });

  test('every other figure is still said exactly once', () => {
    const counts = new Map();
    for (const label of gridLabels(COM3, 20)) {
      counts.set(label.text, (counts.get(label.text) || 0) + 1);
    }
    // -100 is on both rows; -200, the far end of both, is said once in each,
    // the X one with the unit. Zero, shared, once.
    expect(counts.get('-100')).toBe(2);
    expect(counts.get('-200')).toBe(1);
    expect(counts.get('-200 mm')).toBe(1);
    expect(counts.get('0')).toBe(1);
  });
});

describe('gridLabels, when zero is inside what is drawn', () => {
  // A program with its zero in the middle of the part, as the calibration
  // file is: -25 to 25 on both axes.
  const PART = { min: { x: -25, y: -25, z: -10 }, max: { x: 25, y: 25, z: 1 } };

  test('moves the rulers to the front and right edges, off the part', () => {
    const labels = gridLabels(PART, 10);
    const alongX = labels.filter((l) => l.key.startsWith('x'));
    const alongY = labels.filter((l) => l.key.startsWith('y'));

    expect(alongX.every((l) => l.y === -25 && l.push.y === -1)).toBe(true);
    expect(alongY.every((l) => l.x === 25 && l.push.x === 1)).toBe(true);
  });

  test('numbers zero in each ruler, and writes no shared zero at a corner that is not zero', () => {
    const labels = gridLabels(PART, 10);

    expect(labels.filter((l) => l.text === '0').map((l) => l.key).sort()).toEqual(['x0', 'y0']);
    expect(labels.some((l) => l.key === 'origin')).toBe(false);
    // At the far end of the X ruler here too, whatever the rulers did.
    expect(labels.filter((l) => l.text.endsWith(' mm')).map((l) => l.text)).toEqual(['25 mm']);
  });

  test('names both ends of each ruler, not the round number short of one', () => {
    // 50 × 50 about its middle, counted in twenties as the preview counted
    // it: the ruler read -20 · 0 · 25, one end named and the other not.
    const labels = gridLabels(PART, 20);
    const on = (axis) => labels.filter((l) => l.key.startsWith(axis)).map((l) => Number(l.text.replace(/ mm$/, '')));

    // ±20 are a quarter of a square from the ends: they give way to them.
    expect(on('x')).toEqual([-25, 0, 25]);
    expect(on('y')).toEqual([-25, 0, 25]);
  });

  test('moves only the ruler whose zero line would cross', () => {
    // Zero inside along X only: the Y figures still run up the zero line.
    const labels = gridLabels({ min: { x: -25, y: 0, z: 0 }, max: { x: 25, y: 40, z: 0 } }, 10);

    expect(labels.filter((l) => l.key.startsWith('x')).every((l) => l.y === 0)).toBe(true);
    expect(labels.filter((l) => l.key.startsWith('y')).every((l) => l.x === 25)).toBe(true);
  });

  test('a machine, with zero at a corner of its travel, is numbered as before', () => {
    const COM3 = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };
    const labels = gridLabels(COM3, 20);

    expect(labels.filter((l) => l.key === 'origin')).toHaveLength(1);
    expect(labels.filter((l) => l.key.startsWith('x')).every((l) => l.y === 0)).toBe(true);
  });
});

describe('a figure', () => {
  test('is printed to a tenth at most, so the far end of a program is not the widest thing on the ruler', () => {
    // jsdc's reach in Y, exactly as the file has it.
    const area = { min: { x: 0, y: -58.1149, z: -1 }, max: { x: 102.3526, y: 0, z: 1 } };
    const texts = gridLabels(area, 10).map((l) => l.text);

    expect(texts).toContain('-58.1');
    expect(texts).toContain('102.4 mm');
    expect(texts.some((text) => /\.\d\d/.test(text))).toBe(false);
  });
});

describe('in inches', () => {
  // The server's inch rule, the part the rulers read.
  const INCH = { factor: 1 / 25.4, length: 'in' };
  // Ten inches square, from the origin into the machine's negative quarter.
  const TEN = { min: { x: -254, y: -254 }, max: { x: 0, y: 0 } };

  test('counts round inches, on lines drawn every 25.4 mm', () => {
    const labels = gridLabels(TEN, 25.4, INCH).filter((label) => label.key.startsWith('x'));
    expect(labels.map((label) => label.text.replace(/ in$/, ''))).toEqual(
      ['-10', '-9', '-8', '-7', '-6', '-5', '-4', '-3', '-2', '-1'],
    );
  });

  test('names its unit on the far figure, as the millimetre ruler does', () => {
    const far = gridLabels(TEN, 25.4, INCH).find((label) => label.text.endsWith(' in'));
    expect(far && far.text).toBe('-10 in');
  });

  test('widens its count in round inches, handed back in millimetres', () => {
    // At a zoom where an inch is 10 pixels, 64 pixels between figures wants
    // 10 inches — 254 mm in the world.
    expect(labelStep(25.4, 10 / 25.4, INCH.factor)).toBeCloseTo(254, 6);
  });
});

describe('rulers along the edges nearest the camera (Ścieżka, design 03a)', () => {
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
    const labels = gridLabels(TRAVEL, 200, { factor: 1, length: 'mm' }, { sides: nearSides(TRAVEL, ISO), titles: true });

    expect(labels.filter((l) => l.title).map((l) => l.text)).toEqual(['X [mm]', 'Y [mm]']);
    expect(labels.filter((l) => !l.title).every((l) => !l.text.includes('mm'))).toBe(true);
    // Every X figure on the front edge, every Y figure on the right one.
    expect(labels.filter((l) => l.key.startsWith('x')).every((l) => l.y === -700)).toBe(true);
    expect(labels.filter((l) => l.key.startsWith('y')).every((l) => l.x === 0)).toBe(true);
  });

  test('each title stands on its ruler, past the end away from the corner where they meet', () => {
    const [x, y] = axisTitles(TRAVEL, nearSides(TRAVEL, ISO), 'in');

    expect(x).toMatchObject({ text: 'X [in]', along: 'x', x: -1000, y: -700, push: { x: -1, y: -1 } });
    expect(y).toMatchObject({ text: 'Y [in]', along: 'y', x: 0, y: 0, push: { x: 1, y: 1 } });
    expect(x.clear.x).toBeLessThan(0);
    expect(y.clear.y).toBeGreaterThan(0);
  });

  test('without it, the zero rule and the unit in the far figure, as the file preview has them', () => {
    const labels = gridLabels(TRAVEL, 200);

    expect(labels.some((l) => l.title)).toBe(false);
    expect(labels.find((l) => l.key === 'x-1000').text).toBe('-1000 mm');
  });
});
