/**
 * One secondary reading in its own box: a tool number, a spindle speed.
 *
 * Boxed rather than listed because these are readings an operator checks
 * against what they expect, one at a time, rather than scanning as a set.
 *
 * `compact` puts the label and the reading on one line, for a card where
 * several of them sit under something that needs the room (the Pliki
 * preview; Mateusz, 2026-09-25: the four tiles took too much of the card).
 */
const StatTile = ({ label, value, unit, compact = false }) => (
  <div
    className={[
      'flex min-w-0 flex-1 rounded-ctl border border-line bg-field px-3',
      compact ? 'flex-row items-baseline justify-between gap-2 py-1' : 'flex-col gap-1 py-2',
    ].join(' ')}
  >
    <span className="truncate font-num text-note text-mut">{label}</span>
    <span className="flex items-baseline gap-2">
      <span className={`truncate font-num font-medium text-ink ${compact ? 'text-base' : 'text-lead'}`}>{value}</span>
      {unit ? <span className="shrink-0 font-num text-note text-mut">{unit}</span> : null}
    </span>
  </div>
);

export default StatTile;
