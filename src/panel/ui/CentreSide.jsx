import { useId } from 'react';
import {
  AxisPair, Contact, DASH, Dimension, FACE, Motion, NS, ReachDimension, Tag, WorkHatch, kit, tagWidth,
} from './probeDraw';
import useViewScale from './useViewScale';
import { t } from '../i18n';

/**
 * A centre from the front (review notes, 2026-10-01: *"rzut z boku"*,
 * *"nie zmieniaj osi, tylko pokaż ruch osi Y w głębi"*): always along X, Z
 * up. A part touched from outside a faint hatch; a hole cut through, its far
 * wall paler, the ball in it seen. No table: no other drawing has one
 * (review note, 2026-10-01).
 * The 3D probe's stylus and ball: a way along Y goes into the drawing, the
 * ball larger nearer, smaller further, dashed while something hides it. A
 * move's arrow with its feed over the ball, a figure's dimension beside or
 * under it with its words, a touch green, X0 when written.
 *
 * Everything comes from the cycle's `side`: along X in the drawing's units,
 * up as the ball's height over the top; `part` is the cycle's; `gap`, on
 * the way into place, the few millimetres it is said with. `bare`: without
 * the form's figures.
 */

const VIEW = [-101, -110, 202, 188];
// The work runs out at the drawing's foot.
const FOOT = VIEW[1] + VIEW[3];
// How deep a hole is drawn.
const HOLE_DEPTH = 46;
const ALONG = 'v';
const BOSS = 'boss';
// Beside the ball, where its arrow goes: a way across over it, a way up or down to its left.
const ASIDE = 16;
// A dimension's words beside its line, clear of its ticks.
const BESIDE = 13;

const CentreSide = ({
  part, along, r, hidden = false, h, motion = null, gap = null, vdims = [], contact = null, zero = 0, focus = null, bare = false, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const fade = (one) => (focus && focus !== one ? 0.3 : 1);
  // Up the drawing is up the machine: a height is drawn negative.
  const cy = -(h + r);
  const right = VIEW[0] + VIEW[2] - 2;
  const left = VIEW[0] + 2;
  // Words from `x` rightwards, or leftwards (`toLeft`) — kept inside the drawing whatever its size (review note, 2026-10-01: *"są ucinane"*).
  const words = (x, y, text, lit, toLeft = false) => {
    if (bare || !text) {
      return null;
    }
    const w = tagWidth(text, size.fs);
    const at = Math.max(left, Math.min(right - w, toLeft ? x - w : x));
    return <Tag x={at} y={y} text={text} face={lit ? FACE.hot : FACE.plain} size={size} />;
  };
  // A vertical dimension's words: beside its line, away from the middle, where the drawing has room.
  const besideV = (at, y, text, lit) => (at > 0 ? words(at + BESIDE, y, text, lit) : words(at - BESIDE, y, text, lit, true));

  // A Z move's arrow left of the ball, its feed beside it; the distances stand on the right.
  let arrow = null;
  if (motion) {
    const at = motion.at - ASIDE;
    arrow = (
      <g opacity={motion.kind === 'rapid' ? 1 : fade('feed')}>
        <Motion axis={ALONG} at={at} from={-motion.from} to={-motion.to} kind={motion.kind} size={size} />
        {words(at - 6, -(motion.from + motion.to) / 2, motion.text, motion.lit, true)}
      </g>
    );
  }

  const boss = part.kind === BOSS;
  return (
    <svg ref={measure} viewBox={VIEW.join(' ')} role="img" aria-label={label} className={`block ${className}`}>
      <WorkHatch id={id} />
      {boss ? (
        <path d={`M${-part.r} ${FOOT} V0 H${part.r} V${FOOT}`} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
      ) : (
        <>
          <rect x={VIEW[0] - 2} y={0} width={VIEW[2] + 4} height={FOOT + 2} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
          {/* The hole cut through, its far wall further back (review note, 2026-10-01: *"otwór jest w przekroju i narzędzie jest widoczne"*). */}
          <path d={`M${-part.r} 0 V${HOLE_DEPTH} H${part.r} V0 Z`} fill={`url(#${id}far)`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        </>
      )}
      {zero > 0 ? (
        <g opacity={zero}>
          <path d={`M0 ${VIEW[1]} V${FOOT}`} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
          <text x={4} y={VIEW[1] + size.fs + 4} fontSize={size.fs} className="fill-acc font-num font-semibold">{t('probe.corner.zeroX')}</text>
        </g>
      ) : null}
      {/* What hides the ball dashes the stylus under the top and the ball, seen through it. */}
      <path d={`M${along} ${VIEW[1]} V${hidden ? Math.min(0, cy - r) : cy - r}`} className="stroke-ink" strokeWidth={2} vectorEffect={NS} />
      {hidden ? (
        <>
          {cy - r < 0 ? null : <path d={`M${along} 0 V${cy - r}`} className="stroke-ink" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />}
          <circle cx={along} cy={cy} r={r} fill="none" className="stroke-ink" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
        </>
      ) : <circle cx={along} cy={cy} r={r} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />}
      {contact ? <Contact x={contact[0]} y={-contact[1]} size={size} /> : null}
      {/* Arrows, dimensions and their words over the stylus and the ball, never under them (review note, 2026-10-01: *"strzałki i etykiety są zakryte"*). */}
      {/* Up and down the drawing, as the Z plate's: a way, or a limit dashed, its words beside it. */}
      {vdims.map((dim) => (
        <g key={dim.id} opacity={fade(dim.lit ? dim.id : 'retract')}>
          {dim.mid === undefined ? (
            <Dimension axis={ALONG} at={dim.at} from={-dim.from} to={-dim.to} limit={dim.limit} lit={dim.lit} size={size} />
          ) : (
            // A slow touch's reach: one line, its way to the top and the margin past it.
            <ReachDimension axis={ALONG} at={dim.at} from={-dim.from} mid={-dim.mid} to={-dim.to} lit={dim.lit} size={size} />
          )}
          {/* Right of the line, away from the arrow on the ball's left (review note, 2026-10-01: "10 mm" lay on the arrow). */}
          {words(dim.at + BESIDE, -(dim.from + (dim.mid ?? dim.to)) / 2, dim.text, dim.lit)}
          {dim.mid === undefined ? null : words(dim.at + BESIDE, -(dim.mid + dim.to) / 2, dim.far, dim.lit)}
        </g>
      ))}
      {gap ? (
        <g>
          <Dimension axis={ALONG} at={gap.at} from={-gap.from} to={-gap.to} size={size} />
          {besideV(gap.at, -(gap.from + gap.to) / 2, t(gap.key), false)}
        </g>
      ) : null}
      {arrow}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.zPlus')} size={size} />
    </svg>
  );
};

export default CentreSide;
