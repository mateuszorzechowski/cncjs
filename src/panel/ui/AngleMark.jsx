import {
  DASH, FACE, NS, Tag,
} from './probeDraw';

// The drawing's Y is up, the SVG's down.
const sy = (y) => -y;

/*
 * An edge's angle (Pomiar): from its first touch, a dashed line along the
 * axis the edge should run along and the accent line through both touches,
 * the arc between them, and the angle said past the arc's end — outside the
 * part, the side's far end.
 */
const ANGLE_ARM = 76;
const ANGLE_ARC = 56;
const AngleMark = ({ angle, size, bare }) => {
  const [x, y] = [angle.at[0], sy(angle.at[1])];
  const base = [angle.base[0], -angle.base[1]];
  const run = [angle.to[0] - angle.at[0], sy(angle.to[1]) - y];
  const length = Math.hypot(...run) || 1;
  const along = [run[0] / length, run[1] / length];
  const [a0, a1] = [Math.atan2(base[1], base[0]), Math.atan2(along[1], along[0])];
  const point = (a, r) => [x + r * Math.cos(a), y + r * Math.sin(a)];
  const [s0, s1] = [point(a0, ANGLE_ARC), point(a1, ANGLE_ARC)];
  // The short way round, from the axis to the edge.
  const sweep = Math.sin(a1 - a0) > 0 ? 1 : 0;
  const [tx, ty] = point(a1, ANGLE_ARM + 6);
  return (
    <g>
      <path d={`M${x} ${y} L${x + base[0] * ANGLE_ARM} ${y + base[1] * ANGLE_ARM}`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} strokeDasharray={DASH} />
      <path d={`M${x} ${y} L${x + along[0] * ANGLE_ARM} ${y + along[1] * ANGLE_ARM}`} className={angle.lit ? 'stroke-acc' : 'stroke-ink'} strokeWidth={1.5} vectorEffect={NS} />
      <path d={`M${s0[0]} ${s0[1]} A${ANGLE_ARC} ${ANGLE_ARC} 0 0 ${sweep} ${s1[0]} ${s1[1]}`} fill="none" className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} />
      {bare ? null : <Tag x={tx} y={ty} text={angle.text} right={along[0] < 0} face={angle.lit ? FACE.hot : FACE.plain} size={size} />}
    </g>
  );
};

export default AngleMark;
