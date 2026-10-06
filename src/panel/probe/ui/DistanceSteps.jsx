import { useState } from 'react';
import DistanceDrawing from './DistanceDrawing';
import HeightDrawing from './HeightDrawing';
import SegmentedChoice from '../../ui/SegmentedChoice';
import StatTile from '../../ui/StatTile';
import WcsBadge from '../../ui/WcsBadge';
import { Tiles } from './SizeSteps';
import { filmed } from '../machine/sizeCycle';
import {
  PAIRS, pairChoice, pairEnds, pairFits, pairOf, shapeOf,
} from '../machine/probe';
import { degrees } from '../../machine/units';
import { useUnits } from '../../ui/units';
import { t } from '../../i18n/index';

/**
 * Pomiar's pairs, two features measured one after the other with the jog
 * between — the server's `strategies/distance`: a distance (Mateusz,
 * 2026-10-05: *"złożenie A + B, wszystkie trzy pary"*), each end a hole, a
 * stud or an edge; and a corner, two edges that meet (*"zrób 2"*).
 */

const ENDS = ['a', 'b'];
const END_KEYS = { a: 'probe.distance.first', b: 'probe.distance.second' };

/**
 * The two ends, each a row of tiles. A second that does not go with the
 * first — an edge square to it for a distance, one running the same way for
 * a corner — cannot be picked; a first that would leave none moves the
 * second to the first that goes with it.
 */
