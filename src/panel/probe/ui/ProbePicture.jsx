/**
 * What a probing method looks like on the machine, small: the tile it is
 * picked on. The Z plate and the L plate are the design's pictograms (1d and
 * 1e, 2026-09-29); the paper is drawn the same way — the work, the V bit, the
 * accent arrow — with the sheet one accent line folded at one end (review
 * note, 2026-10-01: *"kartka to jedna niebieska linia z fałdami po jednej
 * stronie"*).
 */

/*
 * The Z plate's pictogram, as the design draws it (1d, 2026-09-29): the work,
 * the plate with its blue edge, the tool as an outline — a 60° V bit, the
 * panel's one tool (Mateusz, the same day) — and the accent arrow
 * down onto the plate. Its own 48-unit box, three shapes, so it stays legible
 * as small as a tile.
 */
const ZPlatePictogram = ({ label, className }) => (
  <svg viewBox="0 0 48 48" role="img" aria-label={label} className={`shrink-0 overflow-visible ${className}`}>
    <rect x={4} y={37} width={40} height={7} className="fill-mutS stroke-line" strokeWidth={1.6} />
    <rect x={15} y={31} width={18} height={6} className="fill-accS stroke-acc" strokeWidth={1.6} />
    <path d="M20.5 3 H27.5 V13.4 L24 19.5 L20.5 13.4 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M20 23.5 H28 L24 29 Z" className="fill-acc stroke-acc" strokeWidth={0.96} strokeLinejoin="round" />
  </svg>
);

/*
 * The L plate's pictogram, as the design draws it (1e, 2026-09-29): the work,
 * the L plate over its corner — the part on the work dashed — and the V bit
 * over it with the accent arrow.
 */
const CornerPictogram = ({ label, className }) => (
  <svg viewBox="0 0 48 48" role="img" aria-label={label} className={`shrink-0 overflow-visible ${className}`}>
    <rect x={10} y={30} width={36} height={14} className="fill-mutS stroke-line" strokeWidth={1.6} />
    <path d="M5 25 H25 V38 H5 Z" className="fill-accS stroke-acc" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M25 30 H10 V38" className="stroke-acc" fill="none" strokeWidth={1.12} strokeDasharray="1.8 1.3" />
    <path d="M12 3 H18 V11.8 L15 17 L12 11.8 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M11.5 19.5 H18.5 L15 23.5 Z" className="fill-acc" />
  </svg>
);

/*
 * The paper's pictogram: the work, the sheet on it as one accent line bowed
 * up once beside the tool, as the sheet stuck under it is drawn (review note
 * #1, 2026-10-02), the V bit over it and the arrow down — the Z plate's tool
 * and arrow, lower, as there is no plate.
 */
const PaperPictogram = ({ label, className }) => (
  <svg viewBox="0 0 48 48" role="img" aria-label={label} className={`shrink-0 overflow-visible ${className}`}>
    <rect x={4} y={37} width={40} height={7} className="fill-mutS stroke-line" strokeWidth={1.6} />
    <path d="M5 35.4 C9 35.4 10 31.2 14 31.2 C18 31.2 18.5 35.4 22.5 35.4 H43" className="stroke-acc" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.5 9 H27.5 V19.4 L24 25.5 L20.5 19.4 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M20 28.5 H28 L24 33.5 Z" className="fill-acc stroke-acc" strokeWidth={0.96} strokeLinejoin="round" />
  </svg>
);

/*
 * The hole's pictogram, cut through: the work either side of the hole, a 3D
 * probe — its body, the stylus and the ball — down in it, and an accent head
 * on each side: it touches both walls.
 */
const HolePictogram = ({ label, className }) => (
  <svg viewBox="0 0 48 48" role="img" aria-label={label} className={`shrink-0 overflow-visible ${className}`}>
    <path d="M4 26 H15 V44 H4 Z M33 26 H44 V44 H33 Z" className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M19 3 H29 V15 L26 18 H22 L19 15 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M24 18 V31" className="stroke-ink" strokeWidth={1.6} />
    <circle cx={24} cy={33} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    <path d="M18.6 30 L15.8 33 L18.6 36 Z M29.4 30 L32.2 33 L29.4 36 Z" className="fill-acc" />
  </svg>
);

