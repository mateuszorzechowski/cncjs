import { useId } from 'react';
import AngleMark from './AngleMark';
import {
  Dimension, NS, Tag, WorkHatch, kit,
} from './probeDraw';
import { tagWidth } from './probeLabels';
import useViewScale from './useViewScale';
import { decimal } from '../machine/probeFields';
import { pairEnds } from '../machine/probe';
import { degrees } from '../../machine/units';
import { useUnits } from '../../ui/units';

/*
 * A distance measured, from above (Mateusz, 2026-10-05: *"dorobić
 * rysunki"*): the two ends where they lie and the measure between them —
 * two centres with the line through them, each way and its angle; a centre
 * square to an edge; two edges, square to them. To scale where it reads, an
 * edge drawn level: its angle is in the tiles.
 */
const W = 400;
const H = 240;
const M = 34;
// Each way along an edge, from the middle; the work's band behind an edge, screen units.
const HALF = 150;
const BAND = 44;
const SMALLEST = 5;
const GAP = 8;
// A dimension's way on the screen: across it, or up and down it.
const ACROSS = 'h';
const ALONG = 'v';
// An angle too small to draw an arc for.
const LEVEL = 0.05;
// How far out from the first centre the angle's figure stands: past `AngleMark`'s arc.
const BISECT = 72;

// Each edge's ways on the screen: `U` along it, `V` into its part.
const FRAMES = {
  'edge-front': { U: [1, 0], V: [0, -1] },
  'edge-back': { U: [1, 0], V: [0, 1] },
  'edge-left': { U: [0, 1], V: [1, 0] },
  'edge-right': { U: [0, 1], V: [-1, 0] },
};
// A pocket's wall faces back into the pocket, as the opposite edge of a part faces out of it.
const AS_EDGE = {
  'wall-front': 'edge-back', 'wall-back': 'edge-front', 'wall-left': 'edge-right', 'wall-right': 'edge-left',
};
const facing = (part) => AS_EDGE[part] ?? part;
const FACING_APART = { 'edge-front': 'edge-back', 'edge-back': 'edge-front', 'edge-left': 'edge-right', 'edge-right': 'edge-left' };

// A centre found.
const Cross = ({ x, y }) => <path d={`M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4}`} className="stroke-ink" strokeWidth={1} vectorEffect={NS} />;

// A round end: a hole cut in the work, or a stud standing on it.
const Round = ({
  x, y, r, part, hatch,
}) => (
  <circle cx={x} cy={y} r={r} fill={part === 'circle-outside' ? `url(#${hatch})` : undefined} className={part === 'circle-outside' ? 'stroke-mut' : 'fill-field stroke-line'} strokeWidth={1.5} vectorEffect={NS} />
);

// A figure's box, its middle at (x, y).
const Centred = ({
  x, y, text, size,
}) => <Tag x={x - tagWidth(text, size.fs) / 2} y={y} text={text} size={size} />;

const Centres = ({
  size, pair, ends, said, hatch, k,
}) => {
  const [ra, rb] = ends.map((one) => one.size.d / 2);
  const xs = [-ra, ra, size.dx - rb, size.dx + rb];
  const ys = [-ra, ra, size.dy - rb, size.dy + rb];
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((W - 2 * M - 60) / (x1 - x0 || 1), (H - 2 * M - 30) / (y1 - y0 || 1));
  const at = (x, y) => [M + (x - x0) * s, M + (y1 - y) * s];
  const [A, B] = [at(0, 0), at(size.dx, size.dy)];
  const [bottom, right] = [M + (y1 - y0) * s, M + (x1 - x0) * s];
  const tags = kit(k);
  const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const half = (size.a * Math.PI) / 360;
  const arc = {
    at: [A[0], -A[1]], base: [1, 0], to: [B[0], -B[1]], lit: true,
  };
  const level = Math.abs(size.a) < LEVEL || Math.abs(Math.abs(size.a) - 180) < LEVEL;
  return (
    <>
      <rect x={0} y={0} width={W} height={H} fill={`url(#${hatch})`} />
      <Round x={A[0]} y={A[1]} r={Math.max(SMALLEST, ra * s)} part={pair.a} hatch={hatch} />
      <Round x={B[0]} y={B[1]} r={Math.max(SMALLEST, rb * s)} part={pair.b} hatch={hatch} />
      <Cross x={A[0]} y={A[1]} />
      <Cross x={B[0]} y={B[1]} />
      <path d={`M${A[0]} ${A[1]} L${B[0]} ${B[1]}`} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} />
      {level ? null : <AngleMark angle={arc} />}
      {Math.abs(size.dx * s) > GAP ? <Dimension axis={ACROSS} at={bottom + 18} from={A[0]} to={B[0]} size={tags} /> : null}
      {Math.abs(size.dy * s) > GAP ? <Dimension axis={ALONG} at={right + 18} from={A[1]} to={B[1]} size={tags} /> : null}
      <Centred x={mid[0]} y={mid[1] - 12} text={said(size.dist)} size={tags} />
      {Math.abs(size.dx * s) > GAP ? <Centred x={(A[0] + B[0]) / 2} y={bottom + 34} text={said(Math.abs(size.dx))} size={tags} /> : null}
      {Math.abs(size.dy * s) > GAP ? <Tag x={right + 30} y={(A[1] + B[1]) / 2} text={said(Math.abs(size.dy))} size={tags} /> : null}
      {/* The angle's figure out along the middle of its arc, past it. */}
      {level ? null : <Centred x={A[0] + BISECT * Math.cos(half)} y={A[1] - BISECT * Math.sin(half)} text={`${decimal(degrees(size.a))}°`} size={tags} />}
    </>
  );
};

