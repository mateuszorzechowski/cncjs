import Button from './Button';
import Notice from './Notice';
import ProbePicture from './ProbePicture';
import ProbeWire from './ProbeWire';
import StatTile from './StatTile';
import WcsBadge from './WcsBadge';
import CornerCycle from './CornerCycle';
import CornerParams from './CornerParams';
import CentreCycle from './CentreCycle';
import CentreParams from './CentreParams';
import AreaModeChooser from './AreaModeChooser';
import { AREA_MODES } from './useHeightMapAsk';
import CornerChooser from './CornerChooser';
import MapToolChooser from './MapToolChooser';
import PaperChooser from './PaperChooser';
import { ShapeChooser, SizeResult } from './SizeSteps';
import HeightMapSetup from './HeightMapSetup';
import { HeightMapCycle, HeightMapResult } from './HeightMapSteps';
import PaperParams from './PaperParams';
import PaperScene from './PaperScene';
import ZPlateCycle from './ZPlateCycle';
import ZPlateParams from './ZPlateParams';
import ZPlateScene from './ZPlateScene';
import { METHODS, SURFACE, failureKey, phaseWords } from '../machine/probe';
import { BOSS_CYCLE } from '../machine/bossCycle';
import { HOLE_CYCLE } from '../machine/holeCycle';
import { paperScene } from '../machine/paperCycle';
import { drawnPasses, sizeCycle } from '../machine/sizeCycle';
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
const EDITORS = {
  z: ZPlateParams,
  corner: CornerParams,
  hole: (props) => <CentreParams cycle={HOLE_CYCLE} {...props} />,
  boss: (props) => <CentreParams cycle={BOSS_CYCLE} {...props} />,
  paper: PaperParams,
  'height-map': HeightMapSetup,
  // A size's, the centre's moves ending in the size; a width's by the shape chosen.
  'hole-size': (props) => <CentreParams cycle={sizeCycle('hole-size')} {...props} />,
  'boss-size': (props) => <CentreParams cycle={sizeCycle('boss-size')} {...props} />,
  width: (props) => <CentreParams cycle={sizeCycle('width', props.chosen)} {...props} />,
};
// A size measured, as the centre's: its passes those it was asked for.
const SizeCycle = ({ phase, probe }) => {
  const cycle = sizeCycle(probe?.method, probe?.options?.shape);
  return <CentreCycle cycle={cycle} phase={phase} passes={drawnPasses(cycle, probe?.params?.holePasses, probe?.params?.repeats)} />;
};
const CYCLES = {
  z: ZPlateCycle,
  corner: ({ phase, words, probe }) => <CornerCycle corner={probe?.options?.corner} phase={phase} words={words} />,
  hole: ({ phase, probe }) => <CentreCycle cycle={HOLE_CYCLE} phase={phase} passes={probe?.params?.holePasses} />,
  boss: ({ phase, probe }) => <CentreCycle cycle={BOSS_CYCLE} phase={phase} passes={probe?.params?.holePasses} />,
  'height-map': HeightMapCycle,
  'hole-size': SizeCycle,
  'boss-size': SizeCycle,
  width: SizeCycle,
};
// Which dimension the zero is shown with.
const THICKNESS = 'plateThickness';

// Where the measurement was made and Z0 went, as it was asked for.
const surfaceOf = (probe) => ({ on: probe?.options?.on ?? SURFACE.on, z0: probe?.options?.z0 ?? SURFACE.z0 });

const OUTCOMES = {
  // Design 1a: the tool lifted clear, Z0 under the plate by its thickness — or on the table.
  z: ({ plate, probe }) => (
    <ZPlateScene gap={56} marks={THICKNESS} zero={1} surface={surfaceOf(probe)} badge={{ x: 304, y: 191, text: `T ${plate}` }} label={t('probe.method.z')} className="mx-auto w-full max-w-md" />
  ),
  // The last frame of 1f: X0 Y0 from above, Z0 and X0 from the side.
  corner: ({ probe }) => <CornerCycle corner={probe?.options?.corner} done className="mx-auto w-full max-w-md" />,
  // X0 Y0 from above, at the middle of the hole.
  hole: () => <CentreCycle cycle={HOLE_CYCLE} done className="mx-auto w-full max-w-md" />,
  // X0 Y0 from above, at the middle of the part.
  boss: () => <CentreCycle cycle={BOSS_CYCLE} done className="mx-auto w-full max-w-md" />,
  // The paper's zero written: the sheet flat under the tool, the zero's line on the surface.
  paper: ({ probe }) => (
    <PaperScene {...paperScene('zero', 1, { edge: probe?.options?.edge || 'z', surface: surfaceOf(probe) })} dim={null} dia={null} stock={null} label={t('probe.method.paper')} className="mx-auto w-full max-w-md" />
  ),
};

/** The buttons at the foot of a step: back on the left — or `backLabel`'s way out — the way on at the right. */
export const Foot = ({ back, backLabel = null, children }) => (
  <div className="mt-auto flex shrink-0 justify-between gap-2 pt-4">
    {back ? <Button tone="outline" onClick={back} className="h-ctl">{backLabel || t('probe.back')}</Button> : <span />}
    <div className="flex gap-2">{children}</div>
  </div>
);

