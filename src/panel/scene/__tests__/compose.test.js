import { composeScene, toolPoint } from '../compose';

const ALL = { path: true, programArea: true, wcsAxes: true, machineArea: true, machineAxes: true };
const NONE = { path: false, programArea: false, wcsAxes: false, machineArea: false, machineAxes: false };

// COM3: 200mm on each axis, homing off, nothing inverted.
const SETTINGS = {
  settings: { $20: '0', $22: '0', $23: '0', $130: '200', $131: '200', $132: '200' },
  parameters: {
    G54: { x: '0.000', y: '0.000', z: '0.000' },
    G55: { x: '-40.000', y: '-60.000', z: '-5.000' },
  },
};

// A 10mm square cut 2mm deep, written against the work zero. `readToolpath`
// hands the vertices on untouched; nothing here needs them.
const TOOLPATH = {
  name: 'part.nc',
  bounds: { min: { x: 0, y: 0, z: -2 }, max: { x: 10, y: 10, z: 0 } },
  source: { positions: new Float32Array(0), motions: new Uint8Array(0), vertexCount: 0 },
};

// Work zero at machine (-100, -80, -10): the offset the caller settles from
// the two positions in every status report.
const OFFSET = { x: -100, y: -80, z: -10 };

// Where the machine can reach, as the server sends it: 200mm on each axis,
// homing to the maximum, so the reachable volume is negative.
const ENVELOPE = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };

const scene = (overrides = {}) => composeScene({
  settings: SETTINGS,
  envelope: ENVELOPE,
  wcs: 'G54',
  offset: OFFSET,
  toolpath: TOOLPATH,
  layers: ALL,
  ...overrides,
});

describe('where the program is drawn', () => {
  test('is moved by the work offset, not drawn where its numbers say', () => {
    // Work zero at machine (-100, -80, -10), so a program that starts at its
    // own origin is cut there. Drawing it at machine zero instead would put
    // it 100mm away and look entirely reasonable.
    const drawn = scene();

    expect(drawn.offset).toEqual({ x: -100, y: -80, z: -10 });
    expect(drawn.program).toEqual({
      min: { x: -100, y: -80, z: -12 },
      max: { x: -90, y: -70, z: -10 },
    });
  });

  test('moving the work zero moves it', () => {
    // The machine has not moved; the zero has. Work X went from 0 to 25 at the
    // same machine position, so the program is drawn 25mm further negative.
    const moved = scene({ offset: { ...OFFSET, x: -125 } });

    expect(moved.program.min.x).toBe(-125);
  });

  test('draws about machine zero when there is no offset to apply', () => {
    // What the caller hands in when the machine has not reported both
    // positions. Wrong, and wrong in the one place the screen also says it
    // does not know where machine zero is.
    const drawn = scene({ offset: { x: 0, y: 0, z: 0 } });

    expect(drawn.program.min).toEqual(TOOLPATH.bounds.min);
  });
});

describe('what the camera is framed on', () => {
  test('is the union of the layers that are switched on', () => {
    const drawn = scene();

    // The envelope reaches -200 and the program reaches -70. Framing the
    // program alone is what left the envelope crossing the view as two
    // unexplained lines.
    expect(drawn.frame).toEqual({
      min: { x: -200, y: -200, z: -200 },
      max: { x: 0, y: 0, z: 0 },
    });
  });

  test('takes in the whole travel whatever is switched on', () => {
    const drawn = scene({ layers: { ...ALL, machineArea: false, machineAxes: false, wcsAxes: false } });

    // Machine zero and the far corner are both always drawn, so the views
    // always show both ends — *"tak, zawsze cały zakres"* (2026-09-25). It
    // also keeps the floor in a side view with the envelope off, which is
    // where this started. Closer in on the program is the fit button's job.
    expect(drawn.frame).toEqual({
      min: { x: -200, y: -200, z: -200 },
      max: { x: 0, y: 0, z: 0 },
    });
  });

  test('does not reach for a floor the machine has not described', () => {
    const drawn = scene({ envelope: null, layers: { ...ALL, machineArea: false, machineAxes: false, wcsAxes: false } });

    expect(drawn.frame).toEqual({
      min: { x: -100, y: -80, z: -12 },
      max: { x: -90, y: -70, z: -10 },
    });
  });

  test('includes the work zero when that is all there is', () => {
    const drawn = scene({
      wcs: 'G55',
      toolpath: null,
      envelope: null,
      layers: { ...NONE, wcsAxes: true },
    });

    // A point, framed, on a machine that has not described its travel.
    // Otherwise the layer is a button that appears to do nothing because
    // what it drew is off screen.
    expect(drawn.frame).toEqual({
      min: { x: -40, y: -60, z: -5 },
      max: { x: -40, y: -60, z: -5 },
    });
  });

  test('is something rather than nothing with every layer off', () => {
    const drawn = scene({ layers: NONE });

    // The travel, and the unit box around machine zero that stands in for
    // nothing at all.
    expect(drawn.frame).toEqual({
      min: { x: -200, y: -200, z: -200 },
      max: { x: 1, y: 1, z: 1 },
    });
  });
});

