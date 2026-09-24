/**
 * One setting: what it is, how it is set, and what it means.
 *
 * From the drawings of 2026-09-25. Wide, a row: the name and its note on the
 * left, the control on the right, a rule between rows — a settings page read
 * down one column of names rather than a stack of unrelated blocks, which is
 * what the application tab had become (*"na tym ekranie dużo się dzieje"*).
 * On a phone the same three things stacked: the name, the control, then the
 * note.
 *
 * One order in the markup for both — name, control, note — so a screen
 * reader hears the control before its small print; the wide layout moves the
 * note up beside the name with grid placement, not by reordering. The name's
 * row is as tall as the name and the note's takes the rest, or a tall control
 * — the certificate's — stretched both and pushed the note to the bottom.
 */
const SettingRow = ({ title, note, children }) => (
  <div className="flex flex-col gap-2 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0 @3xl/shell:grid @3xl/shell:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] @3xl/shell:grid-rows-[auto_1fr] @3xl/shell:gap-x-10 @3xl/shell:gap-y-1">
    <h3 className="m-0 text-base font-semibold text-ink @3xl/shell:col-start-1 @3xl/shell:row-start-1">{title}</h3>
    <div className="flex min-w-0 flex-col gap-3 @3xl/shell:col-start-2 @3xl/shell:row-span-2 @3xl/shell:row-start-1">
      {children}
    </div>
    {note ? (
      <p className="m-0 text-note text-mut @3xl/shell:col-start-1 @3xl/shell:row-start-2">{note}</p>
    ) : null}
  </div>
);

export default SettingRow;
