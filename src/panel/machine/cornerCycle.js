/**
 * The L plate's cycle as the design draws it — 1f, the same loop from above
 * and from the side (`Sondowanie - plytka L`, chosen 2026-09-29).
 *
 * The design animates one corner, front-left, with SMIL, touching each wall
 * once; the machine touches each twice — fast to find it, back off, slow for
 * the figure that counts (review note, the same day: *"czy w tym pomiarze nie
 * ma dojazdu szybkiego i dokładnego?"*). So the keyframes are the design's
 * with a back-off and a slow touch at every wall, played against a clock
 * here: a field being set plays the part it acts in, the machine's step
 * plays what it is doing, and the drawing mirrors to any corner.
 *
 * Coordinates are the design's, before its 0.8 scale: from above the work
 * spans x 110–400, y 60–210, the plate's walls stand 10 outside it; from the
 * side the work's top is at 170 and the plate's at 150.
 */

/** One loop of the whole cycle, in milliseconds. */
export const CORNER_MS = 10000;

/*
 * The loop, a row per moment: when, the tool from above [x, y], the ring
 * round it that says its height, and from the side [x, tip].
 */
const FRAMES = [
  [0, [145, 165], 18, [145, 110]],
  [0.04, [145, 165], 18, [145, 110]],
  [0.12, [145, 165], 10, [145, 150]], // Z, fast touch
  [0.15, [145, 165], 14, [145, 128]], // back off, far enough to see
  [0.18, [145, 165], 10, [145, 150]], // Z, slow touch
  [0.21, [145, 165], 18, [145, 110]],
  [0.28, [60, 170], 18, [60, 110]], // out past the X wall
  [0.34, [60, 170], 10, [60, 186]], // down beside it
  [0.41, [90, 170], 10, [90, 186]], // X, fast touch
  [0.44, [70, 170], 10, [70, 186]],
  [0.47, [90, 170], 10, [90, 186]], // X, slow touch
  [0.5, [60, 170], 10, [60, 186]],
  [0.56, [60, 252], 18, [60, 110]], // up, and round to the front
  [0.63, [140, 252], 18, [140, 110]],
  [0.68, [140, 252], 10, [140, 186]], // down beside the Y wall
  [0.75, [140, 222], 10, [140, 186]], // Y, fast touch
  [0.78, [140, 240], 10, [140, 186]],
  [0.81, [140, 222], 10, [140, 186]], // Y, slow touch
  [0.84, [140, 252], 10, [140, 186]],
  [0.9, [140, 252], 18, [140, 110]], // lift
  [1, [140, 252], 18, [140, 110]],
];

// Where each touch lights, and when — a flash, not the back-off after it — from
// above, and from the side where it shows.
const TOUCHES = [
  { axis: 'z', at: [[0.12, 0.13], [0.18, 0.19]], top: [145, 165], side: [145, 150] },
  { axis: 'x', at: [[0.41, 0.42], [0.47, 0.48]], top: [100, 170], side: [100, 186] },
  { axis: 'y', at: [[0.75, 0.76], [0.81, 0.82]], top: [140, 212], side: null },
];

export const CORNER_STAGES = [
  { n: 1, axis: 'Z', until: 0.24 },
  { n: 2, axis: 'X', until: 0.56 },
  { n: 3, axis: 'Y', until: 1.01 },
];

/** From here on the zero is written, and the drawing says so. */
export const ZERO_FROM = 0.9;

const lerp = (a, b, u) => (Array.isArray(a) ? a.map((v, k) => v + (b[k] - v) * u) : a + (b - a) * u);

/**
 * The drawing at `p`, a fraction of the whole loop: the tool from above and
 * from the side, which touch is lit, which stage is playing, whether the
 * zero has come in, and whether the side view has faded (the Y touches
 * happen in front of the plate, where the side view says nothing).
 */
