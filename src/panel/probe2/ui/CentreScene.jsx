import { useId } from 'react';
import {
  AxisPair, Contact, axisRects, DIM_TICK, Dimension, FACE, Head, MOTION_TICK, Motion, NS, ReachDimension, Tag, WorkHatch, kit,
} from './probeDraw';
import { shownView } from './probeLabels';
import { placePaired, usePairLayer, usePairView } from './probePair';
import useViewScale from './useViewScale';
import { t } from '../../i18n/index';
import AngleMark, { angleLine, angleRects } from './AngleMark';

/**
 * A hole, or a part touched from outside, from above, drawn by the probe
 * proposals' rule (Claude Design, 2026-09-30): the work a faint hatch — the
 * hole cut out of it, or the part standing on the table — the ball a circle,
 * larger the higher it stands, as the corner draws height. A touch's arrow
 * with its feed on one side, the search's limit and the figures' dimensions
 * on the other; the walls this pass has touched, the middle of a pair once
 * the ball is there, X0 and Y0 when written.
 *
 * `part` is the cycle's: `{ kind: 'hole' | 'boss', r, toolR, grow }`, `grow`
 * how much larger the ball is drawn a level up. Everything else comes from
 * its scene (or `positionAt`), in the drawing's units with the centre at the
 * origin and Y up. `bare`: without the form's figures (the machine measuring).
 */

// The Z plate's shape, so the two Setups stand as tall at any width — or half of it, beside a side view (`part.view`).
const WIDE = [-202, -94, 404, 188];
// The arrow on one side of the tool's way, the dimension on the other.
const ASIDE = 22;
const ACROSS = 'h';
const ALONG = 'v';
const WAY = { left: 'left', right: 'right' };
// The diameter's ticks under the ball, half their length.
const DIA_TICK = 5;

// Y up in the drawing's figures, down on the screen.
const sy = (y) => -y;

const BOSS = 'boss';

