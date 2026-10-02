import { parseLine } from 'gcode-parser';

/**
 * A program bent to the surface a height map measured (Mateusz, 2026-10-02).
 *
 * The map is a grid of heights over the machine's X and Y, each one how far
 * the surface stands above or below the map's first point: `{ xs, ys, dz,
 * travel }`, millimetres, `dz[j][i]` at `(xs[i], ys[j])`. Its X and Y are
 * the machine's, so a zero moved in X or Y after the map was measured moves
 * the program over the same surface; its heights are relative, so a Z0 set
 * again on the first point — a new tool — keeps the map true. `travel` is
 * the height the probe went between the points, over the first one.
 *
 * What it does, as he chose it:
 * - every move is cut where the grid's lines cross it, and a piece again
 *   wherever the surface bows away from a straight line by more than
 *   `tolerance`; a move straight up or down is not cut;
 * - an arc becomes the straight moves Grbl would cut it into itself (`$12`,
 *   `arcTolerance`), and those are bent like any other; only in the XY
 *   plane — an arc in another is refused;
 * - `G91` comes out as `G90`: where each relative move ends is known, so the
 *   whole program is absolute. Refused when a relative move comes before
 *   anything says where the tool is, and for `G92`, which moves the zero
 *   under the program;
 * - `G28`, `G30`, `G53` and `G38` are passed on as they are; after them an
 *   axis they moved is unknown again;
 * - a rapid above `travel` at both ends is passed on as it is: there the
 *   surface does not matter, and a rapid an operator knows stays the one
 *   they know. So is a straight move before anything has said where the
 *   tool is — `G1 Z1` first thing, as jscut writes — since there is no
 *   point under it to bend it by; an arc there is refused;
 * - past the grid the surface is the height at its nearest edge; further than
 *   half a step past it the program is refused, not guessed at.
 *
 * Out: `{ lines, source }` — the lines to send and, for each, the line of the
 * file it came from, so progress and the toolpath stay on the file — or
 * `{ refused: { code, line } }`, `line` the file's, from zero.
 */

const MM_PER_INCH = 25.4;
const EPSILON = 1e-9;
// Grbl's own (`ARC_ANGULAR_TRAVEL_EPSILON`): a full circle, not none.
const ARC_EPSILON = 5e-7;

export const DEFAULT_TOLERANCE = 0.01;
// Grbl's `$12` as it ships.
export const DEFAULT_ARC_TOLERANCE = 0.002;

const AXES = ['x', 'y', 'z'];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** The cell `[i, i + 1]` a coordinate is in, the edge one for a coordinate past the grid. */
const cellOf = (values, v) => {
  let i = 0;
  while (i < values.length - 2 && values[i + 1] <= v) {
    i++;
  }
  return i;
};

/** How far the surface stands from the first point at a machine X and Y. */
export const heightAt = ({ xs, ys, dz }, x, y) => {
  const cx = clamp(x, xs[0], xs[xs.length - 1]);
  const cy = clamp(y, ys[0], ys[ys.length - 1]);
  const i = cellOf(xs, cx);
  const j = cellOf(ys, cy);
  const a = (cx - xs[i]) / (xs[i + 1] - xs[i]);
  const b = (cy - ys[j]) / (ys[j + 1] - ys[j]);
  return dz[j][i] * (1 - a) * (1 - b) + dz[j][i + 1] * a * (1 - b) + dz[j + 1][i] * (1 - a) * b + dz[j + 1][i + 1] * a * b;
};

/**
 * Where along a straight move, from 0 to 1, it is cut. Along a line the
 * bilinear surface is a parabola, `c t²` its bow: within a cell the chord is
 * off it by `|c| L² / 4` at most over a piece `L` long, so that many pieces
 * keep it within `tolerance`. Past the grid's edge the surface does not
 * change across it, so the bow there is in the other axis alone.
 */
const cutsOf = (map, from, to, tolerance) => {
  const { xs, ys, dz } = map;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const ts = [0, 1];
  if (Math.abs(dx) > EPSILON) {
    xs.forEach((x) => ts.push((x - from.x) / dx));
  }
  if (Math.abs(dy) > EPSILON) {
    ys.forEach((y) => ts.push((y - from.y) / dy));
  }
  const sorted = [...new Set(ts.filter((t) => t > EPSILON && t < 1 - EPSILON))].sort((a, b) => a - b);
  const breaks = [0, ...sorted, 1];

  const cuts = [];
  for (let k = 1; k < breaks.length; k++) {
    const t0 = breaks[k - 1];
    const t1 = breaks[k];
    const mx = from.x + dx * (t0 + t1) / 2;
    const my = from.y + dy * (t0 + t1) / 2;
    const inX = mx >= xs[0] && mx <= xs[xs.length - 1];
    const inY = my >= ys[0] && my <= ys[ys.length - 1];
    const i = cellOf(xs, clamp(mx, xs[0], xs[xs.length - 1]));
    const j = cellOf(ys, clamp(my, ys[0], ys[ys.length - 1]));
    const twist = (dz[j][i] - dz[j][i + 1] - dz[j + 1][i] + dz[j + 1][i + 1]) / ((xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]));
    const bow = Math.abs(twist * (inX ? dx : 0) * (inY ? dy : 0));
    const length = t1 - t0;
    const pieces = Math.max(1, Math.ceil(Math.sqrt(bow * length * length / (4 * tolerance))));
    for (let p = 1; p <= pieces; p++) {
      cuts.push(t0 + length * p / pieces);
    }
  }
  return cuts;
};

