import Icon from './Icon';

// The tone a machine state is shown in. Four, and no more: the panel spends
// colour on "moving", "ready", "will not move" and "nothing to say", and a
// fifth would dilute the ones that matter.
// The edge carries its variant written out, because Tailwind reads source
// text: a class assembled at runtime from a prefix and a colour is a class it
// never sees and never generates.
const TONES = {
  running: { text: 'text-grn', dot: 'bg-grn', rule: 'bg-grn', edge: 'border-grn bg-grnS' },
  ready: { text: 'text-amb', dot: 'bg-amb', rule: 'bg-amb', edge: 'border-amb bg-ambS' },
  stopped: { text: 'text-red', dot: 'bg-red', rule: 'bg-red', edge: 'border-red bg-redS' },
  inactive: { text: 'text-mut', dot: 'bg-mut', rule: 'bg-line', edge: 'border-line bg-mutS' },
};

/**
 * What state the machine is in.
 *
 * The dot carries the colour so the answer arrives before the word does —
 * across a workshop, from an angle, by someone whose hands are busy.
 *
 * The background is the state's own colour washed into the surface, so the
 * answer arrives as a field of colour before either the dot or the word is
 * looked at. Twelve percent: enough to read across a workshop, not enough to
 * compete with the stop beside it.
 *
 * One width, whatever the word. `Idle` is four letters and `Disconnected` is
 * twelve, and a chip that sizes to its contents moves the filename beside it
 * every time the machine changes state — on the one strip of the screen that
 * has to be readable at a glance from across a workshop. `--chipw` is the
 * drawing's own token for it.
 *
 * On a phone it loses its box and its background and becomes a dot and a
 * word on the bar. The border is there to make a target out of a reading on
 * a panel an arm's length away; at 390px it is a frame around nothing, and
 * the room it costs is the filename's.
 */
const StateChip = ({ tone = 'inactive', label, onPress, children }) => {
  const t = TONES[tone] || TONES.inactive;

  /*
   * A button, because it is the way to everything the panel knows about the
   * state it is showing — what it means, what to do about it, and the help.
   *
   * It is the right thing to hang that on for the reason it was drawn this
   * way in the first place: it is always there, in the same place, saying
   * what the machine is doing. The amber warning badge that used to sit
   * beside it was a second control about the same fact, and it is gone.
   */
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className={[
        'flex shrink-0 items-center gap-1.5',
        // Framed on a phone too, and as tall as the `?` and the STOP beside
        // it — *"w naszych stylach i wszystko tej samej wysokości"*
        // (2026-09-25). It was bare text there.
        // The right edge as close to the chevron as the rule is on its left:
        // the chevron sits centred in its own end of the chip.
        'h-chiph min-w-chip rounded-ctl border pl-3 pr-2.5',
        // The rail's column, inset either side. `--chipw` was a different
        // number from `--rail` and two nearly-equal widths stacked read as a
        // mistake; the full `--rail` glued it to both edges of the column.
        // One column, and the chip sits inside it.
        //
        // Wide, a column: the dot and the state, centred between the top edge
        // and the chevron, and the chevron at the bottom — no rule. Picked
        // from six drawn variants on 2026-09-25 (*"kropka z boku, status z
        // kropką dobrze wyśrodkowany między górnym borderem a chevronem"*).
        // Stacked, the word has the chip's whole width and the chip stays in
        // the rail's column; beside the word, a rule and chevron left too
        // little of 120px and the longer states were cut to "BRAK SERW…".
        '@3xl/shell:h-btnh @3xl/shell:w-railInset @3xl/shell:flex-col @3xl/shell:items-stretch @3xl/shell:gap-0 @3xl/shell:px-2 @3xl/shell:pb-1.5',
        '@3xl/shell:rounded-ctl @3xl/shell:border',
        t.edge,
        'transition-colors hover:brightness-95',
      ].join(' ')}
    >
      <span className="flex min-w-0 items-center gap-1.5 @3xl/shell:flex-1 @3xl/shell:justify-center">
        <span className={`size-[9px] shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
        <span className={`min-w-0 truncate text-left text-cap @3xl/shell:text-center @3xl/shell:line-clamp-2 @3xl/shell:whitespace-normal @3xl/shell:break-words font-semibold uppercase tracking-[0.06em] fullhd:text-lead ${t.text}`}>
          {children}
        </span>
      </span>
      {/* What pressing it does: it opens the state sheet. On a phone a short
        * rule in the chip's tone and a chevron beside the word; wide, the
        * chevron alone, under it. As drawn on 2026-09-25. */}
      <span className={`ml-1 h-5 w-px shrink-0 ${t.rule} @3xl/shell:hidden`} aria-hidden="true" />
      <Icon name="chevron" className={`ml-1 size-4 shrink-0 ${t.text} @3xl/shell:ml-0 @3xl/shell:self-center`} weight={2} />
    </button>
  );
};

export default StateChip;
