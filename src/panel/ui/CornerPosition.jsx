import CornerSide from './CornerSide';
import CornerTop from './CornerTop';
import useTicker from './useTicker';
import { positionAt } from '../machine/cornerCycle';
import { t } from '../i18n';

/**
 * Where the tool has to be before the L plate is measured, shown as the move
 * to get it there (review note, 2026-09-30): from off the work across over
 * the plate, and down to a few millimetres above it, held there with the gap
 * drawn — from above and from the side, as the Setup draws the corner.
 */
const CornerPosition = ({ corner, className = '' }) => {
  const place = { ...positionAt(useTicker('position')), text: t('probe.position.few') };
  const drawing = {
    corner, place, label: t('probe.place.corner'), className: 'h-auto w-full',
  };
  return (
    <div className={`grid grid-cols-2 divide-x divide-line overflow-hidden rounded-ctl border border-line bg-panel ${className}`}>
      <CornerTop {...drawing} />
      <CornerSide {...drawing} />
    </div>
  );
};

export default CornerPosition;
