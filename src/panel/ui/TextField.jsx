/**
 * The panel's one field to type into.
 *
 * The first one — until the journal needed a search, every value on the
 * panel was chosen, stepped or jogged, never typed. One component so that
 * the second screen to need a field gets the same one.
 *
 * `label` is the name read aloud. A date and time is `DateTimeField`, which
 * wears the same face.
 */
const TextField = ({ label, className = '', ...rest }) => (
  <label className={`flex h-chiph min-w-0 items-center gap-2 ${className}`}>
    <input
      aria-label={label}
      className={[
        'h-full min-w-0 flex-1 rounded-ctl border border-line bg-field px-3 text-note text-ink',
        'outline-none placeholder:text-mut focus:border-acc',
      ].join(' ')}
      {...rest}
    />
  </label>
);

export default TextField;
