import { useId } from 'react';
import {
  Contact, DIM_TICK, Dimension, FACE, Head, Jog, MOTION_TICK, Motion, NS, TONES, Tag, kit,
} from './probeDraw';
import { placeTags, shownView } from './probeLabels';
import { SurfaceGround, zeroLineY } from './SurfaceGround';
import useViewScale from './useViewScale';
import { FACE_Y, SHEET_Y } from '../machine/paperCycle';
import { TOOL_X } from '../machine/paperSheet';
import { t } from '../../i18n/index';

/**
 * The paper side-on, the sheet as the design draws it (Claude Design,
 * `templates/probe-paper-proposal`, 2026-09-30): a soft band in the plates'
 * colour with a darker top edge and no outline, folding and bowing as
 * `paperSheet` moves it. The rest is the Z plate's drawing's: the work a
 * faint hatch, the tool an outline — a V bit from the side over the top, a
 * circle from above on a side — the jog's arrow in the text's colour, the
 * zero's line in the accent. The touch is coloured by the feel: green the
 * drag to stop at, amber resisting, red standing (Mateusz, 2026-09-30).
 *
 * A side is drawn in the top's layout, the work's face the line the sheet
 * lies on; `mirror` turns it for the right and back sides, the words kept
 * readable. `focus` names the figure being set; its dimension is lit.
 * `shift` and `motion` are the position step's: the tool coming across and
 * down (`positionAt`), its heights on this drawing.
 */

const WIDTH = 310;
const HEIGHT = 190;
const USER = 'userSpaceOnUse';
const SLANT = 'rotate(45)';
// The jog's arrow left of the tool, the sheet's dimension right of it; the tool's radius from above.
const ARROW_X = 117;
const DIM_X = 200;
const R = 12;
// The band: its width, and how far above its middle the top edge runs.
const BAND = 6;
const EDGE = 3;
// The jog key a step is pressed with, in the corner; SVG's word for centred text.
const KEY_W = 46;
const KEY_H = 34;
const MIDDLE = 'middle';
// Where the hand's to-and-fro is drawn, left of the sheet's end and above it.
const SLIDE_W = 28;
const SLIDE_UP = 26;

// Heads' ways and a dimension across, as `Head` and `Dimension` name them.
const LEFT = 'left';
const RIGHT = 'right';
const ACROSS = 'h';
// Two places after the point are plenty for a path.
const at2 = (v) => Math.round(v * 100) / 100;

// The feel's colour on its tag.
const TAG_FACE = { grn: FACE.touch, amb: FACE.warn, red: FACE.alarm };

