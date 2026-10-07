import { useState } from 'react';
import CentreScene from './CentreScene';
import CentreSide from './CentreSide';
import SegmentedChoice from '../../ui/SegmentedChoice';
import { PairOfViews, usePair } from './probePair';
import { useIsPhone } from '../../ui/shell';
import { t } from '../../i18n/index';

const VIEWS = ['top', 'side'];
const VIEW_KEYS = { top: 'probe.view.top', side: 'probe.view.side' };

/**
 * A centre's drawing: from above, and — where its cycle has `side` — from
 * the front beside it, as the corner's
 * (review note, 2026-10-01). On a phone one view at a time: the one the
 * move is seen best from (`auto`), or one chosen by hand, held while that
 * move plays.
 *
 * `top` and `side` are the views' drawings; `name` the move playing.
 */
const CentreViews = ({
  cycle, top, side = null, name, auto, label, bare = false, className = '',
}) => {
  const phone = useIsPhone();
  const [chosen, setChosen] = useState(null);
  const pair = usePair();
  // A film of two features draws each with its own part (`pairCycle`).
  const part = cycle.partOf ? cycle.partOf(name) : cycle.part;
  const topView = <CentreScene part={part} {...top} bare={bare} label={label} className={side ? `h-auto w-full ${className}` : `aspect-[404/188] h-auto w-full ${className}`} />;
  if (!side) {
    return topView;
  }
  const sideView = <CentreSide part={part} {...side} focus={top.focus} bare={bare} label={label} className={`h-auto w-full ${className}`} />;
  if (!phone) {
    // One drawing in two views, a line between them; a label short of room in one may stand in the other's free edge.
    return (
      <PairOfViews pair={pair}>
        {topView}
        {sideView}
      </PairOfViews>
    );
  }
  const view = chosen && chosen.name === name ? chosen.view : (auto || VIEWS[0]);
  return (
    <>
      <div className="border-b border-line p-2">
        <SegmentedChoice
          options={VIEWS}
          value={view}
          onChange={(which) => setChosen({ view: which, name })}
          format={(which) => t(VIEW_KEYS[which])}
          label={t('probe.view.label')}
          joined
        />
      </div>
      {view === 'top' ? topView : sideView}
    </>
  );
};

export default CentreViews;
