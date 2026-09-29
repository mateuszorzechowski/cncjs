import CycleStages from './CycleStages';
import ZPlateScene from './ZPlateScene';
import useTicker from './useTicker';
import { FIGURES, figureOfPhase, sceneAt } from '../machine/probeCycle';
import { t } from '../i18n';

/**
 * The measurement as it happens (design 1g, played by the machine rather than
 * a clock): the stage the server's step belongs to, and that part of the
 * cycle looping on the drawing until the next step comes in. `words` is what
 * the tool is doing, said under it.
 */
const ZPlateCycle = ({ phase, words }) => {
  const name = figureOfPhase(phase);
  const ms = useTicker(phase || name);
  return (
    <div className="flex flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <CycleStages stage={FIGURES[name].stage} />
      <ZPlateScene {...sceneAt(name, ms)} label={t('probe.method.z')} className="mx-auto w-full max-w-md" />
      <div className="flex items-center justify-center border-t border-line px-2 py-3 text-center text-base font-semibold text-ink">{words}</div>
    </div>
  );
};

export default ZPlateCycle;
