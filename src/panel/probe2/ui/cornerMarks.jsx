/*
 * A corner's pictogram for Sonda 3D's tiles (the server's `corner3d`), in
 * the 48-unit box the other shapes' marks use (`SizeSteps`), drawn for the
 * front-left corner and mirrored for the others. A part's: the part standing
 * up and to the right of its corner, the ball off the corner, two heads in to
 * each edge; a pocket's: the work round it, the ball in the pocket by its
 * corner, two heads out to each wall. Spaced as the edge's marks are — a
 * head's tip on the edge, its base 2.8 off.
 */
const WORK = 'fill-mutS stroke-line';
const PART = 'fill-mutS stroke-mut';
const EVEN_ODD = 'evenodd';

const OUT_CORNER = (
  <>
    <path d="M16 6 H44 V32 H16 Z" className={PART} strokeWidth={1.6} strokeLinejoin="round" />
    <circle cx={8} cy={40} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    {/* In to the left edge at two heights, and up to the front edge at two places along it. */}
    <path d="M13.2 23 L16 26 L13.2 29 Z M13.2 11 L16 14 L13.2 17 Z M19 34.8 L22 32 L25 34.8 Z M31 34.8 L34 32 L37 34.8 Z" className="fill-acc" />
  </>
);

const IN_CORNER = (
  <>
    <path d="M4 4 H44 V44 H4 Z M12 6 H42 V36 H12 Z" fillRule={EVEN_ODD} className={WORK} strokeWidth={1.6} strokeLinejoin="round" />
    <circle cx={19} cy={29} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    {/* Out to the left wall at two heights, and down to the front wall at two places along it. */}
    <path d="M14.8 26 L12 29 L14.8 32 Z M14.8 14 L12 17 L14.8 20 Z M16 33.2 L19 36 L22 33.2 Z M28 33.2 L31 36 L34 33.2 Z" className="fill-acc" />
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
