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
 * same day). `badge`, `{ name, text }`, is a figure's value where it acts;
 * `note`, the same, for a second value — a move's bound by its dimension.
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

// Where each figure's value stands, drawn for front-left, in its view's own
// units: beside its dimension, never on it, and by every dimension it has —
// the X wall's in both views (review notes, 2026-09-29).
const WALL_X_AT = [['top', 124, 226], ['side', 30, 212]];

const ANCHORS = {
  fast: [['side', 190, 84]],
  maxZ: [['side', 4, 118]],
  slow: [['side', 190, 84]],
  retract: [['side', 190, 150]],
  lift: [['side', 190, 118]],
  cornerThickness: [['side', 218, 148]],
  depth: [['side', 16, 194]],
  clear: [['top', 26, 114]],
  wallX: WALL_X_AT,
  maxXY: [['top', 4, 116], ['side', 0, 206]],
  toolDiameter: [['top', 160, 96]],
  clearance: [['side', 182, 122]],
  wallY: [['top', 218, 202]],
};

const Contact = ({ at }) => <circle cx={at[0]} cy={at[1]} r={4.5} className="fill-amb" />;

// An arrowhead with its tip at (x, y), pointing along the unit (dx, dy): `len`
// long, `half` either side across it — along (-dy, dx), so a slant has a head too.
const Head = ({ x, y, dx = 0, dy = 0, len = 6, half = 3.5 }) => (
  <path
    d={`M${x - dx * len - dy * half} ${y - dy * len + dx * half} L${x} ${y} L${x - dx * len + dy * half} ${y - dy * len - dx * half} Z`}
    className="fill-acc"
  />
);

/*
 * Dimensions, the Z plate's (review note, 2026-09-29: *"nie pokazujesz na
 * animacji odległości, grubości jak dla płytki Z"*): thin extension lines and
 * a thin line with small heads pointing in — from outside where the gap is
 * too small for them between. Thin, so they are never read as the tool's
 * move, which has an arrow of its own.
 */
const Vertical = ({ x, top, bottom, from, to }) => {
  const inside = bottom - top > 18;
  return (
    <>
      <path d={`M${from} ${top} H${to} M${from} ${bottom} H${to}`} className="stroke-acc" fill="none" strokeWidth={1} />
      {inside ? (
        <>
          <path d={`M${x} ${top + 6} V${bottom - 6}`} className="stroke-acc" strokeWidth={1.25} />
          <Head x={x} y={top} dy={-1} />
          <Head x={x} y={bottom} dy={1} />
        </>
      ) : (
        <>
          <path d={`M${x} ${top - 14} V${top} M${x} ${bottom} V${bottom + 14}`} className="stroke-acc" strokeWidth={1.25} />
          <Head x={x} y={top} dy={1} />
          <Head x={x} y={bottom} dy={-1} />
        </>
      )}
    </>
  );
};

const Horizontal = ({ y, left, right, from, to }) => {
  const inside = right - left > 18;
  return (
    <>
      <path d={`M${left} ${from} V${to} M${right} ${from} V${to}`} className="stroke-acc" fill="none" strokeWidth={1} />
      {inside ? (
        <>
          <path d={`M${left + 6} ${y} H${right - 6}`} className="stroke-acc" strokeWidth={1.25} />
          <Head x={left} y={y} dx={-1} />
          <Head x={right} y={y} dx={1} />
        </>
      ) : (
        <>
          <path d={`M${left - 14} ${y} H${left} M${right} ${y} H${right + 14}`} className="stroke-acc" strokeWidth={1.25} />
          <Head x={left} y={y} dx={1} />
          <Head x={right} y={y} dx={-1} />
        </>
      )}
    </>
  );
};

/*
 * Each figure's dimension, in each view it can be seen in, drawn for
 * front-left in the view's own units and mirrored with the corner: from above
 * the plate's walls stand 100–110 and 210–220 about a work edged at 110 and
 * 210; from the side (X and Z) its top is at 150, the work's at 170, and the
 * X wall hangs 100–110 down to 196 — so the X wall is marked in both views
 * (review note, the same day), the Y wall only from above.
 */
const WALL_X = [
  ['top', () => <Horizontal y={236} left={100} right={110} from={222} to={244} />],
  ['side', () => <Horizontal y={210} left={100} right={110} from={198} to={218} />],
];

const DIMENSIONS = {
  cornerThickness: [['side', () => <Vertical x={206} top={150} bottom={170} from={192} to={214} />]],
  depth: [['side', () => <Vertical x={36} top={150} bottom={186} from={28} to={100} />]],
  lift: [['side', () => <Vertical x={180} top={110} bottom={150} from={150} to={188} />]],
  // The fast touch's way, as the lift's (review note, 2026-09-30): from where
  // the tool sets off down to the plate.
  fast: [['side', () => <Vertical x={120} top={110} bottom={150} from={112} to={150} />]],
  retract: [['side', () => <Vertical x={180} top={128} bottom={150} from={150} to={188} />]],
  clear: [['top', () => <Horizontal y={150} left={60} right={145} from={142} to={158} />]],
  wallX: WALL_X,
  // The furthest a probe may go, as the Z plate's travel limit is drawn: from
  // where the tool sets off to what it is meant to touch (review note,
  // 2026-09-29 — it had the X wall's thickness).
  maxXY: [
    ['top', () => <Horizontal y={148} left={60} right={90} from={140} to={160} />],
    ['side', () => <Horizontal y={198} left={60} right={90} from={188} to={206} />],
  ],
  maxZ: [['side', () => <Vertical x={120} top={110} bottom={150} from={112} to={150} />]],
  wallY: [['top', () => <Vertical x={206} top={210} bottom={220} from={192} to={214} />]],
  // A few millimetres between the tip and the plate, before measuring.
  clearance: [['side', () => <Vertical x={172} top={130} bottom={150} from={150} to={182} />]],
  toolDiameter: [['top', ({ at }) => <Horizontal y={at.top[1] - 22} left={at.top[0] - 10} right={at.top[0] + 10} from={at.top[1] - 28} to={at.top[1] - 6} />]],
};

