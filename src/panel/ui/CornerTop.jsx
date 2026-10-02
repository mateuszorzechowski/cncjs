import { useId } from 'react';
import {
  AxisPair, Contact, axisRects, DASH, DIM_TICK, Dimension, FACE, Head, MOTION_TICK, Motion, NS, ReachDimension, Tag, kit,
} from './probeDraw';
import { shownView } from './probeLabels';
import { placePaired, usePairLayer, usePairView } from './probePair';
import useViewScale from './useViewScale';
import {
  C0, XO, cornerSides, gapAt, levelOfGap, moveOf, positionOf, zeroShown,
} from '../machine/cornerCycle';
import { t } from '../i18n';

/**
 * The L plate from above (Claude Design, `templates/probe-corner-proposal`,
 * 2026-09-30): the work a faint hatch, the plate over its corner with the
 * work's edge under it dashed, the tool a circle — drawn larger in step with
 * its height, whichever move raises or lowers it.
 * Moves on the wall's plane are drawn here, by the rules in `probeDraw`:
 * each move's arrow on one side of its way — a
 * touch's with its feed, a G0's bare — and its distance a grey dimension on
 * the other, X0 and Y0 when written. Z touches leave the tool over the
 * plate; they are the side view's.
 *
 * Drawn for the front-left corner and mirrored for the others; the words are
 * placed on the mirror, never mirrored themselves. `bare`: without the
 * form's figures (the machine measuring); `place`: the tool at `{ at, level }`
 * on its way into place, and nothing of the cycle.
 */

const VIEW = [38, 36, 202, 188];
const R = 7.2;
const USER = 'userSpaceOnUse';
// Words the drawing's pieces switch on, kept out of the markup.
const ACROSS = 'h';
const ALONG = 'v';
const RAPID = 'rapid';
const WAY = { left: 'left', right: 'right', up: 'up' };

const SLANT = 'rotate(45)';
// The tool's diameter under it, half its ticks' length.
const DIA_TICK = 5;
// Ticks across a dimension from `from` to `to`.
const dimTicks = (...along) => along.map((a) => [a, DIM_TICK]);

// The tool's diameter from above, as the dimension under it says it.
const ToolWidth = ({ cx, cy, size }) => (
  <g>
    <circle cx={cx} cy={cy} r={R} fill="none" className="stroke-acc" strokeWidth={2} vectorEffect={NS} />
    <path d={`M${cx - R} ${cy + R + 7 - DIA_TICK} V${cy + R + 7 + DIA_TICK} M${cx + R} ${cy + R + 7 - DIA_TICK} V${cy + R + 7 + DIA_TICK} M${cx - R} ${cy + R + 7} H${cx + R}`} className="stroke-acc" strokeWidth={1} vectorEffect={NS} />
    <Head x={cx - R} y={cy + R + 7} dir={WAY.left} size={size} className="fill-acc" />
    <Head x={cx + R} y={cy + R + 7} dir={WAY.right} size={size} className="fill-acc" />
  </g>
);

