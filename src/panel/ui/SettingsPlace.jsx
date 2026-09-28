import Button from './Button';
import Card from './Card';
import Sheet from './Sheet';
import { t } from '../i18n';

/**
 * Where a line of the controller's list opens — a group, the history, `$$`
 * — the same for all of them (review note, 2026-09-28: *"czy te sekcje mogą
 * się otwierać w ramach widoku zamiast w dialogu?"*).
 *
 * On a phone a sheet over the list, closed with "Gotowe" (frame D2). Wider,
 * `inline`, a card in the list's own place, and "Wróć" takes it back to the
 * list (frame GT2ter) — a step back in the same place, not a closing, which
 * is why the two words differ. On a PC beside the list, which stays, so
 * there is no `onBack` and nothing to go back to (frame PC1).
 *
 * In a card the head stands and the rest scrolls under it, going under the
 * bar of changes below (`Card scrolls`); `footer`, which stands under a
 * sheet, ends the card.
 */
const SettingsPlace = ({
  title, inline = false, aboveBar = false, onBack, onClose, footer = null, children,
}) => {
  if (!inline) {
    return <Sheet title={title} onClose={onClose} footer={footer}>{children}</Sheet>;
  }
  return (
    <Card
      label={title}
      aside={onBack ? <Button className="h-chiph px-4" onClick={onBack}>{t('machine.back')}</Button> : null}
      scrolls
      gapBelow={aboveBar}
      className="min-h-0 flex-1"
      bodyClassName="gap-3"
    >
      {children}
      {footer ? <div className="mt-auto pt-1">{footer}</div> : null}
    </Card>
  );
};

export default SettingsPlace;