const MethodTile = ({ method, onPick }) => (
  <button
    type="button"
    onClick={() => onPick(method.id)}
    className="flex flex-col items-center gap-3 rounded-ctl border border-line bg-field p-4 text-center hover:border-acc"
  >
    <ProbePicture method={method.id} label={t(method.key)} className="h-24 w-32" />
    <span className="text-base font-semibold text-ink">{t(method.key)}</span>
    <span className="text-note text-mut">{t(method.note)}</span>
  </button>
);

// The methods that find a zero; under them, in a row of their own, the height map (Mateusz, 2026-10-02).
// The methods whose one choice is a step of its own, and what it is picked on.
const CHOOSERS = {
  corner: CornerChooser, paper: PaperChooser, 'height-map': MapToolChooser, width: ShapeChooser,
};

export const ChooseStep = ({ method, value, onChange }) => {
  const Chooser = CHOOSERS[method.id];
  return <Chooser value={value} onChange={onChange} />;
};

// How the height map's area is given, a step of its own before its figures (review note, 2026-10-02).
export const AreaWayStep = ({ map }) => (
  <AreaModeChooser modes={AREA_MODES.filter((one) => one !== 'program' || map.outline)} value={map.mode} onChange={map.setMode} />
);

export const MethodStep = ({ onPick }) => (
  <div className="flex flex-col gap-3">
    <div className="grid gap-3 @3xl/shell:grid-cols-3">
      {METHODS.filter((method) => !method.apart).map((method) => <MethodTile key={method.id} method={method} onPick={onPick} />)}
    </div>
    <div className="grid gap-3 @3xl/shell:grid-cols-3">
      {METHODS.filter((method) => method.apart).map((method) => <MethodTile key={method.id} method={method} onPick={onPick} />)}
    </div>
  </div>
);

export const PrepareStep = ({
  method, chosen, surface, onSurface, fields, texts, onText, bad, wcs, split = null,
}) => {
  const Editor = EDITORS[method.id];
  return (
    // The method, for a review note pinned on its drawing; `contents` keeps the layout the editor's own.
    <div data-probe-method={method.id} className="contents">
      <Editor
        fields={fields}
        texts={texts}
        onText={onText}
        bad={bad}
        wcs={wcs}
        corner={chosen}
        chosen={chosen}
        surface={surface}
        onSurface={onSurface}
        split={split}
        intro={method.how ? <p className="m-0 text-base text-ink">{t(method.how)}</p> : null}
        note={<p className="m-0 text-note text-mut">{t('probe.remember')}</p>}
      />
    </div>
  );
};

export const WireStep = ({
  lit, touched, plate, how = 'probe.wire.how', stuck = null,
}) => {
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
      <p className="m-0 text-base text-ink">{t(how)}</p>
      <ProbeWire lit={lit} plate={plate} />
      {/* Dalej is never held back (Mateusz, 2026-09-30); an untested wire is said
        * instead, beside the pin when wide, so the step still needs no scroll. */}
      <div className="grid gap-3 @3xl/shell:grid-cols-2">
        <StatTile label={t('diag.pin.probe')} value={state} tone={lit ? 'warn' : undefined} />
        {touched ? null : <Notice>{t('probe.wire.untested')}</Notice>}
      </div>
      {lit && stuck ? <Notice>{t(stuck)}</Notice> : null}
      {lit === null ? <p className="m-0 text-note text-mut">{t('probe.wire.unknown')}</p> : null}
    </div>
  );
};

export const MeasureStep = ({ probe, machine = null }) => {
  const step = probe?.step;
  const phase = phaseWords(step?.phase);
  const words = step ? t(phase.key, { axis: phase.axis }) : NO_READING;
  const Cycle = CYCLES[probe?.method];
  return (
    <div className="flex flex-col gap-3">
      {Cycle ? (
        <>
          <span className="text-note text-mut">{step ? t('probe.measure.stepOf', { n: step.index + 1, total: step.total }) : null}</span>
          <Cycle phase={step?.phase} words={words} probe={probe} machine={machine} />
        </>
      ) : (
        <StatTile
          label={step ? t('probe.measure.stepOf', { n: step.index + 1, total: step.total }) : t('probe.step.measure')}
          value={words}
        />
      )}
      {step?.waits ? null : <p className="m-0 text-note text-mut">{t('probe.measure.note')}</p>}
    </div>
  );
};

export const ResultStep = ({ probe, plate, machine = null }) => {
  const units = useUnits();
  const Outcome = OUTCOMES[probe?.method];
  // A height map is a surface to keep, not a zero: no system, no shift.
  if (probe?.state !== 'failed' && probe?.result?.map) {
    return <HeightMapResult probe={probe} machine={machine} />;
  }
  // A size: what it came out at, nothing to write.
  if (probe?.state !== 'failed' && probe?.result?.size) {
    return <SizeResult probe={probe} />;
  }
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
  // What else the touches told, for the operator to check: a hole's size each way.
  const found = probe?.result?.found || {};
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
        {['x', 'y'].filter((axis) => axis in found).map((axis) => (
          <StatTile
            key={`found${axis}`}
            label={t('probe.result.found', { axis: axis.toUpperCase() })}
            value={units.figure(found[axis])}
            unit={units.length}
          />
        ))}
      </div>
      <p className="m-0 text-note text-mut">{t('probe.result.note')}</p>
    </div>
  );
};
