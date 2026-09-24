/**
 * A choice among a few fixed values: a jog step, a coordinate system, a view.
 *
 * Every option is always on screen. A dropdown would be fewer pixels and the
 * wrong shape — an operator changing the jog step is looking at the tool, not
 * at the screen, and a menu that has to be opened first cannot be hit blind.
 *
 * Equal columns — `basis-0` so they divide the row rather than sizing to
 * their own labels, which would make `0.1` narrower than `1500`.
 *
 * `aria-pressed` rather than a class alone: which one is chosen has to be
 * available to something that is not looking at the fill.
 *
 * `compact` is for a filter rather than a setting: options as wide as their
 * labels, so a row of them can sit beside other controls — *"filtry w jednej
 * linii, mniejsze buttony"* (Mateusz, 2026-09-24). The same face and height,
 * because these are the panel's buttons and a touch target does not get
 * smaller for being a filter.
 *
 * For the journal's filters, more, all optional:
 * - `isOn(option)` in place of `value` when more than one can be on — the
 *   journal's levels and sources are sets;
 * - `counts`, what each option stands for, shown after its name;
 * - `columns`, tiles in a grid instead of a row, for a phone's sheet;
 * - `joined`, the same buttons as one group, touching, rounded only at the
 *   ends — *"te przyciski mogą być jako button group"* (2026-09-24).
 */
const COLUMNS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 4: 'grid-cols-4' };

const SegmentedChoice = ({
  options, value, onChange, format = String, label, unit, disabled, compact = false, isOn, counts, columns, joined = false,
}) => (
  <div
    className={columns ? `grid gap-2 ${COLUMNS[columns]}` : `flex h-chiph shrink-0 ${joined ? '' : 'gap-2'}`}
    role="group"
    aria-label={label}
  >
    {options.map((option, index) => {
      const on = (which) => (isOn ? isOn(which) : which === value);
      const chosen = on(option);
      const count = counts ? counts[option] : undefined;
      return (
        <button
          key={option}
          type="button"
          // The face says `1` because the drawing does and because four
          // chips of bare numbers are read as a scale. The name says
          // `1 mm`, because a control read aloud without its unit is the
          // one thing on this panel that must never be ambiguous.
          aria-label={unit ? `${format(option)} ${unit}` : undefined}
          aria-pressed={chosen}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={[
            'flex items-center gap-2 border font-num text-base font-semibold transition-colors',
            // Joined: one border between two buttons rather than two, and the
            // chosen one drawn over its neighbours so its edge is whole.
            // Hovered drawn over its neighbours too, or the neighbour's edge
            // covers one side of the hover and it reads as one button
            // slipping under the next.
            joined ? 'relative -ml-px first:ml-0 first:rounded-l-ctl last:rounded-r-ctl hover:z-20' : 'rounded-ctl',
            joined && chosen ? 'z-10' : '',
            // Two chosen side by side would read as one wide button.
            joined && chosen && index > 0 && on(options[index - 1]) ? 'border-l-panel' : '',
            columns ? 'h-chiph justify-between px-3' : 'h-full justify-center',
            !columns && compact ? 'shrink-0 px-3' : '',
            !columns && !compact ? 'min-w-0 flex-1 basis-0 px-1' : '',
            chosen
              ? 'border-acc bg-acc text-white hover:brightness-95'
              : 'border-line bg-surf text-ink hover:border-acc hover:text-acc',
            // Dimmed, not repainted: which step is selected is still the
            // answer to "what happens when I reconnect and press a key", and
            // a disabled control that drops its selection hides that.
            'disabled:opacity-45 disabled:hover:border-line disabled:hover:text-ink disabled:hover:brightness-100',
          ].join(' ')}
        >
          {format(option)}
          {count === undefined ? null : <span className="tabular-nums opacity-75">{count}</span>}
        </button>
      );
    })}
  </div>
);

export default SegmentedChoice;
