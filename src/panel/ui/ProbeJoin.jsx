import Button from './Button';
import { methodOf } from '../machine/probe';
import { t } from '../i18n';

/**
 * A wizard waits on another device, and this one came to the probe screen
 * from its menu (review note, 2026-10-01: *"dołącz albo własny, ale tylko jak
 * wejdę z menu"*): join it, or start one's own — which takes the step over
 * only once it reaches it.
 */
const ProbeJoin = ({ stage, onJoin, onOwn }) => {
  const method = methodOf(stage.method);
  const where = stage.owner?.name || t('probe.join.elsewhere');
  return (
    <div className="flex flex-col gap-3 rounded-ctl border border-acc bg-accS p-4">
      <p className="m-0 text-base font-semibold text-ink">
        {t('probe.join.waiting', { method: method ? t(method.key) : '', where, step: t(`probe.step.${stage.step}`) })}
      </p>
      <p className="m-0 text-note text-mut">{t('probe.join.how')}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button tone="outline" onClick={onOwn} className="h-ctl">{t('probe.join.own')}</Button>
        <Button tone="primary" onClick={onJoin} className="h-ctl">{t('probe.join.join')}</Button>
      </div>
    </div>
  );
};

export default ProbeJoin;