/**
 * An arc in the XY plane as the points Grbl's `mc_arc` would go through, in
 * work millimetres, the target last; null when its figures make no arc.
 * `offset` is `I`/`J` or `{ r }`.
 */
const arcPoints = (from, to, offset, clockwise, arcTolerance) => {
  let { i, j } = offset;
  if (offset.r !== undefined) {
    // Grbl's radius format: the centre on the side the sign of R says.
    let r = offset.r;
    const x = to.x - from.x;
    const y = to.y - from.y;
    let h = 4 * r * r - x * x - y * y;
    if (h < 0 || (Math.abs(x) < EPSILON && Math.abs(y) < EPSILON)) {
      return null;
    }
    h = -Math.sqrt(h) / Math.hypot(x, y);
    if (!clockwise) {
      h = -h;
    }
    if (r < 0) {
      h = -h;
      r = -r;
    }
    i = 0.5 * (x - y * h);
    j = 0.5 * (y + x * h);
  }
  const cx = from.x + i;
  const cy = from.y + j;
  const r0 = -i;
  const r1 = -j;
  const rt0 = to.x - cx;
  const rt1 = to.y - cy;
  const radius = Math.hypot(r0, r1);
  if (radius < EPSILON) {
    return null;
  }
  let travel = Math.atan2(r0 * rt1 - r1 * rt0, r0 * rt0 + r1 * rt1);
  if (clockwise) {
    if (travel >= -ARC_EPSILON) {
      travel -= 2 * Math.PI;
    }
  } else if (travel <= ARC_EPSILON) {
    travel += 2 * Math.PI;
  }
  const segments = Math.floor(Math.abs(0.5 * travel * radius) / Math.sqrt(arcTolerance * (2 * radius - arcTolerance)));
  const points = [];
  for (let k = 1; k < segments; k++) {
    const angle = travel * k / segments;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    points.push({
      x: cx + r0 * cos - r1 * sin,
      y: cy + r0 * sin + r1 * cos,
      z: from.z + (to.z - from.z) * k / segments,
    });
  }
  points.push({ ...to });
  return points;
};

const known = (point) => AXES.every((axis) => point[axis] !== null);

/** A figure in the program's units, as short as it can be said. */
const say = (mm, inches) => String(inches ? Math.round(mm / MM_PER_INCH * 10000) / 10000 : Math.round(mm * 1000) / 1000);

const wordsOf = (point, inches) => AXES
  .filter((axis) => point[axis] !== null)
  .map((axis) => `${axis.toUpperCase()}${say(point[axis], inches)}`)
  .join(' ');

/** A word as it was written: `G1`, `F100`. */
const spell = ([letter, value]) => `${letter}${value}`;

const isG = (word, ...codes) => word[0] === 'G' && codes.includes(word[1]);

