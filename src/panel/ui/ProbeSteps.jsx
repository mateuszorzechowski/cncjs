import Button from './Button';
import Notice from './Notice';
import ProbePicture from './ProbePicture';
import SegmentedChoice from './SegmentedChoice';
import StatTile from './StatTile';
import TextField from './TextField';
import WcsBadge from './WcsBadge';
import {
  CORNERS, FIELDS, FIRST_CORNER, METHODS, failureKey, fieldUnit, phaseWords,
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
        disabled={method.soon}
        onClick={() => onPick(method.id)}
        className="flex flex-col items-center gap-3 rounded-ctl border border-line bg-field p-4 text-center hover:border-acc disabled:opacity-45 disabled:hover:border-line"
      >
        <ProbePicture method={method.id} corner={FIRST_CORNER} label={t(method.key)} className="h-24 w-32" />
        <span className="text-base font-semibold text-ink">{t(method.key)}</span>
        <span className="text-note text-mut">{method.soon ? t('probe.method.soon') : t(method.note)}</span>
      </button>
    ))}
  </div>
);

export const PrepareStep = ({ method, corner, onCorner, fields, texts, onText, bad }) => {
  const units = useUnits();
  return (
    <div className="grid gap-4 @3xl/shell:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex flex-col items-center gap-3">
        <ProbePicture method={method.id} corner={corner} label={t(method.key)} className="h-40 w-52" />
        {method.id === 'corner' ? (
          <SegmentedChoice
            options={CORNERS.map((c) => c.id)}
            value={corner}
            onChange={onCorner}
            format={(id) => t(CORNERS.find((c) => c.id === id).key)}
            label={t('probe.cornerLabel')}
            columns={2}
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
      <StatTile label={t('diag.pin.probe')} value={state} tone={lit ? 'warn' : undefined} />
      {lit === null ? <p className="m-0 text-note text-mut">{t('probe.wire.unknown')}</p> : null}
    </div>
  );
};

export const MeasureStep = ({ probe }) => {
  const step = probe?.step;
  const phase = phaseWords(step?.phase);
  return (
    <div className="flex flex-col gap-3">
      <StatTile
        label={step ? t('probe.measure.stepOf', { n: step.index + 1, total: step.total }) : t('probe.step.measure')}
        value={step ? t(phase.key, { axis: phase.axis }) : NO_READING}
      />
      <p className="m-0 text-note text-mut">{t('probe.measure.note')}</p>
    </div>
  );
};

export const ResultStep = ({ probe }) => {
  const units = useUnits();
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
      <div className="grid grid-cols-3 gap-2">
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
