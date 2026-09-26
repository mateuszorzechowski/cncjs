/**
 * Rows of one subject under a quiet heading — the connection tab's three,
 * Sterownik · Serwer · Stan, from the settings design's variant 3a
 * (2026-09-26). The heading is the card caption's face, because it does the
 * same job one level down: it names what the rows below are about, and says
 * nothing a row would have to repeat.
 */
const SettingGroup = ({ title, children }) => (
  <section className="flex flex-col border-b border-line pb-4 pt-6 first:pt-0 last:border-b-0 last:pb-0">
    <h2 className="m-0 text-cap font-semibold uppercase tracking-[0.1em] text-mut">{title}</h2>
    {children}
  </section>
);

export default SettingGroup;
