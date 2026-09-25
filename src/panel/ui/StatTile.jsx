import Icon from './Icon';

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
 * marked with the state chip's chevron, which is what every control that
 * opens a sheet carries. `tone` colours the whole tile when it is a verdict,
 * the way the chip is coloured: amber to read before acting, red for what
 * will not run (Mateusz, 2026-09-25: *"całość powinna być czerwona"*).
 */
const TONES = {
  warn: { edge: 'border-amb bg-ambS', text: 'text-amb' },
  bad: { edge: 'border-red bg-redS', text: 'text-red' },
};
const PLAIN = { edge: 'border-line bg-field', text: 'text-ink' };

const StatTile = ({ label, value, unit, compact = false, tone, onPress }) => {
  const Root = onPress ? 'button' : 'div';
  const look = TONES[tone] || PLAIN;

  return (
    <Root
      {...(onPress ? { type: 'button', onClick: onPress } : {})}
      className={[
        `flex min-w-0 flex-1 rounded-ctl border ${look.edge} px-3 text-left`,
        compact ? 'flex-row items-baseline justify-between gap-2 py-1' : 'flex-col gap-1 py-2',
      ].join(' ')}
    >
      <span className={`truncate font-num text-note ${tone ? look.text : 'text-mut'}`}>{label}</span>
      <span className="flex items-baseline gap-2">
        <span className={`truncate font-num font-medium ${look.text} ${compact ? 'text-base' : 'text-lead'}`}>{value}</span>
        {unit ? <span className="shrink-0 font-num text-note text-mut">{unit}</span> : null}
        {onPress ? <Icon name="chevron" className={`size-4 shrink-0 self-center ${tone ? look.text : 'text-mut'}`} weight={2} /> : null}
      </span>
    </Root>
  );
};

export default StatTile;
