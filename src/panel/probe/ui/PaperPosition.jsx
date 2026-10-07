import PaperScene from './PaperScene';
import useTicker from './useTicker';
import { SHEET_Y, mirrored } from '../machine/paperCycle';
import { START, sheetShape } from '../machine/paperSheet';
import { OVER, TOP, positionAt } from '../machine/probeCycle';
import { t } from '../../i18n/index';

// The sheet lying flat, as it does before the tool is near.
const FLAT = sheetShape(START);

// The Z plate's heights onto this drawing: both are a gap over the surface.
const onSheet = (y) => y - TOP + SHEET_Y;

/**
 * Where the tool has to be before the paper is felt for, shown as the move
 * to get it there, as the Z plate's and the corner's are (review note,
 * 2026-09-30: *"animacja nakierowania jak w innych"*): across, down to a few
 * millimetres over the surface chosen, and held there with the gap drawn.
 */
const PaperPosition = ({ edge = 'z' }) => {
  const { over, motion, ...scene } = positionAt(useTicker('position'));
  return (
    <PaperScene
      {...scene}
      motion={motion ? { ...motion, from: onSheet(motion.from), to: onSheet(motion.to) } : null}
      sheet={FLAT}
      side={edge !== 'z'}
      mirror={mirrored(edge)}
      dim={over ? { top: SHEET_Y - OVER, bottom: SHEET_Y, text: t('probe.position.few') } : null}
      label={t('probe.place.paper')}
      className="w-full max-w-md self-center rounded-ctl border border-line bg-panel"
    />
  );
};

export default PaperPosition;
