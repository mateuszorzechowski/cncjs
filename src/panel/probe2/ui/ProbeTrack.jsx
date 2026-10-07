import Card from '../../ui/Card';
import Notice from '../../ui/Notice';
import StepTrack from './StepTrack';
import { stepsOf } from '../machine/probe';
import { t } from '../../i18n/index';

/**
 * The card over the wizard: its caption, the steps and the method in one row
 * when wide (review note, 2026-09-30: *"dużo miejsca to zajmuje"*); on a
 * phone the steps under the other two. Captioned Sonda v2, so a screenshot
 * says which of the two wizards it is.
 */
const ProbeTrack = ({
  method, choice, step, takenBy,
}) => (
  <Card>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <h2 className="m-0 text-cap font-semibold uppercase tracking-[0.1em] text-mut">{t('nav.probe2')}</h2>
      <StepTrack
        steps={stepsOf(method, choice).map((s) => ({ ...s, name: t(s.key) }))}
        current={step}
        label={t('probe.steps')}
        className="order-3 w-full @3xl/shell:order-none @3xl/shell:w-auto @3xl/shell:flex-1"
      />
      {method ? <span className="ml-auto font-num text-note text-mut @3xl/shell:ml-0">{t(method.key)}</span> : null}
      {takenBy ? <div className="order-4 w-full"><Notice>{t('probe.join.taken', { where: takenBy })}</Notice></div> : null}
    </div>
  </Card>
);

export default ProbeTrack;
