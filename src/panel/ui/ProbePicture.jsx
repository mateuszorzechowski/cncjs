import { useId } from 'react';

/**
 * What a probing method looks like on the machine: where the plate goes and
 * which way the tool comes at it. Plain drawings for now — the model and its
 * animation are the next step (Mateusz, 2026-09-29: *"instrukcje, animacje,
 * grafiki, model 3d"*).
 *
 * The plate side-on for Z and the paper, and from above for the corner,
 * because that is the view in which choosing a corner means something: the
 * drawing turns to the corner chosen.
 */

// The corner's point on the drawing, and which way is in from it.
const CORNER_AT = {
  'back-left': { x: 28, y: 24, dx: 1, dy: 1 },
  'back-right': { x: 96, y: 24, dx: -1, dy: 1 },
  'front-left': { x: 28, y: 72, dx: 1, dy: -1 },
  'front-right': { x: 96, y: 72, dx: -1, dy: -1 },
};

// SVG's own word for a marker that turns with its line.
const ORIENT = 'auto-start-reverse';

const box = (x1, y1, x2, y2) => ({ x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) });

const Arrow = ({ id, x1, y1, x2, y2 }) => {
  const head = `url(#${id})`;
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-acc" strokeWidth={2} markerEnd={head} />;
};

const SideView = ({ id, paper }) => (
  <>
    <rect x={8} y={64} width={104} height={22} className="fill-mutS stroke-line" />
    {paper
      ? <rect x={40} y={62} width={40} height={2} className="fill-accS stroke-acc" />
      : <rect x={44} y={54} width={32} height={10} className="fill-accS stroke-acc" />}
    <rect x={55} y={6} width={10} height={24} className="fill-field stroke-ink" />
    <path d="M55 30 L60 38 L65 30 Z" className="fill-field stroke-ink" />
    <Arrow id={id} x1={60} y1={40} x2={60} y2={paper ? 56 : 48} />
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

const TopView = ({ id, corner }) => {
  const { x, y, dx, dy } = CORNER_AT[corner] || CORNER_AT['front-left'];
  const tool = { x: x + dx * 12, y: y + dy * 12 };
  return (
    <>
      <rect x={28} y={24} width={68} height={48} className="fill-mutS stroke-line" />
      <rect {...box(x - dx * 6, y - dy * 6, x + dx * 26, y + dy * 26)} className="fill-accS stroke-acc" />
      <circle cx={tool.x} cy={tool.y} r={4} className="fill-ink" />
      <Arrow id={id} x1={x - dx * 18} y1={tool.y} x2={x - dx * 9} y2={tool.y} />
      <Arrow id={id} x1={tool.x} y1={y - dy * 18} x2={tool.x} y2={y - dy * 9} />
    </>
  );
};

/** The view for a method and its choice: the corner from above, a paper side from above, the rest side-on. */
const viewOf = (method, choice) => {
  if (method === 'corner') {
    return (id) => <TopView id={id} corner={choice} />;
  }
  if (method === 'paper' && SIDE_AT[choice]) {
    return (id) => <SideOfWork id={id} edge={choice} />;
  }
  return (id) => <SideView id={id} paper={method === 'paper'} />;
};

const ProbePicture = ({ method, choice, label, className = '' }) => {
  const id = `probe-arrow-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 124 92" role="img" aria-label={label} className={`shrink-0 ${className}`} fill="none" strokeWidth={1.5}>
      <defs>
        <marker id={id} viewBox="0 0 8 8" refX={6} refY={4} markerWidth={5} markerHeight={5} orient={ORIENT}>
          <path d="M0 0 L8 4 L0 8 Z" className="fill-acc" />
        </marker>
      </defs>
      {viewOf(method, choice)(id)}
    </svg>
  );
};

export default ProbePicture;
