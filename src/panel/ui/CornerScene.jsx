import { useId } from 'react';
import { cornerSides } from '../machine/cornerCycle';
import { t } from '../i18n';

/**
 * The L plate from above and from the side, as the design draws it (1f,
 * 2026-09-29), on one X axis: above, where the tool is, a dashed ring for how
 * high; below, how high, and the tip going down beside the wall. `at` is a
 * frame from `cornerAt`. The design draws the front-left corner; another
 * corner mirrors the geometry about the middle of the work, and the words are
 * placed where the mirrored corner puts them.
 *
 * Each view has room round it for the tool on every side, so a back corner —
 * whose Y probe comes from above the work — is not cut off (review note, the
 * same day). `badge`, `{ name, text }`, is a figure's value where it acts.
 */

// SVG's words for text anchored at its start and its end, and for the hatching.
const START = 'start';
const END = 'end';
const ON_VIEW = 'userSpaceOnUse';
const SLANT = 'rotate(45)';

// A 60° V bit side-on, its tip at the origin.
const BIT = 'M-10 -92 H10 V-17.3 L0 0 L-10 -17.3 Z';

// The views' widths, before the mirror: what a right corner turns x about.
const TOP_W = 510;
const SIDE_W = 520;

// Where each figure's value stands, drawn for front-left, in its view's own units.
const ANCHORS = {
  fast: ['side', 165, 104],
  maxZ: ['side', 165, 104],
  slow: ['side', 165, 104],
  retract: ['side', 165, 124],
  lift: ['side', 165, 70],
  cornerThickness: ['side', 196, 138],
  depth: ['side', 196, 176],
  clear: ['top', 16, 128],
  wallX: ['top', 4, 196],
  maxXY: ['top', 4, 196],
  toolDiameter: ['top', 160, 128],
  wallY: ['top', 160, 232],
};

const Contact = ({ at }) => <circle cx={at[0]} cy={at[1]} r={4.5} className="fill-amb" />;

/*
 * Dimensions, the Z plate's style (review note, 2026-09-29: *"nie pokazujesz
 * na animacji odległości, grubości jak dla płytki Z"*): extension lines, and
 * the arrows pointing in — from outside where the gap is too small for them
 * to fit between.
 */
// An arrowhead with its tip at (x, y), pointing along (dx, dy).
const Head = ({ x, y, dx = 0, dy = 0 }) => (
  <path
    d={`M${x - dx * 9 - dy * 5} ${y - dy * 9 - dx * 5} L${x} ${y} L${x - dx * 9 + dy * 5} ${y - dy * 9 + dx * 5} Z`}
    className="fill-acc"
  />
);

/** Between two heights `top` and `bottom` at `x`, extension lines from `from` to `to`. */
const Vertical = ({ x, top, bottom, from, to }) => {
  const inside = bottom - top > 24;
  return (
    <>
      <path d={`M${from} ${top} H${to} M${from} ${bottom} H${to}`} className="stroke-acc" fill="none" strokeWidth={1} />
      {inside ? (
        <>
          <path d={`M${x} ${top + 9} V${bottom - 9}`} className="stroke-acc" strokeWidth={2} />
          <Head x={x} y={top} dy={-1} />
          <Head x={x} y={bottom} dy={1} />
        </>
      ) : (
        <>
          <path d={`M${x} ${top - 18} V${top} M${x} ${bottom} V${bottom + 18}`} className="stroke-acc" strokeWidth={2} />
          <Head x={x} y={top} dy={1} />
          <Head x={x} y={bottom} dy={-1} />
        </>
      )}
    </>
  );
};

/** Between two places `left` and `right` across at `y`, extension lines from `from` to `to`. */
const Horizontal = ({ y, left, right, from, to }) => {
  const inside = right - left > 24;
  return (
    <>
      <path d={`M${left} ${from} V${to} M${right} ${from} V${to}`} className="stroke-acc" fill="none" strokeWidth={1} />
      {inside ? (
        <>
          <path d={`M${left + 9} ${y} H${right - 9}`} className="stroke-acc" strokeWidth={2} />
          <Head x={left} y={y} dx={-1} />
          <Head x={right} y={y} dx={1} />
        </>
      ) : (
        <>
          <path d={`M${left - 18} ${y} H${left} M${right} ${y} H${right + 18}`} className="stroke-acc" strokeWidth={2} />
          <Head x={left} y={y} dx={1} />
          <Head x={right} y={y} dx={-1} />
        </>
      )}
    </>
  );
};

/*
 * Each figure's dimension, drawn for front-left in its view's own units and
 * mirrored with the corner: from above the plate's walls stand 100–110 and
 * 210–220 about a work edged at 110 and 210; from the side its top is at
 * 150, the work's at 170.
 */
const DIMENSIONS = {
  cornerThickness: ['side', () => <Vertical x={204} top={150} bottom={170} from={192} to={214} />],
  depth: ['side', () => <Vertical x={36} top={150} bottom={186} from={28} to={100} />],
  lift: ['side', () => <Vertical x={176} top={110} bottom={150} from={150} to={186} />],
  retract: ['side', () => <Vertical x={176} top={142} bottom={150} from={150} to={186} />],
  clear: ['top', () => <Horizontal y={150} left={60} right={145} from={142} to={158} />],
  wallX: ['top', () => <Horizontal y={236} left={100} right={110} from={222} to={244} />],
  maxXY: ['top', () => <Horizontal y={236} left={100} right={110} from={222} to={244} />],
  wallY: ['top', () => <Vertical x={206} top={210} bottom={220} from={192} to={214} />],
  toolDiameter: ['top', ({ at }) => <Horizontal y={at.top[1] - 22} left={at.top[0] - 10} right={at.top[0] + 10} from={at.top[1] - 28} to={at.top[1] - 6} />],
};

