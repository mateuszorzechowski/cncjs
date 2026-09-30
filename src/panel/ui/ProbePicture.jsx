import { useId } from 'react';

/**
 * What a probing method looks like on the machine, small: the tile it is
 * picked on and the paper's steps.
 *
 * The Z plate and the L plate are the design's pictograms (1d and 1e,
 * 2026-09-29); the paper is a plain drawing still — side-on for the top, from
 * above for a side, turned to the side chosen.
 */

// SVG's own word for a marker that turns with its line.
const ORIENT = 'auto-start-reverse';

const Arrow = ({ id, x1, y1, x2, y2 }) => {
  const head = `url(#${id})`;
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-acc" strokeWidth={2} markerEnd={head} />;
};

const SideView = ({ id }) => (
  <>
    <rect x={8} y={64} width={104} height={22} className="fill-mutS stroke-line" />
    <rect x={40} y={62} width={40} height={2} className="fill-accS stroke-acc" />
    <rect x={55} y={6} width={10} height={24} className="fill-field stroke-ink" />
    <path d="M55 30 L60 38 L65 30 Z" className="fill-field stroke-ink" />
    <Arrow id={id} x1={60} y1={40} x2={60} y2={56} />
  </>
);

// Where the tool stands for each side the paper finds, and which way it faces.
const SIDE_AT = {
  'x-left': { x: 28, y: 48, dx: 1, dy: 0 },
  'x-right': { x: 96, y: 48, dx: -1, dy: 0 },
  'y-front': { x: 62, y: 72, dx: 0, dy: -1 },
  'y-back': { x: 62, y: 24, dx: 0, dy: 1 },
};

/** From above: the tool beside one side of the work, a sheet between them. */
const SideOfWork = ({ id, edge }) => {
  const { x, y, dx, dy } = SIDE_AT[edge];
  const along = { x: dy !== 0 ? 10 : 0, y: dx !== 0 ? 10 : 0 };
  return (
    <>
      <rect x={28} y={24} width={68} height={48} className="fill-mutS stroke-line" />
      <line x1={x - dx * 2 - along.x} y1={y - dy * 2 - along.y} x2={x - dx * 2 + along.x} y2={y - dy * 2 + along.y} className="stroke-acc" strokeWidth={2} />
      <circle cx={x - dx * 8} cy={y - dy * 8} r={4} className="fill-ink" />
      <Arrow id={id} x1={x - dx * 22} y1={y - dy * 22} x2={x - dx * 14} y2={y - dy * 14} />
    </>
  );
};

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

const PICTOGRAMS = { z: ZPlatePictogram, corner: CornerPictogram };

const ProbePicture = ({ method, choice, label, className = '' }) => {
  const id = `probe-arrow-${useId().replace(/:/g, '')}`;
  const Pictogram = PICTOGRAMS[method];
  if (Pictogram) {
    return <Pictogram label={label} className={className} />;
  }
  return (
    <svg viewBox="0 0 124 92" role="img" aria-label={label} className={`shrink-0 ${className}`} fill="none" strokeWidth={1.5}>
      <defs>
        <marker id={id} viewBox="0 0 8 8" refX={6} refY={4} markerWidth={5} markerHeight={5} orient={ORIENT}>
          <path d="M0 0 L8 4 L0 8 Z" className="fill-acc" />
        </marker>
      </defs>
      {SIDE_AT[choice] ? <SideOfWork id={id} edge={choice} /> : <SideView id={id} />}
    </svg>
  );
};

export default ProbePicture;
