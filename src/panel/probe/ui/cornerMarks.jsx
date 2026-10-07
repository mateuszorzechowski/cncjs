/*
 * A corner's pictogram for Sonda 3D's tiles (the server's `corner3d`), in
 * the 48-unit box the other shapes' marks use (`SizeSteps`), drawn for the
 * front-left corner and mirrored for the others. A part's: the part standing
 * up and to the right of its corner, the ball off the corner, two heads in to
 * each edge; a pocket's: its corner alone, an L of the work's two walls
 * (Mateusz, 2026-10-06), the ball in it, two heads out to each wall. Each
 * head halfway between the ball and the work, as `SizeSteps` spaces them.
 */
const WORK = 'fill-mutS stroke-line';

const OUT_CORNER = (
  <>
    <path d="M17 4 H44 V31 H17 Z" className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
    <circle cx={6} cy={42} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    {/* In to the left edge at two places along it, and up to the front edge at two. */}
    <path d="M11.4 10 L14.2 13 L11.4 16 Z M11.4 22 L14.2 25 L11.4 28 Z M23 36.6 L26 33.8 L29 36.6 Z M35 36.6 L38 33.8 L41 36.6 Z" className="fill-acc" />
  </>
);

const IN_CORNER = (
  <>
    <path d="M4 4 H13 V35 H44 V44 H4 Z" className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
    <circle cx={24} cy={24} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    {/* Out to the left wall square across and further back, and down to the front wall square across and further right. */}
    <path d="M18.6 9 L15.8 12 L18.6 15 Z M18.6 21 L15.8 24 L18.6 27 Z M21 29.4 L24 32.2 L27 29.4 Z M33 29.4 L36 32.2 L39 29.4 Z" className="fill-acc" />
  </>
);

// Mirrored for the other three corners: right is the left turned over, back the front.
const MIRROR = {
  'front-left': undefined,
  'front-right': 'translate(48 0) scale(-1 1)',
  'back-left': 'translate(0 48) scale(1 -1)',
  'back-right': 'rotate(180 24 24)',
};

/** The marks of corner shape `one` (`{ corner, side }`). */
const CornerMarks = ({ one }) => <g transform={MIRROR[one.corner]}>{one.side === 'inside' ? IN_CORNER : OUT_CORNER}</g>;

export default CornerMarks;
