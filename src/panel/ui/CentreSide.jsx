import { useId } from 'react';
import {
  AxisPair, Contact, DASH, Dimension, FACE, Motion, NS, Tag, kit, tagWidth,
} from './probeDraw';
import useViewScale from './useViewScale';
import { t } from '../i18n';

/**
 * A centre from the front (review notes, 2026-10-01: *"rzut z boku"*,
 * *"nie zmieniaj osi, tylko pokaż ruch osi Y w głębi"*): always along X, Z
 * up. A part touched from outside a faint hatch, a hole going down into the
 * work, its walls dashed — the work in front hides them. No table: no other
 * drawing has one (review note, 2026-10-01).
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
const USER = 'userSpaceOnUse';
const SLANT = 'rotate(45)';
const ACROSS = 'h';
const ALONG = 'v';
const BOSS = 'boss';
// Beside the ball, where its arrow goes: a way across over it, a way up or down to its left.
const ASIDE = 16;
// A tag's words, from a dimension's line.
const OFF = 12;

const CentreSide = ({
  part, along, r, hidden = false, h, motion = null, depth = null, gap = null, dims = [], contact = null, zero = 0, focus = null, bare = false, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const fade = (one) => (focus && focus !== one ? 0.3 : 1);
  // Up the drawing is up the machine: a height is drawn negative.
  const cy = -(h + r);
  const right = VIEW[0] + VIEW[2] - 2;
  const left = VIEW[0] + 2;
  const words = (x, y, text, lit, toLeft = false) => (bare || !text ? null : (
    <Tag x={toLeft ? x - tagWidth(text, size.fs) : x} y={y} text={text} face={lit ? FACE.hot : FACE.plain} size={size} />
  ));
  // Words centred on `x`, kept inside the drawing.
  const centred = (x, y, text, lit) => {
    if (!text) {
      return null;
    }
    const w = tagWidth(text, size.fs);
    return words(Math.max(left, Math.min(right - w, x - w / 2)), y, text, lit);
  };
  // A vertical dimension's words: beside its line, away from the middle, where the drawing has room.
  const besideV = (at, y, text, lit) => (at > 0 ? words(at + OFF, y, text, lit) : words(at - OFF, y, text, lit, true));

  let arrow = null;
  if (motion) {
    const flat = motion.dir === 'h';
    const at = flat ? -(motion.at + r) - ASIDE : motion.at - ASIDE;
    const [from, to] = flat ? [motion.from, motion.to] : [-motion.from, -motion.to];
    arrow = (
      <g opacity={motion.kind === 'rapid' ? 1 : fade(motion.lit ? 'feed' : 'dim')}>
        <Motion axis={flat ? ACROSS : ALONG} at={at} from={from} to={to} kind={motion.kind} size={size} />
        {flat ? centred((from + to) / 2, at - 10, motion.text, motion.lit) : words(at - 6, (from + to) / 2, motion.text, motion.lit, true)}
      </g>
    );
  }

  const boss = part.kind === BOSS;
  return (
    <svg ref={measure} viewBox={VIEW.join(' ')} role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={id} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <rect width={7} height={7} className="fill-work" />
          <path d="M0 0 V7" className="stroke-hatch" strokeWidth={1} />
        </pattern>
        {/* Paler and closer: the work behind the hole, further back in the drawing (review notes, 2026-10-01). */}
        <pattern id={`${id}b`} width={5} height={5} patternUnits={USER} patternTransform={SLANT}>
          <rect width={5} height={5} className="fill-work" />
          <path d="M0 0 V5" className="stroke-hatch" strokeOpacity={0.4} strokeWidth={1} />
        </pattern>
      </defs>
      {boss ? (
        <path d={`M${-part.r} ${FOOT} V0 H${part.r} V${FOOT}`} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
      ) : (
        <>
          <rect x={VIEW[0] - 2} y={0} width={VIEW[2] + 4} height={FOOT + 2} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
          {/* The hole behind the work in front: its walls dashed, the work beyond it paler and closer hatched. */}
          <path d={`M${-part.r} 0 V${HOLE_DEPTH} H${part.r} V0 Z`} fill={`url(#${id}b)`} className="stroke-mut" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
        </>
      )}
      {zero > 0 ? (
        <g opacity={zero}>
          <path d={`M0 ${VIEW[1]} V${FOOT}`} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
          <text x={4} y={VIEW[1] + size.fs + 4} fontSize={size.fs} className="fill-acc font-num font-semibold">{t('probe.corner.zeroX')}</text>
        </g>
      ) : null}
      {dims.map((dim) => (
        <g key={dim.id} opacity={fade(dim.id)}>
          <Dimension axis={ACROSS} at={-dim.at} from={dim.from} to={dim.to} lit={dim.lit} size={size} />
          {centred((dim.from + dim.to) / 2, -dim.at + OFF, dim.text, dim.lit)}
        </g>
      ))}
      {depth ? (
        <g opacity={fade('depth')}>
          <Dimension axis={ALONG} at={depth.at} from={0} to={cy} lit={depth.lit} size={size} />
          {besideV(depth.at, cy / 2, depth.text, depth.lit)}
        </g>
      ) : null}
      {gap ? (
        <g>
          <Dimension axis={ALONG} at={gap.at} from={-gap.from} to={-gap.to} size={size} />
          {besideV(gap.at, -(gap.from + gap.to) / 2, t(gap.key), false)}
        </g>
      ) : null}
      {arrow}
      {/* What hides the ball dashes the stylus under the top and the ball, seen through it. */}
      <path d={`M${along} ${VIEW[1]} V${hidden ? Math.min(0, cy - r) : cy - r}`} className="stroke-ink" strokeWidth={2} vectorEffect={NS} />
      {hidden ? (
        <>
          {cy - r < 0 ? null : <path d={`M${along} 0 V${cy - r}`} className="stroke-ink" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />}
          <circle cx={along} cy={cy} r={r} fill="none" className="stroke-ink" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
        </>
      ) : <circle cx={along} cy={cy} r={r} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />}
      {contact ? <Contact x={contact[0]} y={-contact[1]} size={size} /> : null}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.zPlus')} size={size} />
    </svg>
  );
};

export default CentreSide;