export const compensate = (text, map, {
  wco = { x: 0, y: 0, z: 0 },
  tolerance = DEFAULT_TOLERANCE,
  arcTolerance = DEFAULT_ARC_TOLERANCE,
} = {}) => {
  const input = text.split(/\r?\n/);
  const parsed = input.map((line) => parseLine(line));

  if (!parsed.some(({ words }) => words.some(([letter]) => letter === 'Z'))) {
    return { refused: { code: 'no-z', line: null } };
  }

  const { xs, ys } = map;
  const halfX = (xs[1] - xs[0]) / 2;
  const halfY = (ys[1] - ys[0]) / 2;
  const outside = (p) => {
    const x = p.x + wco.x;
    const y = p.y + wco.y;
    return x < xs[0] - halfX - EPSILON || x > xs[xs.length - 1] + halfX + EPSILON ||
      y < ys[0] - halfY - EPSILON || y > ys[ys.length - 1] + halfY + EPSILON;
  };
  const bent = (p) => ({ ...p, z: p.z + heightAt(map, p.x + wco.x, p.y + wco.y) });

  // Absolute and in millimetres from the first line, whatever the machine was left in.
  const lines = ['G90 G21'];
  const source = [0];
  const put = (line, index) => {
    lines.push(line);
    source.push(index);
  };

  let motion = 0;
  let absolute = true;
  let inches = false;
  let plane = 17;
  let pos = { x: null, y: null, z: null };

  for (let index = 0; index < input.length; index++) {
    const { words } = parsed[index];
    if (words.length === 0) {
      put(input[index], index);
      continue;
    }
    const refuse = (code) => ({ refused: { code, line: index } });

    if (words.some((w) => w[0] === 'G' && Math.floor(w[1]) === 92)) {
      return refuse('g92');
    }
    for (const w of words) {
      if (isG(w, 20)) {
        inches = true;
      } else if (isG(w, 21)) {
        inches = false;
      } else if (isG(w, 90)) {
        absolute = true;
      } else if (isG(w, 91)) {
        absolute = false;
      } else if (isG(w, 17, 18, 19)) {
        plane = w[1];
      } else if (isG(w, 0, 1, 2, 3)) {
        motion = w[1];
      } else if (isG(w, 80)) {
        motion = null;
      }
    }

    const given = {};
    for (const [letter, value] of words) {
      const axis = letter.toLowerCase();
      if (AXES.includes(axis)) {
        given[axis] = inches ? value * MM_PER_INCH : value;
      }
    }
    const hasAxes = Object.keys(given).length > 0;
    // A line said as it was, but never leaving the machine in G91.
    const asWritten = () => {
      put(input[index], index);
      if (!absolute) {
        put('G90', index);
      }
    };

    if (words.some((w) => isG(w, 53))) {
      asWritten();
      for (const axis of Object.keys(given)) {
        pos[axis] = given[axis] - (wco[axis] || 0);
      }
      continue;
    }
    if (words.some((w) => isG(w, 28, 30))) {
      asWritten();
      // Home, by way of a point: every axis it names — all of them, named none — is somewhere else now.
      for (const axis of hasAxes ? Object.keys(given) : AXES) {
        pos[axis] = null;
      }
      continue;
    }
    if (words.some((w) => w[0] === 'G' && Math.floor(w[1]) === 38)) {
      asWritten();
      // A probe stops wherever it touched.
      for (const axis of Object.keys(given)) {
        pos[axis] = null;
      }
      continue;
    }

    const rest = words.filter(([letter, value]) => {
      if (letter === 'G') {
        return ![0, 1, 2, 3, 90, 91].includes(value);
      }
      return !['X', 'Y', 'Z', 'I', 'J', 'K', 'R'].includes(letter);
    }).map(spell).join(' ');

    if (!hasAxes || motion === null || words.some((w) => isG(w, 4, 10))) {
      // Modes, a feed, a spindle, a dwell: the line without its distance mode.
      // An arc's mode alone is not said: every arc goes out as straight moves.
      const kept = words.filter((w) => !isG(w, 2, 3, 90, 91));
      if (kept.length > 0) {
        put(kept.map(spell).join(' '), index);
      }
      continue;
    }

    const to = { ...pos };
    for (const axis of Object.keys(given)) {
      if (absolute) {
        to[axis] = given[axis];
      } else if (pos[axis] === null) {
        return refuse('relative-unknown');
      } else {
        to[axis] = pos[axis] + given[axis];
      }
    }

    const from = pos;
    pos = to;
    const lineFor = (point, first) => [first ? `G${motion === 0 ? 0 : 1}` : '', wordsOf(point, inches), first ? rest : '']
      .filter(Boolean).join(' ');

    if (motion >= 2 && plane !== 17) {
      return refuse('arc-plane');
    }
    // A rapid over the surface, or a straight move before anything has said where the tool is: as the operator wrote it.
    const over = to.z !== null && to.z >= map.travel && (from.z === null || from.z >= map.travel);
    if ((motion === 0 && over) || (motion < 2 && !known(to))) {
      put(lineFor(to, true), index);
      continue;
    }

    let ends = [to];
    if (motion >= 2) {
      // An arc's centre is from where it starts: both ends must be known.
      if (!known(from) || !known(to)) {
        return refuse('unknown-position');
      }
      const ij = {};
      for (const [letter, value] of words) {
        if (['I', 'J', 'R'].includes(letter)) {
          ij[letter.toLowerCase()] = inches ? value * MM_PER_INCH : value;
        }
      }
      ends = arcPoints(from, to, ij.r !== undefined ? { r: ij.r } : { i: ij.i || 0, j: ij.j || 0 }, motion === 2, arcTolerance);
      if (!ends) {
        return refuse('bad-arc');
      }
    }

    const points = [];
    let at = known(from) ? from : null;
    for (const end of ends) {
      if (at && (Math.abs(end.x - at.x) > EPSILON || Math.abs(end.y - at.y) > EPSILON)) {
        const a = { x: at.x + wco.x, y: at.y + wco.y };
        const b = { x: end.x + wco.x, y: end.y + wco.y };
        for (const t of cutsOf(map, a, b, tolerance)) {
          points.push({ x: at.x + (end.x - at.x) * t, y: at.y + (end.y - at.y) * t, z: at.z + (end.z - at.z) * t });
        }
      } else {
        points.push(end);
      }
      at = end;
    }
    if (points.some(outside)) {
      return refuse('outside-map');
    }
    points.forEach((point, k) => put(lineFor(bent(point), k === 0), index));
  }

  return { lines, source };
};

export default compensate;