export const PairChooser = ({ value, onChange }) => {
  const pair = pairOf(value);
  const { parts } = PAIRS[pair.shape];
  const fits = (a, b) => pairFits(pair.shape, a, b);
  const pick = (end, part) => {
    const next = { ...pair, [end]: part };
    if (!fits(next.a, next.b)) {
      next.b = parts.find((one) => fits(next.a, one));
    }
    onChange(pairChoice(next));
  };
  return (
    <div className="flex flex-col gap-4">
      {ENDS.map((end) => (
        <div key={end} className="flex flex-col gap-2">
          <h3 className="m-0 text-cap font-semibold uppercase tracking-[0.1em] text-mut">{t(END_KEYS[end])}</h3>
          <Tiles
            label={t(END_KEYS[end])}
            items={parts.map((part) => ({
              id: part, shape: part, key: shapeOf(part).key, disabled: end === 'b' && !fits(pair.a, part),
            }))}
            on={pair[end]}
            onPick={(part) => pick(end, part)}
            className={`grid-cols-2 ${parts.length > 8 ? '@3xl/shell:grid-cols-5' : '@3xl/shell:grid-cols-4'}`}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * A distance's Setup: each end's moves, one at a time, picked above the
 * drawing (`render(shape, head)`) — the figures are one set for both. Any
 * other shape as it is.
 */
export const DistanceSetup = ({ chosen, render }) => {
  const pair = pairOf(chosen);
  const [end, setEnd] = useState('a');
  // Two surfaces are one drawing, a step with both touches on it: nothing to pick; a pair played as one film neither.
  if (!pair || PAIRS[pair.shape].fixed) {
    return render(pair ? pair.a : chosen, null);
  }
  if (filmed(pair)) {
    return render(chosen, null);
  }
  return render(pair[end], (
    <SegmentedChoice
      options={ENDS}
      value={end}
      onChange={setEnd}
      format={(one) => `${t(END_KEYS[one])} · ${t(shapeOf(pair[one]).key)}`}
      label={t('probe.distance.setupLabel')}
      joined
    />
  ));
};

// Which pair it was: two centres, a centre and an edge, or two edges.
const pairKind = (parts) => parts.filter((one) => one.kind === 'edge').length;
const DIST_KEYS = ['probe.distance.centres', 'probe.distance.fromEdge', 'probe.distance.edges'];
const WHY_KEYS = ['probe.distance.centresWhy', 'probe.distance.fromEdgeWhy', 'probe.distance.edgesWhy'];

// An end's own figure: a circle's diameter, an edge's angle.
const ownOf = (one, units) => (one.kind === 'edge'
  ? { value: degrees(one.size.a), unit: '°', key: 'probe.size.angle' }
  : { value: units.figure(one.size.d), unit: units.length, key: 'probe.size.diameter' });

/**
 * What a distance came out at: the distance, each way and the line's angle
 * for two centres, how far off parallel for two edges; then each end's own
 * figure. Nothing to write: no zero.
 */
export const DistanceResult = ({ probe }) => {
  const units = useUnits();
  const { size, parts } = probe.result.size;
  const pair = probe.options;
  const kind = pairKind(parts);
  // Wide, the drawing a column of its own beside the figures, as a size's (`SizeResult`).
  return (
    <div className="grid items-start gap-4 @3xl/shell:grid-cols-2">
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-ctl border border-line bg-panel">
        <DistanceDrawing probe={probe} label={t(DIST_KEYS[kind])} className="max-h-80 @[1800px]/shell:max-h-[28rem]" />
      </div>
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid gap-2 @3xl/shell:grid-cols-2">
        <StatTile label={t(DIST_KEYS[kind])} value={units.figure(size.dist)} unit={units.length} />
        {Number.isFinite(size.par) ? <StatTile label={t('probe.distance.par')} value={degrees(size.par)} unit="°" /> : null}
        {['dx', 'dy'].filter((key) => Number.isFinite(size[key])).map((key) => (
          <StatTile key={key} label={t('probe.distance.along', { axis: key[1].toUpperCase() })} value={units.figure(size[key])} unit={units.length} />
        ))}
        {Number.isFinite(size.a) ? <StatTile label={t('probe.distance.angle')} value={degrees(size.a)} unit="°" /> : null}
      </div>
      <p className="m-0 text-note text-mut">{t(WHY_KEYS[kind])}</p>
      <div className="grid gap-2 @3xl/shell:grid-cols-2">
        {parts.map((one, n) => {
          const own = ownOf(one, units);
          return (
            <StatTile
              key={ENDS[n]}
              label={`${t(END_KEYS[ENDS[n]])} · ${t(shapeOf(pair[ENDS[n]]).key)} · ${t(own.key)}`}
              value={own.value}
              unit={own.unit}
            />
          );
        })}
      </div>
      <p className="m-0 text-note text-mut">{t('probe.size.ball', { ball: units.figure(probe.params?.ballDiameter), unit: units.length })}</p>
      <p className="m-0 text-note text-mut">{t('probe.distance.note')}</p>
    </div>
    </div>
  );
};

/**
 * What a corner came out at: the angle inside the part between its two
 * edges and how far off square; where they meet, in the system measured in
 * — a zero there if asked (`AfterFoot`); each edge's own angle.
 */
export const CornerResult = ({ probe }) => {
  const units = useUnits();
  const {
    size, parts, centre,
  } = probe.result.size;
  // A pair's two ends — or a corner's two edges, from one cycle (`pairEnds`).
  const pair = pairEnds(probe.options);
  return (
    <div className="grid items-start gap-4 @3xl/shell:grid-cols-2">
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-ctl border border-line bg-panel">
        <DistanceDrawing probe={probe} label={t('probe.meet.angle')} className="max-h-80 @[1800px]/shell:max-h-[28rem]" />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="grid gap-2 @3xl/shell:grid-cols-2">
          <StatTile label={t('probe.meet.angle')} value={degrees(size.a)} unit="°" />
          <StatTile label={t('probe.size.square')} value={degrees(size.square)} unit="°" />
        </div>
        <p className="m-0 text-note text-mut">{t('probe.meet.angleWhy')}</p>
        <div className="flex items-center gap-3">
          <span className="text-base text-ink">{t('probe.meet.at')}</span>
          <WcsBadge wcs={probe.wcs} />
        </div>
        <div className="grid gap-2 @3xl/shell:grid-cols-2">
          {['x', 'y'].map((axis) => (
            <StatTile key={axis} label={t('probe.meet.axis', { axis: axis.toUpperCase() })} value={units.figure(centre[axis])} unit={units.length} />
          ))}
        </div>
        <div className="grid gap-2 @3xl/shell:grid-cols-2">
          {parts.map((one, n) => (
            <StatTile key={ENDS[n]} label={`${t(END_KEYS[ENDS[n]])} · ${t(shapeOf(pair[ENDS[n]]).key)} · ${t('probe.size.angle')}`} value={degrees(one.size.a)} unit="°" />
          ))}
        </div>
        <p className="m-0 text-note text-mut">{t('probe.size.angleWhy')}</p>
        <p className="m-0 text-note text-mut">{t('probe.size.note')}</p>
      </div>
    </div>
  );
};

/**
 * What a height came out at: two surfaces, how far the second stands over
 * the first, and each one's Z — in the system measured in, and never a zero
 * (the probe's length is not the tool's).
 */
export const HeightResult = ({ probe }) => {
  const units = useUnits();
  const { size, parts } = probe.result.size;
  return (
    <div className="grid items-start gap-4 @3xl/shell:grid-cols-2">
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-ctl border border-line bg-panel">
        <HeightDrawing probe={probe} label={t('probe.height.dz')} className="max-h-80 @[1800px]/shell:max-h-[28rem]" />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <StatTile label={t('probe.height.dz')} value={units.figure(size.dz)} unit={units.length} />
        <p className="m-0 text-note text-mut">{t('probe.height.dzWhy')}</p>
        <div className="flex items-center gap-3">
          <span className="text-base text-ink">{t('probe.height.at')}</span>
          <WcsBadge wcs={probe.wcs} />
        </div>
        <div className="grid gap-2 @3xl/shell:grid-cols-2">
          {parts.map((one, n) => (
            <StatTile key={ENDS[n]} label={t('probe.height.zOf', { end: t(END_KEYS[ENDS[n]]) })} value={units.figure(one.centre.z)} unit={units.length} />
          ))}
        </div>
        <p className="m-0 text-note text-mut">{t('probe.height.zWhy')}</p>
        <p className="m-0 text-note text-mut">{t('probe.height.note')}</p>
      </div>
    </div>
  );
};
