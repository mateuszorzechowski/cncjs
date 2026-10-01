import Button from './Button';
import Notice from './Notice';
import ProbePicture from './ProbePicture';
import ProbeWire from './ProbeWire';
import StatTile from './StatTile';
import WcsBadge from './WcsBadge';
import CornerCycle from './CornerCycle';
import CornerParams from './CornerParams';
import PaperParams from './PaperParams';
import PaperScene from './PaperScene';
import ZPlateCycle from './ZPlateCycle';
import ZPlateParams from './ZPlateParams';
import ZPlateScene from './ZPlateScene';
import { METHODS, failureKey, phaseWords } from '../machine/probe';
import { paperScene } from '../machine/paperCycle';
import { NO_READING } from '../machine/readings';
import { useUnits } from './units';
import { t } from '../i18n';

/**
 * The probe wizard's steps, one component each — `screens/ProbeScreen`
 * decides which is shown and what the buttons at its foot do.
 */

const signed = (text) => (text.startsWith('-') || text === NO_READING ? text : `+${text}`);

/*
 * Each method's drawings (the flat set, 2026-09-29, and the paper's,
 * 2026-09-30): the figures set on the drawing, the measurement played on it,
 * the zero shown on it.
 */
const EDITORS = { z: ZPlateParams, corner: CornerParams, paper: PaperParams };
const CYCLES = {
  z: ZPlateCycle,
  corner: ({ phase, words, probe }) => <CornerCycle corner={probe?.options?.corner} phase={phase} words={words} />,
};
// Which dimension the zero is shown with.
const THICKNESS = 'plateThickness';

const OUTCOMES = {
  // Design 1a: the tool lifted clear, Z0 under the plate by its thickness.
  z: ({ plate }) => (
    <ZPlateScene gap={56} marks={THICKNESS} zero={1} badge={{ x: 304, y: 191, text: `T ${plate}` }} label={t('probe.method.z')} className="mx-auto w-full max-w-md" />
  ),
  // The last frame of 1f: X0 Y0 from above, Z0 and X0 from the side.
  corner: ({ probe }) => <CornerCycle corner={probe?.options?.corner} done className="mx-auto w-full max-w-md" />,
  // The paper's zero written: the sheet flat under the tool, the zero's line on the surface.
  paper: ({ probe }) => (
    <PaperScene {...paperScene('zero', 1, { edge: probe?.options?.edge || 'z' })} dim={null} dia={null} label={t('probe.method.paper')} className="mx-auto w-full max-w-md" />
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

export const PrepareStep = ({
  method, chosen, onChoose, fields, texts, onText, bad, wcs, split = null,
}) => {
  const Editor = EDITORS[method.id];
  return (
    <Editor
      fields={fields}
      texts={texts}
      onText={onText}
      bad={bad}
      wcs={wcs}
      corner={chosen}
      chosen={chosen}
      onChoose={onChoose}
      split={split}
      intro={method.how ? <p className="m-0 text-base text-ink">{t(method.how)}</p> : null}
      note={<p className="m-0 text-note text-mut">{t('probe.remember')}</p>}
    />
  );
};

export const WireStep = ({ lit, touched, plate }) => {
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
      <ProbeWire lit={lit} plate={plate} />
      {/* Dalej is never held back (Mateusz, 2026-09-30); an untested wire is said
        * instead, beside the pin when wide, so the step still needs no scroll. */}
      <div className="grid gap-3 @3xl/shell:grid-cols-2">
        <StatTile label={t('diag.pin.probe')} value={state} tone={lit ? 'warn' : undefined} />
        {touched ? null : <Notice>{t('probe.wire.untested')}</Notice>}
      </div>
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
          <Cycle phase={step?.phase} words={words} probe={probe} />
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
      {Outcome ? <Outcome plate={plate} probe={probe} /> : null}
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