describe('the far corner of the travel', () => {
  test('is the end of each axis farthest from machine zero', () => {
    // The floor's guide lines go through it — where the travel ends, not
    // only where it starts (2026-09-25).
    expect(scene().farCorner).toEqual({ x: -200, y: -200, z: -200 });
  });

  test('follows an axis that homes to its other end', () => {
    const envelope = { min: { x: -200, y: -200, z: 0 }, max: { x: 0, y: 0, z: 200 } };
    expect(scene({ envelope }).farCorner).toEqual({ x: -200, y: -200, z: 200 });
  });

  test('with no machine to say, is the far corner of the program — the file preview', () => {
    // The program, shifted by the work offset: machine (-100..-90, -80..-70).
    expect(scene({ envelope: null }).farCorner).toEqual({ x: -100, y: -80, z: -12 });
  });

  test('is nothing with neither a machine nor a program', () => {
    expect(scene({ envelope: null, toolpath: null }).farCorner).toBeNull();
  });

  test('is inside the frame whatever is switched on', () => {
    const drawn = scene({ toolpath: null, layers: { ...NONE, machineAxes: true } });
    expect(drawn.frame).toEqual({
      min: { x: -200, y: -200, z: -200 },
      max: { x: 0, y: 0, z: 0 },
    });
  });
});

describe('the work coordinate system', () => {
  test('is the one the machine is working in, and only that one', () => {
    /*
     * All six were drawn once, the active one solid and the rest faint. An
     * unset system reads 0,0,0 — which is machine zero — so on a controller
     * nobody has configured, five of them stack in one spot and on top of
     * the machine's own zero. Switching the work axes then looked like it
     * controlled the machine axes, and switching the machine axes looked
     * like it did nothing.
     */
    const drawn = scene({ toolpath: null });

    expect(drawn.origin).toEqual({ name: 'G54', origin: { x: 0, y: 0, z: 0 } });
  });

  test('follows the machine into another system', () => {
    const drawn = scene({ wcs: 'G55', toolpath: null });

    expect(drawn.origin).toEqual({ name: 'G55', origin: { x: -40, y: -60, z: -5 } });
  });

  test('is nothing when the parser state has not arrived', () => {
    // Which system is active comes from `$G`. Guessing G54 would draw a zero
    // the machine may not be measuring from.
    expect(scene({ wcs: undefined, toolpath: null }).origin).toBeNull();
  });

  test('is nothing when the controller never answered $#', () => {
    const drawn = scene({ settings: { settings: SETTINGS.settings }, toolpath: null });

    expect(drawn.origin).toBeNull();
  });
});

describe('the tool', () => {
  test('is the machine position, which is the frame everything else is in', () => {
    expect(toolPoint({ x: -100, y: -80, z: -10 })).toEqual({ x: -100, y: -80, z: -10 });
  });

  test('is nothing until the machine has reported one', () => {
    expect(toolPoint({ x: null, y: null, z: null })).toBeNull();
    expect(toolPoint(undefined)).toBeNull();
  });

  test('is taken live rather than composed, so the picture can stay settled', () => {
    // The whole reason it is a separate function. Everything `composeScene`
    // returns is memoised by the caller; this is the one reading that moves
    // four times a second, and a scene recomposed around it was rebuilding
    // every outline's geometry at the same rate.
    expect(scene()).not.toHaveProperty('tool');
  });
});

describe('the empty floor', () => {
  test('is one unit either way, in the server’s units', () => {
    const empty = { settings: null, envelope: null, wcs: null, offset: { x: 0, y: 0, z: 0 }, toolpath: null, layers: NONE };
    expect(composeScene(empty).frame).toEqual({ min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } });
    expect(composeScene({ ...empty, factor: 1 / 25.4 }).frame.max.x).toBeCloseTo(25.4, 9);
  });
});