const PaperScene = ({
  gap = 60, shift = 0, motion = null, sheet, tone = null, jog = null, fine = null, tag = null, zero = 0, axis = 'Z',
  dim = null, dia = null, side = false, mirror = false, focus = null, surface = undefined, stock = null, click = null, lift = null,
  label, className = '',
}) => {
  const toolX = TOOL_X + shift;
  const id = useId().replace(/:/g, '');
  const [measure, k, box] = useViewScale(WIDTH, HEIGHT);
  const size = kit(k);
  const mx = (x) => (mirror ? WIDTH - x : x);
  const mid = SHEET_Y + EDGE;
  const tip = SHEET_Y - gap;
  const { points, end } = sheet;
  const path = `M${points.map(([x, lift]) => `${at2(mx(x))} ${at2(mid - lift)}`).join(' L')} L${mx(TOOL_X)} ${mid} H${at2(mx(end))}`;
  const hand = points[0][0];
  const slideY = mid - SLIDE_UP;
  const slide = TONES[tone || 'mut'];
  const [outward, inward] = mirror ? [RIGHT, LEFT] : [LEFT, RIGHT];
  // A line's figures on the unmirrored drawing, placed by the one rule (`placeTags`) and then on the mirror.
  const avoid = zero > 0 ? [[0, zeroLineY(FACE_Y, surface) - 1, WIDTH, 2]] : [];
  const tags = (line, face) => placeTags({
    ...line, view: shownView([0, 0, WIDTH, HEIGHT], k, box), avoid, size,
  }).map((one) => (
    <Tag key={one.text} x={mirror ? WIDTH - one.x - one.w : one.x} y={one.y} text={one.text} face={face} size={size} />
  ));
  const jogFrom = SHEET_Y - (jog || fine || { from: 0 }).from;
  return (
    <svg ref={measure} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={id} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <rect width={7} height={7} className="fill-work" />
          <path d="M0 0 V7" className="stroke-hatch" strokeWidth={1} />
        </pattern>
      </defs>
      {/* The work, or the table with the work beside it past the sheet's end, and Z0 on the surface chosen. */}
      <SurfaceGround
        fill={`url(#${id})`}
        y={FACE_Y}
        width={WIDTH}
        surface={surface}
        zero={zero}
        label={`${axis}0`}
        labelX={mirror ? 6 : WIDTH - 30}
        stock={stock ? { ...stock, fade: focus && !stock.lit ? 0.3 : 1 } : null}
        blockX={240}
        size={size}
      />
      <path d={path} fill="none" className="stroke-plate" strokeWidth={BAND} strokeLinejoin="round" />
      <path d={path} transform={`translate(0 ${-EDGE})`} fill="none" className="stroke-plateEdge" strokeWidth={1.5} strokeLinejoin="round" vectorEffect={NS} />
      {/* The hand's to-and-fro at the sheet's end: grey while it slides freely, then in the feel's colour. */}
      <g>
        <path d={`M${mx(hand - SLIDE_W)} ${slideY} H${mx(hand)}`} className={slide.stroke} strokeWidth={1.5} vectorEffect={NS} />
        <Head x={mx(hand - SLIDE_W)} y={slideY} dir={outward} size={size} className={slide.fill} />
        <Head x={mx(hand)} y={slideY} dir={inward} size={size} className={slide.fill} />
      </g>
      {jog ? <Jog at={mx(ARROW_X)} from={SHEET_Y - jog.from} to={tip} every={jog.every} size={size} /> : null}
      {fine ? <Jog at={mx(ARROW_X)} from={SHEET_Y - fine.from} to={tip} size={size} /> : null}
      {jog || fine ? (
        tags({
          at: ARROW_X, side: -1, parts: [[jogFrom, tip, t(jog ? 'probe.paper.step1' : 'probe.paper.step01')]], ticks: [[jogFrom, MOTION_TICK]],
        }, FACE.ink)
      ) : null}
      {dim ? (
        <g opacity={focus && focus !== dim.field ? 0.3 : 1}>
          <Dimension at={mx(DIM_X)} from={dim.top} to={dim.bottom} lit={Boolean(dim.field) && focus === dim.field} size={size} />
          {tags({ at: DIM_X, parts: [[dim.top, dim.bottom, dim.text]], ticks: [[dim.top, DIM_TICK], [dim.bottom, DIM_TICK]] }, dim.field && focus === dim.field ? FACE.hot : FACE.plain)}
        </g>
      ) : null}
      {motion ? <Motion at={mx(ARROW_X + shift)} from={motion.from} to={motion.to} kind={motion.kind} size={size} /> : null}
      {dia ? (
        <g opacity={focus && focus !== 'toolDiameter' ? 0.3 : 1}>
          <Dimension axis={ACROSS} at={tip - 2 * R - 14} from={mx(TOOL_X - R)} to={mx(TOOL_X + R)} lit={focus === 'toolDiameter'} size={size} />
          {tags({
            axis: ACROSS, at: tip - 2 * R - 14, side: -1, parts: [[TOOL_X - R, TOOL_X + R, dia.text]], ticks: [[TOOL_X - R, DIM_TICK], [TOOL_X + R, DIM_TICK]],
          }, focus === 'toolDiameter' ? FACE.hot : FACE.plain)}
        </g>
      ) : null}
      {side ? (
        <circle cx={mx(toolX)} cy={tip - R} r={R} className="fill-field stroke-ink" strokeWidth={2} vectorEffect={NS} />
      ) : (
        // The Z plate's V bit, 16 wide: its point is 12 long.
        <path d={`M${mx(toolX) - 8} ${tip - 64} H${mx(toolX) + 8} V${tip - 12} L${mx(toolX)} ${tip} L${mx(toolX) - 8} ${tip - 12} Z`} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" vectorEffect={NS} />
      )}
      {tone ? <Contact x={mx(TOOL_X)} y={SHEET_Y} tone={tone} size={size} /> : null}
      {tag ? <Tag x={mx(8)} y={SHEET_Y - 50} text={t(tag)} right={mirror} face={TAG_FACE[tone] || FACE.ink} size={size} /> : null}
      {/* The jog key each step is pressed with, lit as it is (review note, 2026-10-01: *"pojedyncze kliknięcia"*). */}
      {click ? (
        <g>
          <rect x={mirror ? WIDTH - 8 - KEY_W : 8} y={8} width={KEY_W} height={KEY_H} rx={size.rx} className={click.on ? 'fill-acc stroke-acc' : 'fill-accS stroke-line'} strokeWidth={1} vectorEffect={NS} />
          <text x={mirror ? WIDTH - 8 - KEY_W / 2 : 8 + KEY_W / 2} y={8 + KEY_H * 0.45} textAnchor={MIDDLE} fontSize={size.fs} className={`font-num font-semibold ${click.on ? 'fill-white' : 'fill-acc'}`}>{click.way}</text>
          <text x={mirror ? WIDTH - 8 - KEY_W / 2 : 8 + KEY_W / 2} y={8 + KEY_H * 0.8} textAnchor={MIDDLE} fontSize={size.fs * 0.75} className={click.on ? 'fill-white' : 'fill-acc'}>{t(click.step)}</text>
        </g>
      ) : null}
      {lift ? (
        <g opacity={focus && !lift.lit ? 0.3 : 1}>
          <Dimension at={mx(DIM_X)} from={lift.top} to={lift.bottom} lit={lift.lit} size={size} />
          {tags({ at: DIM_X, parts: [[lift.top, lift.bottom, lift.text]], ticks: [[lift.top, DIM_TICK], [lift.bottom, DIM_TICK]] }, lift.lit ? FACE.hot : FACE.plain)}
        </g>
      ) : null}
    </svg>
  );
};

export default PaperScene;
