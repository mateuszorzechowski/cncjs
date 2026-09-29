import CornerScene from './CornerScene';
import CycleStages from './CycleStages';
import useTicker from './useTicker';
import {
  CORNER_MS, CORNER_STAGES, FIELD_WINDOW, cornerAt, cornerReadout, figureAt, loopIn, windowOfPhase,
} from '../machine/cornerCycle';
import { figureSaid } from '../machine/probe';
import { inMm } from '../machine/units';
import { useUnits } from './units';
import { t } from '../i18n';

const AXES = CORNER_STAGES.map(({ axis }) => axis);

const numberOf = (text) => Number(String(text).replace(',', '.'));

/**
 * The L plate's cycle over its tabs — 1 · Z, 2 · X, 3 · Y — and under it what
 * the part playing does. Three ways to play it, one drawing: `field`, the
 * part a figure being set acts in; `phase`, the part the machine is in; with
 * neither, the whole loop. `still` holds one frame instead (0 the tool over
 * the plate, 0.97 the zero found).
 *
 * Given the figures typed (`texts`), it is the example the Z plate's is
 * (review notes, 2026-09-29): each part's value where it acts, and under the
 * drawing the tool's X, Y and Z in the system — against the old zero, then
 * the new one once written.
 */
const CornerCycle = ({
  corner, field = null, phase = null, still = null, words = null, texts = null, wcs = null, className = '',
}) => {
  const units = useUnits();
  let part = 'whole';
  if (field) {
    part = FIELD_WINDOW[field] || 'whole';
  } else if (phase) {
    part = windowOfPhase(phase);
  }
  const ms = useTicker(still === null ? `${part}-${phase || field || ''}` : null);
  const at = cornerAt(still ?? loopIn(part, ms, CORNER_MS));

  const shownField = field || figureAt(at.p);
  const badge = texts && shownField && texts[shownField] !== undefined
    ? { name: shownField, text: figureSaid(shownField, texts[shownField], units.rule) }
    : null;
  let readout = null;
  if (texts) {
    const mm = Object.fromEntries(['wallX', 'wallY', 'cornerThickness'].map((name) => [name, inMm(numberOf(texts[name]), units.rule) ?? 0]));
    readout = cornerReadout(at, corner, mm);
  }

  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel ${className}`}>
      <CycleStages stage={at.stage} names={AXES} />
      <CornerScene corner={corner} at={at} badge={badge} label={t('probe.method.corner')} className="w-full" />
      {readout ? (
        <div className={`flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 border-t border-line px-2 py-2 font-num ${readout.after ? 'bg-accS text-acc' : 'text-ink'}`}>
          <span className="text-cap text-mut">
            {t('probe.readout.system', { wcs: wcs || 'G54', when: t(readout.after ? 'probe.readout.after' : 'probe.readout.before') })}
          </span>
          {['x', 'y', 'z'].map((axis) => (
            <span key={axis} className="text-note font-semibold">{`${axis.toUpperCase()} ${units.figure(readout[axis])}`}</span>
          ))}
        </div>
      ) : null}
      {words ? <div className="border-t border-line px-2 py-3 text-center text-base font-semibold text-ink">{words}</div> : null}
    </div>
  );
};

export default CornerCycle;
