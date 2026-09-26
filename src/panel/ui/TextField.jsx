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
 */
const TextField = ({ label, unit, className = '', ...rest }) => (
  <label className={`relative flex h-chiph min-w-0 items-center gap-2 ${className}`}>
    <input
      aria-label={label}
      className={[
        'h-full min-w-0 flex-1 rounded-ctl border border-line bg-field px-3 text-note text-ink',
        'outline-none placeholder:text-mut focus:border-acc',
        // A figure with a unit reads in the panel's figures face.
        unit ? 'pr-10 font-num' : '',
      ].join(' ')}
      {...rest}
    />
    {unit ? (
      <span className="pointer-events-none absolute right-3 font-num text-note text-mut">{unit}</span>
    ) : null}
  </label>
);

export default TextField;
