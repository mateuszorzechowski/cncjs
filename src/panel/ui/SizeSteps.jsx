import CentreViews from './CentreViews';
import StatTile from './StatTile';
import WcsBadge from './WcsBadge';
import {
  KINDS, SHAPES, methodOf, shapeOf, shapeOfKind,
} from '../machine/probe';
import { decimal, figureSaid } from '../machine/probeFields';
import { sizeCycle } from '../machine/sizeCycle';
import { degrees } from '../machine/units';
import { useUnits } from './units';
import { t } from '../i18n';

// The result's drawing, larger than a Setup's (`DRAWING_FIT`).
const RESULT_FIT = 'max-h-80 @[1800px]/shell:max-h-[28rem]';

/**
 * Pomiar (Mateusz, 2026-10-03): what is measured, how it lies, and what came
 * out — the zero left as it is. See `machine/sizeCycle`.
 */

/*
 * Each shape from above, small: the work hatched where it stands, the 3D
 * probe's ball and the accent heads at the walls it touches — out from
 * inside a hole, a pocket or a groove, in from outside a stud, a part or a
 * bar, as the hole's and the part's pictograms point. Along Y the same, turned.
 *
 * Spaced as those pictograms are (review note, 2026-10-05: *"między
 * narzędziem, strzałką a materiałem jednakowa odległość"*): on the measuring
 * line the walls stand at x 15 and 33, a head's tip on the wall's edge, its
 * base 2 off the ball — the ball in the middle from inside, at x 6 from
 * outside. A shape at an angle is drawn turned so it still crosses the line
 * there (scratchpad marks.py worked the points out).
 */
const BALL = <circle cx={24} cy={24} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />;
const OUT_BALL = <circle cx={6} cy={24} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />;
// From inside, out to the walls; from outside, in to the part.
const OUT_HEADS = <path d="M18.6 21 L15.8 24 L18.6 27 Z M29.4 21 L32.2 24 L29.4 27 Z" className="fill-acc" />;
const IN_HEADS = <path d="M11.4 21 L14.2 24 L11.4 27 Z M36.6 21 L33.8 24 L36.6 27 Z" className="fill-acc" />;
const WORK = 'fill-mutS stroke-line';
// A part standing alone, with nothing round it to show its edge: outlined darker.
const PART = 'fill-mutS stroke-mut';
// SVG's word for a shape with a hole cut in it.
const EVEN_ODD = 'evenodd';
// The work round a hole: the hole's own outline is cut out of it.
const AROUND = 'M4 6 H44 V42 H4 Z ';

// The outlines, crossing the measuring line at x 15 and 33: as they stand, and turned (12°, the oval 20°, the slot 15°).
const OUTLINE = {
  circle: 'M15 24 A9 9 0 1 0 33 24 A9 9 0 1 0 15 24 Z',
  square: 'M15 15 H33 V33 H15 Z',
  turned: 'M13.56 17.22 L30.78 13.56 L34.44 30.78 L17.22 34.44 Z',
  oval: 'M33.87 20.41 A10.5 5.19 -20 1 0 14.13 27.59 A10.5 5.19 -20 1 0 33.87 20.41 Z',
  slot: 'M21.84 30.27 L29.01 28.35 A5.5 5.5 0 0 0 26.16 17.73 L18.99 19.65 A5.5 5.5 0 0 0 21.84 30.27 Z',
};

const inside = (outline) => (
  <>
    <path d={AROUND + outline} fillRule={EVEN_ODD} className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
    {BALL}
    {OUT_HEADS}
  </>
);
const outside = (outline) => (
  <>
    <path d={outline} className={PART} strokeWidth={1.6} strokeLinejoin="round" />
    {OUT_BALL}
    {IN_HEADS}
  </>
);

const MARKS = {
  'circle-inside': inside(OUTLINE.circle),
  'circle-outside': outside(OUTLINE.circle),
  'oval-inside': inside(OUTLINE.oval),
  'oval-outside': outside(OUTLINE.oval),
  'rect-inside': inside(OUTLINE.square),
  'rect-outside': outside(OUTLINE.square),
  'rect-inside-turned': inside(OUTLINE.turned),
  'rect-outside-turned': outside(OUTLINE.turned),
  'slot-inside': inside(OUTLINE.slot),
  'slot-outside': outside(OUTLINE.slot),
  groove: (
    <>
      <path d="M4 8 H15 V40 H4 Z M33 8 H44 V40 H33 Z" className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
      {BALL}
      {OUT_HEADS}
    </>
  ),
  bar: outside('M15 8 H33 V40 H15 Z'),
  // A distance: two holes in the work, the measure between their centres in the accent.
  distance: (
    <>
      <path d={`${AROUND}M8 24 A5 5 0 1 0 18 24 A5 5 0 1 0 8 24 Z M30 24 A5 5 0 1 0 40 24 A5 5 0 1 0 30 24 Z`} fillRule={EVEN_ODD} className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M13 24 H35" className="stroke-acc" strokeWidth={1.6} />
      <path d="M16 21.5 L13 24 L16 26.5 Z M32 21.5 L35 24 L32 26.5 Z" className="fill-acc" />
    </>
  ),
  // A corner: the part standing in it, the angle between its two sides in the accent.
  angle: (
    <>
      <path d="M12 38 V10 H40 V38 Z" className={PART} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M26 38 A14 14 0 0 0 12 24" fill="none" className="stroke-acc" strokeWidth={1.6} />
    </>
  ),
  // An edge facing −Y, the part above it: the ball in front, the two heads where it touches, either side of it —
  // spaced as the others, a tip on the edge, the base 2 off the ball's row.
  edge: (
    <>
      <path d="M8 8 H40 V30 H8 Z" className={PART} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={24} cy={39} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
      <path d="M13 33.6 L16 30.8 L19 33.6 Z M29 33.6 L32 30.8 L35 33.6 Z" className="fill-acc" />
    </>
  ),
};

