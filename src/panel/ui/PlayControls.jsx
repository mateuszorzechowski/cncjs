import Icon from './Icon';
import { MODES } from '../machine/player';
import { t } from '../i18n';

const BUTTON = 'button';

const MODE_KEYS = { cycle: 'probe.play.cycle', loop: 'probe.play.loop', once: 'probe.play.once' };
// A playlist player's repeat: all, one with a 1 — and once, a straight way with a 1 (review note, 2026-09-30).
const MODE_ICONS = { cycle: 'repeat', loop: 'repeatOne', once: 'once' };
const LOOP = 'loop';

const face = (on) => (on ? 'z-10 border-acc bg-acc text-white' : 'border-line bg-surf text-ink hover:border-acc');

/**
 * The Setup drawing's transport, under its bar, as a player's (review of
 * 2026-09-30): a segment back, play and pause as two states side by side,
 * a segment on — neither lit once a single play has ended — and the repeat
 * on its own, one button as a playlist player has it (review note,
 * 2026-09-30: *"jak w YouTube albo Spotify"*), each tap the next: the whole
 * cycle, the part picked in a loop, the part picked once. `locked`, a figure
 * being set: its own loop plays, shown as one, and nothing here can change
 * it until it is done.
 */
const PlayControls = ({
  paused, ended = false, mode, locked = false, onPlay, onPause, onStep, onMode,
}) => {
  const shown = locked ? LOOP : mode;
  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  return (
    // A press here keeps a figure's field focused, as the bar does.
    <div role="group" aria-label={t('probe.play.label')} onMouseDown={(event) => event.preventDefault()} className="flex items-center gap-1.5 border-t border-line px-3 py-2">
      <button type={BUTTON} disabled={locked} onClick={() => onStep(-1)} aria-label={t('probe.play.prev')} className="flex size-8 items-center justify-center rounded-ctl border border-line bg-surf text-ink hover:border-acc disabled:opacity-45 disabled:hover:border-line">
        <Icon name="prev" className="size-4" weight={2} />
      </button>
      <div className="flex">
        <button type={BUTTON} disabled={locked} onClick={onPlay} aria-pressed={!paused && !ended} aria-label={t('probe.play.play')} className={`flex size-8 items-center justify-center rounded-l-ctl border disabled:opacity-45 ${face(!paused && !ended)}`}>
          <Icon name="play" className="size-4" weight={2} />
        </button>
        <button type={BUTTON} disabled={locked} onClick={onPause} aria-pressed={paused} aria-label={t('probe.play.pause')} className={`-ml-px flex size-8 items-center justify-center rounded-r-ctl border disabled:opacity-45 ${face(paused)}`}>
          <Icon name="pause" className="size-4" weight={2} />
        </button>
      </div>
      <button type={BUTTON} disabled={locked} onClick={() => onStep(1)} aria-label={t('probe.play.next')} className="flex size-8 items-center justify-center rounded-ctl border border-line bg-surf text-ink hover:border-acc disabled:opacity-45 disabled:hover:border-line">
        <Icon name="next" className="size-4" weight={2} />
      </button>
      <button type={BUTTON} disabled={locked} onClick={() => onMode(next)} aria-label={`${t('probe.play.repeat')}: ${t(MODE_KEYS[shown])}`} title={t(MODE_KEYS[shown])} className={`ml-1.5 flex size-8 items-center justify-center rounded-ctl border disabled:opacity-45 ${face(true)}`}>
        <Icon name={MODE_ICONS[shown]} className="size-4" weight={2} />
      </button>
    </div>
  );
};

export default PlayControls;
