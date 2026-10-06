import { useId } from 'react';
import {
  Dimension, FACE, Motion, NS, Tag, WorkHatch, kit,
} from './probeDraw';
import {
  HOLE_R, SPAN, STUD_R, pairLayout, profileOf,
} from './pairLayout';
import useViewScale from './useViewScale';
import { clamp, ease } from '../machine/bossMoves';
import { t } from '../../i18n/index';

/*
 * The scenes of both features of a distance (`pairCycle`), from above and
 * in section along the line it is measured on, the features where the
 * operator picked them (`pairLayout`). To begin with (`start`) the ball
 * comes down to where the first's own cycle begins — into a hole, over a
 * stud, over the part by an edge; between them (`jog`) it goes up, over and
 * down to where the second's begins, the operator's way, by the jog; at the
 * end (`end`) both with the measure between them. From above the ball is
 * drawn larger the higher it is, as every probe drawing draws height. The
 * features' own moves are drawn by their own views, not here.
 *
 * As large as a feature's own views (`bossCycle`'s part view, `CentreSide`),
 * so the drawing keeps its size between them.
 */
const TOP = [-101, -94, 202, 188];
const SIDE = [-101, -110, 202, 188];
const FOOT = SIDE[1] + SIDE[3];
const BALL_R = 8;
// Over everything on the way across.
const UP = 50;
// From the line: the way across on one side of it, the measure on the other.
const AWAY = 62;
const ACROSS = 'h';
const ALONG = 'v';
const RAPID = 'rapid';
const END_KEYS = { a: 'probe.distance.first', b: 'probe.distance.second' };
const MEASURE_KEYS = { centres: 'probe.distance.centres', fromEdge: 'probe.distance.fromEdge', edges: 'probe.distance.edges' };

const step = (p, a, b) => ease(clamp((p - a) / (b - a)));
const between = (from, to, k) => from + (to - from) * k;

/** Where the ball is in scene `name` at `p`, along the line and its bottom's height over the part's top. */
const poseAt = (name, p, { a, b }) => {
  if (name === 'start') {
    return { u: a.start.u, h: between(UP, a.start.h, step(p, 0.15, 0.85)) };
  }
  if (name === 'jog') {
    // Up from the first, over, down to the second: one leg after another, as the jog goes.
    const h = p < 0.5 ? between(a.start.h, UP, step(p, 0.05, 0.3)) : between(UP, b.start.h, step(p, 0.72, 0.95));
    return { u: between(a.start.u, b.start.u, step(p, 0.33, 0.68)), h };
  }
  return { u: b.start.u, h: b.start.h };
};

const PairOverview = ({
  pair, name, p, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measureTop, kTop] = useViewScale(TOP[2], TOP[3]);
  const [measureSide, kSide] = useViewScale(SIDE[2], SIDE[3]);
  const [top, side] = [kit(kTop), kit(kSide)];
  const layout = pairLayout(pair);
  const { axis, regions, ends } = layout;
  const flat = axis === 'x';
  // From above, the line across the drawing for X, down it for Y (the front at the bottom).
  const at = (u, v = 0) => (flat ? [u, v] : [v, u]);
  const { u, h } = poseAt(name, p, ends);
  const [bx, by] = at(u);
  const r = BALL_R * (1 + 0.6 * clamp((h + 26) / (UP + 26)));
  const sideWork = `M${-SPAN} ${FOOT} ${profileOf(layout).map(([pu, ph]) => `L${pu} ${-ph}`).join(' ')} L${SPAN} ${FOOT} Z`;
  const ways = {
    start: [{ axis: ALONG, at: ends.a.start.u - 14, from: -UP, to: -ends.a.start.h }],
    jog: [
      { axis: ALONG, at: ends.a.start.u - 14, from: -ends.a.start.h, to: -UP },
      { axis: ACROSS, at: -UP - 12, from: ends.a.start.u, to: ends.b.start.u },
      { axis: ALONG, at: ends.b.start.u + 14, from: -UP, to: -ends.b.start.h },
    ],
    end: [],
  }[name];
  // The measure's ends on the line: a round feature's middle, an edge itself.
  const [from, to] = [ends.a.u, ends.b.u];
  return (
    <div className={`grid grid-cols-2 divide-x divide-line ${className}`}>
      <svg ref={measureTop} viewBox={TOP.join(' ')} role="img" aria-label={label} className="block h-auto w-full">
        <WorkHatch id={`${id}t`} />
        {/* The part's top hatched, a lower step paler, the table beside it bare. */}
        {regions.filter(([, , level]) => level > -30).map(([lo, hi, level]) => {
          const [x0, y0] = at(lo, -80);
          const [x1, y1] = at(hi, 80);
          return <rect key={lo} x={Math.min(x0, x1)} y={Math.min(y0, y1)} width={Math.abs(x1 - x0)} height={Math.abs(y1 - y0)} fill={`url(#${id}t${level < 0 ? 'far' : ''})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />;
        })}
        {Object.entries(ends).map(([end, one]) => {
          const [x, y] = at(one.u);
          const round = one.part.startsWith('circle');
          const [tx, ty] = round ? [x - 18, y - 30] : at(one.u, -74);
          return (
            <g key={end}>
              {one.part === 'circle-inside' ? <circle cx={x} cy={y} r={HOLE_R} className="fill-field stroke-line" strokeWidth={1.5} vectorEffect={NS} /> : null}
              {one.part === 'circle-outside' ? <circle cx={x} cy={y} r={STUD_R} fill={`url(#${id}t)`} className="stroke-mut" strokeWidth={1.5} vectorEffect={NS} /> : null}
              {round ? <path d={`M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4}`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} /> : null}
              <Tag x={tx} y={ty} text={t(END_KEYS[end])} size={top} />
            </g>
          );
        })}
        {name === 'jog' ? <Motion axis={flat ? ACROSS : ALONG} at={-AWAY} from={ends.a.start.u} to={ends.b.start.u} kind={RAPID} size={top} /> : null}
        {name === 'end' ? (
          <>
            <Dimension axis={flat ? ACROSS : ALONG} at={AWAY} from={from} to={to} lit size={top} />
            {/* Under the measure across X; down Y beside it, ending at it, clear of the ball on the line. */}
            <Tag x={flat ? (from + to) / 2 - 40 : AWAY - 8} right={!flat} y={flat ? AWAY + 14 : (from + to) / 2 - 10} text={t(MEASURE_KEYS[layout.kind])} face={FACE.hot} size={top} />
          </>
        ) : null}
        <circle cx={bx} cy={by} r={r} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />
      </svg>
      <svg ref={measureSide} viewBox={SIDE.join(' ')} role="img" aria-label={label} className="block h-auto w-full">
        <WorkHatch id={`${id}s`} />
        <path d={sideWork} fill={`url(#${id}s)`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        {ways.map((way) => <Motion key={`${way.axis}${way.at}`} axis={way.axis} at={way.at} from={way.from} to={way.to} kind={RAPID} size={side} />)}
        {/* In section: the ball in a hole is seen, as the features' own side views draw it. */}
        <path d={`M${u} ${SIDE[1]} V${-(h + 2 * BALL_R)}`} className="stroke-ink" strokeWidth={2} vectorEffect={NS} />
        <circle cx={u} cy={-(h + BALL_R)} r={BALL_R} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />
      </svg>
    </div>
  );
};

export default PairOverview;
