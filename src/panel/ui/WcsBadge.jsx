import { NO_READING } from '../machine/readings';

/**
 * The coordinate system the machine works in, as a marker on a card.
 *
 * A marker rather than a footnote: as plain muted text it read as a label on
 * the card rather than a reading from the machine. One component, so the
 * readout card and the zeroing card say it the same way — the zeroing card
 * had it as plain text (Mateusz, 2026-09-25).
 */
const WcsBadge = ({ wcs }) => (
  <span className="rounded-ctl border border-line bg-field px-3 py-1 text-base font-semibold uppercase tracking-[0.08em] text-ink">
    {wcs || NO_READING}
  </span>
);

export default WcsBadge;
