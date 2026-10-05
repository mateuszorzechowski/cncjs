import Button from '../../ui/Button';
import ConfirmSheet from '../../ui/ConfirmSheet';
import { useIsPhone } from '../../ui/shell';
import { methodOfRun } from '../machine/probe';
import { t } from '../../i18n/index';

/**
 * A wizard waits on another device, and this one came to the probe screen
 * from its menu (review note, 2026-10-01: *"dołącz albo własny, ale tylko jak
 * wejdę z menu"*): join it, or start one's own — which takes the step over
 * only once it reaches it. Over the methods: a card when wide, a sheet on a
 * phone, plain as the other sheets are (*"arkusz … bez ramki niebieskiej"*);
 * closing it is starting one's own.
 */
const ProbeJoin = ({ stage, onJoin, onOwn }) => {
  const phone = useIsPhone();
  const method = methodOfRun(stage.method, stage.options);
  const where = stage.owner?.name || t('probe.join.elsewhere');
  const waiting = t('probe.join.waiting', { method: method ? t(method.key) : '', where, step: t(`probe.step.${stage.step}`) });
  if (phone) {
    return (
      <ConfirmSheet
        title={t('probe.title')}
        note={waiting}
        confirmLabel={t('probe.join.join')}
        tone="primary"
        onConfirm={onJoin}
        cancelLabel={t('probe.join.own')}
        onClose={onOwn}
      >
        <p className="m-0 text-note text-mut">{t('probe.join.how')}</p>
      </ConfirmSheet>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-ctl border border-acc bg-accS p-4">
      <p className="m-0 text-base font-semibold text-ink">{waiting}</p>
      <p className="m-0 text-note text-mut">{t('probe.join.how')}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button tone="outline" onClick={onOwn} className="h-ctl">{t('probe.join.own')}</Button>
        <Button tone="primary" onClick={onJoin} className="h-ctl">{t('probe.join.join')}</Button>
      </div>
    </div>
  );
};

export default ProbeJoin;