/*
 * An edge with what it is measured to: a centre or another edge. Drawn in
 * the edge's own frame — along it and into its part — turned the way it
 * faces.
 */
const FromEdge = ({
  size, pair, ends, beyond, said, hatch, k,
}) => {
  const first = ends[0].kind === 'edge' ? 'a' : 'b';
  const edge = facing(pair[first]);
  const other = first === 'a' ? 'b' : 'a';
  const two = ends.every((one) => one.kind === 'edge');
  const { U, V } = FRAMES[edge];
  const r = two ? 0 : ends.find((one) => one.kind !== 'edge').size.d / 2;
  const far = beyond ? -size.dist : size.dist;
  const room = (U[0] ? H : W) - 2 * M - 2 * BAND;
  const s = Math.min(room / (size.dist + r || 1), 6);
  const [lo, hi] = [Math.min(0, far * s - r * s), Math.max(0, far * s + r * s)];
  // The middle of what is drawn, in the edge's frame, at the drawing's middle.
  const o = [W / 2 - (U[0] ? 0 : (V[0] * (lo + hi)) / 2), H / 2 - (U[0] ? (V[1] * (lo + hi)) / 2 : 0)];
  const at = (u, v) => [o[0] + u * U[0] + v * V[0], o[1] + u * U[1] + v * V[1]];
  const band = (v0, v1, u0, u1) => {
    const corners = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
    return <path d={`M${corners.map((p) => p.join(' ')).join(' L')} Z`} fill={`url(#${hatch})`} />;
  };
  const line = (v) => {
    const [p, q] = [at(-HALF, v), at(HALF, v)];
    return <path d={`M${p[0]} ${p[1]} L${q[0]} ${q[1]}`} className="stroke-ink" strokeWidth={2} vectorEffect={NS} />;
  };
  const v1 = far * s;
  let work;
  let way = HALF * 0.45;
  if (!two) {
    work = band(0, Math.max(hi, 0) + BAND, -HALF, HALF);
  } else if (FACING_APART[edge] === facing(pair[other])) {
    // Facing apart: one part between them, or two with the gap between.
    work = v1 > 0 ? band(0, v1, -HALF, HALF) : <>{band(0, BAND, -HALF, HALF)}{band(v1 - BAND, v1, -HALF, HALF)}</>;
  } else {
    // Facing alike: two parts side by side, a step between their sides.
    work = <>{band(0, Math.max(0, v1) + BAND, -HALF, 0)}{band(v1, Math.max(0, v1) + BAND, 0, HALF)}</>;
    way = 0;
  }
  const centre = at(0, v1);
  const tags = kit(k);
  const [d0, d1] = [at(way + r * s + 16, 0), at(way + r * s + 16, v1)];
  const text = said(size.dist);
  return (
    <>
      {work}
      {line(0)}
      {two ? line(v1) : <Round x={centre[0]} y={centre[1]} r={Math.max(SMALLEST, r * s)} part={pair[other]} hatch={hatch} />}
      {two ? null : <Cross x={centre[0]} y={centre[1]} />}
      {U[0] ? <Dimension axis={ALONG} at={d0[0]} from={d0[1]} to={d1[1]} size={tags} /> : <Dimension axis={ACROSS} at={d0[1]} from={d0[0]} to={d1[0]} size={tags} />}
      {U[0] ? <Tag x={d0[0] + 14} y={(d0[1] + d1[1]) / 2} text={text} size={tags} /> : <Centred x={(d0[0] + d1[0]) / 2} y={d0[1] + 16} text={text} size={tags} />}
    </>
  );
};

