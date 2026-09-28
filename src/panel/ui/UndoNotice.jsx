import Button from './Button';
import Notice from './Notice';
import { useShowing } from './RefusalNotice';
import { t } from '../i18n';

/**
 * Something just thrown away, with the way to take it back.
 *
 * For "Odrzuć wszystkie" on the controller's settings (settings handoff,
 * 2026-09-28, frame E3): the edits are only this panel's, so there is no
 * "are you sure" before they go — instead this, for as long as a refusal
 * stays up, and then they are gone for good.
 *
 * `RefusalNotice`'s face, the amber and the triangle, chosen over the
 * drawing's dark bar (Mateusz, 2026-09-28). Unlike that notice this one
 * takes presses — it is the only way to the undo — so the caller places it
 * where it covers nothing a thumb is on its way to, `className` saying where.
 *
 * `notice` is `{ seq, text }`, numbered like a refusal so a second discard
 * shows again rather than riding on the first one's clock.
 */
const UndoNotice = ({ notice, onUndo, className = '' }) => {
  const showing = useShowing(notice?.seq ?? 0);
  if (!notice || !showing) {
    return null;
  }

  return (
    <div role="status" className={`absolute z-20 ${className}`}>
      <Notice>
        <div className="flex items-center justify-between gap-3">
          <span>{notice.text}</span>
          <Button className="h-chiph" onClick={onUndo}>{t('notice.undo')}</Button>
        </div>
      </Notice>
    </div>
  );
};

export default UndoNotice;