// An edge's marks turned from the front's to face its own way.
const EDGE_TURN = {
  'edge-front': undefined, 'edge-back': 'rotate(180 24 24)', 'edge-left': 'rotate(90 24 24)', 'edge-right': 'rotate(-90 24 24)',
};

/** A shape's marks in a 48-unit box. */
const ShapeMarks = ({ shape }) => {
  const one = shapeOf(shape);
  if (one.kind === 'edge') {
    return <g transform={EDGE_TURN[one.id]}>{MARKS.edge}</g>;
  }
  if (one.kind !== 'width') {
    return MARKS[one.id];
  }
  return <g transform={one.axis === 'y' ? 'rotate(90 24 24)' : undefined}>{one.side === 'inside' ? MARKS.groove : MARKS.bar}</g>;
};

export const ShapePicture = ({ shape }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-20 w-24 overflow-visible">
    <ShapeMarks shape={shape} />
  </svg>
);

// `disabled` on an item: one that cannot go with what is chosen elsewhere — a distance's edge square to the other.
export const Tiles = ({
  label, items, on, onPick, className,
}) => (
  <div className={`grid gap-3 ${className}`} role="group" aria-label={label}>
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        aria-pressed={item.id === on}
        disabled={item.disabled}
        onClick={() => onPick(item.id)}
        className={`flex flex-col items-center gap-3 rounded-ctl border p-4 text-center disabled:opacity-45 ${item.id === on ? 'border-acc bg-accS' : 'border-line bg-field enabled:hover:border-acc'}`}
      >
        <ShapePicture shape={item.shape} />
        <span className="text-base font-semibold text-ink">{t(item.key)}</span>
        {item.note ? <span className="text-note text-mut">{t(item.note)}</span> : null}
      </button>
    ))}
  </div>
);

/** What is measured: a circle, a rectangle or one width — each drawn as its first shape, from inside. */
export const KindChooser = ({ value, onChange }) => (
  <Tiles
    label={t('probe.kindLabel')}
    items={KINDS.map((kind) => ({ ...kind, shape: SHAPES.find((one) => one.kind === kind.id).id }))}
    on={shapeOf(value).kind}
    onPick={(kind) => onChange(shapeOfKind(kind, value))}
    className="@3xl/shell:grid-cols-3"
  />
);

/** How it lies: from inside or outside — a width's axis too — among the shapes of the kind chosen. */
export const LieChooser = ({ value, onChange }) => {
  const { kind } = shapeOf(value);
  const items = SHAPES.filter((one) => one.kind === kind).map((one) => ({ ...one, shape: one.id }));
  return <Tiles label={t('probe.shapeLabel')} items={items} on={shapeOf(value).id} onPick={onChange} className={items.length > 2 ? '@3xl/shell:grid-cols-4' : '@3xl/shell:grid-cols-2'} />;
};

const AXES = ['x', 'y'];

/**
 * What a size came out at: the shape drawn with its size on it; a tile for
 * the diameter or each axis — and, measured more than once, the spread and
 * every pass; a circle's distance from round; the middle in the system it
 * was measured in; the ball's diameter it rests on, and the zero untouched.
 */