/*
 * The tool's move, as the Z plate's (Mateusz, 2026-09-29: *"strzałka
 * kierunku ruchu pokazuje się jedynie przy ruchu i skraca się wraz z drogą
 * do celu"*): only while the tool moves, from the tool to where the move
 * ends, shrinking as it gets there and gone once shorter than its head — in
 * the view the move is seen in. `at.target` is where the move ends.
 */
const Move = ({ from, to }) => {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (length <= 12) {
    return null;
  }
  // Along the move, a unit long — so a slant across the table gets its head too.
  const dx = (to[0] - from[0]) / length;
  const dy = (to[1] - from[1]) / length;
  return (
    <>
      <path d={`M${from[0]} ${from[1]} L${to[0] - dx * 9} ${to[1] - dy * 9}`} className="stroke-acc" strokeWidth={3} strokeLinecap="round" />
      <Head x={to[0]} y={to[1]} dx={dx} dy={dy} len={11} half={6} />
    </>
  );
};

// From above: from the tool's leading edge to where that edge will be.
const TopMove = ({ at }) => {
  const way = at.moving.top;
  if (!way) {
    return null;
  }
  const [x, y] = at.top;
  const [tx, ty] = at.target.top;
  // Along the move's own axis: out past the wall drifts 5 px in Y on the way,
  // and aimed at that the arrow came out as a crooked stroke (review note, 2026-09-30).
  const to = [way[0] ? tx + way[0] * 12 : x, way[1] ? ty + way[1] * 12 : y];
  return <Move from={[x + way[0] * 12, y + way[1] * 12]} to={to} />;
};

// From the side: up and down beside the bit, from the tip's height to where it
// is going; across, above the tip, from the bit to where it is going.
const SideMove = ({ at }) => {
  const way = at.moving.side;
  if (!way) {
    return null;
  }
  const [x, tip] = at.side;
  const [tx, ttip] = at.target.side;
  if (way[1]) {
    return <Move from={[x + 22, tip]} to={[x + 22, ttip]} />;
  }
  return <Move from={[x + way[0] * 12, tip - 60]} to={[tx + way[0] * 12, tip - 60]} />;
};

const Badge = ({ x, y, text }) => (
  <g>
    <rect x={x} y={y} width={text.length * 8 + 18} height={24} rx={4} className="fill-accS stroke-acc" strokeWidth={1.5} />
    <text x={x + 9} y={y + 17} className="fill-acc font-num text-note font-semibold">{text}</text>
  </g>
);

/** A figure's value where it acts, in each view, mirrored with its corner; the text itself stays upright. */
const placed = (badge, flipX, flipY) => (ANCHORS[badge.name] || []).map(([view, x, y]) => {
  const w = badge.text.length * 8 + 18;
  const mx = flipX ? (view === 'top' ? TOP_W : SIDE_W) - x - w : x;
  const my = flipY && view === 'top' ? 270 - y - 24 : y;
  return { view, x: mx, y: my };
});

const CornerScene = ({
  corner, at, badge = null, note = null, moves = true, label, className = '',
}) => {
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
  const shown = badge ? placed(badge, flipX, flipY) : [];
  const noted = note ? placed(note, flipX, flipY) : [];
  const badges = (view) => [
    ...shown.filter((one) => one.view === view).map((one) => <Badge key={`badge-${view}`} x={one.x} y={one.y} text={badge.text} />),
    ...noted.filter((one) => one.view === view).map((one) => <Badge key={`note-${view}`} x={one.x} y={one.y} text={note.text} />),
  ];
  const dimensions = (badge && DIMENSIONS[badge.name]) || [];
  const marks = (view) => dimensions.filter(([where]) => where === view).map(([, Mark], k) => <Mark key={k} at={at} />);

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
          {marks('top')}
          {moves ? <TopMove at={at} /> : null}
        </g>
        {at.zero ? (
          <text x={cornerX + (flipX ? 14 : -14)} y={cornerY + (flipY ? -10 : 22)} textAnchor={flipX ? START : END} className="fill-acc font-num text-cap font-semibold">
            {t('probe.corner.zeroXY')}
          </text>
        ) : null}
        {badges('top')}
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
          {marks('side')}
          {moves ? <SideMove at={at} /> : null}
        </g>
        {at.zero ? (
          <>
            <text x={flipX ? 116 : 404} y={164} textAnchor={flipX ? START : END} className="fill-acc font-num text-cap font-semibold">{t('probe.z0')}</text>
            <text x={flipX ? 404 : 116} y={238} textAnchor={flipX ? END : START} className="fill-acc font-num text-cap font-semibold">{t('probe.corner.zeroX')}</text>
          </>
        ) : null}
        {badges('side')}
      </g>

      <text x={12} y={14} className="fill-mut text-cap">{t('probe.corner.fromAbove')}</text>
      <text x={12} y={262} className="fill-mut text-cap">{t('probe.corner.fromSide')}</text>
    </svg>
  );
};

export default CornerScene;
