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
 * For the journal's filters, three more, all optional:
 * - `isOn(option)` in place of `value` when more than one can be on — a
 *   level is a floor, so `Warn` lights `Warn` and `Error`; sources are a
 *   set;
 * - `counts`, what each option stands for, shown after its name;
 * - `columns`, tiles in a grid instead of a row, for a phone's sheet.
 */
const COLUMNS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 4: 'grid-cols-4' };

const SegmentedChoice = ({
  options, value, onChange, format = String, label, unit, disabled, compact = false, isOn, counts, columns,
}) => (
  <div
    className={columns ? `grid gap-2 ${COLUMNS[columns]}` : 'flex h-chiph shrink-0 gap-2'}
    role="group"
    aria-label={label}
  >
    {options.map((option) => {
      const chosen = isOn ? isOn(option) : option === value;
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
            'flex items-center gap-2 rounded-ctl border font-num text-base font-semibold transition-colors',
            columns ? 'h-chiph justify-between px-3' : 'h-full justify-center',
            !columns && compact ? 'shrink-0 px-3' : '',
            !columns && !compact ? 'min-w-0 flex-1 basis-0 px-1' : '',
            chosen
              ? 'border-acc bg-acc text-white'
              : 'border-line bg-surf text-ink hover:border-acc hover:text-acc',
            // Dimmed, not repainted: which step is selected is still the
            // answer to "what happens when I reconnect and press a key", and
            // a disabled control that drops its selection hides that.
            'disabled:opacity-45 disabled:hover:border-line disabled:hover:text-ink',
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
