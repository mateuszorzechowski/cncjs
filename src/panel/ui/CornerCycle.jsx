import CornerScene from './CornerScene';
import CycleStages from './CycleStages';
import useTicker from './useTicker';
import {
  CORNER_MS, CORNER_STAGES, FIELD_WINDOW, cornerAt, loopIn, windowOfPhase,
} from '../machine/cornerCycle';
import { t } from '../i18n';

const AXES = CORNER_STAGES.map(({ axis }) => axis);

/**
 * The L plate's cycle over its tabs — 1 · Z, 2 · X, 3 · Y — and under it what
 * the part playing does. Three ways to play it, one drawing: `field`, the
 * part a figure being set acts in; `phase`, the part the machine is in; with
 * neither, the whole loop. `still` holds one frame instead (0 the tool over
 * the plate, 0.97 the zero found).
 */
const CornerCycle = ({ corner, field = null, phase = null, still = null, words = null, className = '' }) => {
  let part = 'whole';
  if (field) {
    part = FIELD_WINDOW[field] || 'whole';
  } else if (phase) {
    part = windowOfPhase(phase);
  }
  const ms = useTicker(still === null ? `${part}-${phase || field || ''}` : null);
  const at = cornerAt(still ?? loopIn(part, ms, CORNER_MS));
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel ${className}`}>
      <CycleStages stage={at.stage} names={AXES} />
      <CornerScene corner={corner} at={at} label={t('probe.method.corner')} className="w-full" />
      {words ? <div className="border-t border-line px-2 py-3 text-center text-base font-semibold text-ink">{words}</div> : null}
    </div>
  );
};

export default CornerCycle;
