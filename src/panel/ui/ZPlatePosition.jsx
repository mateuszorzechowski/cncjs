import ZPlateScene from './ZPlateScene';
import useTicker from './useTicker';
import { positionAt } from '../machine/probeCycle';
import { t } from '../i18n';

// Which dimension the tool ends on.
const CLEARANCE = 'clearance';

/**
 * Where the tool has to be before measuring, shown as the move to get it
 * there (review note, 2026-09-29): across over the plate, down to a few
 * millimetres above it, and held there with the gap drawn.
 */
const ZPlatePosition = () => {
  const { over, ...scene } = positionAt(useTicker('position'));
  return (
    <ZPlateScene
      {...scene}
      marks={over ? CLEARANCE : null}
      badge={over ? { x: 60, y: 160, text: t('probe.position.few') } : null}
      label={t('probe.place.z')}
      className="w-full max-w-md self-center rounded-ctl border border-line bg-panel"
    />
  );
};

export default ZPlatePosition;
