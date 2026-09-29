/**
 * The Z plate's cycle as a drawing moves through it — the design's flat
 * drawings, 1g and 1l (`Sondowanie - grafiki plaskie`, 2026-09-29).
 *
 * Nothing here is the machine's: the tool's height above the plate is in the
 * drawing's pixels and the timings are the drawing's, the same for any
 * figure. What a figure *means* is shown by which part of the cycle plays
 * when it is picked — the design's keyframes, carried over as they are.
 */

/** One loop of a part of the cycle, in milliseconds. */
export const CYCLE_MS = 2600;

// The tool's tip on the plate, in the drawing's pixels.
export const PLATE_TOP = 192;

/*
 * Each figure: which stage of the cycle it belongs to (1 finding the plate,
 * 2 the measurement, 3 the zero), the tool's height above the plate through
 * one loop as `[at, px, eased]`, and whether an arrow shows the move.
 */
const APPROACH = [[0, 84], [0.15, 84], [0.7, 0], [1, 0]];

export const FIGURES = {
  maxZ: { stage: 1, frames: APPROACH, arrow: false, badge: [96, 140] },
  fast: { stage: 1, frames: APPROACH, arrow: true, badge: [256, 140] },
  retract: { stage: 2, frames: [[0, 0], [0.2, 0], [0.55, 14, true], [1, 14]], arrow: false, badge: [108, 175] },
  slow: { stage: 2, frames: [[0, 14], [0.15, 14], [0.75, 0], [1, 0]], arrow: true, badge: [256, 166] },
  plateThickness: { stage: 3, frames: [[0, 0], [1, 0]], arrow: false, zero: true, badge: [304, 191] },
  lift: { stage: 3, frames: [[0, 0], [0.2, 0], [0.6, 56, true], [1, 56]], arrow: true, badge: [256, 150] },
};

export const STAGES = [
  { n: 1, key: 'probe.stage.search' },
  { n: 2, key: 'probe.stage.measure' },
  { n: 3, key: 'probe.stage.zero' },
];

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);

/** The tool's height above the plate at `p`, a fraction of one loop. */
export const gapAt = (frames, p) => {
  for (let i = 0; i < frames.length - 1; i++) {
    const [a, from] = frames[i];
    const [b, to, eased] = frames[i + 1];
    if (p >= a && p <= b) {
      const u = (p - a) / Math.max(1e-6, b - a);
      return from + (to - from) * (eased ? ease(u) : u);
    }
  }
  return frames[frames.length - 1][1];
};

/**
 * The drawing for one figure at `ms` into its loop: the tool's `gap`, the
 * arrow of the move under way (`{ from, to }`, tip to target, or null), the
 * amber dot of a contact, and for the plate's thickness how far the Z0 line
 * has come in.
 */
export const sceneAt = (name, ms) => {
  const figure = FIGURES[name];
  if (!figure) {
    return { gap: 84, arrow: null, contact: false, zero: 0 };
  }
  const p = (ms % CYCLE_MS) / CYCLE_MS;
  const { frames } = figure;
  const gap = gapAt(frames, p);
  const start = (frames[1] || frames[0])[0];
  const [end, target] = frames[2] || frames[frames.length - 1];
  let arrow = null;
  if (figure.arrow && p >= start && p < end) {
    const from = PLATE_TOP - gap;
    const to = PLATE_TOP - target;
    arrow = Math.abs(to - from) > 10 ? { from, to } : null;
  }
  if (figure.zero) {
    return { gap, arrow, contact: p % 0.5 < 0.3, zero: Math.min(1, Math.max(0, (p - 0.25) / 0.2)) };
  }
  return { gap, arrow, contact: gap < 0.5, zero: 0 };
};

/*
 * The whole cycle, when no figure is being set (Mateusz, 2026-09-29: *"jak
 * żaden input nie ma fokusa to pokazuj całą animację z przystankami"*): each
 * part in the order the machine runs them, played once and then held for a
 * moment, so the stages read one at a time.
 */
export const CYCLE_ORDER = ['fast', 'retract', 'slow', 'plateThickness', 'lift'];

/** How long each part is held at its end before the next begins. */
export const STOP_MS = 800;

/** The part of the whole cycle at `ms`, and the drawing for it. */
export const cycleAt = (ms) => {
  const span = CYCLE_MS + STOP_MS;
  const at = ms % (span * CYCLE_ORDER.length);
  const name = CYCLE_ORDER[Math.floor(at / span)];
  const into = at % span;
  // Held on its last frame through the stop.
  return { name, scene: sceneAt(name, Math.min(into, CYCLE_MS - 1)) };
};

/*
 * What the machine is doing, as the figure whose part of the cycle it is —
 * the server's step names (`services/probe/moves`), so the measurement
 * screen plays the part the machine is in.
 */
const PHASE_FIGURE = {
  'z-fast': 'fast',
  'z-back': 'retract',
  'z-settle': 'retract',
  z: 'slow',
  lift: 'lift',
};

export const figureOfPhase = (phase) => PHASE_FIGURE[phase] || 'fast';