export const SizeResult = ({ probe }) => {
  const units = useUnits();
  const shape = probe.options?.shape;
  const {
    size, spread, each, centre = {}, off, turn,
  } = probe.result.size;
  // An edge or a rectangle at an angle: drawn turned the way it was found.
  const cycle = sizeCycle(probe.method, shape, size.a ?? turn?.a);
  // A circle's one diameter, an edge's angle, an oval's two axes, or each axis measured.
  const keys = ['d', 'a', 'major', 'length'].find((key) => key in size) ? ['d', 'a', 'major', 'minor', 'length', 'width'].filter((key) => key in size) : AXES.filter((axis) => axis in size);
  const edge = 'a' in size;
  const oval = 'major' in size;
  const slot = 'length' in size;
  const name = (key) => (key === 'd' ? 'Ø' : key.toUpperCase());
  // An angle in degrees, never converted; a length in the panel's units.
  const figureOf = (key, value) => (key === 'a' ? degrees(value) : units.figure(value));
  const unitOf = (key) => (key === 'a' ? '°' : units.length);
  const LABELS = {
    d: 'probe.size.diameter', a: 'probe.size.angle', major: 'probe.size.major', minor: 'probe.size.minor', length: 'probe.size.length', width: 'probe.size.across',
  };
  // On the drawing as its other labels: the language's decimal sign (Mateusz, 2026-10-02).
  const said = (mm) => `${decimal(units.figure(mm))} ${units.length}`;
  const ball = units.figure(probe.params?.ballDiameter);
  const how = {
    texts: { ballDiameter: ball }, say: (field, text) => figureSaid(field, text, units.rule), sizes: {
      ...Object.fromEntries(keys.map((key) => [key, key === 'a' ? `${decimal(degrees(size.a))}°` : `${key === 'd' ? 'Ø' : ''}${said(size[key])}`])),
      ...(turn ? { a: `${decimal(degrees(turn.a))}°` } : {}),
    },
  };
  /*
   * Wide, the drawing a column of its own beside the figures, as the height
   * map's result (2026-10-05): taller than the Setup's, so its labels — they
   * keep their size — find room beside their lines, out of the part, and the
   * buttons stay in sight. On a phone one above the other.
   */
  return (
    <div className="grid items-start gap-4 @3xl/shell:grid-cols-2">
      {cycle ? (
        <div className="mx-auto w-full max-w-xl">
          <CentreViews
            cycle={cycle}
            top={{ ...cycle.scene('zero', 1, how), limit: null }}
            side={cycle.side ? cycle.side('zero', 1) : null}
            name="zero"
            label={`${t(methodOf(probe.method)?.key)} · ${t(shapeOf(shape).key)}`}
            className={RESULT_FIT}
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-3">
      <div className="grid gap-2 @3xl/shell:grid-cols-2">
        {keys.map((key) => (
          <StatTile key={key} label={LABELS[key] ? t(LABELS[key]) : t('probe.size.axis', { axis: name(key) })} value={figureOf(key, size[key])} unit={unitOf(key)} />
        ))}
        {spread ? keys.map((key) => (
          <StatTile key={`spread${key}`} label={t('probe.size.spread', { axis: name(key) })} value={units.figure(spread[key])} unit={units.length} />
        )) : null}
        {Number.isFinite(off) ? <StatTile label={t({ true: 'probe.size.offSlot', false: oval ? 'probe.size.offOval' : 'probe.size.off' }[slot])} value={units.figure(off)} unit={units.length} /> : null}
        {turn ? <StatTile label={t(oval || slot ? 'probe.size.majorAngle' : 'probe.size.turnAngle')} value={degrees(turn.a)} unit="°" /> : null}
        {Number.isFinite(turn?.square) ? <StatTile label={t('probe.size.square')} value={degrees(turn.square)} unit="°" /> : null}
      </div>
      {each.length > 1 ? keys.map((key) => (
        <p key={`each${key}`} className="m-0 font-num text-note text-mut">
          {t('probe.size.each', { axis: name(key), list: each.map((one) => units.figure(one[key])).join(' · '), unit: units.length })}
        </p>
      )) : null}
      {Number.isFinite(off) ? <p className="m-0 text-note text-mut">{t({ true: 'probe.size.offSlotWhy', false: oval ? 'probe.size.offOvalWhy' : 'probe.size.offWhy' }[slot])}</p> : null}
      {edge || turn ? <p className="m-0 text-note text-mut">{t('probe.size.angleWhy')}</p> : null}
      {Number.isFinite(turn?.square) ? <p className="m-0 text-note text-mut">{t('probe.size.squareWhy')}</p> : null}
      <div className="flex items-center gap-3">
        <span className="text-base text-ink">{t(edge ? 'probe.size.edgeIn' : 'probe.size.centreIn')}</span>
        <WcsBadge wcs={probe.wcs} />
      </div>
      <div className="grid gap-2 @3xl/shell:grid-cols-2">
        {AXES.filter((axis) => Number.isFinite(centre[axis])).map((axis) => (
          <StatTile key={`centre${axis}`} label={t(edge ? 'probe.size.edgeAt' : 'probe.size.centre', { axis: axis.toUpperCase() })} value={units.figure(centre[axis])} unit={units.length} />
        ))}
      </div>
      <p className="m-0 text-note text-mut">{t('probe.size.ball', { ball, unit: units.length })}</p>
      <p className="m-0 text-note text-mut">{t('probe.size.note')}</p>
      </div>
    </div>
  );
};