const CentreScene = ({
  part, tool, level = 0, motion = null, way = motion, limit = null, dims = [], reach = null, touched = [], contact = null, centre = null, dia = null, angle = null, focus = null,
  bare = false, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const VIEW = part.view || WIDE;
  const [measure, k, box, node] = useViewScale(VIEW[2], VIEW[3]);
  const other = usePairView('top', node);
  const layer = usePairLayer(node);
  // Labels crossing into the other view, drawn over both (`probePair`).
  const crossing = [];
  const size = kit(k);
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);
  const r = part.toolR * (1 + part.grow * Math.max(0, level));
  const [cx, cy] = [tool[0], sy(tool[1])];
  // A line's figures, placed by the one rule (`placeTags`).
  // Never on X0's or Y0's line (L15), on the ball's whole way through this move (L16), nor on the axes.
  const path = way ? [[way.from[0], sy(way.from[1])], [way.to[0], sy(way.to[1])]] : [[cx, cy]];
  const [x0, x1] = [Math.min(...path.map(([x]) => x)), Math.max(...path.map(([x]) => x))];
  const [y0, y1] = [Math.min(...path.map(([, y]) => y)), Math.max(...path.map(([, y]) => y))];
  const sweep = [x0 - r, y0 - r, x1 - x0 + 2 * r, y1 - y0 + 2 * r];
  // Nor on an angle's arms (L15's rule for lines that say something).
  const avoid = [...axisRects(VIEW[0], VIEW[1] + VIEW[3], size), sweep, ...(angle ? angleRects(angle) : [])];
  const place = (line) => (bare ? [] : placePaired(line, { view: shownView(VIEW, k, box), avoid, size }, other));
  const tags = (line, face) => place(line).map((tag) => {
    const drawn = <Tag key={`${tag.text}${tag.x}`} x={tag.x} y={tag.y} text={tag.text} face={face} ext={tag.ext} size={size} />;
    return tag.ext ? crossing.push(drawn) && null : drawn;
  });

  let arrow = null;
  if (motion) {
    const flat = motion.axis === 'x';
    const at = flat ? sy(motion.from[1]) - ASIDE : motion.from[0] - ASIDE;
    const [from, to] = flat ? [motion.from[0], motion.to[0]] : [sy(motion.from[1]), sy(motion.to[1])];
    const face = motion.lit ? FACE.hot : FACE.plain;
    arrow = (
      <g opacity={motion.kind === 'rapid' ? 1 : fade('feed')}>
        <Motion axis={flat ? ACROSS : ALONG} at={at} from={from} to={to} kind={motion.kind} size={size} />
        {tags({
          axis: flat ? ACROSS : ALONG, at, side: -1, parts: [[from, to, motion.feed]], ticks: [[from, MOTION_TICK]],
        }, face)}
      </g>
    );
  }

  let fence = null;
  if (limit) {
    const flat = limit.axis === 'x';
    const at = flat ? sy(limit.from[1]) + ASIDE : limit.from[0] + ASIDE;
    const [from, to] = flat ? [limit.from[0], limit.to[0]] : [sy(limit.from[1]), sy(limit.to[1])];
    const face = limit.lit ? FACE.hot : FACE.plain;
    // A reach made of two figures and said as their sum: a short tick where they meet (`mid`).
    let mid = null;
    if (limit.mid) {
      mid = flat ? limit.mid[0] : sy(limit.mid[1]);
    }
    fence = (
      <g opacity={fade('dim')}>
        <Dimension axis={flat ? ACROSS : ALONG} at={at} from={from} to={to} mid={mid} limit lit={limit.lit} size={size} />
        {tags({
          axis: flat ? ACROSS : ALONG, at, parts: [[from, to, limit.text]], ticks: [[from, DIM_TICK], [to, DIM_TICK]],
        }, face)}
      </g>
    );
  }

  // A figure's dimension on the far side of the ball's way — or where the scene puts it (`at`, across
  // the drawing: down it for a way across, along it for a way up) — its words beside it.
  const drawn = dims.map((dim) => {
    const flat = dim.axis === 'x';
    const at = dim.at ?? (flat ? sy(dim.from[1]) + ASIDE : dim.from[0] + ASIDE);
    const [from, to] = flat ? [dim.from[0], dim.to[0]] : [sy(dim.from[1]), sy(dim.to[1])];
    // A way of two figures said as their sum: a short tick where they meet (`mid`).
    let mid = null;
    if (dim.mid) {
      mid = flat ? dim.mid[0] : sy(dim.mid[1]);
    }
    const face = dim.lit ? FACE.hot : FACE.plain;
    return (
      <g key={dim.id} opacity={fade(dim.id)}>
        <Dimension axis={flat ? ACROSS : ALONG} at={at} from={from} to={to} mid={mid} lit={dim.lit} size={size} />
        {tags({
          axis: flat ? ACROSS : ALONG, at, parts: [[from, to, dim.text]], ticks: [[from, DIM_TICK], [to, DIM_TICK]],
        }, face)}
      </g>
    );
  });

  // A slow touch's reach: one line from off the wall past it, its two figures apart.
  let reaching = null;
  if (reach) {
    const flat = reach.axis === 'x';
    const at = flat ? sy(reach.from[1]) + ASIDE : reach.from[0] + ASIDE;
    const [from, mid, to] = flat ? [reach.from[0], reach.mid[0], reach.to[0]] : [sy(reach.from[1]), sy(reach.mid[1]), sy(reach.to[1])];
    const face = reach.lit ? FACE.hot : FACE.plain;
    reaching = (
      <g opacity={fade('retract')}>
        <ReachDimension axis={flat ? ACROSS : ALONG} at={at} from={from} mid={mid} to={to} lit={reach.lit} size={size} />
        {tags({
          axis: flat ? ACROSS : ALONG, at, parts: [[from, to, reach.text]], ticks: [from, to].map((a) => [a, DIM_TICK]),
        }, face)}
      </g>
    );
  }

  const boss = part.kind === BOSS;
  // The part's outline from above: round, square for a rectangle, or a groove's or a bar's strip across the drawing, `strip` its width's axis.
  let outline = { r: part.r };
  if (part.strip === 'x') {
    outline = { x: -part.r, y: VIEW[1] - 2, width: 2 * part.r, height: VIEW[3] + 4 };
  } else if (part.strip === 'y') {
    outline = { x: VIEW[0] - 2, y: -part.r, width: VIEW[2] + 4, height: 2 * part.r };
  } else if (part.square) {
    outline = {
      x: -part.r, y: -part.r, width: 2 * part.r, height: 2 * part.r,
    };
  }
  const Outline = part.strip || part.square ? 'rect' : 'circle';
  return (
    <svg ref={measure} viewBox={VIEW.join(' ')} role="img" aria-label={label} className={`block ${className}`}>
      <WorkHatch id={id} />
      {/* The work round the hole, or the part alone — no table under it, as no other drawing has (review note, 2026-10-01). */}
      {boss ? (
        // An edge's part turned by its angle, anticlockwise: Y is up, so against the SVG's turn.
        <>
          <Outline {...outline} transform={part.turn ? `rotate(${-part.turn})` : undefined} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
          {/* Two surfaces: the lower, right of the step, paler as further away. */}
          {part.drop ? <rect x={0} y={-part.r} width={part.r} height={2 * part.r} fill={`url(#${id}far)`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} /> : null}
        </>
      ) : (
        <>
          <rect x={VIEW[0]} y={VIEW[1]} width={VIEW[2]} height={VIEW[3]} fill={`url(#${id})`} />
          {/* Its bottom further back, as its far wall from the front (review note, 2026-10-01). */}
          <Outline {...outline} transform={part.turn ? `rotate(${-part.turn})` : undefined} fill={`url(#${id}far)`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        </>
      )}
      {/* The walls touched before, still: the one under way beats. */}
      {angle ? <AngleMark angle={angle} /> : null}
      {angle ? tags(angleLine(angle), angle.lit ? FACE.hot : FACE.plain) : null}
      {touched.map(([x, y]) => <circle key={`${x} ${y}`} cx={x} cy={sy(y)} r={3 / k} className="fill-grn" opacity={0.6} />)}
      {centre ? <path d={`M${centre[0] - 6} ${sy(centre[1])} H${centre[0] + 6} M${centre[0]} ${sy(centre[1]) - 6} V${sy(centre[1]) + 6}`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} /> : null}
      <circle cx={cx} cy={cy} r={r} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />
      {contact ? <Contact x={contact[0]} y={sy(contact[1])} size={size} /> : null}
      {/* Arrows, dimensions and their words over the ball, never under it (review note, 2026-10-01). */}
      {fence}
      {drawn}
      {reaching}
      {arrow}
      {dia && !bare ? (
        <g opacity={dia.lit ? 1 : fade('dim')}>
          <path d={`M${cx - r} ${cy + r + 9 - DIA_TICK} V${cy + r + 9 + DIA_TICK} M${cx + r} ${cy + r + 9 - DIA_TICK} V${cy + r + 9 + DIA_TICK}`} className={dia.lit ? 'stroke-acc' : 'stroke-mut'} strokeWidth={1} vectorEffect={NS} />
          <Head x={cx - r} y={cy + r + 9} dir={WAY.right} size={size} className={dia.lit ? 'fill-acc' : 'fill-mut'} />
          <Head x={cx + r} y={cy + r + 9} dir={WAY.left} size={size} className={dia.lit ? 'fill-acc' : 'fill-mut'} />
          {tags({
            axis: ACROSS, at: cy + r + 9, parts: [[cx - r, cx + r, dia.text]], ticks: [[cx - r, DIA_TICK], [cx + r, DIA_TICK]],
          }, dia.lit ? FACE.hot : FACE.plain)}
        </g>
      ) : null}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.yPlus')} size={size} />
      {layer(crossing)}
    </svg>
  );
};

export default CentreScene;
