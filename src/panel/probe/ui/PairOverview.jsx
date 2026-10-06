import { useId } from 'react';
import {
  Dimension, FACE, Motion, NS, Tag, WorkHatch, kit,
} from './probeDraw';
import useViewScale from './useViewScale';
import { clamp, ease } from '../machine/bossMoves';
import { t } from '../../i18n/index';

/*
 * The scenes of both features of a distance (`pairCycle`): from above and
 * from the front, the work with the two holes where they were picked, first
 * on the left. To begin with (`start`) the ball comes down into the first;
 * between them (`jog`) it goes up out of it, over, and down into the second
 * — the operator's way, by the jog; at the end (`end`) both with the measure
 * between their middles. From above the ball is drawn larger the higher it
 * is, as every probe drawing draws height. The features' own moves are drawn
 * by their own views, not here.
 */
// As large as a feature's own views (`bossCycle`'s part view, `CentreSide`), so the drawing keeps its size between them.
const TOP = [-101, -94, 202, 188];
const SIDE = [-101, -110, 202, 188];
const AT = { a: -50, b: 50 };
const HOLE_R = 22;
const BALL_R = 8;
// The ball's bottom over the top: down in a hole, and over the work on the way across.
const IN = -26;
const UP = 40;
const HOLE_DEPTH = 46;
// From above: over the holes the way across, under them the measure.
const OVER = -50;
const UNDER = 52;
const ACROSS = 'h';
const ALONG = 'v';
const RAPID = 'rapid';
const END_KEYS = { a: 'probe.distance.first', b: 'probe.distance.second' };
// SVG's word for a shape with a hole cut in it.
const EVEN_ODD = 'evenodd';

const hole = (x) => `M${x - HOLE_R} 0 A${HOLE_R} ${HOLE_R} 0 1 0 ${x + HOLE_R} 0 A${HOLE_R} ${HOLE_R} 0 1 0 ${x - HOLE_R} 0 Z`;
const WORK_TOP = `M-95 -80 H95 V80 H-95 Z ${hole(AT.a)} ${hole(AT.b)}`;
const WORK_SIDE = `M-95 0 H${AT.a - HOLE_R} V${HOLE_DEPTH} H${AT.a + HOLE_R} V0 H${AT.b - HOLE_R} V${HOLE_DEPTH} H${AT.b + HOLE_R} V0 H95 V80 H-95 Z`;

const step = (p, a, b) => ease(clamp((p - a) / (b - a)));
const between = (from, to, k) => from + (to - from) * k;

/** Where the ball is in scene `name` at `p`: along X, and its bottom's height over the top. */
const poseAt = (name, p) => {
  if (name === 'start') {
    return { x: AT.a, h: between(UP, IN, step(p, 0.15, 0.85)) };
  }
  if (name === 'jog') {
    // Up out of the first, over, down into the second: one leg after another, as the jog goes.
    const h = p < 0.5 ? between(IN, UP, step(p, 0.05, 0.3)) : between(UP, IN, step(p, 0.72, 0.95));
    return { x: between(AT.a, AT.b, step(p, 0.33, 0.68)), h };
  }
  return { x: AT.b, h: IN };
};

// The ways a scene goes, from the front: down into the first; up, over, down into the second.
const WAYS = {
  start: [{ axis: ALONG, at: AT.a - 16, from: -UP, to: -IN }],
  jog: [
    { axis: ALONG, at: AT.a - 16, from: -IN, to: -UP },
    { axis: ACROSS, at: -UP - 14, from: AT.a, to: AT.b },
    { axis: ALONG, at: AT.b + 16, from: -UP, to: -IN },
  ],
  end: [],
};

const PairOverview = ({
  name, p, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measureTop, kTop] = useViewScale(TOP[2], TOP[3]);
  const [measureSide, kSide] = useViewScale(SIDE[2], SIDE[3]);
  const [top, side] = [kit(kTop), kit(kSide)];
  const { x, h } = poseAt(name, p);
  // Larger the higher, as from above every probe drawing says height.
  const r = BALL_R * (1 + 0.6 * clamp((h - IN) / (UP - IN)));
  const cy = -(h + BALL_R);
  return (
    <div className={`grid grid-cols-2 divide-x divide-line ${className}`}>
      <svg ref={measureTop} viewBox={TOP.join(' ')} role="img" aria-label={label} className="block h-auto w-full">
        <WorkHatch id={`${id}t`} />
        <path d={WORK_TOP} fillRule={EVEN_ODD} fill={`url(#${id}t)`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        {Object.entries(AT).map(([end, at]) => (
          <g key={end}>
            <path d={`M${at - 5} 0 H${at + 5} M${at} -5 V5`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} />
            <Tag x={at - HOLE_R} y={-HOLE_R - 10} text={t(END_KEYS[end])} size={top} />
          </g>
        ))}
        {name === 'jog' ? (
          <>
            <Motion axis={ACROSS} at={OVER} from={AT.a} to={AT.b} kind={RAPID} size={top} />
            <Tag x={-12} y={OVER - 16} text={t('probe2.height.bar.jog')} face={FACE.rapid} size={top} />
          </>
        ) : null}
        {name === 'end' ? (
          <>
            <Dimension axis={ACROSS} at={UNDER} from={AT.a} to={AT.b} lit size={top} />
            <Tag x={-40} y={UNDER + 14} text={t('probe.distance.centres')} face={FACE.hot} size={top} />
          </>
        ) : null}
        <circle cx={x} cy={0} r={r} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />
      </svg>
      <svg ref={measureSide} viewBox={SIDE.join(' ')} role="img" aria-label={label} className="block h-auto w-full">
        <WorkHatch id={`${id}s`} />
        <path d={WORK_SIDE} fill={`url(#${id}s)`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        {WAYS[name].map((way) => <Motion key={`${way.axis}${way.at}`} axis={way.axis} at={way.at} from={way.from} to={way.to} kind={RAPID} size={side} />)}
        {/* The holes in section: the ball in one is seen, as the features' side views draw it. */}
        <path d={`M${x} ${SIDE[1]} V${cy - BALL_R}`} className="stroke-ink" strokeWidth={2} vectorEffect={NS} />
        <circle cx={x} cy={cy} r={BALL_R} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />
      </svg>
    </div>
  );
};

export default PairOverview;
