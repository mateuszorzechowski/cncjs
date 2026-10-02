import CornerSide from './CornerSide';
import CornerTop from './CornerTop';
import MoveBar, { namedGroups } from './MoveBar';
import useTicker from './useTicker';
import {
  CORNER_GROUPS, cornerTimeline, moveOf, moveOfPhase, playAt,
} from '../machine/cornerCycle';
import { fillsAt, timeAt } from '../machine/timeline';
import { t } from '../i18n';
import { DRAWING_FIT_MEASURING } from './probeDraw';

// The cycle's segments, as the Setup's bar has them on a wide screen.
const ITEMS = cornerTimeline();

/**
 * The L plate's cycle played by the machine rather than a clock: the move the
 * server's step belongs to, looping until the next step comes in, from above
 * and from the side as the Setup draws it (Claude Design, probe proposals,
 * 2026-09-30) — without the form's figures, the machine being the one moving.
 * `words` is what the tool is doing, said under it; `done`, the result: the
 * zero written, held.
 */
const CornerCycle = ({
  corner, phase = null, done = false, words = null, className = '',
}) => {
  const name = done ? 'zero' : moveOfPhase(phase);
  const ms = useTicker(done ? null : phase || name);
  const { p } = done ? { p: 1 } : playAt(ms, { pinned: name });
  const groups = namedGroups(CORNER_GROUPS, t, (id) => t(moveOf(id).titleKey));
  const drawing = {
    name, p, corner, bare: true, label: t(moveOf(name).titleKey), className: `h-auto w-full ${DRAWING_FIT_MEASURING}`,
  };
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel ${className}`}>
      <div className="grid grid-cols-2 divide-x divide-line">
        <CornerTop {...drawing} />
        <CornerSide {...drawing} />
      </div>
      {done ? null : <MoveBar groups={groups} active={name} fills={fillsAt(ITEMS, timeAt(ITEMS, name, p))} />}
      {words ? <div className="border-t border-line px-2 py-3 text-center text-base font-semibold text-ink">{words}</div> : null}
    </div>
  );
};

export default CornerCycle;
