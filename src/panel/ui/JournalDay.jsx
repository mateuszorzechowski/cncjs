const heading = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
});

/**
 * The day the entries below it happened on.
 *
 * A heading rather than a date on every row: the journal keeps months, and
 * *"data i godzina"* (Mateusz, 2026-09-24) is answered once per day instead
 * of forty times. From the drawing of the same day.
 */
const JournalDay = ({ time }) => (
  <li className="pb-1 pt-3 text-cap font-semibold uppercase tracking-[0.08em] text-mut first:pt-0">
    {heading.format(new Date(time))}
  </li>
);

/** The local calendar day of an entry, for telling where a new one starts. */
export const dayOf = (time) => new Date(time).toDateString();

export default JournalDay;
