import CentreViews from './CentreViews';
import CornerMarks from './cornerMarks';
import StatTile from '../../ui/StatTile';
import WcsBadge from '../../ui/WcsBadge';
import {
  SHAPES, kindsOf, methodOfRun, shapeOf, shapeOfKind,
} from '../machine/probe';
import { decimal, figureSaid } from '../machine/probeFields';
import { sizeCycle } from '../machine/sizeCycle';
import { degrees } from '../../machine/units';
import { useUnits } from '../../ui/units';
import { t } from '../../i18n/index';

// The result's drawing, larger than a Setup's (`DRAWING_FIT`).
const RESULT_FIT = 'max-h-80 @[1800px]/shell:max-h-[28rem]';

/**
 * Pomiar (Mateusz, 2026-10-03): what is measured, how it lies, and what came
 * out — the zero left as it is. See `machine/sizeCycle`.
 */

/*
 * Each shape from above, small: the work where it stands, the 3D probe's
 * ball and the accent heads at the walls it touches — out from inside a
 * hole or a pocket, in from outside a stud or a part; four heads where both
 * axes are measured, two where one is. Along Y the same, turned.
 *
 * One rule for every head (Mateusz, 2026-10-06: *"mają być równe
 * odległości"*): it stands halfway between the ball and the work — `GAP`
 * from the ball's edge to its base, `GAP` from its tip to the work's edge,
 * the strokes counted; a head on a side the ball is not at stands `GAP` off
 * the work all the same. The work's outline is the same light line
 * everywhere, whether it stands alone or round a hole (*"te same kolory
 * materiału"*). The figures below are worked out from it: the ball's edge
 * 3.4 from its centre, the work's 0.8 past its line, a head 2.8 deep.
 */
const BALL_AT = (x, y) => <circle cx={x} cy={y} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />;
const WORK = 'fill-mutS stroke-line';
// SVG's word for a shape with a hole cut in it.
const EVEN_ODD = 'evenodd';
// The work round a hole or a pocket, its walls as thick all round: the hole's own outline is cut out of it.
const AROUND = 'M4 4 H44 V44 H4 Z ';
const Work = ({ d, cut = false }) => <path d={d} fillRule={cut ? EVEN_ODD : undefined} className={WORK} strokeWidth={1.6} strokeLinejoin="round" />;
const Heads = ({ d }) => <path d={d} className="fill-acc" />;

// Inside: the hole or the pocket 22 across about the middle, the ball in it; each head out to its wall.
const HOLE = {
  circle: 'M13 24 A11 11 0 1 0 35 24 A11 11 0 1 0 13 24 Z',
  square: 'M13 13 H35 V35 H13 Z',
};
const OUT_X = 'M18.6 21 L15.8 24 L18.6 27 Z M29.4 21 L32.2 24 L29.4 27 Z';
const OUT_Y = 'M21 18.6 L24 15.8 L27 18.6 Z M21 29.4 L24 32.2 L27 29.4 Z';
// Outside: the part 22 across about (28, 24), the ball off its left side; each head in to its side.
const PART = {
  circle: 'M17 24 A11 11 0 1 0 39 24 A11 11 0 1 0 17 24 Z',
  square: 'M17 13 H39 V35 H17 Z',
};
const IN_X = 'M11.4 21 L14.2 24 L11.4 27 Z M44.6 21 L41.8 24 L44.6 27 Z';
const IN_Y = 'M25 7.4 L28 10.2 L31 7.4 Z M25 40.6 L28 37.8 L31 40.6 Z';

const inside = (outline, heads) => (
  <>
    <Work d={AROUND + outline} cut />
    {BALL_AT(24, 24)}
    <Heads d={heads} />
  </>
);
const outside = (outline, heads) => (
  <>
    <Work d={outline} />
    {BALL_AT(6, 24)}
    <Heads d={heads} />
  </>
);

