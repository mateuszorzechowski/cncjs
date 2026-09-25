/**
 * One secondary reading in its own box: a tool number, a spindle speed.
 *
 * Boxed rather than listed because these are readings an operator checks
 * against what they expect, one at a time, rather than scanning as a set.
 *
 * `compact` puts the label and the reading on one line, for a card where
 * several of them sit under something that needs the room (the Pliki
 * preview; Mateusz, 2026-09-25: the four tiles took too much of the card).
 *
 * `onPress` makes it a button with more behind it — the file check's list —
 * marked the way `SettingSummary` is. `tone` colours the reading when it is a
 * verdict: amber to read before acting, red for what will not run.
 */
const TONES = { warn: 'text-amb', bad: 'text-red' };

const StatTile = ({ label, value, unit, compact = false, tone, onPress }) => {
  const Root = onPress ? 'button' : 'div';

  return (
    <Root
      {...(onPress ? { type: 'button', onClick: onPress } : {})}
      className={[
        'flex min-w-0 flex-1 rounded-ctl border border-line bg-field px-3 text-left',
        compact ? 'flex-row items-baseline justify-between gap-2 py-1' : 'flex-col gap-1 py-2',
      ].join(' ')}
    >
      <span className="truncate font-num text-note text-mut">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className={`truncate font-num font-medium ${TONES[tone] || 'text-ink'} ${compact ? 'text-base' : 'text-lead'}`}>{value}</span>
        {unit ? <span className="shrink-0 font-num text-note text-mut">{unit}</span> : null}
        {onPress ? <span aria-hidden="true" className="shrink-0 text-note text-mut">&#9656;</span> : null}
      </span>
    </Root>
  );
};

export default StatTile;
