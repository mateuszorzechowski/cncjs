/**
 * The panel's one field to type into.
 *
 * The first one — until the journal needed a search and a time window, every
 * value on the panel was chosen, stepped or jogged, never typed. One component
 * so that the second screen to need a field gets the same one.
 *
 * `label` is the name read aloud, and, when `caption` is set, also written
 * before the field in the panel's small caps — a date field on its own says
 * nothing about which end of a window it is.
 */
const TextField = ({ label, caption = false, className = '', ...rest }) => (
  <label className={`flex h-chiph min-w-0 items-center gap-2 ${className}`}>
    {caption ? (
      <span className="shrink-0 text-cap font-semibold uppercase tracking-[0.08em] text-mut">{label}</span>
    ) : null}
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
