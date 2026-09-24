import DroWidget from '../widgets/DroWidget';
import JogWidget from '../widgets/JogWidget';
import { t } from '../i18n';

/**
 * Jogging on a phone: the keys, and where they got to.
 *
 * No toolpath and no fact strip. The canvas says nothing an operator needs
 * while a thumb is on a jog key, and the four facts cost the readout its place
 * on the screen — a position you have to scroll to is worse than four facts
 * one tap away.
 *
 * The keys take the slack and the readout keeps its own height. It is the pad
 * that benefits from every spare pixel: it is what the screen is for and what
 * a thumb has to hit without looking.
 *
 * The readout on top and the keys under it — *"możesz zamienić kolejnością
 * elementy na tym ekranie"* (Mateusz, 2026-09-25). Where the machine is gets
 * read first, and the keys sit lower, where a thumb holding the phone reaches.
 */
const JogPhone = ({ machine }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-gap">
    <DroWidget machine={machine} label={t('dro.position')} strip className="shrink-0" />
    <JogWidget machine={machine} className="min-h-0 flex-1" />
  </div>
);

export default JogPhone;
