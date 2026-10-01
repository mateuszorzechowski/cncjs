import { useId } from 'react';
import {
  AxisPair, Contact, DASH, Dimension, FACE, Head, Motion, NS, ReachDimension, Tag, kit, tagWidth,
} from './probeDraw';
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
const besideOf = (x) => x - 16;

const CornerSide = ({
  name = 'zFast', p = 0, corner, texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null, bare = false, place = null, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const { flipX, flipY } = cornerSides(corner);
  const outside = `url(#${id}m)`;
  const inside = `url(#${id}c)`;
  const move = moveOf(name);
  const said = (field) => say(field, texts[field] ?? '');
  const flip = `translate(${flipX ? 284 : 0} 0) scale(${flipX ? -1 : 1} 1)`;
  // `fixed`: in the same place whichever way the drawing faces — clear of the controls in its top right.
  const tag = (x, y, text, anchor, face = FACE.plain, key = text, fixed = false) => {
    if (bare) {
      return null;
    }
    const w = tagWidth(text, size.fs);
    let left = x;
    if (anchor === 'c') {
      left = x - w / 2;
    } else if (anchor === 'r') {
      left = x - w;
    }
    // Never past the view's edges, however large the words are drawn small (review note, 2026-10-01).
    left = Math.max(VIEW[0] + 2, Math.min(left, VIEW[0] + VIEW[2] - 2 - w));
    return <Tag key={key} x={flipX && !fixed ? 284 - left - w : left} y={y} text={text} face={face} size={size} />;
  };
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);

  const geometry = [];
  const words = [];
  let bit;
  // At a back corner, out past the Y wall the tool is behind the work (Mateusz, 2026-09-30).
  let behind = false;
  let touch = null;

  if (place) {
    // On its way into place: over the plate at last, a few millimetres above it.
    bit = { cx: place.at[0], tip: tipOf(place.level), scale: nearness(place.at[1], flipY) };
    if (place.over) {
      geometry.push(<Dimension key="few" at={190} from={tipOf(1)} to={TOP} size={size} />);
      words.push(tag(190, tipOf(1) - 26, place.text, 'c'));
    }
  } else if (move.view === 'side' && move.gap) {
    // A Z touch, straight down onto the plate's top.
    const [g0, g1] = move.gap;
    const gap = gapAt(move, p);
    const tip = TOP - gap;
    bit = { cx: C0[0], tip };
    geometry.push(
      <g key="arrow" opacity={fade('feed')}>
        <Motion at={120} from={TOP - g0} to={TOP - g1} kind={move.kind} size={size} />
      </g>,
    );
    if (move.feed) {
      const f = TOP - g0;
      const e = TOP - g1;
      words.push(<g key="feed" opacity={fade('feed')}>{tag(112, Math.abs(f - e) < 30 ? Math.min(f, e) - 12 : (f + e) / 2, said(move.feed), 'r', focus === 'feed' ? FACE.hot : FACE.plain)}</g>);
    }
    const { from, to: end, limit } = move.dim;
    const { split } = move.dim;
    // Twice a figure (`split`): the way back plain, the margin past it a limit.
    const to = split ? (from + end) / 2 : end;
    const small = to - from < 24;
    geometry.push(<g key="dim" opacity={fade('dim')}>{split ? <ReachDimension at={190} from={from} mid={to} to={end} lit={focus === 'dim'} size={size} /> : <Dimension at={190} from={from} to={to} limit={limit} lit={focus === 'dim'} size={size} />}</g>);
    const figure = said(split || move.dim.field);
    words.push(<g key="dimt" opacity={fade('dim')}>{tag(190, small ? from - 26 : from - 14, limit ? upTo(figure) : figure, 'c', focus === 'dim' ? FACE.hot : FACE.plain)}</g>);
    if (split) {
      // Under the margin's end, where there is room for it.
      words.push(<g key="dimt2" opacity={fade('dim')}>{tag(190, end + 16, upTo(figure), 'c', focus === 'dim' ? FACE.hot : FACE.plain)}</g>);
    }
    if (gap < 0.3) {
      touch = [C0[0], TOP];
    }
  } else if (move.depthOf) {
    // Down beside the wall, below the work's top by the depth.
    const [x, , level] = positionOf(move.frames, p);
    bit = { cx: x, tip: tipOf(level) };
    geometry.push(<path key="edge" d="M20 170 H106" className="stroke-mut" strokeWidth={1} vectorEffect={NS} strokeDasharray={DASH} />);
    geometry.push(<g key="arrow" opacity={0.3}><Motion at={56} from={tipOf(1)} to={tipOf(0)} kind={PROBE} size={size} /></g>);
    geometry.push(<Dimension key="dim" at={190} from={170} to={182} lit size={size} />);
    words.push(tag(190, 140, said('depth'), 'c', FACE.hot));
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
          if (down && !focus) {
            words.push(tag(at - 8, (y1 + y2) / 2, said('fast'), 'r', FACE.plain, 'legf'));
          }
          if (parts && !focus) {
            // A rise or descent that adds two figures: each drawn as its own dimension, split at the plate's top (review notes, 2026-09-30).
            // One chained dimension past the plate's far side, ticked at the plate's top, the figures beside it (review note, 2026-09-30).
            const col = 190;
            const [low, high] = [Math.max(y1, y2), Math.min(y1, y2)];
            const ticks = [high, TOP, low].map((y) => `M${col - 6} ${y} H${col + 6}`).join(' ');
            geometry.push(
              <g key="parts">
                <path d={`M${col} ${high} V${low} ${ticks}`} fill="none" className="stroke-mut" strokeWidth={1} vectorEffect={NS} />
                {[[high, UP], [TOP, DOWN], [TOP, UP], [low, DOWN]].map(([y, dir]) => <Head key={`${y}${dir}`} x={col} y={y} dir={dir} size={size} className="fill-mut" />)}
              </g>,
            );
            words.push(tag(col + 10, (TOP + low) / 2, said(parts[0]), 'l', FACE.plain, 'partLow'));
            words.push(tag(col + 10, (high + TOP) / 2, said(parts[1]), 'l', FACE.plain, 'partHigh'));
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
        geometry.push(<g key="thick" opacity={fade('thick') * (focus ? 1 : shown)}><Dimension at={190} from={TOP} to={170} lit={focus === 'thick'} size={size} /></g>);
        words.push(<g key="thickt" opacity={fade('thick') * (focus ? 1 : shown)}>{tag(190, 118, said('cornerThickness'), 'c', focus === 'thick' ? FACE.hot : FACE.plain)}</g>);
      }
    }
    if (move.rise && focus === 'rise') {
      // The lift being set: its way over the plate's top, lit, its figure beside it.
      geometry.push(<Dimension key="rise" at={190} from={tipOf(LIFTED)} to={TOP} lit size={size} />);
      words.push(tag(200, (tipOf(LIFTED) + TOP) / 2, said('lift'), 'l', FACE.hot, 'rise'));
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
