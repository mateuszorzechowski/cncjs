import { useState } from 'react';
import SegmentedChoice from './SegmentedChoice';
import StatTile from './StatTile';
import { Tiles } from './SizeSteps';
import {
  PARTS, pairChoice, pairCrosses, pairOf, shapeOf,
} from '../machine/probe';
import { degrees } from '../machine/units';
import { useUnits } from './units';
import { t } from '../i18n';

/**
 * Pomiar's distance (Mateusz, 2026-10-05: *"złożenie A + B, wszystkie trzy
 * pary"*): two features, each a hole, a stud or an edge, measured one after
 * the other with the jog between — the server's `strategies/distance`.
 */

const ENDS = ['a', 'b'];
const END_KEYS = { a: 'probe.distance.first', b: 'probe.distance.second' };

/**
 * The two ends, each a row of tiles. An edge square to the other end's
 * cannot be picked; picking one that would be makes the other the same.
 */
export const PairChooser = ({ value, onChange }) => {
  const pair = pairOf(value);
  const pick = (end, part) => {
    const other = end === 'a' ? 'b' : 'a';
    const next = { ...pair, [end]: part };
    onChange(pairChoice(pairCrosses(next.a, next.b) ? { ...next, [other]: part } : next));
  };
  return (
    <div className="flex flex-col gap-4">
      {ENDS.map((end) => (
        <div key={end} className="flex flex-col gap-2">
          <h3 className="m-0 text-cap font-semibold uppercase tracking-[0.1em] text-mut">{t(END_KEYS[end])}</h3>
          <Tiles
            label={t(END_KEYS[end])}
            items={PARTS.map((part) => ({
              id: part, shape: part, key: shapeOf(part).key, disabled: end === 'b' && pairCrosses(pair.a, part),
            }))}
            on={pair[end]}
            onPick={(part) => pick(end, part)}
            className="grid-cols-2 @3xl/shell:grid-cols-6"
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
  if (!pair) {
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
  return (
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
  );
};
