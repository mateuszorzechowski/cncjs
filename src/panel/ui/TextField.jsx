/**
 * The panel's one field to type into.
 *
 * The first one — until the journal needed a search, every value on the
 * panel was chosen, stepped or jogged, never typed. One component so that
 * the second screen to need a field gets the same one.
 *
 * `label` is the name read aloud. A date and time is `DateTimeField`, which
 * wears the same face. `unit`, when given, stands inside the field at its
 * right, muted — the figure typed and what it is in (Mateusz, 2026-09-26,
 * the jog steps: *"dodaj maskę do wartości z jednostkami"*).
 *
 * The unit beside the figure inside one frame, not laid over the field: a
 * unit as long as `kroków/mm` ran under the digits. The frame takes the
 * focus colour from the input inside it.
 *
 * For a value that is not saved yet (the controller settings design,
 * 2026-09-26, decision 6): `was`, what it replaces, small and struck
 * through under the figure inside the field, so the row keeps its height;
 * `state` `changed` frames it in amber, `bad` in red.
 *
 * A figure (`inputMode="decimal"`) stands at the right, digits under digits
 * down a column of fields — panel v2 of the same design.
 */
const FRAMES = {
  changed: 'border-amb bg-ambS',
  bad: 'border-red bg-redS',
};

const TextField = ({ label, unit, was, state, className = '', ...rest }) => {
  const figure = rest.inputMode === 'decimal';
  return (
    <label
      className={[
        'flex h-chiph min-w-0 items-center gap-2 rounded-ctl border px-3 focus-within:border-acc',
        FRAMES[state] || 'border-line bg-field',
        className,
      ].join(' ')}
    >
      <span className={`flex min-w-0 flex-1 flex-col justify-center self-stretch ${figure ? 'items-end' : ''}`}>
        <input
          aria-label={label}
          className={[
            'min-w-0 self-stretch bg-transparent text-note text-ink outline-none placeholder:text-mut',
            was === undefined ? 'h-full' : 'leading-tight',
            // A figure with a unit reads in the panel's figures face.
            unit || figure ? 'font-num' : '',
            figure ? 'text-right' : '',
          ].join(' ')}
          {...rest}
        />
        {was !== undefined ? <s className="font-num text-cap leading-none text-ambT">{was}</s> : null}
      </span>
      {unit ? <span className="pointer-events-none shrink-0 font-num text-note text-mut">{unit}</span> : null}
    </label>
  );
};

export default TextField;
