import { useId } from 'react';
import {
  AxisPair, Contact, DASH, Dimension, FACE, Head, Motion, NS, Tag, kit, tagWidth,
} from './probeDraw';
import useViewScale from './useViewScale';
import {
  C0, cornerSides, signedFor, gapAt, legAt, levelOfGap, moveOf, positionOf, zeroShown,
} from '../machine/cornerCycle';
import { t } from '../i18n';

/**
 * The L plate from above (Claude Design, `templates/probe-corner-proposal`,
 * 2026-09-30): the work a faint hatch, the plate over its corner with the
 * work's edge under it dashed, the tool a circle — drawn larger in step with
 * its height, whichever move raises or lowers it.
 * Moves on the wall's plane are drawn here: a set-up's legs one by one, a
 * touch's arrow with its figure, the search limit and the walls as
 * dimensions, X0 and Y0 when written. Z touches leave the tool over the
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
const LEFT = 'l';
const RIGHT = 'r';
const MID = 'c';

// The tool's diameter from above, as the dimension under it says it.
const ToolWidth = ({ cx, cy, size }) => (
  <g>
    <circle cx={cx} cy={cy} r={R} fill="none" className="stroke-acc" strokeWidth={2} vectorEffect={NS} />
    <path d={`M${cx - R} ${cy + R + 2} V${cy + R + 12} M${cx + R} ${cy + R + 2} V${cy + R + 12} M${cx - R} ${cy + R + 7} H${cx + R}`} className="stroke-acc" strokeWidth={1} vectorEffect={NS} />
    <Head x={cx - R} y={cy + R + 7} dir={WAY.left} size={size} className="fill-acc" />
    <Head x={cx + R} y={cy + R + 7} dir={WAY.right} size={size} className="fill-acc" />
  </g>
);

const CornerTop = ({
  name = 'zFast', p = 0, corner, texts = {}, say = (field, text) => text, upTo = (v) => v, focus = null, bare = false, place = null, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(VIEW[2], VIEW[3]);
  const size = kit(k);
  const { flipX, flipY } = cornerSides(corner);
  const move = moveOf(name);
  const said = (field) => say(field, texts[field] ?? '');
  const flip = `translate(${flipX ? 278 : 0} ${flipY ? 260 : 0}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})`;
  const mx = (x) => (flipX ? 278 - x : x);
  const my = (y) => (flipY ? 260 - y : y);
  // A figure's words at a place on the front-left drawing, placed on the mirror.
  const tag = (x, y, text, anchor, face = FACE.plain, key = text) => {
    if (bare) {
      return null;
    }
    const w = tagWidth(text, size.fs);
    let left = anchor === MID ? x - w / 2 : x;
    if (anchor === RIGHT) {
      left = x - w;
    }
    const placed = flipX ? 278 - left - w : left;
    return <Tag key={key} x={placed} y={my(y)} text={text} face={face} size={size} />;
  };
  const fade = (part) => (focus && focus !== part ? 0.3 : 1);

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
  } else if (move.legs) {
    const now = legAt(move, p);
    move.legs.forEach(([from, to, plane, sayLeg], i) => {
      // The leg under way's arrow alone: the ones before do not pile up (review note, 2026-09-30).
      if (i !== now || plane !== 'xy') {
        return;
      }
      const [fx, fy] = positionOf(move.frames, from);
      const [tx, ty] = positionOf(move.frames, to);
      const flat = Math.abs(fy - ty) < 0.5;
      // A leg across both axes, back over the plate or over X0 Y0, has an arrow for each.
      geometry.push(
        <g key={`leg${i}`} opacity={focus ? 0.3 : 1}>
          {Math.abs(fx - tx) > 0.5 ? <Motion axis={ACROSS} at={80} from={fx} to={tx} kind={RAPID} size={size} /> : null}
          {flat ? null : <Motion axis={ALONG} at={190} from={fy} to={ty} kind={RAPID} size={size} />}
        </g>,
      );
      // Its signs turned for the corner, as the drawing is (review note, 2026-10-01).
      const text = signedFor(corner)(sayLeg(texts, say));
      if (i === now && !focus && text) {
        words.push(flat ? tag((fx + tx) / 2, 66, text, MID, FACE.rapid) : tag(196, 207, text, MID, FACE.rapid));
      }
    });
  } else if (move.view === 'top' && move.kind) {
    const [fx, fy] = positionOf(move.frames, 0);
    const [tx, ty] = positionOf(move.frames, 1);
    const flat = fy === ty;
    geometry.push(
      <g key="arrow" opacity={fade('feed')}>
        <Motion axis={flat ? ACROSS : ALONG} at={flat ? fy - 18 : fx - 18} from={flat ? fx : fy} to={flat ? tx : ty} kind={move.kind} size={size} />
      </g>,
    );
    if (move.by) {
      const text = said(move.by);
      const face = focus === 'feed' ? FACE.hot : FACE.plain;
      words.push(
        <g key="by" opacity={fade('feed')}>
          {flat ? tag((fx + tx) / 2, move.dim ? fy + 30 : fy - 34, text, MID, face) : tag(fx - 26, (fy + ty) / 2, text, RIGHT, face)}
        </g>,
      );
    }
  }

  // The dimensions this move shows: its search limit, the walls at the zero, a figure being set.
  const lit = (part) => focus === part;
  const dims = [];
  // Nothing to dimension on the way into place.
  if (!place) {
    if (move.dim?.name === 'limitX') {
      dims.push(['limitX', <Dimension key="limitX" axis={ACROSS} at={80} from={75} to={111} limit lit={lit('dim')} size={size} />, tag(75, 63, upTo(said('maxXY')), LEFT, lit('dim') ? FACE.hot : FACE.plain, 'limitXt')]);
    }
    if (move.dim?.name === 'limitY') {
      dims.push(['limitY', <Dimension key="limitY" axis={ALONG} at={172} from={195} to={159} limit lit={lit('dim')} size={size} />, tag(172, 214, upTo(said('maxXY')), MID, lit('dim') ? FACE.hot : FACE.plain, 'limitYt')]);
    }
    const walls = Boolean(move.walls);
    if (walls || focus === 'wallX') {
      dims.push(['wallX', <Dimension key="wallX" axis={ACROSS} at={79} from={106} to={130} lit={lit('wallX')} size={size} />, tag(136, 79, said('wallX'), LEFT, lit('wallX') ? FACE.hot : FACE.plain, 'wallXt')]);
    }
    if (walls || focus === 'wallY') {
      dims.push(['wallY', <Dimension key="wallY" axis={ALONG} at={203} from={140} to={164} lit={lit('wallY')} size={size} />, tag(203, 126, said('wallY'), MID, lit('wallY') ? FACE.hot : FACE.plain, 'wallYt')]);
    }
    if (focus === 'clear') {
      dims.push(['clear', <Dimension key="clear" axis={ACROSS} at={139} from={82} to={106} lit size={size} />, tag(44, 160, said('clear'), LEFT, FACE.hot, 'cleart')]);
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
      {focus === 'tool' ? tag(cx - R - 4, cy + R + 16, `Ø${said('toolDiameter')}`, RIGHT, FACE.hot, 'dia') : null}
      <AxisPair x={VIEW[0]} y={VIEW[1] + VIEW[3]} across={t('probe.axis.xPlus')} up={t('probe.axis.yPlus')} size={size} />
    </svg>
  );
};

export default CornerTop;