const CornerTop = ({
  name = 'zFast', p = 0, corner, texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null, bare = false, place = null, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k, box, node] = useViewScale(VIEW[2], VIEW[3]);
  const paired = usePairView('top', node);
  const layer = usePairLayer(node);
  // Labels crossing into the other view, drawn over both (`probePair`).
  const crossing = [];
  const size = kit(k);
  const { flipX, flipY } = cornerSides(corner);
  const move = moveOf(name);
  const said = (field) => say(field, texts[field] ?? '');
  const flip = `translate(${flipX ? 278 : 0} ${flipY ? 260 : 0}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})`;
  const mx = (x) => (flipX ? 278 - x : x);
  const my = (y) => (flipY ? 260 - y : y);
  // A line's figures on the front-left drawing, placed by the one rule (`placeTags`) and then on the mirror.
  // Never on the axes, nor on X0's or Y0's line (L15).
  const avoid = [
    ...axisRects(VIEW[0], VIEW[1] + VIEW[3], size).map(([x, y, w, h]) => [flipX ? 278 - x - w : x, flipY ? 260 - y - h : y, w, h]),
    ...(move.zero && !place ? [[129, VIEW[1], 2, VIEW[3]], [VIEW[0], 139, VIEW[2], 2]] : []),
  ];
  // Nor on the tool's whole way through the move (L16) — not only where it is now.
  const toolRect = () => {
    const way = place || !move.frames ? [[cx, cy, level]] : [0, 1].map((at) => positionOf(move.frames, at));
    const rr = R * (1 + 0.3 * Math.max(0, level, ...way.map(([, , z]) => z)));
    const [x0, x1] = [Math.min(...way.map(([x]) => x)), Math.max(...way.map(([x]) => x))];
    const [y0, y1] = [Math.min(...way.map(([, y]) => y)), Math.max(...way.map(([, y]) => y))];
    return [x0 - rr, y0 - rr, x1 - x0 + 2 * rr, y1 - y0 + 2 * rr];
  };
  // The other view's box and what it covers, on the front-left drawing as these labels are placed.
  const mirror = ([x, y, w, h]) => [flipX ? 278 - x - w : x, flipY ? 260 - y - h : y, w, h];
  const other = paired ? { box: mirror(paired.box), rects: paired.rects.map(mirror) } : null;
  const placed = (line) => (bare ? [] : placePaired(line, { view: shownView(VIEW, k, box), avoid: [...avoid, toolRect()], size }, other));
  const tags = (line, face = FACE.plain) => placed(line).map((tag) => {
    const drawn = <Tag key={`${tag.text}${tag.x}`} x={flipX ? 278 - tag.x - tag.w : tag.x} y={my(tag.y)} text={tag.text} face={face} ext={tag.ext} size={size} />;
    return tag.ext ? crossing.push(drawn) && null : drawn;
  });
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);
  const lit = (part) => focus === part;

  // Where the tool is: a Z touch or the descent beside a wall leaves it standing.
  let [cx, cy, level] = [C0[0], C0[1], 1];
  if (move.view === 'side') {
    // The tool's height follows the Z touch, so its size does (review note, 2026-09-30).
    [cx, cy, level] = move.depthOf ? positionOf(move.frames, p) : [C0[0], C0[1], levelOfGap(gapAt(move, p))];
  } else {
    [cx, cy, level] = positionOf(move.frames, p);
  }
  if (place) {
    [cx, cy, level] = [place.at[0], place.at[1], place.level];
  }

  const geometry = [];
  const words = [];
  // The tool on its way into place: nothing of the cycle is drawn.
  if (place) {
    geometry.length = 0;
  } else if (move.plane === 'xy') {
    const [fx, fy] = positionOf(move.frames, 0);
    const [tx, ty] = positionOf(move.frames, 1);
    const flat = Math.abs(fy - ty) < 0.5;
    // A way across both axes, back over the plate or over X0 Y0, has an arrow for each.
    geometry.push(
      <g key="way" opacity={focus ? 0.3 : 1}>
        {Math.abs(fx - tx) > 0.5 ? <Motion axis={ACROSS} at={80} from={fx} to={tx} kind={RAPID} size={size} /> : null}
        {flat ? null : <Motion axis={ALONG} at={190} from={fy} to={ty} kind={RAPID} size={size} />}
      </g>,
    );
    // A G0 carries nothing: a way by a figure of the form's has it as a dimension on the
    // other side of it; one to a place (over the plate, over X0 Y0) none.
    const figure = move.say(texts, say);
    if (figure && !focus) {
      geometry.push(flat
        ? <Dimension key="wayd" axis={ACROSS} at={fy + 20} from={fx} to={tx} size={size} />
        : <Dimension key="wayd" axis={ALONG} at={fx - 36} from={fy} to={ty} size={size} />);
      const line = flat
        ? { axis: ACROSS, at: fy + 20, parts: [[fx, tx, figure]], ticks: dimTicks(fx, tx) }
        : { at: fx - 36, side: -1, parts: [[fy, ty, figure]], ticks: dimTicks(fy, ty) };
      words.push(<g key="wayt">{tags(line)}</g>);
    }
  } else if (move.view === 'top' && move.kind) {
    const [fx, fy] = positionOf(move.frames, 0);
    const [tx, ty] = positionOf(move.frames, 1);
    const flat = fy === ty;
    geometry.push(
      <g key="arrow" opacity={fade('feed')}>
        <Motion axis={flat ? ACROSS : ALONG} at={flat ? fy - 18 : fx - 18} from={flat ? fx : fy} to={flat ? tx : ty} kind={move.kind} size={size} />
      </g>,
    );
    if (move.kind === RAPID) {
      // A G0 bare; its way, the back-off, a grey dimension on the other side.
      const face = lit('dim') ? FACE.hot : FACE.plain;
      geometry.push(
        <g key="way" opacity={fade('dim')}>
          <Dimension axis={flat ? ACROSS : ALONG} at={flat ? fy + 18 : fx + 18} from={flat ? fx : fy} to={flat ? tx : ty} lit={lit('dim')} size={size} />
        </g>,
      );
      words.push(
        <g key="wayt" opacity={fade('dim')}>
          {flat ? tags({ axis: ACROSS, at: fy + 18, parts: [[fx, tx, said(move.by)]], ticks: dimTicks(fx, tx) }, face) : tags({ at: fx + 18, parts: [[fy, ty, said(move.by)]], ticks: dimTicks(fy, ty) }, face)}
        </g>,
      );
    } else if (move.feed) {
      const face = focus === 'feed' ? FACE.hot : FACE.plain;
      words.push(
        <g key="by" opacity={fade('feed')}>
          {flat ? tags({
            axis: ACROSS, at: fy - 18, side: -1, parts: [[fx, tx, said(move.feed)]], ticks: [[fx, MOTION_TICK]],
          }, face) : tags({
            at: fx - 18, side: -1, parts: [[fy, ty, said(move.feed)]], ticks: [[fy, MOTION_TICK]],
          }, face)}
        </g>,
      );
    }
    if (move.feed === 'slow') {
      // The slow touch's reach, twice the back-off: back to the wall, and the margin past it.
      const [mid, end] = flat ? [tx, tx + (tx - fx)] : [ty, ty + (ty - fy)];
      const face = lit('dim') ? FACE.hot : FACE.plain;
      geometry.push(
        <g key="reach" opacity={fade('dim')}>
          <ReachDimension axis={flat ? ACROSS : ALONG} at={flat ? fy + 18 : fx + 18} from={flat ? fx : fy} mid={mid} to={end} lit={lit('dim')} size={size} />
        </g>,
      );
      words.push(
        <g key="reacht" opacity={fade('dim')}>
          {tags({
            axis: flat ? ACROSS : 'v',
            at: flat ? fy + 18 : fx + 18,
            parts: flat ? [[fx, mid, said('retract')], [mid, end, upTo(said('retract'))]] : [[fy, mid, said('retract')], [mid, end, upTo(said('retract'))]],
            ticks: flat ? dimTicks(fx, mid, end) : dimTicks(fy, mid, end),
          }, face)}
        </g>,
      );
    }
  }

  // The dimensions this move shows: its search limit, the walls at the zero, a figure being set.
  const dims = [];
  // Nothing to dimension on the way into place.
  if (!place) {
    if (move.dim?.name === 'limitX') {
      dims.push(['limitX', <Dimension key="limitX" axis={ACROSS} at={134} from={75} to={111} limit lit={lit('dim')} size={size} />, <g key="limitXt">{tags({ axis: ACROSS, at: 134, parts: [[75, 111, upTo(said('maxXY'))]], ticks: dimTicks(75, 111) }, lit('dim') ? FACE.hot : FACE.plain)}</g>]);
    }
    if (move.dim?.name === 'limitY') {
      dims.push(['limitY', <Dimension key="limitY" axis={ALONG} at={172} from={195} to={159} limit lit={lit('dim')} size={size} />, <g key="limitYt">{tags({ at: 172, parts: [[195, 159, upTo(said('maxXY'))]], ticks: dimTicks(195, 159) }, lit('dim') ? FACE.hot : FACE.plain)}</g>]);
    }
    const walls = Boolean(move.walls);
    if (walls || focus === 'wallX') {
      // At the zero, X's figure over its dimension and Y's under its own (Mateusz, 2026-10-01).
      const line = {
        axis: ACROSS, at: 79, side: -1, parts: [[106, 130, said('wallX')]], ticks: dimTicks(106, 130),
      };
      dims.push(['wallX', <Dimension key="wallX" axis={ACROSS} at={79} from={106} to={130} lit={lit('wallX')} size={size} />, <g key="wallXt">{tags(line, lit('wallX') ? FACE.hot : FACE.plain)}</g>]);
    }
    if (walls || focus === 'wallY') {
      const line = {
        at: 203, parts: [[140, 164, said('wallY')]], ticks: dimTicks(140, 164), past: 'after',
      };
      dims.push(['wallY', <Dimension key="wallY" axis={ALONG} at={203} from={140} to={164} lit={lit('wallY')} size={size} />, <g key="wallYt">{tags(line, lit('wallY') ? FACE.hot : FACE.plain)}</g>]);
    }
    if (focus === 'travel') {
      // Sideways from where the tool starts, not from the wall: where it ends depends on the start.
      const at = C0[1] + 20;
      dims.push(['travel', <Dimension key="travel" axis={ACROSS} at={at} from={C0[0]} to={XO[0]} lit size={size} />, <g key="travelt">{tags({ axis: ACROSS, at, parts: [[C0[0], XO[0], said('travel')]], ticks: dimTicks(C0[0], XO[0]) }, FACE.hot)}</g>]);
    }
  }
  const dimFade = (part) => {
    const coming = move.walls && part.startsWith('wall') && !focus ? zeroShown(move, p) : 1;
    if (!focus) {
      return coming;
    }
    return lit(part) || (part.startsWith('limit') && lit('dim')) ? 1 : 0.3;
  };

  let zero = 0;
  if (move.zero && !place) {
    zero = zeroShown(move, p);
  }
  // The zero is written with the tool still on the Y wall: its touch stays, seen from above (review note, 2026-09-30).
  const touched = !place && move.touch && (move.walls || p > 0.75) && move.view !== 'side';

  return (
    <svg ref={measure} viewBox={VIEW.join(' ')} role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={id} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <rect width={7} height={7} className="fill-work" />
          <path d="M0 0 V7" className="stroke-hatch" strokeWidth={1} />
        </pattern>
        <pattern id={`${id}h`} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <path d="M0 0 V7" className="stroke-mut" strokeOpacity={0.14} strokeWidth={1} />
        </pattern>
      </defs>
      <g transform={flip}>
        <rect x={130} y={30} width={182} height={110} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        <rect x={106} y={92} width={72} height={72} className="fill-plate stroke-plateEdge" strokeWidth={2} vectorEffect={NS} />
        <rect x={130} y={92} width={48} height={48} fill={`url(#${id}h)`} />
        <path d="M130 92 V140 H178" fill="none" className="stroke-mut" strokeWidth={1} vectorEffect={NS} strokeDasharray={DASH} />
        {zero > 0 ? <path d="M130 34 V222 M-2 140 H312" opacity={zero} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} /> : null}
        {geometry}
        {dims.map(([part, drawn]) => <g key={part} opacity={dimFade(part)}>{drawn}</g>)}
        <circle cx={cx} cy={cy} r={R * (1 + 0.3 * Math.max(0, level))} className="fill-surf stroke-ink" strokeWidth={2} vectorEffect={NS} />
        {focus === 'tool' ? <ToolWidth cx={cx} cy={cy} size={size} /> : null}
        {touched ? <Contact x={move.touch[0]} y={move.touch[1]} size={size} /> : null}
      </g>
      {zero > 0 ? (
        <g opacity={zero}>
          <text x={mx(flipX ? 124 : 136)} y={my(52)} fontSize={size.fs} className="fill-acc font-num font-semibold">{t('probe.corner.zeroX')}</text>
          <text x={mx(flipX ? 76 : 64)} y={my(134)} fontSize={size.fs} className="fill-acc font-num font-semibold">{t('probe.corner.zeroY')}</text>
        </g>
      ) : null}
      {words}
      {dims.map(([part, , words2]) => <g key={`${part}w`} opacity={dimFade(part)}>{words2}</g>)}
      {focus === 'tool' ? tags({
        axis: ACROSS, at: cy + R + 7, parts: [[cx - R, cx + R, `Ø${said('toolDiameter')}`]], ticks: [[cx - R, DIA_TICK], [cx + R, DIA_TICK]],
      }, FACE.hot) : null}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.yPlus')} size={size} />
      {layer(crossing)}
    </svg>
  );
};

export default CornerTop;