export const cornerAt = (p) => {
  const i = Math.max(0, FRAMES.findIndex((frame, k) => k < FRAMES.length - 1 && p >= frame[0] && p <= FRAMES[k + 1][0]));
  const [from, topA, ringA, sideA] = FRAMES[i];
  const [to, topB, ringB, sideB] = FRAMES[i + 1] || FRAMES[i];
  const u = to > from ? (p - from) / (to - from) : 0;
  const touch = TOUCHES.find((one) => one.at.some(([a, b]) => p >= a && p < b)) || null;
  // Which way the tool is going, in each view, from the frames themselves — so
  // an arrow can only ever point the way it moves (review note, 2026-09-29).
  // A drift of a few pixels on the way (out past the wall, 165 to 170) is not a direction.
  const along = (d) => (Math.abs(d) > 6 ? Math.sign(d) : 0);
  const way = (a, b) => {
    const d = [along(b[0] - a[0]), along(b[1] - a[1])];
    return d[0] || d[1] ? d : null;
  };
  return {
    p,
    top: lerp(topA, topB, u),
    ring: lerp(ringA, ringB, u),
    side: lerp(sideA, sideB, u),
    moving: { top: way(topA, topB), side: way(sideA, sideB) },
    touch,
    stage: CORNER_STAGES.find((stage) => p < stage.until).n,
    zero: p >= ZERO_FROM,
    sideFaded: p >= 0.56 && p < ZERO_FROM,
  };
};

/*
 * The loop's parts, by what they are, each with the figure it shows — so a
 * field being set plays where it is used, the machine's step plays what it
 * is doing, and the whole loop shows each part's value as it passes.
 */
const PARTS = {
  zFast: { at: [0.04, 0.12], figure: 'fast' },
  zBack: { at: [0.12, 0.15], figure: 'retract' },
  zSlow: { at: [0.15, 0.18], figure: 'slow' },
  zUp: { at: [0.18, 0.21], figure: 'cornerThickness' },
  xOut: { at: [0.21, 0.28], figure: 'clear' },
  xDown: { at: [0.28, 0.34], figure: 'depth' },
  xFast: { at: [0.34, 0.41], figure: 'wallX' },
  xBack: { at: [0.41, 0.44], figure: 'retract' },
  xSlow: { at: [0.44, 0.5], figure: 'slow' },
  xUp: { at: [0.5, 0.56], figure: null },
  yOut: { at: [0.56, 0.63], figure: 'clear' },
  yDown: { at: [0.63, 0.68], figure: 'depth' },
  yFast: { at: [0.68, 0.75], figure: 'wallY' },
  yBack: { at: [0.75, 0.78], figure: 'retract' },
  ySlow: { at: [0.78, 0.84], figure: 'slow' },
  lift: { at: [0.84, 1], figure: 'lift' },
};

const SPANS = {
  ...Object.fromEntries(Object.entries(PARTS).map(([name, { at }]) => [name, at])),
  z: [0.04, 0.21],
  x: [0.34, 0.5],
  y: [0.68, 0.84],
  whole: [0, 1],
};

/** The figure whose value the drawing shows at `p` in the whole loop. */
export const figureAt = (p) => {
  if (p >= ZERO_FROM) {
    return 'cornerThickness';
  }
  const part = Object.values(PARTS).find(({ at }) => p >= at[0] && p < at[1]);
  return part ? part.figure : null;
};

/** The figures the corner uses, each to the part of the loop it acts in. */
export const FIELD_WINDOW = {
  cornerThickness: 'z',
  maxZ: 'zFast',
  fast: 'zFast',
  retract: 'zBack',
  slow: 'zSlow',
  wallX: 'x',
  wallY: 'y',
  toolDiameter: 'x',
  clear: 'xOut',
  depth: 'xDown',
  maxXY: 'xFast',
  lift: 'lift',
};

