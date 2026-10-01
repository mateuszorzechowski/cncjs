import { useState } from 'react';
import BossSide from './BossSide';
import CentreScene from './CentreScene';
import SegmentedChoice from './SegmentedChoice';
import { useIsPhone } from './shell';
import { t } from '../i18n';

const VIEWS = ['top', 'side'];
const VIEW_KEYS = { top: 'probe.view.top', side: 'probe.view.side' };

/**
 * A centre's drawing: from above, and — for a part touched from outside,
 * whose cycle has `side` — from the side beside it, as the corner's
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
  const topView = <CentreScene part={cycle.part} {...top} bare={bare} label={label} className={side ? `h-auto w-full ${className}` : `aspect-[404/188] h-auto w-full ${className}`} />;
  if (!side) {
    return topView;
  }
  const sideView = <BossSide {...side} focus={top.focus} bare={bare} label={label} className={`h-auto w-full ${className}`} />;
  if (!phone) {
    return (
      <div className="grid grid-cols-2 divide-x divide-line">
        {topView}
        {sideView}
      </div>
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
