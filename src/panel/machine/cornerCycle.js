/**
 * The L plate's cycle as the design draws it — 1f, the same loop from above
 * and from the side (`Sondowanie - plytka L`, chosen 2026-09-29).
 *
 * The design animates one corner, front-left, with SMIL; its keyframes are
 * carried over as they are and played against a clock here, so the panel can
 * pick the part to play — a figure being set, the machine's own step — and
 * mirror it to any corner. Coordinates are the design's, before its 0.8
 * scale: from above the work spans x 110–400, y 60–210; from the side the
 * work's top is at 170 and the plate's at 150.
 */

/** One loop of the whole cycle, in milliseconds. */
export const CORNER_MS = 8000;

const TIMES = [0, 0.06, 0.18, 0.26, 0.36, 0.44, 0.54, 0.6, 0.7, 0.8, 0.86, 0.94, 1];

// From above: where the tool is, and the ring round it that says its height.
const TOP = [[145, 165], [145, 165], [145, 165], [145, 165], [60, 170], [60, 170], [90, 170], [60, 170], [60, 252], [140, 252], [140, 252], [140, 222], [140, 252]];
const RING = [18, 18, 10, 18, 18, 10, 10, 10, 18, 18, 10, 10, 18];
// From the side: across and the height of the tip.
const SIDE = [[145, 110], [145, 110], [145, 150], [145, 110], [60, 110], [60, 186], [90, 186], [60, 186], [60, 110], [140, 110], [140, 186], [140, 186], [140, 110]];

/*
 * The three touches — where the contact lights on each view, and for how
 * long — and the three stages the tabs name.
 */
const TOUCHES = [
  { axis: 'z', from: 0.18, to: 0.26, top: [145, 165], side: [145, 150] },
  { axis: 'x', from: 0.54, to: 0.6, top: [100, 170], side: [100, 186] },
  { axis: 'y', from: 0.94, to: 0.99, top: [140, 212], side: null },
];

export const CORNER_STAGES = [
  { n: 1, axis: 'Z', until: 0.3 },
  { n: 2, axis: 'X', until: 0.64 },
  { n: 3, axis: 'Y', until: 1.01 },
];

const lerp = (list, p) => {
  for (let i = 0; i < TIMES.length - 1; i++) {
    if (p >= TIMES[i] && p <= TIMES[i + 1]) {
      const u = (p - TIMES[i]) / Math.max(1e-6, TIMES[i + 1] - TIMES[i]);
      const a = list[i];
      const b = list[i + 1];
      return Array.isArray(a) ? a.map((v, k) => v + (b[k] - v) * u) : a + (b - a) * u;
    }
  }
  return list[list.length - 1];
};

/**
 * The drawing at `p`, a fraction of the whole loop: the tool from above and
 * from the side, which touch is lit, which stage is playing, whether the
 * zero has come in, and whether the side view has faded (the Y touch happens
 * in front of the plate, where the side view says nothing).
 */
export const cornerAt = (p) => {
  const touch = TOUCHES.find((one) => p >= one.from && p < one.to) || null;
  return {
    top: lerp(TOP, p),
    ring: lerp(RING, p),
    side: lerp(SIDE, p),
    touch,
    stage: CORNER_STAGES.find((stage) => p < stage.until).n,
    zero: p >= 0.955,
    sideFaded: p >= 0.68 && p < 0.98,
  };
};

/*
 * Parts of the loop, by what they are — so a figure being set plays where it
 * is used, and the machine's step plays what it is doing.
 */
const WINDOWS = {
  z: [0.06, 0.26],
  xOut: [0.26, 0.36],
  xDown: [0.36, 0.44],
  x: [0.44, 0.6],
  xUp: [0.6, 0.7],
  yOut: [0.7, 0.8],
  yDown: [0.8, 0.86],
  y: [0.86, 1],
  whole: [0, 1],
};

/** The figures the corner uses, each to the part of the loop it acts in. */
export const FIELD_WINDOW = {
  cornerThickness: 'z',
  maxZ: 'z',
  wallX: 'x',
  wallY: 'y',
  toolDiameter: 'x',
  clear: 'xOut',
  depth: 'xDown',
  maxXY: 'x',
  retract: 'z',
  fast: 'z',
  slow: 'z',
  lift: 'whole',
};

// The server's step names (`services/probe/strategies/corner`) to their part.
const PHASE_WINDOW = {
  'x-out': 'xOut',
  'x-down': 'xDown',
  'x-up': 'xUp',
  'x-return': 'yOut',
  'y-out': 'yOut',
  'y-down': 'yDown',
  'y-up': 'y',
  'y-return': 'y',
};

export const windowOfPhase = (phase) => {
  if (!phase) {
    return 'z';
  }
  if (PHASE_WINDOW[phase]) {
    return PHASE_WINDOW[phase];
  }
  if (phase === 'lift') {
    return 'whole';
  }
  return phase.charAt(0);
};

/** Where in the whole loop `ms` into playing part `name` over and over is. */
export const loopIn = (name, ms, length = CORNER_MS) => {
  const [from, to] = WINDOWS[name] || WINDOWS.whole;
  const span = (to - from) * length;
  return from + ((ms % span) / span) * (to - from);
};

/*
 * The corner turns the drawing: right corners mirror across, back corners
 * mirror top to bottom, about the middle of the work as each view draws it.
 */
const SIDES = {
  'front-left': { flipX: false, flipY: false, dirs: ['X+', 'Y+'] },
  'front-right': { flipX: true, flipY: false, dirs: ['X−', 'Y+'] },
  'back-left': { flipX: false, flipY: true, dirs: ['X+', 'Y−'] },
  'back-right': { flipX: true, flipY: true, dirs: ['X−', 'Y−'] },
};

export const cornerSides = (corner) => SIDES[corner] || SIDES['front-left'];
