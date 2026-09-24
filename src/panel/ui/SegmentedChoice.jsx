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
 * labels, a smaller face, and the chosen one tinted rather than filled, so
 * a row of them can sit beside other controls without being the loudest
 * thing on the screen — *"filtry delikatniejsze, w jednej linii, mniejsze
 * buttony"* (Mateusz, 2026-09-24). Same height, because a touch target
 * does not get smaller for being quiet.
 */
const SegmentedChoice = ({ options, value, onChange, format = String, label, unit, disabled, compact = false }) => (
  <div className={`flex h-chiph shrink-0 ${compact ? 'gap-1' : 'gap-2'}`} role="group" aria-label={label}>
    {options.map((option) => {
      const chosen = option === value;
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
            'h-full rounded-ctl border transition-colors',
            compact
              ? 'shrink-0 px-3 text-note font-semibold'
              : 'min-w-0 flex-1 basis-0 px-1 font-num text-base font-semibold',
            chosen && compact ? 'border-acc bg-accS text-acc' : '',
            chosen && !compact ? 'border-acc bg-acc text-white' : '',
            chosen ? '' : 'border-line bg-surf text-ink hover:border-acc hover:text-acc',
            // Dimmed, not repainted: which step is selected is still the
            // answer to "what happens when I reconnect and press a key", and
            // a disabled control that drops its selection hides that.
            'disabled:opacity-45 disabled:hover:border-line disabled:hover:text-ink',
          ].join(' ')}
        >
          {format(option)}
        </button>
      );
    })}
  </div>
);

export default SegmentedChoice;
