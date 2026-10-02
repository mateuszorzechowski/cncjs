/**
 * A height map seen from above (Mateusz, 2026-10-02): the area, its points,
 * and the program's outline when one is loaded — the one drawing every step
 * of the height map's wizard uses.
 *
 * `area` is `{ x: [from, to], y: [from, to] }` in millimetres, `nx` × `ny`
 * points spread evenly across it, edge to edge, as the server measures them.
 * A point is drawn by what is known of it: waiting, `done`, the one the tool
 * is at (`at`), or — `heights`, `low`, `high` — coloured by its height, low to
 * high in five steps. The first point, the front left, is where the tool
 * starts, and is marked so. `outline`, the program's extent in the same
 * millimetres; `width` and `depth`, the area's sides as words.
 */

// How the sides' words stand against where they are put: SVG's own words, not the operator's.
const MIDDLE = 'middle';
const END = 'end';

const W = 400;
const PAD = 30;
const MAX_H = 300;

// Five steps of height, by their share of the range.
const RAMP = ['fill-map0', 'fill-map1', 'fill-map2', 'fill-map3', 'fill-map4'];

/** Which of the ramp's steps a height is, `low` the first and `high` the last. */
export const rampStep = (dz, low, high) => (high - low > 1e-9 ? Math.min(RAMP.length - 1, Math.floor(((dz - low) / (high - low)) * RAMP.length)) : 0);

const HeightMapGrid = ({
  area, nx, ny, outline = null, done = [], at = null, heights = null, low = 0, high = 0, width = '', depth = '', label, className = '',
}) => {
  const [ax0, ax1] = area.x;
  const [ay0, ay1] = area.y;
  const x0 = Math.min(ax0, outline ? outline.min.x : ax0);
  const x1 = Math.max(ax1, outline ? outline.max.x : ax1);
  const y0 = Math.min(ay0, outline ? outline.min.y : ay0);
  const y1 = Math.max(ay1, outline ? outline.max.y : ay1);
  const spanX = Math.max(x1 - x0, 1);
  const spanY = Math.max(y1 - y0, 1);
  const scale = Math.min((W - 2 * PAD) / spanX, (MAX_H - 2 * PAD) / spanY);
  const H = spanY * scale + 2 * PAD;
  const left = (W - spanX * scale) / 2;
  const px = (x) => left + (x - x0) * scale;
  // Y up, as the machine's.
  const py = (y) => H - PAD - (y - y0) * scale;

  const along = (from, to, n, k) => (n > 1 ? from + ((to - from) * k) / (n - 1) : from);
  const stepPx = Math.min(nx > 1 ? ((ax1 - ax0) * scale) / (nx - 1) : W, ny > 1 ? ((ay1 - ay0) * scale) / (ny - 1) : W);
  const r = Math.max(2.5, Math.min(7, stepPx / 4));
  const isDone = new Set(done.map(({ i, j }) => `${i},${j}`));

  const points = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const cx = px(along(ax0, ax1, nx, i));
      const cy = py(along(ay0, ay1, ny, j));
      let face = 'fill-field stroke-acc';
      if (heights) {
        face = `${RAMP[rampStep(heights[j][i], low, high)]} stroke-line`;
      } else if (at && at.i === i && at.j === j) {
        face = 'fill-acc stroke-ink';
      } else if (isDone.has(`${i},${j}`)) {
        face = 'fill-acc stroke-acc';
      }
      const here = at && at.i === i && at.j === j;
      points.push(<circle key={`${i},${j}`} cx={cx} cy={cy} r={here ? r * 1.5 : r} className={face} strokeWidth={here ? 2 : 1.2} />);
    }
  }

  const first = { x: px(ax0), y: py(ay0) };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={`overflow-visible ${className}`}>
      {outline ? (
        <rect
          x={px(outline.min.x)}
          y={py(outline.max.y)}
          width={(outline.max.x - outline.min.x) * scale}
          height={(outline.max.y - outline.min.y) * scale}
          className="fill-none stroke-mut"
          strokeWidth={1.2}
          strokeDasharray="4 3"
        />
      ) : null}
      <rect x={px(ax0)} y={py(ay1)} width={(ax1 - ax0) * scale} height={(ay1 - ay0) * scale} className="fill-accS stroke-acc" strokeWidth={1.4} />
      {points}
      {/* Where the tool starts: the first point, a ring round it. */}
      <circle cx={first.x} cy={first.y} r={r + 4} className="fill-none stroke-ink" strokeWidth={1.2} strokeDasharray="2 2" />
      <text x={(px(ax0) + px(ax1)) / 2} y={py(ay0) + 20} textAnchor={MIDDLE} fontSize={11} className="fill-mut font-num">{width}</text>
      <text x={px(ax0) - 10} y={(py(ay0) + py(ay1)) / 2} textAnchor={END} dominantBaseline={MIDDLE} fontSize={11} className="fill-mut font-num">{depth}</text>
    </svg>
  );
};

export default HeightMapGrid;
