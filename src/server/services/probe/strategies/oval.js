import { EDGES } from './edge';
import { SIDES, keyOf } from './turned';

/**
 * Pomiar: an oval (Mateusz, 2026-10-03: *"owal w osiach, owal obrócony"*) —
 * a hole from inside, a stud from outside. Touched as a rectangle at an
 * angle is (`turned`): each of four ways at two points, every move along one
 * axis. Eight points on the wall, and the ellipse through them fitted, so it
 * may lie along the axes or turned.
 *
 * The ball's centres are not on an ellipse but on the curve its radius off
 * one, so the ellipse is fitted to them, each centre moved by the radius
 * along the fitted wall's normal — into the wall from inside, onto the stud
 * from outside — and fitted again, until it settles.
 */

// Solve `m · x = v` by Gaussian elimination with pivoting; `m` square.
const solve = (m, v) => {
  const n = v.length;
  const a = m.map((row, i) => [...row, v[i]]);
  for (let c = 0; c < n; c++) {
    let best = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(a[r][c]) > Math.abs(a[best][c])) {
        best = r;
      }
    }
    [a[c], a[best]] = [a[best], a[c]];
    for (let r = 0; r < n; r++) {
      if (r !== c) {
        const k = a[r][c] / a[c][c];
        for (let j = c; j <= n; j++) {
          a[r][j] -= k * a[c][j];
        }
      }
    }
  }
  return a.map((row, i) => row[n] / row[i]);
};

/**
 * The ellipse through `points` by least squares on its equation,
 * A·x² + B·xy + C·y² + D·x + E·y = 1 about the points' mean: `{ x, y, a, b,
 * angle (radians, of the long axis from X) }` — `a` the long half, `b`
 * the short one.
 */
export const fitEllipse = (points) => {
  const [mx, my] = [0, 1].map((i) => points.reduce((sum, p) => sum + p[i], 0) / points.length);
  const rows = points.map(([px, py]) => {
    const [u, v] = [px - mx, py - my];
    return [u * u, u * v, v * v, u, v];
  });
  const normal = [0, 1, 2, 3, 4].map((i) => [0, 1, 2, 3, 4].map((j) => rows.reduce((sum, r) => sum + r[i] * r[j], 0)));
  const right = [0, 1, 2, 3, 4].map((i) => rows.reduce((sum, r) => sum + r[i], 0));
  const [A, B, C, D, E] = solve(normal, right);
  // The middle: where the gradient is nought.
  const [u0, v0] = solve([[2 * A, B], [B, 2 * C]], [-D, -E]);
  const level = 1 - (A * u0 * u0 + B * u0 * v0 + C * v0 * v0 + D * u0 + E * v0);
  // The quadratic part's own values and ways: the halves along them.
  const mean = (A + C) / 2;
  const half = Math.sqrt(((A - C) / 2) ** 2 + (B / 2) ** 2);
  const [small, large] = [mean - half, mean + half];
  const tilt = 0.5 * Math.atan2(B, A - C);
  // The smaller value is the longer half; its way is square to the larger's.
  const a = Math.sqrt(level / small);
  const b = Math.sqrt(level / large);
  const angle = tilt + Math.PI / 2;
  return {
    x: u0 + mx, y: v0 + my, a, b, angle: Math.atan2(Math.sin(2 * angle), Math.cos(2 * angle)) / 2,
  };
};

/*
 * The point of the ellipse nearest `p`, and the wall's outward normal there:
 * sampled round it, then narrowed. `gap`, how far `p` is from it.
 */
const nearest = (e, [px, py]) => {
  const [c, s] = [Math.cos(e.angle), Math.sin(e.angle)];
  const at = (t) => [e.x + e.a * Math.cos(t) * c - e.b * Math.sin(t) * s, e.y + e.a * Math.cos(t) * s + e.b * Math.sin(t) * c];
  const gap = (t) => Math.hypot(at(t)[0] - px, at(t)[1] - py);
  let best = 0;
  for (let k = 1; k < 720; k++) {
    if (gap((k * Math.PI) / 360) < gap(best)) {
      best = (k * Math.PI) / 360;
    }
  }
  let [lo, hi] = [best - Math.PI / 360, best + Math.PI / 360];
  for (let k = 0; k < 80; k++) {
    const [m1, m2] = [lo + (hi - lo) / 3, hi - (hi - lo) / 3];
    if (gap(m1) < gap(m2)) {
      hi = m2;
    } else {
      lo = m1;
    }
  }
  const t = (lo + hi) / 2;
  // Square to the wall, out of the ellipse: its own normal (b·cos t, a·sin t), turned with it.
  const [nu, nv] = [e.b * Math.cos(t), e.a * Math.sin(t)];
  const length = Math.hypot(nu, nv) || 1;
  return { point: at(t), normal: [(nu * c - nv * s) / length, (nu * s + nv * c) / length], gap: gap(t) };
};

/**
 * The oval from its eight touches: `{ kind, size: { major, minor }, turn: { a },
 * off, spread, each, centre }` — the long and the short axis, whole; the long
 * axis's angle in degrees anticlockwise from X, folded to ±90°; the largest
 * less the smallest distance of the walls touched from the ellipse; the
 * middle, machine coordinates.
 */
export const ovalOf = (from, params, seen) => {
  const centres = SIDES.flatMap((side) => [1, 2].map((n) => seen[keyOf(EDGES[side], n)])).map((p) => [p.x, p.y]);
  const r = params.ballDiameter / 2;
  // Into the wall from inside, onto the stud from outside: away from the middle inside, towards it outside.
  const way = from === 'inside' ? 1 : -1;
  let walls = centres;
  let e = fitEllipse(walls);
  for (let k = 0; k < 8; k++) {
    // Each centre moved by the radius square to the wall nearest it.
    walls = centres.map((p) => {
      const { normal } = nearest(e, p);
      return [p[0] + way * r * normal[0], p[1] + way * r * normal[1]];
    });
    e = fitEllipse(walls);
  }
  const distances = walls.map((p) => nearest(e, p).gap);
  const size = { major: 2 * e.a, minor: 2 * e.b };
  return {
    kind: 'oval',
    size,
    turn: { a: (e.angle * 180) / Math.PI },
    off: Math.max(...distances) - Math.min(...distances),
    spread: null,
    each: [size],
    centre: { x: e.x, y: e.y },
  };
};
