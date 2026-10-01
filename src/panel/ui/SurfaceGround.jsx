import {
  DASH, Dimension, FACE, NS, Tag,
} from './probeDraw';

/*
 * The ground a Z is measured on, for the Z plate's and the paper's
 * drawings — apart from `probeDraw`'s pieces, which every drawing shares.
 */

// How thick the work is drawn when the table shows under it or beside it — not to scale.
const STOCK = 14;

/*
 * What a Z is measured on and where Z0 goes (Mateusz, 2026-10-01): the work
 * a hatch (`fill`) with its top at `y`, as before; with Z0 on the table, the
 * table under it and the line there; the plate or the sheet on the table,
 * the table at `y` and the work standing beside it, from `blockX`. `zero`
 * fades the Z0 line in, `label` at `labelX`; `stock`, `{ text, lit, fade }`,
 * the work's thickness, drawn where Z0 is that far from the surface.
 */
export const SurfaceGround = ({
  fill, y, width, surface = { on: 'work', z0: 'top' }, zero = 0, label, labelX, stock = null, blockX = 222, size,
}) => {
  const onTable = surface.on === 'table';
  const shifts = (surface.on === 'work') !== (surface.z0 === 'top');
  const top = onTable ? y - STOCK : y;
  const tableY = onTable || shifts ? top + STOCK : null;
  const zeroY = surface.z0 === 'top' ? top : tableY;
  const stockX = width - 14;
  return (
    <g>
      {onTable ? (
        <>
          <rect x={-2} y={y} width={width + 4} height={40} className="fill-mutS stroke-line" strokeWidth={1.5} vectorEffect={NS} />
          <rect x={blockX} y={top} width={width + 2 - blockX} height={STOCK} fill={fill} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        </>
      ) : (
        <>
          <rect x={-2} y={y} width={width + 4} height={shifts ? STOCK : 40} fill={fill} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
          {shifts ? <rect x={-2} y={tableY} width={width + 4} height={40} className="fill-mutS stroke-line" strokeWidth={1.5} vectorEffect={NS} /> : null}
        </>
      )}
      {zero > 0 ? (
        <g opacity={zero}>
          <path d={`M0 ${zeroY} H${width}`} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
          <text x={labelX} y={zeroY - 5} fontSize={size.fs} className="fill-acc font-num font-semibold">{label}</text>
        </g>
      ) : null}
      {stock && shifts ? (
        <g opacity={stock.fade ?? 1}>
          <Dimension at={stockX} from={top} to={top + STOCK} lit={stock.lit} size={size} />
          <Tag x={stockX - 12} y={top + STOCK / 2} text={stock.text} right face={stock.lit ? FACE.hot : FACE.plain} size={size} />
        </g>
      ) : null}
    </g>
  );
};
