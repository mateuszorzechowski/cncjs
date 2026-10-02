import CentreViews from './CentreViews';
import MoveBar, { namedGroups } from './MoveBar';
import useTicker from './useTicker';
import { fillsAt, timeAt } from '../machine/timeline';
import { t } from '../i18n';
import { DRAWING_FIT_MEASURING } from './probeDraw';

/**
 * A centre measured as it happens, played by the machine rather than a
 * clock: the move the server's step belongs to, looping until the next step
 * comes in, drawn as the Setup's without the figures. The words are what
 * the probe is doing, said under it; `done`, the result: the zero written,
 * held. `cycle` is the hole's or the part's; `passes`, as the measurement
 * was asked for.
 */
const CentreCycle = ({
  cycle, phase = null, done = false, passes = 2, className = '',
}) => {
  const name = done ? 'zero' : cycle.moveOfPhase(phase);
  const ms = useTicker(done ? null : phase || name);
  const { p } = done ? { p: 1 } : cycle.playAt(ms, { pinned: name });
  const items = cycle.timeline(passes);
  const groups = namedGroups(cycle.groups(passes), t, (id) => t(...cycle.titleOf(id)));
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-ctl border border-line bg-panel ${className}`}>
      {/* No fence drawn: the machine is the one moving, not the figures. */}
      <div className={cycle.side ? 'w-full' : 'mx-auto w-full max-w-md'}>
        <CentreViews
          cycle={cycle}
          top={{ ...cycle.scene(name, p), limit: null, dims: [] }}
          side={cycle.side ? cycle.side(name, p) : null}
          name={name}
          auto={cycle.viewOf?.(name, p, null)}
          bare
          label={t(...cycle.titleOf(name))}
          className={DRAWING_FIT_MEASURING}
        />
      </div>
      {done ? null : <MoveBar groups={groups} active={name} fills={fillsAt(items, timeAt(items, name, p))} />}
      {phase && !done ? <div className="border-t border-line px-2 py-3 text-center text-base font-semibold text-ink">{t(...cycle.words(phase))}</div> : null}
    </div>
  );
};

export default CentreCycle;
