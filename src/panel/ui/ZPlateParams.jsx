import { useState } from 'react';
import CycleStages from './CycleStages';
import TextField from './TextField';
import ZPlateScene from './ZPlateScene';
import useTicker from './useTicker';
import { FIELDS, fieldUnit } from '../machine/probe';
import { FIGURES, cycleAt, sceneAt } from '../machine/probeCycle';
import { useUnits } from './units';
import { t } from '../i18n';

// A figure and nothing else, a comma taken as a point — the jog steps' mask.
const figureOnly = (text) => text.replace(/[^0-9.,]/g, '');

const numberOf = (text) => Number(String(text).replace(',', '.'));

// A field the server would not take, framed in red.
const BAD = 'bad';

// The figure whose part draws the Z0 line.
const ZERO = 'plateThickness';

/** A figure as its badge on the drawing says it: a rate as `F100`, a length with its unit. */
const said = (name, text, units) => (FIELDS[name].kind === 'feed' ? `F${text}` : `${text} ${fieldUnit(name, units.rule)}`);

/*
 * The line each figure goes into, as a reminder of what it does. Written
 * with the figures typed, so it changes with them; the plate's thickness
 * goes into no line of its own and says its sum instead.
 */
const lineOf = (name, v) => ({
  maxZ: `G38.2 Z-${v.maxZ} F${v.fast}`,
  fast: `G38.2 Z-${v.maxZ} F${v.fast}`,
  retract: `G0 Z+${v.retract}`,
  slow: `G38.2 Z-${numberOf(v.retract) * 2} F${v.slow}`,
  plateThickness: t('probe.cycle.zeroSum', { t: v.plateThickness }),
  lift: `G0 Z+${v.lift}`,
}[name]);

const CAPTIONS = {
  maxZ: 'probe.cycle.maxZ',
  fast: 'probe.cycle.fast',
  retract: 'probe.cycle.retract',
  slow: 'probe.cycle.slow',
  plateThickness: 'probe.cycle.plateThickness',
  lift: 'probe.cycle.lift',
};

/**
 * The Z plate's figures beside their drawing (design 1l, laid out as a form
 * at Mateusz's word, 2026-09-29: *"rysunek z lewej"*). The drawing on the
 * left, the fields on the right as before; the field being set plays the part
 * of the cycle it is used in, with only its value on the drawing. With no
 * field in hand the whole cycle plays, stopping after each part.
 */
const ZPlateParams = ({ fields, texts, onText, bad }) => {
  const units = useUnits();
  const [picked, setPicked] = useState(null);
  const ms = useTicker(picked || 'cycle');
  const whole = picked ? null : cycleAt(ms);
  const shown = picked || whole.name;
  const figure = FIGURES[shown];
  const scene = picked ? sceneAt(picked, ms) : whole.scene;
  // Its value and dimension for the figure being set; in the whole cycle only the zero's line.
  const badge = picked ? { x: figure.badge[0], y: figure.badge[1], text: said(picked, texts[picked] ?? '', units) } : null;
  const marks = picked || (shown === ZERO ? ZERO : null);

  return (
    <div className="grid gap-4 @3xl/shell:grid-cols-2">
      <div className="flex min-w-0 flex-col self-start overflow-hidden rounded-ctl border border-line bg-panel">
        <CycleStages stage={figure?.stage} />
        <ZPlateScene {...scene} marks={marks} badge={badge} label={t('probe.method.z')} className="w-full" />
        <div className="flex flex-col items-center justify-center gap-1 border-t border-line px-2 py-2 text-center">
          <span className="text-note font-semibold text-ink">{t(CAPTIONS[shown])}</span>
          <span className="font-num text-cap text-mut">{lineOf(shown, texts)}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {fields.map((name) => (
          <div key={name} className="flex flex-col gap-1">
            <span className={`text-note ${name === picked ? 'font-semibold text-acc' : 'text-mut'}`}>{t(FIELDS[name].key)}</span>
            <TextField
              label={t(FIELDS[name].key)}
              inputMode="decimal"
              unit={fieldUnit(name, units.rule)}
              value={texts[name] ?? ''}
              state={bad === name ? BAD : undefined}
              onFocus={() => setPicked(name)}
              onBlur={() => setPicked(null)}
              onChange={(event) => onText(name, figureOnly(event.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ZPlateParams;
