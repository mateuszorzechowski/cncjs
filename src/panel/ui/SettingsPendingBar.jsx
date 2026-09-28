import Button from './Button';
import { useIsPhone } from './shell';
import { GROUPS } from '../machine/machineSettings';
import { t } from '../i18n';

/**
 * The changes not yet in the controller, always in sight while there are
 * any, and the way to them (settings handoff, 2026-09-28, frames E1, GT1,
 * PC1): how many, in which groups, and "Przejrzyj", which opens the review.
 *
 * Only with a change to show — without one the list reaches the menu. It
 * stands outside what scrolls, at every point of the tab: over the list and
 * under an open group alike.
 *
 * On a phone a strip across the screen above the menu; wider, a card of its
 * own under the list. A `section`, so on a phone the shell leaves it the
 * room its last card gets for the menu's mound.
 */
const SettingsPendingBar = ({ pending, groups, error, onReview }) => {
  const phone = useIsPhone();
  return (
    <section
      className={`flex shrink-0 items-center gap-3 bg-panel p-pad ${phone
        ? '-mx-shellPad border-t border-line'
        : 'rounded-card border border-line'}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold text-ink">{t('machine.pending.count', { count: pending.length })}</span>
        <span className="truncate text-note text-mut">
          {groups.map(({ id, count }) => t('machine.pending.group', {
            group: t(GROUPS.find((g) => g.id === id).titleKey),
            count,
          })).join(' · ')}
        </span>
        {error ? <span className="text-note text-red">{error}</span> : null}
      </div>
      <Button tone="primary" className="h-ctl" onClick={onReview}>{t('machine.pending.review')}</Button>
    </section>
  );
};

export default SettingsPendingBar;
