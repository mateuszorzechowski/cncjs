import HelpButton from './HelpButton';

/**
 * The one repeating container: a white panel, a hairline edge, a 6px corner.
 *
 * `label` is the quiet caption at the top left and `aside` the note at the top
 * right — a second reading, a coordinate system, a contact state. A card with
 * neither is still a card; several on this panel are just a frame round a
 * canvas.
 *
 * `onHelp` puts a `?` at the end of that header, the same one a sheet offers.
 * A screen that has to explain itself should do it behind a question mark
 * rather than in a paragraph nobody can put away — which is the whole of what
 * the zeroing screen learned.
 *
 * `sublabel` is a second line under the caption — the firmware's name and
 * version under PAMIĘĆ STEROWNIKA (settings handoff, 2026-09-28). In the
 * number face and not in capitals, because it is a reading, and it wraps
 * rather than truncates: `Smoothieware edge-9a1b2c3` cut short is a
 * different firmware.
 */
const Card = ({ label, sublabel, aside, onHelp, helpLabel, row = false, className = '', bodyClassName = '', children }) => (
  <section
    /*
      * `--thumbGutter` so a scroller inside this card puts its indicator in
      * *this* card's padding. It is inherited, so without it a card sitting
      * in the content area would hand its scroller the shell's margin
      * instead — ten pixels where the card leaves eighteen, and the thumb
      * lands in the middle of the text. See `FadeScroller`.
      */
    className={`flex min-w-0 flex-col rounded-card border border-line bg-panel p-pad [--thumbGutter:var(--pad)] ${className}`}
  >
    {(label || sublabel || aside || onHelp) && (
      // `items-center` only when there is a button to centre against. A
      // baseline is right for two pieces of text and wrong for a square.
      // Two lines of caption sit on the bottom of what is beside them: on
      // the baseline they hung from the top of the ↻ square with a gap under
      // them (review note, 2026-09-28: *"tekst jest wyrównany do górnej
      // krawędzi nie do dolnej"*).
      <header className={`mb-3 flex justify-between gap-3 ${(sublabel && 'items-end') || (onHelp ? 'items-baseline @3xl/shell:items-center' : 'items-baseline')}`}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="m-0 truncate text-cap font-semibold uppercase tracking-[0.1em] text-mut">
            {label}
          </h2>
          {sublabel ? <span className="break-words font-num text-note text-mut">{sublabel}</span> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {aside ? <span className="font-num text-note text-mut">{aside}</span> : null}
          {/* Not on a phone: there the screen lifts it into the top bar with
            * `useHeaderHelp`, beside the state chip. */}
          {onHelp ? <HelpButton label={helpLabel} onPress={onHelp} className="hidden size-chiph text-base @3xl/shell:block" /> : null}
        </div>
      </header>
    )}
    {/*
      * `row` is a prop rather than a class passed in, because two direction
      * utilities in one string do not resolve in the order they are written —
      * the generated stylesheet decides, and `flex-col` quietly won. A card
      * laid out sideways then rendered as a column, which is not a thing any
      * amount of reading the JSX would explain.
      */}
    <div className={`flex min-h-0 flex-1 ${row ? 'flex-row' : 'flex-col'} ${bodyClassName}`}>
      {children}
    </div>
  </section>
);

export default Card;
