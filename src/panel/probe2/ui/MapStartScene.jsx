import { useId } from 'react';
import {
  DIM_TICK, Dimension, FACE, NS, Tag, WorkHatch, kit,
} from './probeDraw';
import { placeTags, shownView } from './probeLabels';
import { MapTool } from './MapScene';
import { PLATE_H, PLATE_W } from '../machine/mapCycle';
import useViewScale from './useViewScale';
import { t } from '../../i18n/index';

/**
 * Where a height map starts, side-on (Mateusz, 2026-10-03: "Wysokość
 * startu"): only the height counts. The server goes over the first point at
 * the height the tool is left at, and its fast touch reaches down no further
 * than the limit (`maxZ`) — so the tool has to stand above the clamps and no
 * higher than that over the board. That band is drawn in the accent, the
 * tool in it over the first point, the limit as a dimension. With the Z
 * plate (2026-10-03) the plate lies under the tool, and the limit is over
 * its top: that is what the first touch finds.
 */

const WIDTH = 340;
const HEIGHT = 180;
// The board's top, the table's, the clamps' highest point — the bolt's end — and the limit over the board.
const BOARD = 140;
const TABLE = 160;
const CLAMP = 108;
const LIMIT = 46;
// The board between the clamps, the tool over its first point, the limit's dimension right of it.
const LEFT = 52;
const RIGHT = 288;
const TOOL_X = 100;
const DIM_X = 250;

/*
 * A step clamp, the left one (the right is its mirror): a stepped block on
 * the table, a strap from its top step onto the board's edge, and a bolt
 * through the strap into the table's slot with a washer and a nut — its end
 * the highest thing on the work, which the band starts over.
 */
const PART = 'fill-field stroke-mut';
const StepClamp = () => (
  <g strokeWidth={1.5} strokeLinejoin="round">
    <path d={`M12 ${TABLE} V150 H18 V145 H24 V${BOARD} H32 V${TABLE} Z`} className={PART} vectorEffect={NS} />
    <rect x={41} y={BOARD} width={4} height={TABLE - BOARD} className={PART} vectorEffect={NS} />
    <rect x={22} y={BOARD - 8} width={LEFT + 14 - 22} height={8} rx={2} className={PART} vectorEffect={NS} />
    <path d={`M41 ${BOARD - 11} V${CLAMP + 1.5} L42 ${CLAMP} H44 L45 ${CLAMP + 1.5} V${BOARD - 11}`} className={PART} vectorEffect={NS} />
    <rect x={35} y={BOARD - 11} width={16} height={3} className={PART} vectorEffect={NS} />
    <rect x={37} y={BOARD - 19} width={12} height={8} rx={1} className={PART} vectorEffect={NS} />
  </g>
);

const MapStartScene = ({ maxZ, tool = 'board', label, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const [measure, k, box] = useViewScale(WIDTH, HEIGHT);
  const size = kit(k);
  const view = shownView([0, 0, WIDTH, HEIGHT], k, box);
  // What the first touch finds: the board, or the plate's top on it.
  const top = tool === 'plate' ? BOARD - PLATE_H : BOARD;
  const tags = placeTags({
    at: DIM_X, parts: [[LIMIT, top, t('probe.cycle.upTo', { v: maxZ })]], ticks: [[LIMIT, DIM_TICK], [top, DIM_TICK]], view, avoid: [], size,
  });
  return (
    <svg ref={measure} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className={`block ${className}`}>
      <WorkHatch id={id} />
      {/* Where the tool may stand: over the clamps, under the limit. */}
      <rect x={10} y={LIMIT} width={WIDTH - 20} height={CLAMP - LIMIT} className="fill-accS" />
      <path d={`M10 ${LIMIT} H${WIDTH - 10} M10 ${CLAMP} H${WIDTH - 10}`} className="stroke-acc" strokeWidth={1} strokeDasharray="5 4" vectorEffect={NS} />
      {/* The table, faint, and the board on it. */}
      <rect x={0} y={TABLE} width={WIDTH} height={HEIGHT - TABLE} fill={`url(#${id}far)`} />
      <path d={`M0 ${TABLE} H${WIDTH}`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} />
      <rect x={LEFT} y={BOARD} width={RIGHT - LEFT} height={TABLE - BOARD} fill={`url(#${id})`} className="stroke-plateEdge" strokeWidth={1.5} vectorEffect={NS} />
      <StepClamp />
      <g transform={`translate(${WIDTH} 0) scale(-1 1)`}>
        <StepClamp />
      </g>
      {/* The first point, under the tool — or the plate laid on it. */}
      {tool === 'plate' ? (
        <rect x={TOOL_X - PLATE_W / 2} y={top} width={PLATE_W} height={PLATE_H} className="fill-plate stroke-plateEdge" strokeWidth={2} vectorEffect={NS} />
      ) : (
        <circle cx={TOOL_X} cy={BOARD} r={3.2 / k} className="fill-panel stroke-acc" strokeWidth={1.2} vectorEffect={NS} />
      )}
      <MapTool x={TOOL_X} tip={(LIMIT + CLAMP) / 2 + 8} tool={tool} />
      <Dimension at={DIM_X} from={top} to={LIMIT} limit size={size} />
      {tags.map((tag) => <Tag key={tag.text} x={tag.x} y={tag.y} text={tag.text} face={FACE.plain} size={size} />)}
    </svg>
  );
};

export default MapStartScene;