const Badge = ({ x, y, text }) => (
  <g>
    <rect x={x} y={y} width={text.length * 8 + 18} height={24} rx={4} className="fill-accS stroke-acc" strokeWidth={1.5} />
    <text x={x + 9} y={y + 17} className="fill-acc font-num text-note font-semibold">{text}</text>
  </g>
);

/** A figure's value where it acts, mirrored with its corner; the text itself stays upright. */
const placed = (badge, flipX, flipY) => {
  const [view, x, y] = ANCHORS[badge.name] || [];
  if (!view) {
    return null;
  }
  const w = badge.text.length * 8 + 18;
  const mx = flipX ? (view === 'top' ? TOP_W : SIDE_W) - x - w : x;
  const my = flipY && view === 'top' ? 270 - y - 24 : y;
  return { view, x: mx, y: my };
};

const CornerScene = ({ corner, at, badge = null, label, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const { flipX, flipY } = cornerSides(corner);
  // Mirrors, in the scaled views' own coordinates: the work's middle is x 255,
  // y 135 from above and x 260 from the side.
  const topFlip = `translate(${flipX ? TOP_W : 0} ${flipY ? 270 : 0}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})`;
  const sideFlip = `translate(${flipX ? SIDE_W : 0} 0) scale(${flipX ? -1 : 1} 1)`;
  // Where the corner's zero is, and its words beside it, outside the work.
  const cornerX = flipX ? 400 : 110;
  const cornerY = flipY ? 60 : 210;
  const hatch = `hatch-${id}`;
  const touch = at.touch;
  const shown = badge ? placed(badge, flipX, flipY) : null;
  const [dimView, Dimension] = (badge && DIMENSIONS[badge.name]) || [];

  return (
    <svg viewBox="0 0 440 446" role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={hatch} patternUnits={ON_VIEW} width={8} height={8} patternTransform={SLANT}>
          <path d="M0 0 V8" className="stroke-acc" strokeWidth={1.2} opacity={0.6} />
        </pattern>
      </defs>

      <g transform="translate(36 20) scale(.8)">
        <g transform={topFlip}>
          <rect x={110} y={60} width={290} height={150} className="fill-mutS stroke-line" strokeWidth={1.5} />
          <rect x={100} y={130} width={90} height={90} className="fill-accS stroke-acc" strokeWidth={2} />
          <rect x={110} y={130} width={80} height={80} fill={`url(#${hatch})`} />
          <path d="M110 130 V210 H190" className="stroke-acc" fill="none" strokeWidth={1.2} strokeDasharray="4 3" />
          <g transform={`translate(${at.top[0]} ${at.top[1]})`}>
            <circle r={at.ring} className="stroke-mut" fill="none" strokeWidth={1.2} strokeDasharray="3 3" />
            <circle r={10} className="fill-field stroke-ink" strokeWidth={2} />
          </g>
          {touch ? <Contact at={touch.top} /> : null}
          {at.zero ? <path d="M102 210 H118 M110 202 V218" className="stroke-acc" strokeWidth={2} /> : null}
          {dimView === 'top' ? <Dimension at={at} /> : null}
        </g>
        {at.zero ? (
          <text x={cornerX + (flipX ? 14 : -14)} y={cornerY + (flipY ? -10 : 22)} textAnchor={flipX ? START : END} className="fill-acc font-num text-cap font-semibold">
            {t('probe.corner.zeroXY')}
          </text>
        ) : null}
        {shown?.view === 'top' ? <Badge x={shown.x} y={shown.y} text={badge.text} /> : null}
      </g>

      <path d="M0 246.5 H440" className="stroke-line" strokeWidth={1} />

      <g transform="translate(36 244) scale(.8)">
        <g transform={sideFlip}>
          <rect x={110} y={170} width={300} height={50} className="fill-mutS stroke-line" strokeWidth={1.5} />
          <path d="M100 150 H190 V196 H100 Z" className="fill-accS stroke-acc" strokeWidth={2} strokeLinejoin="round" />
          <rect x={110} y={170} width={80} height={26} fill={`url(#${hatch})`} />
          <path d="M190 170 H110 V196" className="stroke-acc" fill="none" strokeWidth={1.5} strokeDasharray="5 4" />
          <g opacity={at.sideFaded ? 0.3 : 1} transform={`translate(${at.side[0]} ${at.side[1]})`}>
            <path d={BIT} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" />
          </g>
          {touch?.side ? <Contact at={touch.side} /> : null}
          {dimView === 'side' ? <Dimension at={at} /> : null}
        </g>
        {at.zero ? (
          <>
            <text x={flipX ? 116 : 404} y={164} textAnchor={flipX ? START : END} className="fill-acc font-num text-cap font-semibold">{t('probe.z0')}</text>
            <text x={flipX ? 404 : 116} y={238} textAnchor={flipX ? END : START} className="fill-acc font-num text-cap font-semibold">{t('probe.corner.zeroX')}</text>
          </>
        ) : null}
        {shown?.view === 'side' ? <Badge x={shown.x} y={shown.y} text={badge.text} /> : null}
      </g>

      <text x={12} y={14} className="fill-mut text-cap">{t('probe.corner.fromAbove')}</text>
      <text x={12} y={262} className="fill-mut text-cap">{t('probe.corner.fromSide')}</text>
    </svg>
  );
};

export default CornerScene;
