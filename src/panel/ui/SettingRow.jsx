import { t } from '../i18n';

// Written out, so every key is a literal the resources test can find. The
// server's in the accent, because it is the one that reaches past this device.
const SCOPES = {
  device: { key: 'settings.scope.device', face: 'bg-mutS text-mut' },
  server: { key: 'settings.scope.server', face: 'bg-accS text-acc' },
};

/**
 * One setting: what it is, how it is set, and what it means.
 *
 * From the drawings of 2026-09-25. Wide, a row: the name and its note on the
 * left, the control on the right, a rule between rows — a settings page read
 * down one column of names rather than a stack of unrelated blocks, which is
 * what the application tab had become (*"na tym ekranie dużo się dzieje"*).
 * On a phone the name and its note above the control, full width — the
 * settings drawing of the same day, *"etykieta i opis nad kontrolką"*.
 *
 * `scope` says whose setting it is: `device`, kept by the browser holding
 * this panel, or `server`, the same on every device. Said on the row rather
 * than grouped under a heading, because a tab mixes the two and a row that
 * changes every panel in the workshop has to say so where it is changed.
 * Beside the name on a phone, under the note when wide — the drawing's two
 * places for it.
 *
 * One order in the markup — name, scope, control, note — so a screen reader
 * hears the control before its small print; on a phone `order` lifts the
 * note above the control, and wide, grid placement does — neither reorders
 * what is read. The name's row is as tall as the name and the note's takes
 * the rest when wide, or a tall control — the certificate's — stretched both
 * and pushed the note to the bottom.
 *
 * `noteBelow`: a note that tells what the chosen option does, and so changes
 * with the choice, stays under the control on a phone — above it, a note of
 * another length moved the buttons away from the finger that had just
 * pressed one (Mateusz, 2026-09-26: *"na telefonie to pod przyciskami, bo
 * teraz przyciski przeskakują przy zmianie opcji"*).
 */
const SettingRow = ({ title, note, scope, noteBelow = false, children }) => (
  <div className="grid grid-cols-1 gap-y-2 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0 @3xl/shell:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] @3xl/shell:grid-rows-[auto_auto_1fr] @3xl/shell:items-start @3xl/shell:gap-x-10 @3xl/shell:gap-y-1">
    {/*
      * The name and the scope share a line on a phone and wrap as a pair when
      * they do not fit — `SERWER · WSZYSTKIE URZĄDZENIA` beside a long name
      * broke in two at 360px. Wide, the wrapper steps aside (`contents`) and
      * both are placed in the grid like everything else — the scope pulled
      * left by its own padding, so its words start where the name's and the
      * note's do and only the wash reaches past them (*"czy to ma marginses z
      * lewej? wyglada jakby bylo nierowno"*, 2026-09-25).
      */}
    <div className="order-1 flex flex-wrap items-center gap-x-2 gap-y-1 @3xl/shell:contents">
      <h3 className="m-0 text-base font-semibold text-ink @3xl/shell:col-start-1 @3xl/shell:row-start-1">{title}</h3>
      {scope ? (
        <span className={`whitespace-nowrap rounded-ctl px-1.5 py-0.5 font-num text-cap uppercase tracking-[0.08em] @3xl/shell:col-start-1 @3xl/shell:row-start-3 @3xl/shell:-ml-1.5 @3xl/shell:mt-1 @3xl/shell:justify-self-start ${SCOPES[scope].face}`}>
          {t(SCOPES[scope].key)}
        </span>
      ) : null}
    </div>
    <div className="order-3 flex min-w-0 flex-col gap-3 @3xl/shell:col-start-2 @3xl/shell:row-span-3 @3xl/shell:row-start-1">
      {children}
    </div>
    {note ? (
      <p className={`${noteBelow ? 'order-4' : 'order-2'} m-0 text-note text-mut @3xl/shell:col-start-1 @3xl/shell:row-start-2`}>{note}</p>
    ) : null}
  </div>
);

export default SettingRow;
