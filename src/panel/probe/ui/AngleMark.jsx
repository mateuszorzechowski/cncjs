import { DASH, NS } from './probeDraw';

// The drawing's Y is up, the SVG's down.
const sy = (y) => -y;

/*
 * An edge's angle (Pomiar): from its first touch, a dashed line along the
 * axis the edge should run along and the accent line through both touches,
 * and the arc between them. Its figure is placed by the drawing's one rule
 * (`placeTags`, through `CentreScene`): beside the accent line's far end,
 * into the other view's free edge if this one has no room (review note,
 * 2026-10-05: *"etykieta jest ucięta"*).
 */
const ANGLE_ARM = 76;
const ANGLE_ARC = 56;

// The mark's points, SVG units: the first touch, the two arms' unit ways, their ends.
const geometry = (angle) => {
  const [x, y] = [angle.at[0], sy(angle.at[1])];
  const base = [angle.base[0], -angle.base[1]];
  const run = [angle.to[0] - angle.at[0], sy(angle.to[1]) - y];
  const length = Math.hypot(...run) || 1;
  const along = [run[0] / length, run[1] / length];
  return {
    x, y, base, along, baseEnd: [x + base[0] * ANGLE_ARM, y + base[1] * ANGLE_ARM], end: [x + along[0] * ANGLE_ARM, y + along[1] * ANGLE_ARM],
  };
};

/** The boxes the mark's two arms take, SVG units — for labels to keep off them. */
export const angleRects = (angle) => {
  const { x, y, baseEnd, end } = geometry(angle);
  const box = ([u, v]) => [Math.min(x, u), Math.min(y, v), Math.abs(u - x), Math.abs(v - y)];
  return [box(baseEnd), box(end)];
};

/**
 * Where its figure goes, as a line `placeTags` takes: at the accent line's
 * far end, on the side away from the axis line.
 */
export const angleLine = (angle) => {
  const { y, end } = geometry(angle);
  return {
    axis: 'h', at: end[1], side: end[1] < y ? -1 : 1, parts: [[end[0] - 1, end[0] + 1, angle.text]], ticks: [],
  };
};

const AngleMark = ({ angle }) => {
  const {
    x, y, base, along, baseEnd, end,
  } = geometry(angle);
  const [a0, a1] = [Math.atan2(base[1], base[0]), Math.atan2(along[1], along[0])];
  const point = (a, r) => [x + r * Math.cos(a), y + r * Math.sin(a)];
  const [s0, s1] = [point(a0, ANGLE_ARC), point(a1, ANGLE_ARC)];
  // The short way round, from the axis to the edge.
  const sweep = Math.sin(a1 - a0) > 0 ? 1 : 0;
  return (
    <g>
      <path d={`M${x} ${y} L${baseEnd[0]} ${baseEnd[1]}`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} strokeDasharray={DASH} />
      <path d={`M${x} ${y} L${end[0]} ${end[1]}`} className={angle.lit ? 'stroke-acc' : 'stroke-ink'} strokeWidth={1.5} vectorEffect={NS} />
      <path d={`M${s0[0]} ${s0[1]} A${ANGLE_ARC} ${ANGLE_ARC} 0 0 ${sweep} ${s1[0]} ${s1[1]}`} fill="none" className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} />
    </g>
  );
};

export default AngleMark;
