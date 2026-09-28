import Button from './Button';
import Notice from './Notice';
import Sheet from './Sheet';
import { t } from '../i18n';

/**
 * A question with two answers, for an action that cannot be taken back.
 *
 * The consequence is said in `note` in plain words — what goes, and that it
 * does not come back — and the confirming button names the action rather
 * than saying "OK", so the answer can be read without the question.
 *
 * `warning` is a consequence that holds only this time (the `$C` of a program
 * that leaves the table), marked as the panel marks what wants reading first;
 * `children` is a choice about how the action is taken, made in the same
 * breath as taking it — or, with no `note`, the whole of what is asked.
 *
 * `cancelLabel` and `onCancel` when the other answer is an action of its
 * own rather than closing: the controller settings' review, whose two
 * answers are "discard them all" and "write them" (settings handoff,
 * 2026-09-28). Outlined either way.
 */
const ConfirmSheet = ({
  title, note, warning, confirmLabel, tone = 'stop', onConfirm, onClose, cancelLabel, onCancel, busy = false, children,
}) => (
  <Sheet
    title={title}
    onClose={onClose}
    footer={(
      <div className="flex gap-2">
        <Button className="h-ctl flex-1" disabled={busy && Boolean(onCancel)} onClick={onCancel || onClose}>{cancelLabel || t('confirm.cancel')}</Button>
        <Button tone={tone} className="h-ctl flex-1" disabled={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    )}
  >
    {note ? <p className="m-0 text-base text-ink">{note}</p> : null}
    {warning ? <Notice>{warning}</Notice> : null}
    {children}
  </Sheet>
);

export default ConfirmSheet;
