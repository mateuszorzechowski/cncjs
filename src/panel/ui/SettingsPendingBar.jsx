import Button from './Button';
import { useUnderEdge } from './FadeScroller';
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
 * own under the list.
 *
 * Lower than a card over the mound: the shell leaves the last card its
 * padding and the mound's whole height under it, and the bar's words sit at
 * the left and its button at the right, clear of a mound that rises only in
 * the middle — so the bar keeps just the strip the mound is drawn in (review,
 * 2026-09-28: *"pasek może być niższy"*). `!` over the shell's rule, which
 * is a descendant selector.
 */
const SettingsPendingBar = ({ pending, groups, error, onReview }) => {
  const phone = useIsPhone();
  // On a phone it comes out from under the menu: the mound's glow on it, always.
  const underEdge = useUnderEdge();
  return (
    <section
      ref={phone ? underEdge : undefined}
      className={`flex shrink-0 items-center gap-3 bg-panel p-pad ${phone
        ? '-mx-shellPad border-t border-line !pb-[calc(var(--gap)+var(--navEdge))]'
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
