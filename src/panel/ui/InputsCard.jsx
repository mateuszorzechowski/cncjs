import Card from './Card';
import StatTile from './StatTile';
import { accessoriesOf, pinsLit } from '../machine/inputs';
import { NO_READING } from '../machine/readings';
import { t } from '../i18n';

const SPINDLE = {
  off: 'diag.spindle.off',
  cw: 'diag.spindle.cw',
  ccw: 'diag.spindle.ccw',
};

const onOff = (value) => {
  if (value === null || value === undefined) {
    return NO_READING;
  }
  return t(value ? 'diag.out.on' : 'diag.out.off');
};

/**
 * What the controller sees on its inputs and drives on its outputs, live.
 *
 * The question it answers at the machine: is this limit switch, this probe,
 * this door wired and read? Short one by hand and watch its tile light — the
 * check the kickoff has owed the limit switches since `$21=1` was set without
 * one being tried. Lit in amber, because a switch that is triggered at rest
 * is the thing to look into; a probe touching is the exception an operator
 * already knows about.
 *
 * The buffer only when the firmware reports it (`$10`): the panel does not
 * suggest changing `$10`, which is a write to the controller's memory.
 */
const InputsCard = ({ inputs, connected }) => {
  const pins = pinsLit(inputs?.pins ?? null);
  const outputs = accessoriesOf(inputs?.accessories ?? null);
  const buffer = inputs?.buffer ?? null;

  return (
    <Card label={t('diag.inputs')} bodyClassName="gap-3">
      <p className="m-0 text-note text-mut">{t('diag.inputsNote')}</p>
      <div className="grid grid-cols-2 gap-2 @3xl/shell:grid-cols-4">
        {pins.map((pin) => (
          <StatTile
            key={pin.letter}
            label={t(pin.key)}
            value={pin.lit === null ? NO_READING : t(pin.lit ? 'diag.pin.on' : 'diag.pin.off')}
            tone={pin.lit ? 'warn' : undefined}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 @3xl/shell:grid-cols-4">
        <StatTile label={t('diag.spindle.label')} value={outputs ? t(SPINDLE[outputs.spindle]) : NO_READING} />
        <StatTile label={t('diag.flood')} value={onOff(outputs?.flood)} />
        <StatTile label={t('diag.mist')} value={onOff(outputs?.mist)} />
        <StatTile
          label={t('diag.buffer')}
          value={buffer ? t('diag.bufferValue', { planner: buffer.planner, rx: buffer.rx }) : NO_READING}
        />
      </div>
      {connected && !buffer ? <p className="m-0 text-note text-mut">{t('diag.bufferOff')}</p> : null}
    </Card>
  );
};

export default InputsCard;
