import Button from './Button';
import Sheet from './Sheet';
import { t } from '../i18n';

/**
 * A question with two answers, for an action that cannot be taken back.
 *
 * The consequence is said in `note` in plain words — what goes, and that it
 * does not come back — and the confirming button names the action rather
 * than saying "OK", so the answer can be read without the question.
 */
const ConfirmSheet = ({ title, note, confirmLabel, tone = 'stop', onConfirm, onClose, busy = false }) => (
  <Sheet title={title} onClose={onClose}>
    <p className="m-0 text-base text-ink">{note}</p>
    <div className="flex gap-2">
      <Button className="h-ctl flex-1" onClick={onClose}>{t('confirm.cancel')}</Button>
      <Button tone={tone} className="h-ctl flex-1" disabled={busy} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Sheet>
);

export default ConfirmSheet;
