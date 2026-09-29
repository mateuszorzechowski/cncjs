import Button from './Button';
import Notice from './Notice';
import ProbePicture from './ProbePicture';
import ProbeWire from './ProbeWire';
import SegmentedChoice from './SegmentedChoice';
import StatTile from './StatTile';
import TextField from './TextField';
import WcsBadge from './WcsBadge';
import ZPlateCycle from './ZPlateCycle';
import ZPlateParams from './ZPlateParams';
import ZPlateScene from './ZPlateScene';
import {
  FIELDS, METHODS, failureKey, fieldUnit, phaseWords,
} from '../machine/probe';
import { NO_READING } from '../machine/readings';
import { useUnits } from './units';
import { t } from '../i18n';

/**
 * The probe wizard's steps, one component each — `screens/ProbeScreen`
 * decides which is shown and what the buttons at its foot do.
 */

// A field the server would not take, framed in red.
const BAD = 'bad';

// The mask the jog steps use: a figure and nothing else, a comma taken as a point.
const figureOnly = (text) => text.replace(/[^0-9.,]/g, '');

const signed = (text) => (text.startsWith('-') || text === NO_READING ? text : `+${text}`);

/*
 * The methods that have their design's drawings (the flat set, 2026-09-29):
 * the figures set on the drawing, the measurement played on it, the zero
 * shown on it. The others keep their plain picture and fields for now.
 */
const EDITORS = { z: ZPlateParams };
const CYCLES = { z: ZPlateCycle };
// Which dimension the zero is shown with.
const THICKNESS = 'plateThickness';

const OUTCOMES = {
  // Design 1a: the tool lifted clear, Z0 under the plate by its thickness.
  z: ({ plate }) => (
    <ZPlateScene gap={56} marks={THICKNESS} zero={1} badge={{ x: 304, y: 191, text: `T ${plate}` }} label={t('probe.method.z')} className="mx-auto w-full max-w-md" />
  ),
};

/** The buttons at the foot of a step: back on the left, the way on at the right. */
export const Foot = ({ back, children }) => (
  <div className="mt-auto flex shrink-0 justify-between gap-2 pt-4">
    {back ? <Button tone="outline" onClick={back} className="h-ctl">{t('probe.back')}</Button> : <span />}
    <div className="flex gap-2">{children}</div>
  </div>
);

export const MethodStep = ({ onPick }) => (
  <div className="grid gap-3 @3xl/shell:grid-cols-3">
    {METHODS.map((method) => (
      <button
        key={method.id}
        type="button"
        onClick={() => onPick(method.id)}
        className="flex flex-col items-center gap-3 rounded-ctl border border-line bg-field p-4 text-center hover:border-acc"
      >
        <ProbePicture method={method.id} choice={method.choice?.first} label={t(method.key)} className="h-24 w-32" />
        <span className="text-base font-semibold text-ink">{t(method.key)}</span>
        <span className="text-note text-mut">{t(method.note)}</span>
      </button>
    ))}
  </div>
);

export const PrepareStep = ({ method, chosen, onChoose, fields, texts, onText, bad }) => {
  const units = useUnits();
  const Editor = EDITORS[method.id];
  if (Editor) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-base text-ink">{t(method.how)}</p>
        <p className="m-0 text-note text-mut">{t('probe.remember')}</p>
        <Editor fields={fields} texts={texts} onText={onText} bad={bad} />
      </div>
    );
  }
  return (
    <div className="grid gap-4 @3xl/shell:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex flex-col items-center gap-3">
        <ProbePicture method={method.id} choice={chosen} label={t(method.key)} className="h-40 w-52" />
        {method.choice ? (
          <SegmentedChoice
            options={method.choice.list.map((c) => c.id)}
            value={chosen}
            onChange={onChoose}
            format={(id) => t(method.choice.list.find((c) => c.id === id).key)}
            label={t(method.choice.key)}
            columns={method.choice.columns}
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <p className="m-0 text-base text-ink">{t(method.how)}</p>
        <p className="m-0 text-note text-mut">{t('probe.remember')}</p>
        <div className="grid gap-2 @xl/shell:grid-cols-2">
          {fields.map((name) => (
            <div key={name} className="flex flex-col gap-1">
              <span className="text-note text-mut">{t(FIELDS[name].key)}</span>
              <TextField
                label={t(FIELDS[name].key)}
                inputMode="decimal"
                unit={fieldUnit(name, units.rule)}
                value={texts[name] ?? ''}
                state={bad === name ? BAD : undefined}
                onChange={(event) => onText(name, figureOnly(event.target.value))}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const WireStep = ({ lit, touched }) => {
  let state = t('probe.wire.waiting');
  if (lit === null) {
    state = NO_READING;
  } else if (lit) {
    state = t('probe.wire.touching');
  } else if (touched) {
    state = t('probe.wire.ok');
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-base text-ink">{t('probe.wire.how')}</p>
      <ProbeWire lit={lit} />
      <StatTile label={t('diag.pin.probe')} value={state} tone={lit ? 'warn' : undefined} />
      {lit === null ? <p className="m-0 text-note text-mut">{t('probe.wire.unknown')}</p> : null}
    </div>
  );
};

export const MeasureStep = ({ probe }) => {
  const step = probe?.step;
  const phase = phaseWords(step?.phase);
  const words = step ? t(phase.key, { axis: phase.axis }) : NO_READING;
  const Cycle = CYCLES[probe?.method];
  return (
    <div className="flex flex-col gap-3">
      {Cycle ? (
        <>
          <span className="text-note text-mut">{step ? t('probe.measure.stepOf', { n: step.index + 1, total: step.total }) : null}</span>
          <Cycle phase={step?.phase} words={words} />
        </>
      ) : (
        <StatTile
          label={step ? t('probe.measure.stepOf', { n: step.index + 1, total: step.total }) : t('probe.step.measure')}
          value={words}
        />
      )}
      <p className="m-0 text-note text-mut">{t('probe.measure.note')}</p>
    </div>
  );
};

export const ResultStep = ({ probe, plate }) => {
  const units = useUnits();
  const Outcome = OUTCOMES[probe?.method];
  if (probe?.state === 'failed') {
    const { code, phase } = probe.failure || {};
    const at = phaseWords(phase);
    return (
      <Notice>
        <span>{t(failureKey(code), { code, axis: at.axis })}</span>
      </Notice>
    );
  }
  const shift = probe?.result?.shift || {};
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-base text-ink">{t('probe.result.into')}</span>
        <WcsBadge wcs={probe?.wcs} />
      </div>
      {Outcome ? <Outcome plate={plate} /> : null}
      <div className="grid gap-2 @3xl/shell:grid-cols-3">
        {['x', 'y', 'z'].filter((axis) => axis in shift).map((axis) => (
          <StatTile
            key={axis}
            label={t('probe.result.shift', { axis: axis.toUpperCase() })}
            value={signed(units.figure(shift[axis]))}
            unit={units.length}
          />
        ))}
      </div>
      <p className="m-0 text-note text-mut">{t('probe.result.note')}</p>
    </div>
  );
};
