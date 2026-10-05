import { useId } from 'react';
import {
  Alarm, Contact, DASH, contactRect, DIM_TICK, Dimension, FACE, MOTION_TICK, Motion, NS, ReachDimension, Tag, kit,
} from './probeDraw';
import { placeTags, shownView } from './probeLabels';
import { SurfaceGround, zeroLineY } from './SurfaceGround';
import useViewScale from './useViewScale';
import { TOP } from '../machine/probeCycle';
import { t } from '../../i18n/index';

/**
 * The Z plate side-on, as the proposal draws it (Claude Design,
 * `templates/probe-z-proposal`, 2026-09-30): cropped to the tool and the
 * plate; the work a faint hatch under a neutral plate; the tool an outline
 * (a 60° V bit); on the left the move's arrow — the accent for a probing
 * move, dashed rapid for a G0 — and on the right a grey dimension with the
 * figure from the form, dashed for a search limit. A touch is green, as on
 * the wire step, and beats (`Contact`).
 *
 * `focus` lights the part of the drawing the figure being set is (`dim` or
 * `feed`) and fades the other to 30%. Everything else comes from
 * `plateScene` (or `positionAt`): `gap` and `shift` place the tool, `dim`,
 * `motion`, `feedTag`, `zero`, `contact`, `ghost`, `alarm`.
 */

const WIDTH = 310;
// Deep enough for a search limit's end, 26 below the plate's top.
const HEIGHT = 190;
const USER = 'userSpaceOnUse';
const SLANT = 'rotate(45)';
// Where things stand across the drawing: the plate, the tool's axis, the
// move's arrow left of it and the dimension right of the plate.
const PLATE_X = 105;
const PLATE_W = 80;
const TOOL_X = 145;
const ARROW_X = 117;
const DIM_X = 200;

const ZPlateScene = ({
  gap = 84, shift = 0, dim = null, motion = null, feedTag = false, zero = 0, contact = false, ghost = false, alarm = false, focus = null,
  surface = undefined, stock = null, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k, box] = useViewScale(WIDTH, HEIGHT);
  const size = kit(k);
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);
  const tip = TOP - gap;
  const x = TOOL_X + shift;
  const view = shownView([0, 0, WIDTH, HEIGHT], k, box);
  // Never on Z0's line (L15).
  // Nor on where the tool touches the plate: the touch's ring.
  const avoid = [...(zero > 0 ? [[0, zeroLineY(TOP + 14, surface) - 1, WIDTH, 2]] : []), contactRect(x, TOP, size)];
  // The figures by the one rule (`placeTags`): the dimension's right of it, the feed left of its arrow.
  const dimTags = placeTags({
    at: DIM_X, parts: dim ? [[dim.top, dim.bottom, dim.text]] : [], ticks: dim ? [[dim.top, DIM_TICK], [dim.bottom, DIM_TICK]] : [], view, avoid, size,
  });
  const feedTags = placeTags({
    at: ARROW_X + shift, side: -1, parts: motion && feedTag ? [[motion.from, motion.to, motion.feed]] : [], ticks: [[motion?.from, MOTION_TICK]], view, avoid, size,
  });
  return (
    <svg ref={measure} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={id} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <rect width={7} height={7} className="fill-work" />
          <path d="M0 0 V7" className="stroke-hatch" strokeWidth={1} />
        </pattern>
      </defs>
      {/* The work, or the table with the work beside it, and Z0 on the surface chosen (`surface`). */}
      <SurfaceGround
        fill={`url(#${id})`}
        y={TOP + 14}
        width={WIDTH}
        surface={surface}
        zero={zero}
        label={t('probe.z0')}
        labelX={6}
        stock={stock ? { ...stock, fade: fade('stock') } : null}
        size={size}
      />
      {ghost ? (
        // Not there: the limit is what the probe does with nothing to touch.
        <rect x={PLATE_X} y={TOP} width={PLATE_W} height={14} fill="none" className="stroke-mut" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} opacity={0.6} />
      ) : (
        <rect x={PLATE_X} y={TOP} width={PLATE_W} height={14} className="fill-plate stroke-plateEdge" strokeWidth={2} vectorEffect={NS} />
      )}
      {dim ? (
        <g opacity={fade('dim')}>
          {/* A slow touch's reach one line past the plate, heads at its ends, a short tick at its top; else a dimension. */}
          {dim.mid !== null ? (
            <ReachDimension at={DIM_X} from={dim.top} mid={dim.mid} to={dim.bottom} lit={focus === 'dim'} size={size} />
          ) : (
            <Dimension at={DIM_X} from={dim.top} to={dim.bottom} limit={dim.limit} lit={focus === 'dim'} size={size} />
          )}
          {dimTags.map((tag) => <Tag key={tag.text} x={tag.x} y={tag.y} text={tag.text} face={focus === 'dim' ? FACE.hot : FACE.plain} size={size} />)}
        </g>
      ) : null}
      {motion ? (
        <g opacity={fade('feed')}>
          <Motion at={ARROW_X + shift} from={motion.from} to={motion.to} kind={motion.kind} size={size} />
          {feedTags.map((tag) => <Tag key={tag.text} x={tag.x} y={tag.y} text={tag.text} face={focus === 'feed' ? FACE.hot : FACE.plain} size={size} />)}
        </g>
      ) : null}
      {/* A 60° V bit, 16 wide: its point is 12 long. */}
      <path d={`M${x - 8} ${tip - 64} H${x + 8} V${tip - 12} L${x} ${tip} L${x - 8} ${tip - 12} Z`} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" vectorEffect={NS} />
      {contact ? <Contact x={x} y={TOP} size={size} /> : null}
      {alarm ? <Alarm x={x} y={tip} text={t('probe.cycle.alarm')} size={size} /> : null}
    </svg>
  );
};

export default ZPlateScene;
