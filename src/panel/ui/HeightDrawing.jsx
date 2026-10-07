import { useId } from 'react';
import {
  Dimension, FACE, NS, Tag, WorkHatch, kit,
} from './probeDraw';
import useViewScale from './useViewScale';
import { decimal } from '../machine/probeFields';
import { useUnits } from './units';

/*
 * A height measured, from the side (Wysokość, 2026-10-05): the work's
 * profile with each surface touched — one, or two side by side, the second
 * drawn as far over or under the first as it is, to scale where it reads —
 * the ball on each, and between two the measure. Z up.
 */
const W = 400;
const H = 240;
const GROUND = 214;
const LEFT = 40;
const RIGHT = 360;
const STEP = 200;
const BALL = 9;
// How tall the difference may be drawn, and the most one millimetre may take.
const ROOM = 120;
const MOST = 8;
const ALONG = 'v';
// Each surface's figure is its Z.
const AXIS = 'Z';

const HeightDrawing = ({ probe, label, className = '' }) => {
  const units = useUnits();
  const hatch = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(W, H);
  const tags = kit(k);
  const { kind, size, parts } = probe.result.size;
  const dz = kind === 'height' ? size.dz : 0;
  const s = dz ? Math.min(MOST, ROOM / Math.abs(dz)) : 0;
  // The higher of the two at the same place whichever is first.
  const yA = GROUND - 60 - Math.max(0, -dz * s);
  const yB = yA - dz * s;
  const said = (mm) => `${decimal(units.figure(mm))} ${units.length}`;
  const two = kind === 'height';
  const outline = two
    ? `M${LEFT} ${GROUND} L${LEFT} ${yA} L${STEP} ${yA} L${STEP} ${yB} L${RIGHT} ${yB} L${RIGHT} ${GROUND} Z`
    : `M${LEFT} ${GROUND} L${LEFT} ${yA} L${RIGHT} ${yA} L${RIGHT} ${GROUND} Z`;
  const balls = two ? [[(LEFT + STEP) / 2, yA], [(STEP + RIGHT) / 2, yB]] : [[W / 2, yA]];
  const zs = two ? parts.map((one) => one.centre.z) : [probe.result.size.centre.z];
  return (
    <svg ref={measure} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={`block h-auto w-full ${className}`}>
      <WorkHatch id={hatch} />
      <path d={outline} fill={`url(#${hatch})`} className="stroke-ink" strokeWidth={1.5} strokeLinejoin="round" vectorEffect={NS} />
      {balls.map(([x, y], n) => (
        <g key={x}>
          <path d={`M${x} ${y - 2 * BALL} V${y - 70}`} className="stroke-ink" strokeWidth={2} vectorEffect={NS} />
          <circle cx={x} cy={y - BALL} r={BALL} className="fill-field stroke-ink" strokeWidth={1.5} vectorEffect={NS} />
          <circle cx={x} cy={y} r={2.5} className="fill-grn" />
          <Tag x={x + BALL + 8} y={y - BALL} text={`${AXIS} ${decimal(units.figure(zs[n]))}`} size={tags} />
        </g>
      ))}
      {/* Over the lower surface, by the step: the free side of it. */}
      {two && Math.abs(dz * s) > 6 ? (
        <>
          <Dimension axis={ALONG} at={STEP + (dz > 0 ? -16 : 16)} from={yA} to={yB} size={tags} />
          <Tag x={STEP + (dz > 0 ? -28 : 28)} right={dz > 0} y={(yA + yB) / 2} text={said(dz)} size={tags} face={FACE.hot} />
        </>
      ) : null}
    </svg>
  );
};

export default HeightDrawing;
