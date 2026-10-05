import CentreScene from './CentreScene';
import CentreSide from './CentreSide';
import useTicker from './useTicker';
import { t } from '../../i18n/index';

/**
 * Where the probe has to be before a centre is measured, shown as the move
 * to get it there: across over the hole or the part and down — into the
 * hole, or to a few millimetres over the part. From above and from the side
 * at once on every screen, as the corner's (2026-10-02: on a phone one view
 * at a time drew so tall that Mierz went under the fold, and the side alone
 * hid the way across). `cycle` is the hole's or the part's.
 */
const CentrePosition = ({ cycle }) => {
  const place = cycle.positionAt(useTicker('position'));
  const label = t(cycle.place);
  const top = <CentreScene part={cycle.part} {...place} label={label} className={cycle.sidePlace ? 'h-auto w-full' : 'aspect-[404/188] h-auto w-full'} />;
  return (
    // Not squeezed by a short card: it would cut the drawing off (review note, 2026-10-01).
    <div className={`w-full shrink-0 self-center overflow-hidden rounded-ctl border border-line bg-panel ${cycle.sidePlace ? 'max-w-2xl' : 'max-w-md'}`}>
      {cycle.sidePlace ? (
        <div className="grid grid-cols-2 divide-x divide-line">
          {top}
          <CentreSide part={cycle.part} {...cycle.sidePlace(place)} label={label} className="h-auto w-full" />
        </div>
      ) : top}
    </div>
  );
};

export default CentrePosition;
