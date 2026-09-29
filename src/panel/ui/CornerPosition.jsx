import CornerScene from './CornerScene';
import useTicker from './useTicker';
import { positionAt } from '../machine/cornerCycle';
import { t } from '../i18n';

// Which dimension the tool ends on.
const CLEARANCE = 'clearance';

/**
 * Where the tool has to be before the L plate is measured, shown as the move
 * to get it there (review note, 2026-09-30): from off the work across over
 * the plate, both views, and down to a few millimetres above it, held there
 * with the gap drawn.
 */
const CornerPosition = ({ corner, className = '' }) => {
  const at = positionAt(useTicker('position'));
  return (
    <div className={`overflow-hidden rounded-ctl border border-line bg-panel ${className}`}>
      <CornerScene
        corner={corner}
        at={at}
        badge={at.over ? { name: CLEARANCE, text: t('probe.position.few') } : null}
        label={t('probe.place.corner')}
        className="w-full"
      />
    </div>
  );
};

export default CornerPosition;
