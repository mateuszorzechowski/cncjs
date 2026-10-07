import PaperScene from './PaperScene';
import { useReducedMotion } from './useClock';
import useTicker from './useTicker';
import { feelLoopAt, moveOf, paperScene } from '../machine/paperCycle';
import { t } from '../../i18n/index';
import { DRAWING_FIT } from './probeDraw';

/**
 * What the paper feels like at each step, beside the buttons that make it:
 * the Setup's drag, resisting, standing, back, "here" on a loop, on the
 * surface chosen — the colours the buttons are read by.
 */
const PaperFeel = ({ edge }) => {
  const still = useReducedMotion();
  const { name, p } = feelLoopAt(useTicker('feel'));
  const scene = paperScene(name, still ? 1 : p, { edge });
  return (
    <div className="flex flex-col overflow-hidden rounded-ctl border border-line bg-panel">
      <PaperScene {...scene} label={t(moveOf(name).titleKey, { axis: scene.axis })} className={`aspect-[404/188] h-auto w-full ${DRAWING_FIT}`} />
      <div className="border-t border-line px-3 py-2 text-base font-semibold text-ink">{t(moveOf(name).titleKey, { axis: scene.axis })}</div>
    </div>
  );
};

export default PaperFeel;
