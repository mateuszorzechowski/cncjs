import Icon from './Icon';

/**
 * The same choices as the chips, at a tenth of the room.
 *
 * The toolpath screen can afford headings and words: the drawing is what the
 * screen is for and the column beside it is doing nothing else. The preview
 * beside the jog keys cannot — it is a glance at where the tool is, and a
 * block of labelled buttons under it would take the height that makes the
 * glance worth taking.
 *
 * So the menu goes **on** the drawing rather than under it. Nothing is lost:
 * every button keeps its name where it counts, as `aria-label` and as the
 * tooltip, so the one thing a glyph cannot say is still said to anyone who
 * hovers or cannot see it.
 *
 * Groups are separated by a rule rather than by spacing alone. Which of these
 * is "one of four" and which is "on or off" is not visible in a row of
 * squares, and the rule is what says there are two questions here.
 */
const TONES = {
  on: 'border-acc bg-acc text-white',
  off: 'border-line bg-panel/85 text-ink hover:border-acc hover:text-acc',
};

/*
 * `large`, on a tablet: squares a finger can hit (44px, the touch target the
 * platforms ask for) where a pointer is not the thing pressing them
 * (Mateusz, 2026-09-29: *"na tablecie większe przyciski"*). At that size the
 * eleven do not fit down the jog screen's preview, so the groups stand side
 * by side — the first against the edge — and the tallest is five.
 */
const IconBar = ({ groups, large = false, className = '' }) => (
  <div className={`flex items-start ${large ? 'flex-row-reverse gap-2' : 'flex-col gap-1.5'} ${className}`}>
    {groups.map((group, index) => (
      <div
        key={group.label}
        className={[
          'flex flex-col gap-1',
          // A hairline between groups: above each in a column, beside each in a row.
          index > 0 && !large ? 'mt-1 border-t border-line pt-2' : '',
          index > 0 && large ? 'border-r border-line pr-2' : '',
        ].join(' ')}
        role="group"
        aria-label={group.label}
      >
        {group.items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={item.pressed}
            disabled={item.disabled}
            title={item.note ? `${item.label} — ${item.note}` : item.label}
            onClick={item.onSelect}
            className={[
              'flex shrink-0 items-center justify-center rounded-ctl border',
              large ? 'size-11' : 'size-7',
              'transition-colors disabled:opacity-40 disabled:hover:border-line',
              'disabled:hover:text-ink',
              item.pressed ? TONES.on : TONES.off,
            ].join(' ')}
          >
            <Icon name={item.icon} className={large ? 'size-5' : 'size-4'} />
          </button>
        ))}
      </div>
    ))}
  </div>
);

export default IconBar;
