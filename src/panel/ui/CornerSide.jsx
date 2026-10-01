import { useId } from 'react';
import {
  AxisPair, Contact, axisRects, DASH, DIM_TICK, Dimension, FACE, Head, MOTION_TICK, Motion, NS, ReachDimension, Tag, kit,
} from './probeDraw';
import {
  lineRect, placeTags, shownView, tagRect,
} from './probeLabels';
import useViewScale from './useViewScale';
import {
  C0, LIFTED, TOP, cornerSides, gapAt, zeroShown, legAt, moveOf, positionOf, tipOf,
} from '../machine/cornerCycle';
import { t } from '../i18n';

/**
 * The L plate from the side, in the same drawing as from above (Claude
 * Design, `templates/probe-corner-proposal`, 2026-09-30): the plate's side
 * hanging over the work's edge, which is dashed under it; the tool the Z
 * plate's V bit, drawn a little larger the nearer it comes. Z is drawn here,
 * and only Z (rule, Mateusz 2026-10-01) — the Z touch with its arrow and
 * limit, a set-up's rises and descents, the zero's Z0 and the plate's top,
 * the lift; along X the tool only moves, along Y it only nears.
 *
 * Drawn for a left-hand corner and mirrored for a right one; the words are
 * placed on the mirror. `bare`: without the form's figures (the machine
 * measuring); `place`: the tool at `{ at, level }` on its way into place,
 * with `text` over the gap once `over`.
 */

const VIEW = [41, 36, 202, 188];
const USER = 'userSpaceOnUse';
// Words the drawing's pieces switch on, kept out of the markup.
const RAPID = 'rapid';
const PROBE = 'probe';
const UP = 'up';
const DOWN = 'down';

const SLANT = 'rotate(45)';

// Where the Y wall's outer face is, from above: past it the tool is out beside the work.
const Y_FACE = 164;

// A move along Y comes nearer, drawn up to 30% larger at the front wall — or, at a back corner, further, smaller.
const nearness = (y, back) => 1 + (back ? -0.2 : 0.3) * Math.max(0, Math.min(1, (y - 116) / 79));

const Bit = ({ cx, tip, scale = 1, hidden = false }) => {
  const w = 7.2 * scale;
  const d = `M${cx - w} ${tip - 64 * scale} H${cx + w} V${tip - 12 * scale} L${cx} ${tip} L${cx - w} ${tip - 12 * scale} Z`;
  if (hidden) {
    return <path d={d} fill="none" className="stroke-ink" strokeWidth={1.5} strokeLinejoin="round" vectorEffect={NS} strokeDasharray={DASH} />;
  }
  return <path d={d} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" vectorEffect={NS} />;
};

// The plate and the work as the side sees them: what hides a tool behind them.
const SOLID = [[130, 170, 200, 70], [106, TOP, 72, 60]];
// A mask's colours: white shows, black hides.
const SHOW = '#fff';
const HIDE = '#000';

// Beside the tool, where a rise or a descent is drawn: on its left, the dimensions being on the right.
const besideOf = (x) => x - 18;
// Where the dimensions stand, right of the plate, close enough for their figures to fit beside them; ticks across one.
const COL = 186;
const dimTicks = (...along) => along.map((a) => [a, DIM_TICK]);
// The chained rise's ticks, half their length.
const PART_TICK = 6;

