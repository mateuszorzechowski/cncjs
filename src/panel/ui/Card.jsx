import FadeScroller from './FadeScroller';
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
const Head = ({ label, sublabel, aside, onHelp, helpLabel }) => (
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
);

/*
 * `scrolls`: the head stands and the rest of the card — its frame and its
 * bottom edge included — scrolls under it, fading out at the foot of the
 * space it has, so the card goes under whatever stands below it: the
 * controller settings' bar of changes on a tablet (review note, 2026-09-28:
 * *"cała karta się scroluje, z wyjątkiem nagłówka … chowa się pod paskiem
 * zmian"*). `gapBelow` when something stands under it: the card then ends
 * a gap before it, as cards stand apart (*"po scrollu karta ma mieć gap
 * jak pozostałe karty"*); with nothing under it, it runs to the foot.
 * `standing`: what stands with the head rather than scrolling — the
 * journal's filters, which frame the list and are not part of it.
 * Otherwise the frame stands and a scroller inside it fades its contents
 * within it.
 */
const Card = ({
  label, sublabel, aside, onHelp, helpLabel, row = false, scrolls = false, gapBelow = false, standing = null,
  className = '', bodyClassName = '', children,
}) => {
  const head = (label || sublabel || aside || onHelp)
    ? <Head label={label} sublabel={sublabel} aside={aside} onHelp={onHelp} helpLabel={helpLabel} />
    : null;
  if (scrolls) {
    return (
      // `data-scrolls` and `data-card-foot`: on a phone the shell gives the
      // last card room for the menu's mound, and here that room belongs at
      // the foot of the frame that scrolls, not round the card (see `App`).
      <section data-scrolls="" className={`flex min-h-0 min-w-0 flex-col ${className}`}>
        <div className="shrink-0 rounded-t-card border border-b-0 border-line bg-panel px-pad pt-pad">
          {head}
          {standing}
        </div>
        <FadeScroller frame gapBelow={gapBelow}>
          {/* At least as tall as the room it has: short contents leave the frame at the foot, not a card floating above empty page. */}
          <div className={`flex min-h-full flex-col ${gapBelow ? 'pb-gap' : ''}`}>
            <div data-card-foot="" className={`flex flex-1 flex-col rounded-b-card border border-t-0 border-line bg-panel px-pad pb-pad ${bodyClassName}`}>
              {children}
            </div>
          </div>
        </FadeScroller>
      </section>
    );
  }
  return (
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
    {head}
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
};

export default Card;
