import { useId } from 'react';
import {
  Dimension, FACE, Motion, NS, Tag, WorkHatch, kit,
} from './probeDraw';
import useViewScale from './useViewScale';
import { clamp, ease } from '../machine/bossMoves';
import { t } from '../../i18n/index';

/*
 * The scenes of both features of a distance (`pairCycle`), from above: the
 * work with the two holes where they were picked, first on the left; the
 * ball at the first to begin with (`start`), going over to the second the
 * operator's way, by the jog (`jog`), and at the end both with the measure
 * between their middles (`end`). The features' own moves are drawn by their
 * own views, not here.
 */
const VIEW = [-202, -94, 404, 188];
const AT = { a: -90, b: 90 };
const HOLE_R = 28;
const BALL_R = 8;
// Above the holes the way over goes, under them the measure.
const OVER = -50;
const UNDER = 52;
const ACROSS = 'h';
const RAPID = 'rapid';
const END_KEYS = { a: 'probe.distance.first', b: 'probe.distance.second' };

const hole = (x) => `M${x - HOLE_R} 0 A${HOLE_R} ${HOLE_R} 0 1 0 ${x + HOLE_R} 0 A${HOLE_R} ${HOLE_R} 0 1 0 ${x - HOLE_R} 0 Z`;
const WORK = `M-190 -80 H190 V80 H-190 Z ${hole(AT.a)} ${hole(AT.b)}`;
// SVG's word for a shape with a hole cut in it.
const EVEN_ODD = 'evenodd';

/** Where the ball is in scene `name` at `p`. */
const ballAt = (name, p) => {
  if (name === 'start') {
    return AT.a;
  }
  if (name === 'jog') {
    return AT.a + (AT.b - AT.a) * ease(clamp((p - 0.1) / 0.75));
  }
  return AT.b;
};

const PairOverview = ({
  name, p, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const x = ballAt(name, p);
  return (
    <svg ref={measure} viewBox={VIEW.join(' ')} role="img" aria-label={label} className={`block h-auto w-full ${className}`}>
      <WorkHatch id={id} />
      <path d={WORK} fillRule={EVEN_ODD} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
      {Object.entries(AT).map(([end, at]) => (
        <g key={end}>
          <path d={`M${at - 5} 0 H${at + 5} M${at} -5 V5`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} />
          <Tag x={at - HOLE_R} y={-HOLE_R - 10} text={t(END_KEYS[end])} size={size} />
        </g>
      ))}
      {name === 'jog' ? (
        <>
          <Motion axis={ACROSS} at={OVER} from={AT.a} to={AT.b} kind={RAPID} size={size} />
          <Tag x={-30} y={OVER - 16} text={t('probe2.height.bar.jog')} face={FACE.rapid} size={size} />
        </>
      ) : null}
      {name === 'end' ? (
        <>
          <Dimension axis={ACROSS} at={UNDER} from={AT.a} to={AT.b} lit size={size} />
          <Tag x={-46} y={UNDER + 14} text={t('probe.distance.centres')} face={FACE.hot} size={size} />
        </>
      ) : null}
      <circle cx={x} cy={0} r={BALL_R} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />
    </svg>
  );
};

export default PairOverview;
