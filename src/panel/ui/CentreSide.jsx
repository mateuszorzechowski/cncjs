import { useId } from 'react';
import {
  AxisPair, Contact, axisRects, DASH, DIM_TICK, Dimension, FACE, MOTION_TICK, Motion, NS, ReachDimension, Tag, WorkHatch, kit,
} from './probeDraw';
import {
  lineRect, placeTags, shownView, tagRect,
} from './probeLabels';
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

const CentreSide = ({
  part, along, r, hidden = false, h, motion = null, gap = null, vdims = [], contact = null, zero = 0, focus = null, bare = false, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k, box] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const fade = (one) => (focus && focus !== one ? 0.3 : 1);
  // Up the drawing is up the machine: a height is drawn negative.
  const cy = -(h + r);
  // What a label keeps off (L15, L16, L25): X0's line, the stylus and the ball down to the lowest this move
  // takes them, every arrow and dimension
  // but its own column, and the labels placed before it.
  const lines = [
    motion && { at: motion.at - ASIDE, rect: lineRect(ALONG, motion.at - ASIDE, -motion.from, -motion.to, MOTION_TICK) },
    ...vdims.map((dim) => ({ at: dim.at, rect: lineRect(ALONG, dim.at, -dim.from, -dim.to, DIM_TICK) })),
    gap && { at: gap.at, rect: lineRect(ALONG, gap.at, -gap.from, -gap.to, DIM_TICK) },
  ].filter(Boolean);
  const lowest = Math.max(cy + r, ...(motion ? [-motion.from, -motion.to] : []));
  const fixed = [[along - r, VIEW[1], 2 * r, lowest - VIEW[1]], ...axisRects(VIEW[0], VIEW[1] + VIEW[3], size), ...(zero > 0 ? [[-1, VIEW[1], 2, VIEW[3]]] : [])];
  const taken = [];
  // A line's figures up and down the drawing, placed by the one rule (`placeTags`); the lines in its own column
  // are its own (a split way's parts), the rest it keeps off.
  const place = (line) => {
    const avoid = [...fixed, ...lines.filter((one) => one.at !== line.at).map((one) => one.rect), ...taken];
    const placed = bare ? [] : placeTags({
      ...line, view: shownView(VIEW, k, box), avoid, size,
    });
    taken.push(...placed.map(tagRect));
    return placed;
  };
  const words = (line, lit) => place(line).map((tag) => (
    <Tag key={tag.text} x={tag.x} y={tag.y} text={tag.text} face={lit ? FACE.hot : FACE.plain} size={size} />
  ));

  // A Z move's arrow left of the ball, its feed beside it; the distances stand on the right.
  let arrow = null;
  if (motion) {
    const at = motion.at - ASIDE;
    arrow = (
      <g opacity={motion.kind === 'rapid' ? 1 : fade('feed')}>
        <Motion axis={ALONG} at={at} from={-motion.from} to={-motion.to} kind={motion.kind} size={size} />
        {words({
          at, side: -1, parts: [[-motion.from, -motion.to, motion.text]], ticks: [[-motion.from, MOTION_TICK]],
        }, motion.lit)}
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
          {words({
            at: dim.at,
            parts: dim.mid === undefined ? [[-dim.from, -dim.to, dim.text]] : [[-dim.from, -dim.mid, dim.text], [-dim.mid, -dim.to, dim.far]],
            ticks: [dim.from, dim.mid, dim.to].filter((a) => a !== undefined).map((a) => [-a, DIM_TICK]),
          }, dim.lit)}
        </g>
      ))}
      {gap ? (
        <g>
          <Dimension axis={ALONG} at={gap.at} from={-gap.from} to={-gap.to} size={size} />
          {/* Away from the middle, where the drawing has room. */}
          {words({
            at: gap.at, side: gap.at > 0 ? 1 : -1, parts: [[-gap.from, -gap.to, t(gap.key)]], ticks: [[-gap.from, DIM_TICK], [-gap.to, DIM_TICK]],
          }, false)}
        </g>
      ) : null}
      {arrow}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.zPlus')} size={size} />
    </svg>
  );
};

export default CentreSide;
