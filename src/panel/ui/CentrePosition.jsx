import CentreViews from './CentreViews';
import useTicker from './useTicker';
import { t } from '../i18n';

// On a phone the way into place is seen going down: from the side.
const DOWN_VIEW = 'side';

/**
 * Where the probe has to be before a centre is measured, shown as the move
 * to get it there: across over the hole or the part and down — into the
 * hole, or to a few millimetres over the part — from above, as the Setup
 * draws it. `cycle` is the hole's or the part's.
 */
const CentrePosition = ({ cycle }) => {
  const place = cycle.positionAt(useTicker('position'));
  return (
    // Not squeezed by a short card: it would cut the drawing off (review note, 2026-10-01).
    <div className={`w-full shrink-0 self-center overflow-hidden rounded-ctl border border-line bg-panel ${cycle.sidePlace ? 'max-w-2xl' : 'max-w-md'}`}>
      <CentreViews
        cycle={cycle}
        top={place}
        side={cycle.sidePlace ? cycle.sidePlace(place) : null}
        name="place"
        auto={DOWN_VIEW}
        label={t(cycle.place)}
      />
    </div>
  );
};

export default CentrePosition;
