/**
 * How long a program takes on this machine — Grbl's own planner, replayed.
 *
 * Asked for on 2026-09-25 with accelerations rather than distance over feed:
 * a program of short segments spends most of its time getting up to speed,
 * and length over feed says it takes a fraction of what it does.
 *
 * What is modelled is what Grbl 1.1 does in `planner.c`: every move is a
 * block with a nominal speed, capped per axis by `$110`-`$112`; its
 * acceleration capped per axis by `$120`-`$122`; the speed at a corner set by
 * junction deviation (`$11`); arcs cut into chords by arc tolerance (`$12`);
 * and a look-ahead of Grbl's 16-block buffer that plans to a stop at its end.
 * A block leaves the buffer with the entry speed it had at that moment.
 *
 * What is not: the time a program waits for the operator (M0, M6), the
 * serial link starving the buffer, and override knobs. The number is the
 * machine's, not the afternoon's.
 *
 * Units inside: millimetres and seconds.
 */

const AXES = ['x', 'y', 'z'];

/** Grbl's planner holds 16 blocks, one of which is always the one running. */
export const BUFFER_BLOCKS = 16;

const number = (settings, name) => {
  const value = Number.parseFloat(settings?.[name]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * The settings a time depends on, or null when the machine has not said all
 * of them — a time from half the numbers would be a guess dressed as a
 * measurement.
 */
export const machineTiming = (settings) => {
  const rate = { x: number(settings, '$110'), y: number(settings, '$111'), z: number(settings, '$112') };
  const accel = { x: number(settings, '$120'), y: number(settings, '$121'), z: number(settings, '$122') };
  const junctionDeviation = number(settings, '$11');
  const arcTolerance = number(settings, '$12');

  if ([...Object.values(rate), ...Object.values(accel), junctionDeviation, arcTolerance].some(v => v === null)) {
    return null;
  }

  return {
    // mm/min in the firmware, mm/s here.
    rate: { x: rate.x / 60, y: rate.y / 60, z: rate.z / 60 },
    accel,
    junctionDeviation,
    arcTolerance,
  };
};

/** The most a per-axis limit allows along a direction — Grbl's `limit_value_by_axis_maximum`. */
const alongAxes = (limits, unit) => {
  let value = Infinity;
  for (const axis of AXES) {
    if (unit[axis] !== 0) {
      value = Math.min(value, Math.abs(limits[axis] / unit[axis]));
    }
  }
  return value;
};

/**
 * The points an arc is cut at, after `from` and ending on `to`: as few chords
 * as keep each within `tolerance` of the true curve — Grbl's `mc_arc`, with
 * `$12` for the tolerance. The axis off the plane moves linearly (a helix).
 */
export const arcPoints = (from, to, center, { plane, clockwise }, tolerance) => {
  const [a, b, c] = { G17: ['x', 'y', 'z'], G18: ['z', 'x', 'y'], G19: ['y', 'z', 'x'] }[plane] || ['x', 'y', 'z'];
  const r0 = { a: from[a] - center[a], b: from[b] - center[b] };
  const r1 = { a: to[a] - center[a], b: to[b] - center[b] };
  const radius = Math.hypot(r0.a, r0.b);

  let angle = Math.atan2(r0.a * r1.b - r0.b * r1.a, r0.a * r1.a + r0.b * r1.b);
  if (clockwise) {
    if (angle >= -1e-9) {
      angle -= 2 * Math.PI;
    }
  } else if (angle <= 1e-9) {
    angle += 2 * Math.PI;
  }

  const chord = Math.sqrt(tolerance * (2 * radius - tolerance));
  const segments = Number.isFinite(chord) && chord > 0 ? Math.max(1, Math.floor(Math.abs(0.5 * angle * radius) / chord)) : 1;
  const start = Math.atan2(r0.b, r0.a);
  const points = [];

  for (let i = 1; i < segments; i++) {
    const theta = start + (angle * i) / segments;
    points.push({
      [a]: center[a] + radius * Math.cos(theta),
      [b]: center[b] + radius * Math.sin(theta),
      [c]: from[c] + ((to[c] - from[c]) * i) / segments,
    });
  }
  points.push(to);

  return points;
};

/** Time over one block, entering at `v0`, leaving at `v1`, cruising at most at `vn`. */
export const blockSeconds = (length, v0, v1, vn, accel) => {
  const accelerating = (vn * vn - v0 * v0) / (2 * accel);
  const decelerating = (vn * vn - v1 * v1) / (2 * accel);

  if (accelerating + decelerating <= length) {
    return (vn - v0) / accel + (vn - v1) / accel + (length - accelerating - decelerating) / vn;
  }

  // Never reaches cruise: a triangle, peaking where the two ramps meet.
  const peak = Math.sqrt((2 * accel * length + v0 * v0 + v1 * v1) / 2);
  return (peak - v0) / accel + (peak - v1) / accel;
};

export class Planner {
  seconds = 0;

  blocks = [];

  previous = null;

  /**
   * Seconds and blocks by the line they came from, when asked for: a running
   * program's timeline — where the time goes, and how many blocks each line
   * puts into Grbl's planner. `line` in the options of `line`, `arc`, `stop`.
   */
  lines = null;

  constructor(machine, { byLine = false } = {}) {
    this.machine = machine;
    if (byLine) {
      this.lines = { seconds: [], blocks: [] };
    }
  }

  /** Time to line `line` (1-based), as it is known so far. */
  spend(line, seconds) {
    this.seconds += seconds;
    if (this.lines && line) {
      this.lines.seconds[line - 1] = (this.lines.seconds[line - 1] || 0) + seconds;
    }
  }

  /**
   * One straight move. `feed` in mm/s, or null for a rapid; `inverseTime`
   * when the feed is G93's, where F says how many times a minute the block
   * completes.
   */
  line(from, to, { feed, inverseTime = false, line }) {
    const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
    const length = Math.hypot(delta.x, delta.y, delta.z);

    if (length === 0) {
      return;
    }

    const unit = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
    const fastest = alongAxes(this.machine.rate, unit);
    let nominal = fastest;
    if (feed !== null) {
      nominal = Math.min(fastest, inverseTime ? (length * feed) / 60 : feed);
    }
    const accel = alongAxes(this.machine.accel, unit);

    const block = { length, unit, nominal, accel, maxEntry: 0, entry: 0, line };
    if (this.lines && line) {
      this.lines.blocks[line - 1] = (this.lines.blocks[line - 1] || 0) + 1;
    }
    if (this.previous) {
      block.maxEntry = Math.min(this.junctionSpeed(this.previous, block), this.previous.nominal, nominal);
    }

    this.previous = block;
    this.blocks.push(block);
    if (this.blocks.length >= BUFFER_BLOCKS) {
      this.plan();
      this.run(this.blocks.shift());
    }
  }

  /** Grbl's junction deviation: how fast a corner of this angle can be taken. */
  junctionSpeed(before, after) {
    const cos = -(before.unit.x * after.unit.x + before.unit.y * after.unit.y + before.unit.z * after.unit.z);

    if (cos > 0.999999) {
      return 0; // A reversal.
    }
    if (cos < -0.999999) {
      return Infinity; // Straight on.
    }

    const direction = {
      x: after.unit.x - before.unit.x,
      y: after.unit.y - before.unit.y,
      z: after.unit.z - before.unit.z,
    };
    const size = Math.hypot(direction.x, direction.y, direction.z);
    const accel = alongAxes(this.machine.accel, { x: direction.x / size, y: direction.y / size, z: direction.z / size });
    const sinHalf = Math.sqrt(0.5 * (1 - cos));

    return Math.sqrt((accel * this.machine.junctionDeviation * sinHalf) / (1 - sinHalf));
  }

  /** An arc, as the chords Grbl cuts it into. `clockwise` is G2. */
  arc(from, to, center, { plane, clockwise, feed, inverseTime, line }) {
    const points = arcPoints(from, to, center, { plane, clockwise }, this.machine.arcTolerance);
    // G93 gives the whole arc a time; each chord gets its share of it.
    const chordFeed = inverseTime ? feed * points.length : feed;

    let previous = from;
    for (const point of points) {
      this.line(previous, point, { feed: chordFeed, inverseTime, line });
      previous = point;
    }
  }

  /** Motion stops here — a dwell, a spindle change, a pause. */
  stop(seconds = 0, line) {
    this.flush();
    this.spend(line, seconds);
  }

  /**
   * Backward then forward over what is buffered, as `planner_recalculate`
   * does: the last block must be able to stop; each earlier one enters no
   * faster than it can brake down to the next, and no faster than it could
   * have got up to from the one before.
   */
  plan() {
    const blocks = this.blocks;
    let next = 0;
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      // The first block's entry is the speed the machine left the last one
      // at; that has happened, and no later block can raise it.
      const ceiling = block.started ? block.entry : block.maxEntry;
      block.entry = Math.min(ceiling, Math.sqrt(next * next + 2 * block.accel * block.length));
      next = block.entry;
    }
    for (let i = 0; i < blocks.length - 1; i++) {
      const block = blocks[i];
      const reachable = Math.sqrt(block.entry * block.entry + 2 * block.accel * block.length);
      blocks[i + 1].entry = Math.min(blocks[i + 1].entry, reachable);
    }
  }

  run(block) {
    const next = this.blocks[0];
    if (next) {
      next.started = true;
    }
    this.spend(block.line, blockSeconds(block.length, block.entry, next ? next.entry : 0, block.nominal, block.accel));
  }

  flush() {
    this.plan();
    while (this.blocks.length > 0) {
      this.run(this.blocks.shift());
    }
    this.previous = null;
  }

  finish() {
    this.flush();
    return this.seconds;
  }
}
