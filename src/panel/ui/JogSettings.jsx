import { useState } from 'react';
import Button from './Button';
import SettingRow from './SettingRow';
import SettingSummary from './SettingSummary';
import Sheet from './Sheet';
import Stepper from './Stepper';
import TextField from './TextField';
import { saveUnits } from '../machine/units';
import { MOST_STEPS, readSteps } from '../machine/jogSteps';
import { useUnits } from './units';
import { NO_READING } from '../machine/readings';
import { t } from '../i18n';

/**
 * The jog card's steps and starting rates, set here — the server's, per unit
 * (Mateusz, 2026-09-24: *"w ustawieniach się dorobi"*). The defaults are the
 * server's rule (`services/units`); what is set here goes over them and back
 * to them with one button.
 *
 * Two rows in Preferences, each opening a sheet: the steps, typed — a list
 * a machinist has in their head is quicker typed than dialled — and the
 * rates, on the jog card's own stepper. What the server says comes back over
 * the socket to every panel (`units:change`), this one with them.
 */

const joined = (steps) => (steps ?? []).map(String).join(' · ');

// The mask: a figure and nothing else — digits and one decimal point, a
// comma taken as one.
const figureOnly = (text) => text.replace(/[^0-9.,]/g, '');

const StepFields = ({ title, values, unit, onChange }) => (
  <div className="flex flex-col gap-2">
    <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">{title}</span>
    <div className="grid grid-cols-3 gap-2">
      {values.map((value, i) => (
        <TextField
          // A list of fields in a fixed order; nothing is inserted between them.
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          label={t('jogSettings.stepN', { axes: title, n: i + 1 })}
          inputMode="decimal"
          unit={unit}
          value={value}
          onChange={(event) => onChange(values.map((v, j) => (j === i ? figureOnly(event.target.value) : v)))}
        />
      ))}
    </div>
  </div>
);

const padded = (steps) => [...steps.map(String), ...Array(MOST_STEPS - steps.length).fill('')];

const StepsSheet = ({ jog, onClose }) => {
  const units = useUnits();
  const [xy, setXy] = useState(() => padded(jog.xySteps));
  const [z, setZ] = useState(() => padded(jog.zSteps));
  const [refused, setRefused] = useState(false);
  const save = (change) => saveUnits({ jog: change }).then(onClose).catch(() => setRefused(true));
  const xySteps = readSteps(xy);
  const zSteps = readSteps(z);
  return (
    <Sheet title={t('jogSettings.stepsTitle')} onClose={onClose}>
      <p className="m-0 text-note text-mut">{t('jogSettings.stepsHow', { most: MOST_STEPS })}</p>
      <StepFields title={t('jogSettings.xy')} values={xy} unit={units.length} onChange={setXy} />
      <StepFields title={t('jogSettings.z')} values={z} unit={units.length} onChange={setZ} />
      {refused || !xySteps || !zSteps ? (
        <p className="m-0 text-note text-red">{t('jogSettings.invalid')}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button tone="primary" disabled={!xySteps || !zSteps} onClick={() => save({ xySteps, zSteps })} className="h-ctl flex-1">
          {t('jogSettings.save')}
        </Button>
        <Button tone="outline" onClick={() => save(null)} className="h-ctl flex-1">
          {t('jogSettings.defaults')}
        </Button>
      </div>
    </Sheet>
  );
};

const RatesSheet = ({ jog, onClose }) => {
  const [xy, setXy] = useState(jog.xy.rate);
  const [z, setZ] = useState(jog.z.rate);
  const units = useUnits();
  const save = (change) => saveUnits({ jog: change }).then(onClose).catch(onClose);
  const stepper = (group, value, onChange, title) => (
    <div className="flex flex-col gap-2">
      <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">{title}</span>
      <Stepper
        value={value}
        onChange={onChange}
        fine={group.fine}
        coarse={group.coarse}
        min={group.min}
        max={group.max}
        label={t('jog.speedFor', { axes: title })}
        unit={units.feed}
      />
    </div>
  );
  return (
    <Sheet title={t('jogSettings.ratesTitle')} onClose={onClose}>
      <p className="m-0 text-note text-mut">{t('jogSettings.ratesHow')}</p>
      {stepper(jog.xy, xy, setXy, t('jogSettings.xy'))}
      {stepper(jog.z, z, setZ, t('jogSettings.z'))}
      <div className="flex flex-wrap gap-2">
        <Button tone="primary" onClick={() => save({ xy: { rate: xy }, z: { rate: z } })} className="h-ctl flex-1">
          {t('jogSettings.save')}
        </Button>
        <Button tone="outline" onClick={() => save(null)} className="h-ctl flex-1">
          {t('jogSettings.defaults')}
        </Button>
      </div>
    </Sheet>
  );
};

const JogSettings = () => {
  const units = useUnits();
  const jog = units.rule?.jog;
  const [editing, setEditing] = useState(null);
  const close = () => setEditing(null);
  return (
    <>
      <SettingRow title={t('jogSettings.stepsTitle')} note={t('jogSettings.stepsNote')} scope="server">
        <SettingSummary
          label={t('jogSettings.stepsTitle')}
          values={[
            { value: jog ? `XY ${joined(jog.xySteps)}` : NO_READING, unit: units.length },
            { value: jog ? `Z ${joined(jog.zSteps)}` : NO_READING, unit: units.length },
          ]}
          disabled={!jog}
          onOpen={() => setEditing('steps')}
        />
      </SettingRow>
      <SettingRow title={t('jogSettings.ratesTitle')} note={t('jogSettings.ratesNote')} scope="server">
        <SettingSummary
          label={t('jogSettings.ratesTitle')}
          values={[
            { value: jog ? `XY ${jog.xy.rate}` : NO_READING, unit: units.feed },
            { value: jog ? `Z ${jog.z.rate}` : NO_READING, unit: units.feed },
          ]}
          disabled={!jog}
          onOpen={() => setEditing('rates')}
        />
      </SettingRow>
      {editing === 'steps' && jog ? <StepsSheet jog={jog} onClose={close} /> : null}
      {editing === 'rates' && jog ? <RatesSheet jog={jog} onClose={close} /> : null}
    </>
  );
};

export default JogSettings;