/*
 * The part's pictogram: the hole's negative (review note #8, 2026-10-02:
 * *"piktogram to negatyw hole center, sonda na piktogramie ta sama tylko po
 * lewej stronie"*) — the part standing where the hole was cut, nothing either
 * side; the same 3D probe, at the same height, left of it — as far from its
 * accent head as the hole's is from its own; the heads pointing in at both sides.
 */
const BossPictogram = ({ label, className }) => (
  <svg viewBox="0 0 48 48" role="img" aria-label={label} className={`shrink-0 overflow-visible ${className}`}>
    <path d="M15 26 H33 V44 H15 Z" className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M1 3 H11 V15 L8 18 H4 L1 15 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M6 18 V31" className="stroke-ink" strokeWidth={1.6} />
    <circle cx={6} cy={33} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    <path d="M11.4 30 L14.2 33 L11.4 36 Z M36.6 30 L33.8 33 L36.6 36 Z" className="fill-acc" />
  </svg>
);

/*
 * Pomiar's pictogram (Mateusz, 2026-10-03): the hole's, with the size it
 * measures as a dimension across it under the ball, in place of a zero.
 */
const SizeLine = ({ y, from, to }) => (
  <path d={`M${from} ${y} H${to} M${from} ${y - 2.5} V${y + 2.5} M${to} ${y - 2.5} V${y + 2.5}`} className="stroke-ink" strokeWidth={1.2} />
);

const MeasurePictogram = ({ label, className }) => (
  <svg viewBox="0 0 48 48" role="img" aria-label={label} className={`shrink-0 overflow-visible ${className}`}>
    <path d="M4 26 H15 V44 H4 Z M33 26 H44 V44 H33 Z" className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M19 3 H29 V15 L26 18 H22 L19 15 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M24 18 V31" className="stroke-ink" strokeWidth={1.6} />
    <circle cx={24} cy={33} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    <path d="M18.6 30 L15.8 33 L18.6 36 Z M29.4 30 L32.2 33 L29.4 36 Z" className="fill-acc" />
    <SizeLine y={40.5} from={15} to={33} />
  </svg>
);

/*
 * The height map's pictogram: a board bowed, an accent dot on its top at each
 * point of a row, the V bit over one of them with the arrow down — the Z
 * plate's tool and arrow, touching the board itself.
 */
const HeightMapPictogram = ({ label, className }) => (
  <svg viewBox="0 0 48 48" role="img" aria-label={label} className={`shrink-0 overflow-visible ${className}`}>
    <path d="M4 38 Q24 33 44 38 V44 H4 Z" className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <circle cx={8} cy={37.2} r={1.6} className="fill-acc" />
    <circle cx={16} cy={35.6} r={1.6} className="fill-acc" />
    <circle cx={32} cy={35.6} r={1.6} className="fill-acc" />
    <circle cx={40} cy={37.2} r={1.6} className="fill-acc" />
    <path d="M20.5 9 H27.5 V19.4 L24 25.5 L20.5 19.4 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M20 27.5 H28 L24 32.5 Z" className="fill-acc stroke-acc" strokeWidth={0.96} strokeLinejoin="round" />
  </svg>
);

const PICTOGRAMS = {
  z: ZPlatePictogram,
  corner: CornerPictogram,
  hole: HolePictogram,
  boss: BossPictogram,
  paper: PaperPictogram,
  'height-map': HeightMapPictogram,
  measure: MeasurePictogram,
  // Sonda 3D's zero: the hole's middle, the first of what it finds.
  probe3d: HolePictogram,
};

const ProbePicture = ({ method, label, className = '' }) => {
  const Pictogram = PICTOGRAMS[method];
  return <Pictogram label={label} className={className} />;
};

export default ProbePicture;
