import { useId } from 'react';
import {
  DIM_TICK, Dimension, FACE, NS, Tag, WorkHatch, kit,
} from './probeDraw';
import { placeTags, shownView } from './probeLabels';
import { MapTool } from './MapScene';
import useViewScale from './useViewScale';
import { t } from '../i18n';

/**
 * Where a height map starts, side-on (Mateusz, 2026-10-03: "Wysokość
 * startu"): only the height counts. The server goes over the first point at
 * the height the tool is left at, and its fast touch reaches down no further
 * than the limit (`maxZ`) — so the tool has to stand above the clamps and no
 * higher than that over the board. That band is drawn in the accent, the
 * tool in it over the first point, the limit as a dimension.
 */

const WIDTH = 340;
const HEIGHT = 180;
// The board's top, the clamps' tops, and the limit over the board.
const BOARD = 140;
const CLAMP = 108;
const LIMIT = 46;
// The board between the clamps, the tool over its first point, the limit's dimension right of it.
const LEFT = 52;
const RIGHT = 288;
const TOOL_X = 100;
const DIM_X = 250;

const MapStartScene = ({ maxZ, tool = 'board', label, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const [measure, k, box] = useViewScale(WIDTH, HEIGHT);
  const size = kit(k);
  const view = shownView([0, 0, WIDTH, HEIGHT], k, box);
  const tags = placeTags({
    at: DIM_X, parts: [[LIMIT, BOARD, t('probe.cycle.upTo', { v: maxZ })]], ticks: [[LIMIT, DIM_TICK], [BOARD, DIM_TICK]], view, avoid: [], size,
  });
  const clamp = (x) => <rect x={x} y={CLAMP} width={34} height={HEIGHT - CLAMP} rx={2} className="fill-field stroke-mut" strokeWidth={1.5} vectorEffect={NS} />;
  return (
    <svg ref={measure} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className={`block ${className}`}>
      <WorkHatch id={id} />
      {/* Where the tool may stand: over the clamps, under the limit. */}
      <rect x={10} y={LIMIT} width={WIDTH - 20} height={CLAMP - LIMIT} className="fill-accS" />
      <path d={`M10 ${LIMIT} H${WIDTH - 10} M10 ${CLAMP} H${WIDTH - 10}`} className="stroke-acc" strokeWidth={1} strokeDasharray="5 4" vectorEffect={NS} />
      <rect x={LEFT} y={BOARD} width={RIGHT - LEFT} height={HEIGHT - BOARD} fill={`url(#${id})`} className="stroke-plateEdge" strokeWidth={1.5} vectorEffect={NS} />
      {clamp(LEFT - 34)}
      {clamp(RIGHT)}
      {/* The first point, under the tool. */}
      <circle cx={TOOL_X} cy={BOARD} r={3.2 / k} className="fill-panel stroke-acc" strokeWidth={1.2} vectorEffect={NS} />
      <MapTool x={TOOL_X} tip={(LIMIT + CLAMP) / 2 + 8} tool={tool} />
      <Dimension at={DIM_X} from={BOARD} to={LIMIT} limit size={size} />
      {tags.map((tag) => <Tag key={tag.text} x={tag.x} y={tag.y} text={tag.text} face={FACE.plain} size={size} />)}
    </svg>
  );
};

export default MapStartScene;
