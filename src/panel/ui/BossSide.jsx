import { useId } from 'react';
import {
  AxisPair, Contact, DASH, Dimension, FACE, Motion, NS, Tag, kit, tagWidth,
} from './probeDraw';
import useViewScale from './useViewScale';
import { BOSS_R } from '../machine/bossMoves';
import { t } from '../i18n';

/**
 * The part touched from outside, from the front (review notes, 2026-10-01):
 * always along X, the part standing on the table, a faint hatch; the 3D
 * probe's stylus and ball over it, out beside a side, down by the depth, in
 * to the touch and up. A way along Y goes into the drawing — the ball larger
 * nearer, smaller further, dashed while the part hides it. A move's arrow
 * with its feed, the depth as a dimension, a touch green, X0 when written.
 *
 * Everything comes from `bossSide`: along X in the drawing's units, up as
 * the ball's height over the top. `bare`: without the form's figures.
 */

const VIEW = [-101, -110, 202, 188];
const TABLE = 60;
const USER = 'userSpaceOnUse';
const SLANT = 'rotate(45)';
const ACROSS = 'h';
const ALONG = 'v';
// Beside the ball, where its arrow goes: a way across over it, a way up or down to its left.
const ASIDE = 16;

const BossSide = ({
  along, r, hidden = false, h, motion = null, depth = null, contact = null, zero = 0, focus = null, bare = false, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);
  // Up the drawing is up the machine: a height is drawn negative.
  const cy = -(h + r);
  const words = (x, y, text, lit, right = false) => (bare || !text ? null : (
    <Tag x={right ? x - tagWidth(text, size.fs) : x} y={y} text={text} face={lit ? FACE.hot : FACE.plain} size={size} />
  ));

  let arrow = null;
  if (motion) {
    const flat = motion.dir === 'h';
    const at = flat ? -(motion.at + r) - ASIDE : motion.at - ASIDE;
    const [from, to] = flat ? [motion.from, motion.to] : [-motion.from, -motion.to];
    arrow = (
      <g opacity={motion.kind === 'rapid' ? 1 : fade(motion.lit ? 'feed' : 'dim')}>
        <Motion axis={flat ? ACROSS : ALONG} at={at} from={from} to={to} kind={motion.kind} size={size} />
        {flat ? words((from + to) / 2 - tagWidth(motion.text || '', size.fs) / 2, at - 10, motion.text, motion.lit) : words(at - 6, (from + to) / 2, motion.text, motion.lit, true)}
      </g>
    );
  }

  return (
    <svg ref={measure} viewBox={VIEW.join(' ')} role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={id} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <rect width={7} height={7} className="fill-work" />
          <path d="M0 0 V7" className="stroke-hatch" strokeWidth={1} />
        </pattern>
      </defs>
      <rect x={VIEW[0]} y={TABLE} width={VIEW[2]} height={VIEW[1] + VIEW[3] - TABLE} className="fill-mutS stroke-line" strokeWidth={1.5} vectorEffect={NS} />
      <rect x={-BOSS_R} y={0} width={2 * BOSS_R} height={TABLE} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
      {zero > 0 ? (
        <g opacity={zero}>
          <path d={`M0 ${VIEW[1]} V${TABLE}`} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
          <text x={4} y={VIEW[1] + size.fs + 4} fontSize={size.fs} className="fill-acc font-num font-semibold">{t('probe.corner.zeroX')}</text>
        </g>
      ) : null}
      {depth ? (
        <g opacity={fade('depth')}>
          <Dimension axis={ALONG} at={depth.at} from={0} to={-cy} lit={depth.lit} size={size} />
          {/* Over the top, against the drawing's edge: beside the line there is no room. */}
          {words(depth.at > 0 ? VIEW[0] + VIEW[2] - 2 : VIEW[0] + 2, -10, depth.text, depth.lit, depth.at > 0)}
        </g>
      ) : null}
      {arrow}
      {/* Behind the part the stylus under its top and the ball are dashed, seen through it. */}
      <path d={`M${along} ${VIEW[1]} V${hidden ? 0 : cy - r}`} className="stroke-ink" strokeWidth={2} vectorEffect={NS} />
      {hidden ? (
        <>
          <path d={`M${along} 0 V${cy - r}`} className="stroke-ink" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
          <circle cx={along} cy={cy} r={r} fill="none" className="stroke-ink" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
        </>
      ) : <circle cx={along} cy={cy} r={r} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />}
      {contact ? <Contact x={contact[0]} y={-contact[1]} size={size} /> : null}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.zPlus')} size={size} />
    </svg>
  );
};

export default BossSide;