const CornerSide = ({
  name = 'zFast', p = 0, corner, texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null, bare = false, place = null, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k, box] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const { flipX, flipY } = cornerSides(corner);
  const outside = `url(#${id}m)`;
  const inside = `url(#${id}c)`;
  const move = moveOf(name);
  const said = (field) => say(field, texts[field] ?? '');
  const flip = `translate(${flipX ? 284 : 0} 0) scale(${flipX ? -1 : 1} 1)`;
  const geometry = [];
  const words = [];
  let bit;
  // What a label keeps off (L15, L16, L25): Z0's line, the tool, the arrows and dimensions of the other
  // column, and the labels placed before it.
  const lines = [];
  const taken = [];
  const line = (at, from, to, half) => lines.push({ at, rect: lineRect('v', at, from, to, half) });
  // The bit over its whole way through the move (`sweep`, its tips), not where it is now (L16).
  let sweep = null;
  const bitRect = () => {
    const s = bit.scale || 1;
    const [high, low] = sweep ? [Math.min(...sweep), Math.max(...sweep)] : [bit.tip, bit.tip];
    return [bit.cx - 7.2 * s, high - 64 * s, 14.4 * s, low - high + 64 * s];
  };
  // A line's figures on the left-hand drawing, placed by the one rule (`placeTags`) and then on the mirror.
  const placed = (one) => {
    const axes = axisRects(VIEW[0], VIEW[1] + VIEW[3], size).map(([x, ...rest]) => (flipX ? [284 - x - rest[1], ...rest] : [x, ...rest]));
    const avoid = [
      ...(move.zero ? [[VIEW[0], 169, VIEW[2], 2]] : []), bitRect(), ...axes,
      ...lines.filter((l) => l.at !== one.at).map((l) => l.rect), ...taken,
    ];
    const here = bare ? [] : placeTags({
      ...one, view: shownView(VIEW, k, box), avoid, size,
    });
    taken.push(...here.map(tagRect));
    return here;
  };
  const tags = (key, one, face = FACE.plain) => (
    <g key={key}>
      {placed(one).map((tag) => <Tag key={tag.text} x={flipX ? 284 - tag.x - tag.w : tag.x} y={tag.y} text={tag.text} face={face} size={size} />)}
    </g>
  );
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);
  // At a back corner, out past the Y wall the tool is behind the work (Mateusz, 2026-09-30).
  let behind = false;
  let touch = null;

  if (place) {
    // On its way into place: over the plate at last, a few millimetres above it.
    bit = { cx: place.at[0], tip: tipOf(place.level), scale: nearness(place.at[1], flipY) };
    if (place.over) {
      geometry.push(<Dimension key="few" at={COL} from={tipOf(1)} to={TOP} size={size} />);
      line(COL, tipOf(1), TOP, DIM_TICK);
      words.push(tags('few', { at: COL, parts: [[tipOf(1), TOP, place.text]], ticks: dimTicks(tipOf(1), TOP) }));
    }
  } else if (move.view === 'side' && move.gap) {
    // A Z touch, straight down onto the plate's top.
    const [g0, g1] = move.gap;
    const gap = gapAt(move, p);
    const tip = TOP - gap;
    bit = { cx: C0[0], tip };
    sweep = [TOP - g0, TOP - g1];
    geometry.push(
      <g key="arrow" opacity={fade('feed')}>
        <Motion at={120} from={TOP - g0} to={TOP - g1} kind={move.kind} size={size} />
      </g>,
    );
    line(120, TOP - g0, TOP - g1, MOTION_TICK);
    line(COL, move.dim.from, move.dim.to, DIM_TICK);
    if (move.feed) {
      const f = TOP - g0;
      const e = TOP - g1;
      words.push(<g key="feed" opacity={fade('feed')}>{tags('feedt', { at: 120, side: -1, parts: [[f, e, said(move.feed)]], ticks: [[f, MOTION_TICK]] }, focus === 'feed' ? FACE.hot : FACE.plain)}</g>);
    }
    const { from, to: end, limit } = move.dim;
    const { split } = move.dim;
    // Twice a figure (`split`): the way back plain, the margin past it a limit.
    const to = split ? (from + end) / 2 : end;
    geometry.push(<g key="dim" opacity={fade('dim')}>{split ? <ReachDimension at={COL} from={from} mid={to} to={end} lit={focus === 'dim'} size={size} /> : <Dimension at={COL} from={from} to={to} limit={limit} lit={focus === 'dim'} size={size} />}</g>);
    const figure = said(split || move.dim.field);
    words.push(
      <g key="dimt" opacity={fade('dim')}>
        {tags('dimt', {
          at: COL,
          parts: split ? [[from, to, figure], [to, end, upTo(figure)]] : [[from, to, limit ? upTo(figure) : figure]],
          ticks: split ? dimTicks(from, to, end) : dimTicks(from, to),
        }, focus === 'dim' ? FACE.hot : FACE.plain)}
      </g>,
    );
    if (gap < 0.3) {
      touch = [C0[0], TOP];
    }
  } else if (move.depthOf) {
    // Down beside the wall, below the work's top by the depth.
    const [x, , level] = positionOf(move.frames, p);
    bit = { cx: x, tip: tipOf(level) };
    geometry.push(<path key="edge" d="M20 170 H106" className="stroke-mut" strokeWidth={1} vectorEffect={NS} strokeDasharray={DASH} />);
    geometry.push(<g key="arrow" opacity={0.3}><Motion at={56} from={tipOf(1)} to={tipOf(0)} kind={PROBE} size={size} /></g>);
    geometry.push(<Dimension key="dim" at={COL} from={170} to={182} lit size={size} />);
    line(56, tipOf(1), tipOf(0), MOTION_TICK);
    words.push(tags('depth', { at: COL, parts: [[170, 182, said('depth')]], ticks: dimTicks(170, 182) }, FACE.hot));
  } else {
    // A move on the walls' plane, seen edge-on: the tool moves along X, nears along Y; no arrows.
    const [x, y, level] = positionOf(move.frames, p);
    bit = { cx: x, tip: tipOf(level), scale: nearness(y, flipY) };
    behind = flipY && y > Y_FACE;
    if (move.legs) {
      const now = legAt(move, p);
      move.legs.forEach(([from, to, plane, , , legName, parts], i) => {
        // The leg under way's arrow alone: the ones before do not pile up (review note, 2026-09-30).
        if (i !== now) {
          return;
        }
        const [fx, , fz] = positionOf(move.frames, from);
        const [, , tz] = positionOf(move.frames, to);
        const y1 = tipOf(fz);
        const y2 = tipOf(tz);
        let drawn = null;
        if (Math.abs(y1 - y2) > 0.5) {
          const at = besideOf(fx);
          // Down beside a wall is a G38.3, a probing move with its feed; up a G0, bare.
          const down = legName === 'down';
          drawn = <Motion at={at} from={y1} to={y2} kind={down ? PROBE : RAPID} size={size} />;
          line(at, y1, y2, MOTION_TICK);
          sweep = [y1, y2];
          if (parts && !focus) {
            line(COL, y1, y2, PART_TICK);
          }
          if (down && !focus) {
            words.push(tags('legf', { at, side: -1, parts: [[y1, y2, said('fast')]], ticks: [[y1, MOTION_TICK]] }));
          }
          if (parts && !focus) {
            // A rise or descent that adds two figures: each drawn as its own dimension, split at the plate's top (review notes, 2026-09-30).
            // One chained dimension past the plate's far side, ticked at the plate's top, the figures beside it (review note, 2026-09-30).
            const [low, high] = [Math.max(y1, y2), Math.min(y1, y2)];
            const ticks = [high, TOP, low].map((y) => `M${COL - PART_TICK} ${y} H${COL + PART_TICK}`).join(' ');
            geometry.push(
              <g key="parts">
                <path d={`M${COL} ${high} V${low} ${ticks}`} fill="none" className="stroke-mut" strokeWidth={1} vectorEffect={NS} />
                {[[high, UP], [TOP, DOWN], [TOP, UP], [low, DOWN]].map(([y, dir]) => <Head key={`${y}${dir}`} x={COL} y={y} dir={dir} size={size} className="fill-mut" />)}
              </g>,
            );
            words.push(tags('parts', {
              at: COL, parts: [[high, TOP, said(parts[1])], [TOP, low, said(parts[0])]], ticks: [high, TOP, low].map((y) => [y, PART_TICK]),
            }));
          }
        }
        if (drawn && plane === 'z') {
          geometry.push(<g key={`leg${i}`} opacity={focus ? 0.3 : 1}>{drawn}</g>);
        }
      });
    } else if (move.kind && move.view === 'top') {
      if (move.touch && move.touch[1] === 116 && p > 0.75) {
        touch = [move.touch[0], tipOf(level) - 6];
      }
    }
    if (move.zero) {
      // Z0 on the work's top, under the plate's thickness.
      const shown = zeroShown(move, p);
      geometry.push(
        <g key="z0" opacity={shown * (focus && focus !== 'thick' && focus !== 'rise' ? 0.3 : 1)}>
          <path d="M-2 170 H312" className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
        </g>,
      );
      words.push(<text key="z0t" x={flipX ? 284 - 64 - size.fs * 1.4 : 64} y={164} opacity={shown} fontSize={size.fs} className="fill-acc font-num font-semibold">{t('probe.z0')}</text>);
      if (!move.rise) {
        geometry.push(<g key="thick" opacity={fade('thick') * (focus ? 1 : shown)}><Dimension at={COL} from={TOP} to={170} lit={focus === 'thick'} size={size} /></g>);
        line(COL, TOP, 170, DIM_TICK);
        words.push(
          <g key="thickt" opacity={fade('thick') * (focus ? 1 : shown)}>
            {tags('thickt', { at: COL, parts: [[TOP, 170, said('cornerThickness')]], ticks: dimTicks(TOP, 170) }, focus === 'thick' ? FACE.hot : FACE.plain)}
          </g>,
        );
      }
    }
    if (move.rise && focus === 'rise') {
      // The lift being set: its way over the plate's top, lit, its figure beside it.
      geometry.push(<Dimension key="rise" at={COL} from={tipOf(LIFTED)} to={TOP} lit size={size} />);
      words.push(tags('rise', { at: COL, parts: [[tipOf(LIFTED), TOP, said('lift')]], ticks: dimTicks(tipOf(LIFTED), TOP) }, FACE.hot));
    }
  }

  return (
    <svg ref={measure} viewBox={VIEW.join(' ')} role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={id} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <rect width={7} height={7} className="fill-work" />
          <path d="M0 0 V7" className="stroke-hatch" strokeWidth={1} />
        </pattern>
        <mask id={`${id}m`} maskUnits={USER}>
          <rect x={-100} y={0} width={500} height={300} fill={SHOW} />
          {SOLID.map(([x, y, w, h]) => <rect key={x} x={x} y={y} width={w} height={h} fill={HIDE} />)}
        </mask>
        <clipPath id={`${id}c`}>
          {SOLID.map(([x, y, w, h]) => <rect key={x} x={x} y={y} width={w} height={h} />)}
        </clipPath>
        <pattern id={`${id}h`} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <path d="M0 0 V7" className="stroke-mut" strokeOpacity={0.14} strokeWidth={1} />
        </pattern>
      </defs>
      <g transform={flip}>
        <rect x={130} y={170} width={200} height={70} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        <rect x={106} y={TOP} width={72} height={60} className="fill-plate stroke-plateEdge" strokeWidth={2} vectorEffect={NS} />
        <rect x={130} y={170} width={48} height={36} fill={`url(#${id}h)`} />
        <path d="M130 206 V170 H178" fill="none" className="stroke-mut" strokeWidth={1} vectorEffect={NS} strokeDasharray={DASH} />
        {geometry}
        {bit && behind ? <g mask={outside}><Bit {...bit} /></g> : null}
        {bit && behind ? <g clipPath={inside}><Bit {...bit} hidden /></g> : null}
        {bit && !behind ? <Bit {...bit} /> : null}
        {touch ? <Contact x={touch[0]} y={touch[1]} size={size} /> : null}
      </g>
      {words}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.zPlus')} size={size} />
    </svg>
  );
};

export default CornerSide;