const MARKS = {
  'circle-inside': inside(HOLE.circle, `${OUT_X} ${OUT_Y}`),
  'circle-outside': outside(PART.circle, `${IN_X} ${IN_Y}`),
  'rect-inside': inside(HOLE.square, `${OUT_X} ${OUT_Y}`),
  'rect-outside': outside(PART.square, `${IN_X} ${IN_Y}`),
  // One axis of the same pocket or part: two heads, the other axis left alone.
  pocketAxis: inside(HOLE.square, OUT_X),
  partAxis: outside(PART.square, IN_X),
  // A distance: two holes in the work, the measure between their centres in the accent.
  distance: (
    <>
      <Work d={`${AROUND}M8 24 A5 5 0 1 0 18 24 A5 5 0 1 0 8 24 Z M30 24 A5 5 0 1 0 40 24 A5 5 0 1 0 30 24 Z`} cut />
      <path d="M13 24 H35" className="stroke-acc" strokeWidth={1.6} />
      <Heads d="M16 21.5 L13 24 L16 26.5 Z M32 21.5 L35 24 L32 26.5 Z" />
    </>
  ),
  /*
   * A height, from the side: an even step — two faces as wide, the upper
   * as far over the lower as the lower over the foot — the probe come down
   * from above onto the upper face, and the measure from it down to the
   * lower in the accent, as a distance's is.
   */
  height: (
    <>
      <Work d="M4 44 V20 H24 V32 H44 V44 Z" />
      <path d="M14 4 V12.4" className="stroke-ink" strokeWidth={1.6} />
      {BALL_AT(14, 15.8)}
      <path d="M24 20 H38" className="stroke-line" strokeWidth={1} />
      <path d="M34 23.3 V28.4" className="stroke-acc" strokeWidth={1.6} />
      <Heads d="M31 23.3 L34 20.5 L37 23.3 Z M31 28.4 L34 31.2 L37 28.4 Z" />
    </>
  ),
  // A corner: the part standing in it, the angle between its two sides in the accent.
  angle: (
    <>
      <Work d="M12 38 V10 H40 V38 Z" />
      <path d="M26 38 A14 14 0 0 0 12 24" fill="none" className="stroke-acc" strokeWidth={1.6} />
    </>
  ),
  // A pocket's front wall from inside: the pocket, the ball in it, the two heads out to the wall either side of it.
  wall: (
    <>
      <Work d={AROUND + HOLE.square} cut />
      {BALL_AT(24, 24)}
      <Heads d="M15 29.4 L18 32.2 L21 29.4 Z M27 29.4 L30 32.2 L33 29.4 Z" />
    </>
  ),
  // An edge facing −Y, the part above it: the ball in front, the two heads where it touches, either side of it.
  edge: (
    <>
      <Work d="M8 8 H40 V30 H8 Z" />
      {BALL_AT(24, 41)}
      <Heads d="M13 35.6 L16 32.8 L19 35.6 Z M29 35.6 L32 32.8 L35 35.6 Z" />
    </>
  ),
};

// An edge's marks turned from the front's to face its own way.
const EDGE_TURN = {
  'edge-front': undefined, 'edge-back': 'rotate(180 24 24)', 'edge-left': 'rotate(90 24 24)', 'edge-right': 'rotate(-90 24 24)',
  'wall-front': undefined, 'wall-back': 'rotate(180 24 24)', 'wall-left': 'rotate(90 24 24)', 'wall-right': 'rotate(-90 24 24)',
};

/** A shape's marks in a 48-unit box. */
const ShapeMarks = ({ shape }) => {
  const one = shapeOf(shape);
  if (one.kind === 'edge' || one.kind === 'wall') {
    return <g transform={EDGE_TURN[one.id]}>{MARKS[one.kind]}</g>;
  }
  if (one.kind === 'corner') {
    return <CornerMarks one={one} />;
  }
  // One axis of a pocket or a part, by its axis.
  if (!one.axis) {
    return MARKS[one.id];
  }
  return <g transform={one.axis === 'y' ? 'rotate(90 24 24)' : undefined}>{one.side === 'inside' ? MARKS.pocketAxis : MARKS.partAxis}</g>;
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
        {/* A corner's tiles share a name: which corner, under it. */}
        {item.cornerKey ? <span className="text-note text-mut">{t(item.cornerKey)}</span> : null}
        {item.note ? <span className="text-note text-mut">{t(item.note)}</span> : null}
      </button>
    ))}
  </div>
);

