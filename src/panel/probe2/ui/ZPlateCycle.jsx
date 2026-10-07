import MoveBar, { namedGroups } from './MoveBar';
import ZPlateScene from './ZPlateScene';
import useTicker from './useTicker';
import {
  PLATE_GROUPS, RUN_MS, SPAN_MS, moveOf, moveOfPhase, plateScene, plateTimeline,
} from '../machine/probeCycle';
import { fillsAt, timeAt } from '../machine/timeline';
import { t } from '../../i18n/index';

// The cycle's segments, as the Setup's bar has them.
const ITEMS = plateTimeline();

/**
 * The measurement as it happens, played by the machine rather than a clock:
 * the move the server's step belongs to, looping on the drawing until the
 * next step comes in, drawn as the Setup's (Claude Design, probe proposals,
 * 2026-09-30) but without the figures — the machine is the one moving.
 * `words` is what the tool is doing, said under it.
 */
const ZPlateCycle = ({ phase, words }) => {
  const name = moveOfPhase(phase);
  const ms = useTicker(phase || name);
  const p = Math.min(1, (ms % SPAN_MS) / RUN_MS);
  const scene = { ...plateScene(name, p), dim: null, feedTag: false };
  const groups = namedGroups(PLATE_GROUPS, t, (id) => t(moveOf(id).titleKey, { t: '' }));
  return (
    <div className="flex flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <ZPlateScene {...scene} label={t('probe.method.z')} className="mx-auto w-full max-w-md" />
      <MoveBar groups={groups} active={name} fills={fillsAt(ITEMS, timeAt(ITEMS, name, p))} />
      <div className="flex items-center justify-center border-t border-line px-2 py-3 text-center text-base font-semibold text-ink">{words}</div>
    </div>
  );
};

export default ZPlateCycle;
