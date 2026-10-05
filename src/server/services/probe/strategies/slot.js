import { EDGES } from './edge';
import { fitEllipse } from './oval';
import { SIDES, keyOf } from './turned';

/**
 * Pomiar: a slot — a fasolka, two half circles joined by straight sides
 * (Mateusz, 2026-10-05: *"rób fasolkę"*) — cut, from inside, or standing,
 * from outside; along the axes or turned. Touched as a rectangle at an angle
 * is: four ways at two points each, every move along one axis.
 *
 * Its five figures — the middle, the angle, the straight sides' half length
 * and the ends' radius — are fitted to the ball's eight centres by least
 * squares on how far each stands from the slot's wall, less the ball's
 * radius (Gauss–Newton, damped), from the ellipse through them. The ball is
 * taken off in the fit itself: a centre inside a cut slot is its radius in
 * from the wall, one beside a standing slot its radius out.
 */

// How far `p` is from the wall of the slot `s`, negative inside it.
const signedGap = ({
  x, y, angle, half, r,
}, [px, py]) => {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const u = (px - x) * c + (py - y) * s;
  const v = -(px - x) * s + (py - y) * c;
  const over = Math.abs(u) - half;
  return over <= 0 ? Math.abs(v) - r : Math.hypot(over, v) - r;
};

// Solve the 5×5 `m · x = v` by elimination with pivoting.
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
      if (r !== c && a[c][c] !== 0) {
        const k = a[r][c] / a[c][c];
        for (let j = c; j <= n; j++) {
          a[r][j] -= k * a[c][j];
        }
      }
    }
  }
  return a.map((row, i) => (row[i] === 0 ? 0 : row[n] / row[i]));
};

const NAMES = ['x', 'y', 'angle', 'half', 'r'];

/**
 * The slot whose wall stands `offset` from every point — the ball's radius
 * in from a cut one's wall (negative), out from a standing one's — by least
 * squares: `{ x, y, angle, half, r }` and the residuals.
 */
export const fitSlot = (points, offset = 0) => {
  const e = fitEllipse(points);
  let s = {
    x: e.x, y: e.y, angle: e.angle, half: Math.max(0, e.a - e.b), r: e.b,
  };
  const residuals = (one) => points.map((p) => signedGap(one, p) - offset);
  const cost = (one) => residuals(one).reduce((sum, d) => sum + d * d, 0);
  let damping = 1e-3;
  for (let k = 0; k < 200; k++) {
    const res = residuals(s);
    // The Jacobian by small steps, one figure at a time.
    const jac = res.map(() => []);
    NAMES.forEach((name, j) => {
      const h = 1e-6 * Math.max(1, Math.abs(s[name]));
      const moved = residuals({ ...s, [name]: s[name] + h });
      moved.forEach((value, i) => {
        jac[i][j] = (value - res[i]) / h;
      });
    });
    const jtj = NAMES.map((_, a) => NAMES.map((__, b) => jac.reduce((sum, row) => sum + row[a] * row[b], 0)));
    const jtr = NAMES.map((_, a) => jac.reduce((sum, row, i) => sum + row[a] * res[i], 0));
    const step = solve(jtj.map((row, a) => row.map((value, b) => (a === b ? value * (1 + damping) : value))), jtr.map((v) => -v));
    const next = Object.fromEntries(NAMES.map((name, j) => [name, s[name] + step[j]]));
    next.half = Math.max(0, next.half);
    if (cost(next) < cost(s)) {
      const gain = cost(s) - cost(next);
      s = next;
      damping = Math.max(1e-9, damping / 3);
      if (gain < 1e-18) {
        break;
      }
    } else {
      damping *= 4;
    }
  }
  return { ...s, residuals: residuals(s) };
};

/**
 * The slot from its eight touches: `{ kind, size: { length, width }, turn: {
 * a }, off, spread, each, centre }` — end to end and across, whole; its long
 * axis's angle in degrees anticlockwise from X, folded to ±90°; the largest
 * less the smallest distance of the walls touched from the slot fitted; the
 * middle, machine coordinates.
 */
export const slotOf = (from, params, seen) => {
  const centres = SIDES.flatMap((side) => [1, 2].map((n) => seen[keyOf(EDGES[side], n)])).map((p) => [p.x, p.y]);
  const r = params.ballDiameter / 2;
  const fit = fitSlot(centres, from === 'inside' ? -r : r);
  const turn = Math.atan2(Math.sin(2 * fit.angle), Math.cos(2 * fit.angle)) / 2;
  const size = { length: 2 * (fit.half + fit.r), width: 2 * fit.r };
  return {
    kind: 'slot',
    size,
    turn: { a: (turn * 180) / Math.PI },
    off: Math.max(...fit.residuals) - Math.min(...fit.residuals),
    spread: null,
    each: [size],
    centre: { x: fit.x, y: fit.y },
  };
};
