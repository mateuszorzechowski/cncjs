import { useId } from 'react';
import {
  Contact, DASH, Dimension, FACE, Head, Jog, NS, Tag, kit,
} from './probeDraw';
import useViewScale from './useViewScale';
import { FACE_Y, SHEET_Y } from '../machine/paperCycle';
import { TOOL_X } from '../machine/paperSheet';
import { t } from '../i18n';

/**
 * The paper side-on, the sheet as the design draws it (Claude Design,
 * `templates/probe-paper-proposal`, 2026-09-30): a soft band in the plates'
 * colour with a darker top edge and no outline, folding and bowing as
 * `paperSheet` moves it. The rest is the Z plate's drawing's: the work a
 * faint hatch, the tool an outline — a V bit from the side over the top, a
 * circle from above on a side — the jog's arrow in the text's colour, a
 * touch green, the zero's line in the accent.
 *
 * A side is drawn in the top's layout, the work's face the line the sheet
 * lies on; `mirror` turns it for the right and back sides, the words kept
 * readable. `focus` names the figure being set; its dimension is lit.
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
// Where the hand's to-and-fro is drawn, left of the sheet's end and above it.
const SLIDE_W = 28;
const SLIDE_UP = 26;

// Heads' ways and a dimension across, as `Head` and `Dimension` name them.
const LEFT = 'left';
const RIGHT = 'right';
const ACROSS = 'h';
// Two places after the point are plenty for a path.
const at2 = (v) => Math.round(v * 100) / 100;

const TAG_FACE = {
  'probe.paper.drag': FACE.quiet,
  'probe.paper.held': FACE.touch,
  'probe.paper.stopped': FACE.touch,
  'probe.paper.loose': FACE.quiet,
};

const PaperScene = ({
  gap = 60, sheet, held = false, jog = null, fine = null, tag = null, zero = 0, axis = 'Z',
  dim = null, dia = null, side = false, mirror = false, focus = null, label, className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const [measure, k] = useViewScale(WIDTH, HEIGHT);
  const size = kit(k);
  const mx = (x) => (mirror ? WIDTH - x : x);
  const mid = SHEET_Y + EDGE;
  const tip = SHEET_Y - gap;
  const { points, end } = sheet;
  const path = `M${points.map(([x, lift]) => `${at2(mx(x))} ${at2(mid - lift)}`).join(' L')} L${mx(TOOL_X)} ${mid} H${at2(mx(end))}`;
  const hand = points[0][0];
  const slideY = mid - SLIDE_UP;
  const slide = held ? 'grn' : 'mut';
  const [outward, inward] = mirror ? [RIGHT, LEFT] : [LEFT, RIGHT];
  return (
    <svg ref={measure} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className={`block ${className}`}>
      <defs>
        <pattern id={id} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
          <rect width={7} height={7} className="fill-work" />
          <path d="M0 0 V7" className="stroke-hatch" strokeWidth={1} />
        </pattern>
      </defs>
      <rect x={-2} y={FACE_Y} width={WIDTH + 4} height={40} fill={`url(#${id})`} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
      {zero > 0 ? (
        <g opacity={zero}>
          <path d={`M0 ${FACE_Y} H${WIDTH}`} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
          <text x={mirror ? 6 : WIDTH - 30} y={FACE_Y - 5} fontSize={size.fs} className="fill-acc font-num font-semibold">{`${axis}0`}</text>
        </g>
      ) : null}
      <path d={path} fill="none" className="stroke-plate" strokeWidth={BAND} strokeLinejoin="round" />
      <path d={path} transform={`translate(0 ${-EDGE})`} fill="none" className="stroke-plateEdge" strokeWidth={1.5} strokeLinejoin="round" vectorEffect={NS} />
      {/* The hand's to-and-fro at the sheet's end: grey while it slides, green once the tool holds it. */}
      <g>
        <path d={`M${mx(hand - SLIDE_W)} ${slideY} H${mx(hand)}`} className={`stroke-${slide}`} strokeWidth={1.5} vectorEffect={NS} />
        <Head x={mx(hand - SLIDE_W)} y={slideY} dir={outward} size={size} className={`fill-${slide}`} />
        <Head x={mx(hand)} y={slideY} dir={inward} size={size} className={`fill-${slide}`} />
      </g>
      {jog ? <Jog at={mx(ARROW_X)} from={SHEET_Y - jog.from} to={tip} every={jog.every} size={size} /> : null}
      {fine ? <Jog at={mx(ARROW_X)} from={SHEET_Y - fine.from} to={tip} size={size} /> : null}
      {jog || fine ? (
        <Tag x={mx(ARROW_X - 8)} y={jog ? SHEET_Y - jog.from + 10 : SHEET_Y - 22} text={t(jog ? 'probe.paper.step1' : 'probe.paper.step01')} right={!mirror} face={FACE.ink} size={size} />
      ) : null}
      {dim ? (
        <g opacity={focus && focus !== 'paperThickness' ? 0.3 : 1}>
          <Dimension at={mx(DIM_X)} from={SHEET_Y} to={FACE_Y} lit={focus === 'paperThickness'} size={size} />
          <Tag x={mx(DIM_X + (mirror ? -8 : 8))} y={SHEET_Y - 12} text={dim.text} right={mirror} face={focus === 'paperThickness' ? FACE.hot : FACE.plain} size={size} />
        </g>
      ) : null}
      {dia ? (
        <g opacity={focus && focus !== 'toolDiameter' ? 0.3 : 1}>
          <Dimension axis={ACROSS} at={tip - 2 * R - 14} from={mx(TOOL_X - R)} to={mx(TOOL_X + R)} lit={focus === 'toolDiameter'} size={size} />
          <Tag x={mx(TOOL_X + R + 18)} y={tip - 2 * R - 14} text={dia.text} right={mirror} face={focus === 'toolDiameter' ? FACE.hot : FACE.plain} size={size} />
        </g>
      ) : null}
      {side ? (
        <circle cx={mx(TOOL_X)} cy={tip - R} r={R} className="fill-field stroke-ink" strokeWidth={2} vectorEffect={NS} />
      ) : (
        // The Z plate's V bit, 16 wide: its point is 12 long.
        <path d={`M${mx(TOOL_X) - 8} ${tip - 64} H${mx(TOOL_X) + 8} V${tip - 12} L${mx(TOOL_X)} ${tip} L${mx(TOOL_X) - 8} ${tip - 12} Z`} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" vectorEffect={NS} />
      )}
      {held ? <Contact x={mx(TOOL_X)} y={SHEET_Y} size={size} /> : null}
      {tag ? <Tag x={mx(8)} y={SHEET_Y - 50} text={t(tag)} right={mirror} face={TAG_FACE[tag] || FACE.ink} size={size} /> : null}
    </svg>
  );
};

export default PaperScene;
