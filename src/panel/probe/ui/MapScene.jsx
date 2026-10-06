import { useId } from 'react';
import {
  Alarm, Contact, DASH, contactRect, DIM_TICK, Dimension, FACE, MOTION_TICK, Motion, NS, ReachDimension, Tag, WorkHatch, kit,
} from './probeDraw';
import { placeTags, shownView } from './probeLabels';
import useViewScale from './useViewScale';
import {
  P1, P2, slopeAt, surfaceAt,
} from '../machine/mapCycle';
import { t } from '../../i18n/index';

/**
 * A height map's moves side-on (Mateusz, 2026-10-02): the board, bowed a
 * little, its two points, and the tool — a V bit — touching the first and
 * going on to the second, drawn by the probe drawings' rules (`probeDraw`):
 * the move's arrow left of the tool, its dimension right of it, a touch
 * green. Everything comes from `mapScene`.
 */

// Across: the arrow of a move from one point to the next.
const ACROSS = 'h';

const WIDTH = 340;
const HEIGHT = 180;
// The arrow this far left of the tool, the dimension this far right.
const ARROW = -28;
const DIM = 30;

const board = () => {
  const top = [];
  for (let x = 10; x <= WIDTH - 10; x += 10) {
    top.push(`${x === 10 ? 'M' : 'L'}${x} ${Math.round(surfaceAt(x) * 100) / 100}`);
  }
  return `${top.join(' ')} V${HEIGHT} H10 Z`;
};

/** What touches, its point at (`x`, `tip`): a 60° V bit, or a 3D probe (review note #4, 2026-10-02). */
export const MapTool = ({ x, tip, tool = 'board' }) => (tool === 'probe' ? (
  // Its body, the stylus and the ball.
  <g>
    <path d={`M${x - 9} ${tip - 66} H${x + 9} V${tip - 40} L${x + 5} ${tip - 34} H${x - 5} L${x - 9} ${tip - 40} Z`} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" vectorEffect={NS} />
    <path d={`M${x} ${tip - 34} V${tip - 10}`} className="stroke-ink" strokeWidth={2} vectorEffect={NS} />
    <circle cx={x} cy={tip - 5} r={5} className="fill-field stroke-ink" strokeWidth={2} vectorEffect={NS} />
  </g>
) : (
  // 16 wide: its point is 12 long.
  <path d={`M${x - 8} ${tip - 64} H${x + 8} V${tip - 12} L${x} ${tip} L${x - 8} ${tip - 12} Z`} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" vectorEffect={NS} />
));

const MapScene = ({
  x, tip, dim = null, motion = null, plate = null, contact = false, ghost = false, alarm = false, measured = false, focus = null, tool = 'board', label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k, box] = useViewScale(WIDTH, HEIGHT);
  const size = kit(k);
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);
  const view = shownView([0, 0, WIDTH, HEIGHT], k, box);
  const avoid = [contactRect(x, surfaceAt(x), size)];
  const dimAt = dim ? dim.x + DIM : 0;
  const dimTags = placeTags({
    at: dimAt, parts: dim ? [[dim.top, dim.bottom, dim.text]] : [], ticks: dim ? [[dim.top, DIM_TICK], [dim.bottom, DIM_TICK]] : [], view, avoid, size,
  });
  const vertical = motion?.axis === 'v';
  const feedTags = placeTags({
    at: x + ARROW, side: -1, parts: vertical && motion.feed ? [[motion.from, motion.to, motion.feed]] : [], ticks: [[motion?.from, MOTION_TICK]], view, avoid, size,
  });
  return (
    <svg ref={measure} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className={`block ${className}`}>
      <WorkHatch id={id} />
      {ghost ? (
        // Not there: the limit is what the probe does with nothing to touch.
        <path d={board()} fill="none" className="stroke-mut" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} opacity={0.6} />
      ) : (
        <path d={board()} fill={`url(#${id})`} className="stroke-plateEdge" strokeWidth={1.5} vectorEffect={NS} />
      )}
      {/* The grid's two points on the board: the first filled once measured. */}
      {[P1, P2].map((at, n) => (
        <circle key={at} cx={at} cy={surfaceAt(at)} r={3.2 / k} className={n === 0 && measured ? 'fill-acc stroke-acc' : 'fill-panel stroke-acc'} strokeWidth={1.2} vectorEffect={NS} />
      ))}
      {/* The Z plate where it lies: on the board under its middle, tipped as the board is there. */}
      {plate ? (
        <rect
          x={plate.x - plate.w / 2}
          y={surfaceAt(plate.x) - plate.h}
          width={plate.w}
          height={plate.h}
          transform={`rotate(${slopeAt(plate.x)} ${plate.x} ${surfaceAt(plate.x)})`}
          className="fill-plate stroke-plateEdge"
          strokeWidth={2}
          vectorEffect={NS}
        />
      ) : null}
      {dim ? (
        <g opacity={fade('dim')}>
          {dim.mid !== null ? (
            <ReachDimension at={dimAt} from={dim.top} mid={dim.mid} to={dim.bottom} lit={focus === 'dim'} size={size} />
          ) : (
            <Dimension at={dimAt} from={dim.top} to={dim.bottom} limit={dim.limit} lit={focus === 'dim'} size={size} />
          )}
          {dimTags.map((tag) => <Tag key={tag.text} x={tag.x} y={tag.y} text={tag.text} face={focus === 'dim' ? FACE.hot : FACE.plain} size={size} />)}
        </g>
      ) : null}
      {motion ? (
        <g opacity={fade('feed')}>
          {vertical ? (
            <Motion at={x + ARROW} from={motion.from} to={motion.to} kind={motion.kind} size={size} />
          ) : (
            // Across, over the tool's way — or the plate's, by hand, over it.
            <Motion axis={ACROSS} at={motion.y ?? tip - 76} from={motion.from} to={motion.to} kind={motion.kind} size={size} />
          )}
          {feedTags.map((tag) => <Tag key={tag.text} x={tag.x} y={tag.y} text={tag.text} face={focus === 'feed' ? FACE.hot : FACE.plain} size={size} />)}
        </g>
      ) : null}
      <MapTool x={x} tip={tip} tool={tool} />
      {contact ? <Contact x={x} y={tip} size={size} /> : null}
      {alarm ? <Alarm x={x} y={tip} text={t('probe.cycle.alarm')} size={size} /> : null}
    </svg>
  );
};

export default MapScene;
