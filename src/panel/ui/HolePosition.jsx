import HoleScene from './HoleScene';
import useTicker from './useTicker';
import { positionAt } from '../machine/holeCycle';
import { t } from '../i18n';

/**
 * Where the tool has to be before the hole is measured, shown as the move to
 * get it there: across over the hole and down into it, roughly in its
 * middle — from above, as the Setup draws the hole.
 */
const HolePosition = () => (
  <HoleScene
    {...positionAt(useTicker('position'))}
    label={t('probe.place.hole')}
    className="w-full max-w-md self-center rounded-ctl border border-line bg-panel"
  />
);

export default HolePosition;