// The server's step names (`services/probe/strategies/corner`) to their part.
const PHASE_WINDOW = {
  'z-fast': 'zFast',
  'z-back': 'zBack',
  'z-settle': 'zBack',
  z: 'zSlow',
  'x-out': 'xOut',
  'x-down': 'xDown',
  'x-fast': 'xFast',
  'x-back': 'xBack',
  'x-settle': 'xBack',
  x: 'xSlow',
  'x-up': 'xUp',
  'x-return': 'yOut',
  'y-out': 'yOut',
  'y-down': 'yDown',
  'y-fast': 'yFast',
  'y-back': 'yBack',
  'y-settle': 'yBack',
  y: 'ySlow',
  'y-up': 'lift',
  'y-return': 'lift',
  lift: 'lift',
};

export const windowOfPhase = (phase) => PHASE_WINDOW[phase] || 'zFast';

/*
 * A part played on its own lasts at least this long, and stops at its end
 * for a moment before it starts again: the short ones — a back-off is three
 * hundredths of the loop — flickered past as a jump (review note,
 * 2026-09-29: *"animacja ruchu po zaznaczonym fokusie inputa powinna być
 * wolniejsza"*).
 */
export const PART_MS = 3000;
export const PART_STOP_MS = 700;

/*
 * The whole loop, played part by part like the Z plate's: each at half the
 * loop's own pace and never quicker than `WHOLE_PART_MS`, a short stop after
 * each, a long one on the zero at the end (review note, the same day:
 * *"animacja trwa za szybko, nie widać co się na niej dzieje"*).
 */
export const WHOLE_PART_MS = 1600;
export const WHOLE_STOP_MS = 400;
export const ZERO_STOP_MS = 2000;

const TIMELINE = (() => {
  const parts = [[0, 0.04], ...Object.values(PARTS).map(({ at }) => at)];
  let t = 0;
  return parts.map(([from, to], i) => {
    const plays = Math.max(WHOLE_PART_MS, (to - from) * CORNER_MS * 2);
    const stop = i === parts.length - 1 ? ZERO_STOP_MS : WHOLE_STOP_MS;
    const part = { from, to, begins: t, plays };
    t += plays + stop;
    return part;
  });
})();

/** How long the whole loop takes, played part by part. */
export const WHOLE_MS = (() => {
  const last = TIMELINE[TIMELINE.length - 1];
  return last.begins + last.plays + ZERO_STOP_MS;
})();

const wholeAt = (ms) => {
  const t = ms % WHOLE_MS;
  const part = [...TIMELINE].reverse().find(({ begins }) => t >= begins);
  // Held just short of its end through the stop, which is where the next part begins.
  return part.from + Math.min(0.999, (t - part.begins) / part.plays) * (part.to - part.from);
};

/** Where in the whole loop `ms` into playing part `name` over and over is. */
export const loopIn = (name, ms, length = CORNER_MS) => {
  if (name === 'whole' || !SPANS[name]) {
    return wholeAt(ms);
  }
  const [from, to] = SPANS[name];
  const plays = Math.max(PART_MS, (to - from) * length);
  const into = ms % (plays + PART_STOP_MS);
  return from + Math.min(0.999, into / plays) * (to - from);
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

/*
 * The tool's X, Y and Z in the coordinate system through the loop, for the
 * example it is (review note, 2026-09-29: the Z plate showed one, the corner
 * did not). The drawing's walls are 10 across and the plate 20 over the
 * work, so a pixel is taken as the figures typed make it; the old zero is an
 * example, `BEFORE_MM` away. After the zero is written the corner of the
 * work reads 0, 0, 0.
 */
export const BEFORE_MM = { x: 123.456, y: 78.9, z: 37.482 };

export const cornerReadout = (at, corner, mm) => {
  const { flipX, flipY } = cornerSides(corner);
  const after = {
    x: (flipX ? -1 : 1) * (at.top[0] - 110) * (mm.wallX / 10),
    y: (flipY ? -1 : 1) * (210 - at.top[1]) * (mm.wallY / 10),
    z: (170 - at.side[1]) * (mm.cornerThickness / 20),
  };
  if (at.zero) {
    return { ...after, after: true };
  }
  return { x: after.x + BEFORE_MM.x, y: after.y + BEFORE_MM.y, z: after.z + BEFORE_MM.z, after: false };
};
