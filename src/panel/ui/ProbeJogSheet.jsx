import Button from './Button';
import PaperJog from './PaperJog';
import Sheet from './Sheet';
import JogWidget from '../widgets/JogWidget';
import { surfaceOf } from '../machine/paperCycle';
import { methodOf, sayProbeStage, startProbe } from '../machine/probe';
import { t } from '../i18n';

/**
 * The probe wizard's jog on a phone, from any screen (review notes,
 * 2026-09-30: *"ikona w headerze, po kliknięciu otwiera się jog i
 * zatwierdzenie"*; *"nie widzę, żeby na telefonie włączała się informacja, że
 * mogę zrobić jog do sondy"*): wherever the wizard is open, on this device
 * or another, while it waits on the operator's hands — the server's
 * `probeStage`. Into place, the jog pad and the button that goes on: a plate
 * measures, the paper goes on to be felt for. Felt for, the paper's own
 * buttons and "here". The wizard follows on every device: the stage is one.
 */
const ProbeJogSheet = ({ machine, onClose }) => {
  const stage = machine.probeStage;
  const method = methodOf(stage.method);
  const lit = typeof machine.inputs?.pins === 'string' ? machine.inputs.pins.includes('P') : null;
  const measure = () => startProbe(stage.method, stage.options);
  const feeling = stage.step === 'measure';
  const edge = stage.options?.edge;
  let onward = null;
  if (method.touches) {
    onward = <Button tone="go" disabled={!machine.canProbe || lit !== false} onClick={measure} className="h-ctl">{t(method.start)}</Button>;
  } else if (!feeling) {
    onward = <Button tone="primary" onClick={() => sayProbeStage({ ...stage, step: 'measure' })} className="h-ctl">{t('probe.next')}</Button>;
  }
  const title = feeling
    ? t('probe.paper.jogTitle', { axis: surfaceOf(edge).axis.toUpperCase() })
    : t('probe.jog.title', { method: t(method.key) });
  return (
    <Sheet title={title} onClose={onClose} tall>
      {feeling
        ? <PaperJog machine={machine} edge={edge} onHere={measure} named={false} className="min-h-0 flex-1" />
        : <JogWidget machine={machine} className="min-h-0 flex-1" />}
      {onward ? <div className="flex shrink-0 justify-end pt-3">{onward}</div> : null}
    </Sheet>
  );
};

export default ProbeJogSheet;