/*
 * A corner (2026-10-05): its two edges from where they meet, the part
 * between them, the angle's arc and its figure. Off square it is drawn
 * turned at least `SEEN` degrees, at most `STEEP`, so it can be seen and
 * still reads as a corner — as an edge's angle is drawn (`sizeCycle`).
 */
const SEEN = 8;
const STEEP = 20;
const ARM = 90;
// The way an edge faces, off its part, the drawing's Y up.
const OUT = {
  'edge-front': [0, -1], 'edge-back': [0, 1], 'edge-left': [-1, 0], 'edge-right': [1, 0],
};

const Corner = ({
  size, pair, said, hatch, k,
}) => {
  const [oa, ob] = [OUT[facing(pair.a)], OUT[facing(pair.b)]];
  // A pocket's corner, two walls: the angle is the pocket's, the work round it.
  const pocket = [pair.a, pair.b].every((part) => part.startsWith('wall-'));
  const k0 = pocket ? 1 : -1;
  // Along the first edge, into the second's part — or the pocket; the second turned off that by the angle drawn.
  const ra = [k0 * ob[0], k0 * ob[1]];
  const towards = Math.sign(ra[0] * k0 * oa[1] - ra[1] * k0 * oa[0]);
  const off = Math.abs(size.square) < LEVEL ? 0 : Math.sign(size.square) * Math.min(STEEP, Math.max(SEEN, Math.abs(size.square)));
  const turn = ((90 + off) * Math.PI / 180) * towards;
  const rb = [ra[0] * Math.cos(turn) - ra[1] * Math.sin(turn), ra[0] * Math.sin(turn) + ra[1] * Math.cos(turn)];
  // The corner where the drawing's middle leaves the part's middle.
  const c = [W / 2 - (ra[0] + rb[0]) * ARM * 0.7, H / 2 + (ra[1] + rb[1]) * ARM * 0.7];
  const at = ([x, y], r) => [c[0] + x * r, c[1] - y * r];
  const [ea, eb, far] = [at(ra, ARM * 1.4), at(rb, ARM * 1.4), at([ra[0] + rb[0], ra[1] + rb[1]], ARM * 1.4)];
  const middle = [ra[0] + rb[0], ra[1] + rb[1]];
  const length = Math.hypot(...middle) || 1;
  // Further out than a distance's: its figure stands on the middle of the arc, not off its end.
  const tag = at([middle[0] / length, middle[1] / length], BISECT + 16);
  const arc = {
    at: [c[0], -c[1]], base: ra, to: [eb[0], -eb[1]], lit: true,
  };
  return (
    <>
      {pocket ? <rect x={0} y={0} width={W} height={H} fill={`url(#${hatch})`} /> : null}
      <path d={`M${c[0]} ${c[1]} L${ea[0]} ${ea[1]} L${far[0]} ${far[1]} L${eb[0]} ${eb[1]} Z`} fill={pocket ? undefined : `url(#${hatch})`} className={pocket ? 'fill-field' : undefined} />
      <path d={`M${ea[0]} ${ea[1]} L${c[0]} ${c[1]} L${eb[0]} ${eb[1]}`} fill="none" className="stroke-ink" strokeWidth={2} strokeLinejoin="round" vectorEffect={NS} />
      <AngleMark angle={arc} />
      <circle cx={c[0]} cy={c[1]} r={3} className="fill-acc" />
      <Centred x={tag[0]} y={tag[1]} text={said(size.a)} size={kit(k)} />
    </>
  );
};

const DistanceDrawing = ({ probe, label, className = '' }) => {
  const units = useUnits();
  const hatch = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(W, H);
  const { size, parts, beyond } = probe.result.size;
  // A pair's two ends — or a corner's two edges, from one cycle (`pairEnds`).
  const pair = pairEnds(probe.options);
  const said = (mm) => `${decimal(units.figure(mm))} ${units.length}`;
  const angled = (deg) => `${decimal(degrees(deg))}°`;
  const props = {
    size, pair, ends: parts, beyond, said, hatch, k,
  };
  return (
    <svg ref={measure} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={`block h-auto w-full ${className}`}>
      <WorkHatch id={hatch} />
      {probe.result.size.kind === 'angle' ? <Corner {...props} said={angled} /> : null}
      {probe.result.size.kind === 'distance' && parts.some((one) => one.kind === 'edge') ? <FromEdge {...props} /> : null}
      {probe.result.size.kind === 'distance' && parts.every((one) => one.kind !== 'edge') ? <Centres {...props} /> : null}
    </svg>
  );
};

export default DistanceDrawing;
