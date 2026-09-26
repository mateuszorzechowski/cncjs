import { useCallback, useEffect, useState } from 'react';
import { sideEdgesOf } from './scrollMetrics';

/**
 * A second row of tabs inside a card: the groups of one settings tab, the
 * chosen one underlined, an amber count beside a group that holds unsaved
 * changes.
 *
 * From the controller settings design, panel v2 (2026-09-26): groups as a
 * row across the card rather than a list down its left side — the list cost
 * the content some 160 px on a 1024 px tablet. One row at every width.
 *
 * Where it does not fit it scrolls sideways and only sideways, with no bar,
 * and fades out at the edge that has more behind it — Mateusz, 2026-09-26:
 * *"scroll ma byc nie widoczny, ale ma byc widac ze cos jest schowane"*.
 *
 * `counts[id]`, when above nought, is shown in the badge.
 */
const GroupTabs = ({ options, value, onChange, format, counts = {}, label }) => {
  const [row, setRow] = useState(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => setEdges(sideEdgesOf(row)), [row]);

  useEffect(() => {
    if (!row) {
      return undefined;
    }
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(row);
    return () => resize.disconnect();
  }, [row, measure]);

  return (
    <div className="shrink-0 border-b border-line">
      <div
        ref={setRow}
        role="tablist"
        aria-label={label}
        onScroll={measure}
        className={[
          'scroll-quiet flex overflow-x-auto overflow-y-hidden',
          '[mask-image:linear-gradient(to_right,transparent_0,black_var(--fadeL),black_calc(100%-var(--fadeR)),transparent_100%)]',
          edges.left ? '[--fadeL:2.5rem]' : '[--fadeL:0px]',
          edges.right ? '[--fadeR:2.5rem]' : '[--fadeR:0px]',
        ].join(' ')}
      >
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
                'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-base font-semibold transition-colors',
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
    </div>
  );
};

export default GroupTabs;
