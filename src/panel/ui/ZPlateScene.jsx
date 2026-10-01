import { useId } from 'react';
import {
  Alarm, Contact, DASH, Dimension, FACE, Motion, NS, SurfaceGround, Tag, kit,
} from './probeDraw';
import useViewScale from './useViewScale';
import { TOP } from '../machine/probeCycle';
import { t } from '../i18n';

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
  const [measure, k] = useViewScale(WIDTH, HEIGHT);
  const size = kit(k);
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);
  const tip = TOP - gap;
  const x = TOOL_X + shift;
  const small = dim && dim.bottom - dim.top < 24;
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
          <Dimension at={DIM_X} from={dim.limit ? dim.top : dim.top} to={dim.bottom} limit={dim.limit} lit={focus === 'dim'} size={size} />
          <Tag x={DIM_X + 8} y={small ? dim.top - 12 : (dim.top + dim.bottom) / 2} text={dim.text} face={focus === 'dim' ? FACE.hot : FACE.plain} size={size} />
          {dim.beyond ? (
            <>
              <Dimension at={DIM_X} from={dim.beyond.top} to={dim.beyond.bottom} limit lit={focus === 'dim'} size={size} />
              <Tag x={DIM_X + 8} y={(dim.beyond.top + dim.beyond.bottom) / 2 + 4} text={dim.beyond.text} face={focus === 'dim' ? FACE.hot : FACE.plain} size={size} />
            </>
          ) : null}
        </g>
      ) : null}
      {motion ? (
        <g opacity={fade('feed')}>
          <Motion at={ARROW_X + shift} from={motion.from} to={motion.to} kind={motion.kind} size={size} />
          {feedTag ? (
            <Tag
              x={ARROW_X + shift - 8}
              y={Math.abs(motion.to - motion.from) < 30 ? Math.min(motion.from, motion.to) - 12 : (motion.from + motion.to) / 2}
              text={motion.feed}
              right
              face={focus === 'feed' ? FACE.hot : FACE.plain}
              size={size}
            />
          ) : null}
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