/** What is measured, among the kinds of the tile picked — each drawn as its first shape. */
export const KindChooser = ({ value, onChange, method }) => (
  <Tiles
    label={t('probe.kindLabel')}
    items={kindsOf(method?.id).map((kind) => ({ ...kind, shape: SHAPES.find((one) => one.kind === kind.id).id }))}
    on={shapeOf(value).kind}
    onPick={(kind) => onChange(shapeOfKind(kind, value))}
    className="@3xl/shell:grid-cols-3"
  />
);

/** How it lies: from inside or outside — a width's axis too — among the shapes of the kind chosen. */
export const LieChooser = ({ value, onChange }) => {
  const { kind } = shapeOf(value);
  const items = SHAPES.filter((one) => one.kind === kind).map((one) => ({ ...one, shape: one.id }));
  // A corner's eight two by two even on a phone: back row first, as they lie seen from above.
  let columns = items.length > 2 ? '@3xl/shell:grid-cols-4' : '@3xl/shell:grid-cols-2';
  if (kind === 'corner') {
    columns = 'grid-cols-2 @3xl/shell:grid-cols-4';
  }
  // A pocket's three and a part's three, a row each: both axes, X alone, Y alone.
  if (kind === 'rect') {
    columns = '@3xl/shell:grid-cols-3';
  }
  return <Tiles label={t('probe.shapeLabel')} items={items} on={shapeOf(value).id} onPick={onChange} className={columns} />;
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
    size, spread, each, centre = {}, off,
  } = probe.result.size;
  // An edge: drawn turned the way it was found.
  const cycle = sizeCycle(probe.method, shape, size.a);
  // A circle's one diameter, an edge's angle, or each axis measured.
  const keys = ['d', 'a'].find((key) => key in size) ? ['d', 'a'].filter((key) => key in size) : AXES.filter((axis) => axis in size);
  const edge = 'a' in size;
  const name = (key) => (key === 'd' ? 'Ø' : key.toUpperCase());
  // An angle in degrees, never converted; a length in the panel's units.
  const figureOf = (key, value) => (key === 'a' ? degrees(value) : units.figure(value));
  const unitOf = (key) => (key === 'a' ? '°' : units.length);
  const LABELS = { d: 'probe.size.diameter', a: 'probe.size.angle' };
  // On the drawing as its other labels: the language's decimal sign (Mateusz, 2026-10-02).
  const said = (mm) => `${decimal(units.figure(mm))} ${units.length}`;
  const ball = units.figure(probe.params?.ballDiameter);
  const how = {
    texts: { ballDiameter: ball },
    say: (field, text) => figureSaid(field, text, units.rule),
    sizes: Object.fromEntries(keys.map((key) => [key, key === 'a' ? `${decimal(degrees(size.a))}°` : `${key === 'd' ? 'Ø' : ''}${said(size[key])}`])),
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
            label={`${t(methodOfRun(probe.method, probe.options)?.key)} · ${t(shapeOf(shape).key)}`}
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
        {Number.isFinite(off) ? <StatTile label={t('probe.size.off')} value={units.figure(off)} unit={units.length} /> : null}
      </div>
      {each.length > 1 ? keys.map((key) => (
        <p key={`each${key}`} className="m-0 font-num text-note text-mut">
          {t('probe.size.each', { axis: name(key), list: each.map((one) => units.figure(one[key])).join(' · '), unit: units.length })}
        </p>
      )) : null}
      {Number.isFinite(off) ? <p className="m-0 text-note text-mut">{t('probe.size.offWhy')}</p> : null}
      {edge ? <p className="m-0 text-note text-mut">{t('probe.size.angleWhy')}</p> : null}
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
