/**
 * A second row of tabs inside a card: the groups of one settings tab, the
 * chosen one underlined, an amber count beside a group that holds unsaved
 * changes.
 *
 * From the controller settings design, panel v2 (2026-09-26): groups as a
 * row across the card rather than a list down its left side — the list cost
 * the content some 160 px on a 1024 px tablet. One row at every width; on a
 * phone it scrolls sideways.
 *
 * `counts[id]`, when above nought, is shown in the badge.
 */
const GroupTabs = ({ options, value, onChange, format, counts = {}, label }) => (
  <div role="tablist" aria-label={label} className="-mx-1 flex overflow-x-auto border-b border-line px-1">
    {options.map((option) => {
      const on = option === value;
      const count = counts[option];
      return (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={on}
          onClick={() => onChange(option)}
          className={[
            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-base font-semibold transition-colors',
            on ? 'border-acc text-acc' : 'border-transparent text-ink hover:text-acc',
          ].join(' ')}
        >
          {format(option)}
          {count ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-amb font-num text-cap text-white">{count}</span>
          ) : null}
        </button>
      );
    })}
  </div>
);

export default GroupTabs;
