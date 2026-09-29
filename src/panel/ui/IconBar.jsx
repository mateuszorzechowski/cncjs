import { useEffect, useRef, useState } from 'react';
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
 *
 * `large`, on a tablet: squares a finger can hit (44px, the touch target the
 * platforms ask for) where a pointer is not the thing pressing them
 * (Mateusz, 2026-09-29: *"na tablecie większe przyciski"*). One column where
 * it fits — the Ścieżka screen has the height (*"zmieściłoby się w jednej
 * kolumnie"*); where it does not, as on the jog screen's preview, each group
 * of several folds to one button, and opening one folds the others (*"jeden
 * przycisk, który po kliknięciu zwija pozostałe i rozwija docelową"*). A
 * folded group shows the glyph of what is chosen in it, or its own (`icon`).
 *
 * `data-stage-inset`: it stands on the drawing's right edge, and the frame
 * keeps clear of it (`scene/insets`).
 */
const TONES = {
  on: 'border-acc bg-acc text-white',
  off: 'border-line bg-panel/85 text-ink hover:border-acc hover:text-acc',
};

const KEY = 44;
const GAP = 4;
// Between two groups: the gap, the rule's margin, its padding and the rule.
const BETWEEN = 6 + 4 + 8 + 1;
// Clear of the drawing's edge at the top and at the bottom.
const MARGIN = 16;

/** Whether every group, open, stands in one column of large keys within `room` pixels. */
export const fitsOpen = (groups, room) => {
  const keys = groups.reduce((sum, group) => sum + group.items.length, 0);
  const height = (keys * KEY) + ((keys - groups.length) * GAP) + ((groups.length - 1) * BETWEEN) + MARGIN;
  return height <= room;
};

const Key = ({ item, large, onSelect = item.onSelect }) => (
  <button
    type="button"
    aria-label={item.label}
    aria-pressed={item.pressed}
    aria-expanded={item.expanded}
    disabled={item.disabled}
    title={item.note ? `${item.label} — ${item.note}` : item.label}
    onClick={onSelect}
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
);

const IconBar = ({ groups, large = false, className = '' }) => {
  const bar = useRef(null);
  const [room, setRoom] = useState(Infinity);
  const [open, setOpen] = useState(groups[0]?.label);

  // The height of the drawing the column stands on, while it is large.
  useEffect(() => {
    const stage = bar.current?.parentElement;
    if (!large || !stage) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => setRoom(entry.contentRect.height));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [large]);

  const folds = large && !fitsOpen(groups, room);

  return (
    <div ref={bar} data-stage-inset="right" className={`flex flex-col gap-1.5 ${className}`}>
      {groups.map((group, index) => {
        const folded = folds && group.items.length > 1 && group.label !== open;
        const chosen = group.items.find((item) => item.pressed);
        return (
          <div
            key={group.label}
            className={[
              'flex flex-col gap-1',
              // A hairline above every group but the first.
              index > 0 ? 'mt-1 border-t border-line pt-2' : '',
            ].join(' ')}
            role="group"
            aria-label={group.label}
          >
            {folded ? (
              <Key
                item={{ label: group.label, icon: group.icon ?? chosen?.icon ?? group.items[0].icon, expanded: false }}
                large={large}
                onSelect={() => setOpen(group.label)}
              />
            ) : group.items.map((item) => <Key key={item.id} item={item} large={large} />)}
          </div>
        );
      })}
    </div>
  );
};

export default IconBar;
