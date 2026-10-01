import { useId } from 'react';
import {
  AxisPair, Contact, DASH, Dimension, FACE, Head, Motion, NS, Tag, kit, tagWidth,
} from './probeDraw';
import useViewScale from './useViewScale';
import { HOLE_R, TOOL_R } from '../machine/holeCycle';
import { t } from '../i18n';

/**
 * The hole from above, drawn by the probe proposals' rule (Claude Design,
 * 2026-09-30): the work a faint hatch, the hole cut out of it, the tool a
 * circle — larger the higher it stands, as the corner draws height. A touch's
 * arrow with its feed on one side, the search's limit as a dashed dimension
 * with the hole's size on the other; the walls this pass has touched, the
 * middle of a pair once the tool is there, X0 and Y0 when written.
 *
 * Everything comes from `holeScene` (or `positionAt`), in the drawing's units
 * with the hole's centre at the origin and Y up. `bare`: without the form's
 * figures (the machine measuring).
 */

// The Z plate's shape, so the two Setups stand as tall at any width.
const VIEW = [-202, -94, 404, 188];
const USER = 'userSpaceOnUse';
const SLANT = 'rotate(45)';
// The arrow on one side of the tool's way, the dimension on the other.
const ASIDE = 22;
const ACROSS = 'h';
const ALONG = 'v';
const WAY = { left: 'left', right: 'right' };
// SVG's word for text ending at its x.
const END = 'end';

// How much larger the tool is drawn up high than down in the hole (review note, 2026-10-01: *"większa różnica rozmiaru"*).
const HIGH = 1.2;

// Y up in the drawing's figures, down on the screen.
const sy = (y) => -y;

const HoleScene = ({
  tool, level = 0, motion = null, limit = null, touched = [], contact = null, centre = null, zero = 0, dia = null, focus = null,
  bare = false, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);
  const r = TOOL_R * (1 + HIGH * Math.max(0, level));
  const [cx, cy] = [tool[0], sy(tool[1])];
  // A figure's words, centred over `x` or right-aligned to it.
  const tag = (x, y, text, face, anchor = 'c') => {
    if (bare || !text) {
      return null;
    }
    const w = tagWidth(text, size.fs);
    return <Tag x={anchor === 'r' ? x - w : x - w / 2} y={y} text={text} face={face} size={size} />;
  };

  let arrow = null;
  if (motion) {
    const flat = motion.axis === 'x';
    const at = flat ? sy(motion.from[1]) - ASIDE : motion.from[0] - ASIDE;
    const [from, to] = flat ? [motion.from[0], motion.to[0]] : [sy(motion.from[1]), sy(motion.to[1])];
    const face = motion.lit ? FACE.hot : FACE.plain;
    arrow = (
      <g opacity={motion.kind === 'rapid' ? 1 : fade('feed')}>
        <Motion axis={flat ? ACROSS : ALONG} at={at} from={from} to={to} kind={motion.kind} size={size} />
        {motion.feed ? (flat ? tag((from + to) / 2, at - 12, motion.feed, face) : tag(at - 8, (from + to) / 2, motion.feed, face, 'r')) : null}
      </g>
    );
  }

  let fence = null;
  if (limit) {
    const flat = limit.axis === 'x';
    const at = flat ? sy(limit.from[1]) + ASIDE : limit.from[0] + ASIDE;
    const [from, to] = flat ? [limit.from[0], limit.to[0]] : [sy(limit.from[1]), sy(limit.to[1])];
    const face = limit.lit ? FACE.hot : FACE.plain;
    fence = (
      <g opacity={fade('dim')}>
        <Dimension axis={flat ? ACROSS : ALONG} at={at} from={from} to={to} limit lit={limit.lit} size={size} />
        {/* Down the drawing, the words stand beside the line rather than over it. */}
        {flat ? tag((from + to) / 2, at + 12, limit.text, face) : null}
        {!flat && !bare ? <Tag x={at + 8} y={(from + to) / 2} text={limit.text} face={face} size={size} /> : null}
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
      <rect x={VIEW[0]} y={VIEW[1]} width={VIEW[2]} height={VIEW[3]} fill={`url(#${id})`} />
      <circle r={HOLE_R} className="fill-mutS stroke-line" strokeWidth={1.5} vectorEffect={NS} />
      {zero > 0 ? (
        <g opacity={zero}>
          <path d={`M0 ${VIEW[1]} V${VIEW[1] + VIEW[3]} M${VIEW[0]} 0 H${VIEW[0] + VIEW[2]}`} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
          <text x={6} y={VIEW[1] + size.fs + 4} fontSize={size.fs} className="fill-acc font-num font-semibold">{t('probe.corner.zeroX')}</text>
          <text x={VIEW[0] + VIEW[2] - 6} y={-6} textAnchor={END} fontSize={size.fs} className="fill-acc font-num font-semibold">{t('probe.corner.zeroY')}</text>
        </g>
      ) : null}
      {fence}
      {arrow}
      {/* The walls touched before, still: the one under way beats. */}
      {touched.map(([x, y]) => <circle key={`${x} ${y}`} cx={x} cy={sy(y)} r={3 / k} className="fill-grn" opacity={0.6} />)}
      {centre ? <path d={`M${centre[0] - 6} ${sy(centre[1])} H${centre[0] + 6} M${centre[0]} ${sy(centre[1]) - 6} V${sy(centre[1]) + 6}`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} /> : null}
      <circle cx={cx} cy={cy} r={r} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />
      {contact ? <Contact x={contact[0]} y={sy(contact[1])} size={size} /> : null}
      {dia && !bare ? (
        <g opacity={dia.lit ? 1 : dia.fade * fade('dim')}>
          <path d={`M${cx - r} ${cy + r + 4} V${cy + r + 14} M${cx + r} ${cy + r + 4} V${cy + r + 14}`} className={dia.lit ? 'stroke-acc' : 'stroke-mut'} strokeWidth={1} vectorEffect={NS} />
          <Head x={cx - r} y={cy + r + 9} dir={WAY.right} size={size} className={dia.lit ? 'fill-acc' : 'fill-mut'} />
          <Head x={cx + r} y={cy + r + 9} dir={WAY.left} size={size} className={dia.lit ? 'fill-acc' : 'fill-mut'} />
          {tag(cx - r - 18, cy + r + 9, dia.text, dia.lit ? FACE.hot : FACE.plain, 'r')}
        </g>
      ) : null}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.yPlus')} size={size} />
    </svg>
  );
};

export default HoleScene;
