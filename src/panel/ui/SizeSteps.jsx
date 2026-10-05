import CentreViews from './CentreViews';
import StatTile from './StatTile';
import WcsBadge from './WcsBadge';
import { DRAWING_FIT } from './probeDraw';
import {
  KINDS, SHAPES, methodOf, shapeOf, shapeOfKind,
} from '../machine/probe';
import { figureSaid } from '../machine/probeFields';
import { sizeCycle } from '../machine/sizeCycle';
import { useUnits } from './units';
import { t } from '../i18n';

/**
 * Pomiar (Mateusz, 2026-10-03): what is measured, how it lies, and what came
 * out — the zero left as it is. See `machine/sizeCycle`.
 */

/*
 * Each shape from above, small: the work hatched where it stands, the 3D
 * probe's ball and the accent heads at the walls it touches — out from
 * inside a hole, a pocket or a groove, in from outside a stud, a part or a
 * bar, as the hole's and the part's pictograms point. Along Y the same, turned.
 */
const BALL = <circle cx={24} cy={24} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />;
const OUT_HEADS = <path d="M20.2 21 L17.4 24 L20.2 27 Z M27.8 21 L30.6 24 L27.8 27 Z" className="fill-acc" />;
const IN_HEADS = <path d="M13.8 21 L16.6 24 L13.8 27 Z M34.2 21 L31.4 24 L34.2 27 Z" className="fill-acc" />;
const OUT_BALL = <circle cx={8} cy={24} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />;
const WORK = 'fill-mutS stroke-line';
// SVG's word for a shape with a hole cut in it.
const EVEN_ODD = 'evenodd';

const MARKS = {
  'circle-inside': (
    <>
      <path d="M4 6 H44 V42 H4 Z M24 10 A14 14 0 1 0 24 38 A14 14 0 1 0 24 10 Z" fillRule={EVEN_ODD} className={WORK} strokeWidth={1.6} />
      {BALL}
      <path d="M13.2 21 L10.4 24 L13.2 27 Z M34.8 21 L37.6 24 L34.8 27 Z" className="fill-acc" />
    </>
  ),
  'circle-outside': (
    <>
      <circle cx={24} cy={24} r={9} className={WORK} strokeWidth={1.6} />
      {OUT_BALL}
      <path d="M12.2 21 L15 24 L12.2 27 Z M35.8 21 L33 24 L35.8 27 Z" className="fill-acc" />
    </>
  ),
  'rect-inside': (
    <>
      <path d="M4 6 H44 V42 H4 Z M11 11 V37 H37 V11 Z" fillRule={EVEN_ODD} className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
      {BALL}
      <path d="M14.2 21 L11.4 24 L14.2 27 Z M33.8 21 L36.6 24 L33.8 27 Z" className="fill-acc" />
    </>
  ),
  'rect-outside': (
    <>
      <path d="M17 17 H31 V31 H17 Z" className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
      {OUT_BALL}
      {IN_HEADS}
    </>
  ),
  groove: (
    <>
      <path d="M4 8 H17 V40 H4 Z M31 8 H44 V40 H31 Z" className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
      {BALL}
      {OUT_HEADS}
    </>
  ),
  bar: (
    <>
      <path d="M17 8 H31 V40 H17 Z" className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
      {OUT_BALL}
      {IN_HEADS}
    </>
  ),
};

/** A shape's marks in a 48-unit box. */
const ShapeMarks = ({ shape }) => {
  const one = shapeOf(shape);
  if (one.kind !== 'width') {
    return MARKS[one.id];
  }
  return <g transform={one.axis === 'y' ? 'rotate(90 24 24)' : undefined}>{one.side === 'inside' ? MARKS.groove : MARKS.bar}</g>;
};

const ShapePicture = ({ shape }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-20 w-24 overflow-visible">
    <ShapeMarks shape={shape} />
  </svg>
);

const Tiles = ({
  label, items, on, onPick, className,
}) => (
  <div className={`grid gap-3 ${className}`} role="group" aria-label={label}>
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        aria-pressed={item.id === on}
        onClick={() => onPick(item.id)}
        className={`flex flex-col items-center gap-3 rounded-ctl border p-4 text-center ${item.id === on ? 'border-acc bg-accS' : 'border-line bg-field hover:border-acc'}`}
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
  const cycle = sizeCycle(probe.method, shape);
  const {
    size, spread, each, centre = {}, off,
  } = probe.result.size;
  // A circle's one diameter, or each axis measured.
  const keys = 'd' in size ? ['d'] : AXES.filter((axis) => axis in size);
  const name = (key) => (key === 'd' ? 'Ø' : key.toUpperCase());
  const said = (mm) => `${units.figure(mm)} ${units.length}`;
  const ball = units.figure(probe.params?.ballDiameter);
  const how = {
    texts: { ballDiameter: ball }, say: (field, text) => figureSaid(field, text, units.rule), sizes: Object.fromEntries(keys.map((key) => [key, `${key === 'd' ? 'Ø' : ''}${said(size[key])}`])),
  };
  return (
    <div className="flex flex-col gap-3">
      {cycle ? (
        <div className="mx-auto w-full max-w-md">
          <CentreViews
            cycle={cycle}
            top={{ ...cycle.scene('zero', 1, how), limit: null }}
            side={cycle.side ? cycle.side('zero', 1) : null}
            name="zero"
            label={`${t(methodOf(probe.method)?.key)} · ${t(shapeOf(shape).key)}`}
            className={DRAWING_FIT}
          />
        </div>
      ) : null}
      <div className="grid gap-2 @3xl/shell:grid-cols-2">
        {keys.map((key) => (
          <StatTile key={key} label={key === 'd' ? t('probe.size.diameter') : t('probe.size.axis', { axis: name(key) })} value={units.figure(size[key])} unit={units.length} />
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
      <div className="flex items-center gap-3">
        <span className="text-base text-ink">{t('probe.size.centreIn')}</span>
        <WcsBadge wcs={probe.wcs} />
      </div>
      <div className="grid gap-2 @3xl/shell:grid-cols-2">
        {AXES.filter((axis) => Number.isFinite(centre[axis])).map((axis) => (
          <StatTile key={`centre${axis}`} label={t('probe.size.centre', { axis: axis.toUpperCase() })} value={units.figure(centre[axis])} unit={units.length} />
        ))}
      </div>
      <p className="m-0 text-note text-mut">{t('probe.size.ball', { ball, unit: units.length })}</p>
      <p className="m-0 text-note text-mut">{t('probe.size.note')}</p>
    </div>
  );
};
