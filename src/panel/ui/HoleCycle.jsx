import HoleScene from './HoleScene';
import MoveBar, { namedGroups } from './MoveBar';
import useTicker from './useTicker';
import {
  RUN_MS, SPAN_MS, holeGroups, holeScene, holeTimeline, moveOfPhase, titleOf,
} from '../machine/holeCycle';
import { fillsAt, timeAt } from '../machine/timeline';
import { t } from '../i18n';

// The cycle's segments, as the Setup's bar has them, for one pass or two.
const ITEMS = { 1: holeTimeline(1), 2: holeTimeline(2) };

/**
 * The hole measured as it happens, played by the machine rather than a
 * clock: the move the server's step belongs to, looping until the next step
 * comes in, drawn as the Setup's without the figures. `words` is what the
 * tool is doing, said under it; `done`, the result: the zero written, held;
 * `passes`, as the measurement was asked for.
 */
const HoleCycle = ({
  phase = null, words = null, done = false, passes = 2, className = '',
}) => {
  const name = done ? 'zero' : moveOfPhase(phase);
  const ms = useTicker(done ? null : phase || name);
  const p = done ? 1 : Math.min(1, (ms % SPAN_MS) / RUN_MS);
  const items = ITEMS[passes] || ITEMS[2];
  const groups = namedGroups(holeGroups(passes), t, (id) => t(...titleOf(id)));
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel ${className}`}>
      {/* No fence drawn: the machine is the one moving, not the figures. */}
      <HoleScene {...holeScene(name, p)} limit={null} bare label={t(...titleOf(name))} className="mx-auto h-auto w-full max-w-md" />
      {done ? null : <MoveBar groups={groups} active={name} fills={fillsAt(items, timeAt(items, name, p))} />}
      {words ? <div className="border-t border-line px-2 py-3 text-center text-base font-semibold text-ink">{words}</div> : null}
    </div>
  );
};

export default HoleCycle;
