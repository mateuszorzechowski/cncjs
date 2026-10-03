import CentreViews from './CentreViews';
import StatTile from './StatTile';
import { DRAWING_FIT } from './probeDraw';
import { methodOf, SHAPES } from '../machine/probe';
import { figureSaid } from '../machine/probeFields';
import { sizeCycle } from '../machine/sizeCycle';
import { useUnits } from './units';
import { t } from '../i18n';

/**
 * A size measured (Mateusz, 2026-10-03): which width, and what came out —
 * the zero left as it is. See `machine/sizeCycle`.
 */

/*
 * A width from above, small: the work hatched where it stands, the 3D
 * probe's ball and the accent heads at the walls it touches — out from
 * inside a groove, in from outside a bar, as the hole's and the part's
 * pictograms point. Along Y the same, turned.
 */
const GROOVE = (
  <>
    <path d="M4 8 H17 V40 H4 Z M31 8 H44 V40 H31 Z" className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <circle cx={24} cy={24} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    <path d="M20.2 21 L17.4 24 L20.2 27 Z M27.8 21 L30.6 24 L27.8 27 Z" className="fill-acc" />
  </>
);
const BAR = (
  <>
    <path d="M17 8 H31 V40 H17 Z" className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <circle cx={8} cy={24} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    <path d="M13.8 21 L16.6 24 L13.8 27 Z M34.2 21 L31.4 24 L34.2 27 Z" className="fill-acc" />
  </>
);

/** A width's marks in a 48-unit box, for a picture of its own or the method's pictogram. */
export const ShapeMarks = ({ shape }) => {
  const one = SHAPES.find((each) => each.id === shape) ?? SHAPES[0];
  return <g transform={one.axis === 'y' ? 'rotate(90 24 24)' : undefined}>{one.side === 'inside' ? GROOVE : BAR}</g>;
};

const ShapePicture = ({ shape }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-20 w-24 overflow-visible">
    <ShapeMarks shape={shape} />
  </svg>
);

export const ShapeChooser = ({ value, onChange }) => (
  <div className="grid gap-3 @3xl/shell:grid-cols-4" role="group" aria-label={t('probe.shapeLabel')}>
    {SHAPES.map((shape) => {
      const on = shape.id === value;
      return (
        <button
          key={shape.id}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(shape.id)}
          className={`flex flex-col items-center gap-3 rounded-ctl border p-4 text-center ${on ? 'border-acc bg-accS' : 'border-line bg-field hover:border-acc'}`}
        >
          <ShapePicture shape={shape.id} />
          <span className="text-base font-semibold text-ink">{t(shape.key)}</span>
        </button>
      );
    })}
  </div>
);

const AXES = ['x', 'y'];

/**
 * What a size came out at: the part drawn with its sizes on it, a tile per
 * axis — and, measured more than once, the spread and every pass — the
 * ball's diameter it rests on, and the zero untouched.
 */
export const SizeResult = ({ probe }) => {
  const units = useUnits();
  const cycle = sizeCycle(probe.method, probe.options?.shape);
  const { size, spread, each } = probe.result.size;
  const axes = AXES.filter((axis) => axis in size);
  const said = (mm) => `${units.figure(mm)} ${units.length}`;
  const ball = units.figure(probe.params?.ballDiameter);
  const how = {
    texts: { ballDiameter: ball }, say: (field, text) => figureSaid(field, text, units.rule), sizes: Object.fromEntries(axes.map((axis) => [axis, said(size[axis])])),
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
            label={t(methodOf(probe.method)?.key)}
            className={DRAWING_FIT}
          />
        </div>
      ) : null}
      <div className="grid gap-2 @3xl/shell:grid-cols-2">
        {axes.map((axis) => (
          <StatTile key={axis} label={t('probe.size.axis', { axis: axis.toUpperCase() })} value={units.figure(size[axis])} unit={units.length} />
        ))}
        {spread ? axes.map((axis) => (
          <StatTile key={`spread${axis}`} label={t('probe.size.spread', { axis: axis.toUpperCase() })} value={units.figure(spread[axis])} unit={units.length} />
        )) : null}
      </div>
      {each.length > 1 ? axes.map((axis) => (
        <p key={`each${axis}`} className="m-0 font-num text-note text-mut">
          {t('probe.size.each', { axis: axis.toUpperCase(), list: each.map((one) => units.figure(one[axis])).join(' · '), unit: units.length })}
        </p>
      )) : null}
      <p className="m-0 text-note text-mut">{t('probe.size.ball', { ball, unit: units.length })}</p>
      <p className="m-0 text-note text-mut">{t('probe.size.note')}</p>
    </div>
  );
};
