import { PLATE_TOP } from '../machine/probeCycle';
import { t } from '../i18n';

/**
 * The Z plate side-on, as the design draws it (`Sondowanie - grafiki
 * plaskie`, 1a/1g/1l, 2026-09-29): the work grey, the plate with its blue
 * edge, the tool as an outline — an end mill, one shape for every tool
 * (Mateusz: the tool need not be chosen).
 *
 * Everything that moves comes in: `gap`, the tool's height over the plate in
 * the drawing's pixels; `arrow`, the move under way; `contact`, the amber dot
 * of a touch; `marks`, which figure's dimension is drawn, with `zero` how far
 * the Z0 line has come in; `badge`, the figure's value where the design puts
 * it.
 */

const Head = ({ x, at, down }) => (
  <path d={down ? `M${x - 5} ${at - 9} L${x} ${at} L${x + 5} ${at - 9} Z` : `M${x - 5} ${at + 9} L${x} ${at} L${x + 5} ${at + 9} Z`} className="fill-acc" />
);

/** A dimension between two heights, arrows pointing in at both. */
const Dimension = ({ x, top, bottom, ticks, outside = false }) => (
  <>
    <path d={`M${ticks[0]} ${top} H${ticks[1]} M${ticks[0]} ${bottom} H${ticks[1]}`} className="stroke-acc" fill="none" strokeWidth={1} />
    {outside ? (
      <>
        <path d={`M${x} ${top - 18} V${top} M${x} ${bottom} V${bottom + 18}`} className="stroke-acc" fill="none" strokeWidth={2} />
        <Head x={x} at={top} down />
        <Head x={x} at={bottom} />
      </>
    ) : (
      <>
        <path d={`M${x} ${top + 9} V${bottom - 9}`} className="stroke-acc" fill="none" strokeWidth={2} />
        <Head x={x} at={top} />
        <Head x={x} at={bottom} down />
      </>
    )}
  </>
);

const MARKS = {
  maxZ: () => <Dimension x={196} top={PLATE_TOP - 84} bottom={PLATE_TOP} ticks={[186, 210]} />,
  retract: () => <Dimension x={178} top={PLATE_TOP - 14} bottom={PLATE_TOP} ticks={[170, 210]} outside />,
  plateThickness: ({ zero }) => (
    <>
      <path d="M0 210 H180" className="stroke-acc" strokeWidth={2} strokeDasharray="5 4" opacity={zero} />
      <text x={10} y={204} className="fill-acc font-num text-cap font-semibold" opacity={zero}>{t('probe.z0')}</text>
      <Dimension x={292} top={PLATE_TOP} bottom={210} ticks={[264, 300]} outside />
    </>
  ),
};

const Badge = ({ x, y, text }) => (
  <g>
    <rect x={x} y={y} width={text.length * 7 + 16} height={20} rx={4} className="fill-accS stroke-acc" strokeWidth={1.5} />
    <text x={x + 8} y={y + 14} className="fill-acc font-num text-cap font-semibold">{text}</text>
  </g>
);

const ZPlateScene = ({ gap = 84, arrow = null, contact = false, marks = null, zero = 0, badge = null, label, className = '' }) => {
  const Mark = MARKS[marks];
  return (
    <svg viewBox="0 0 440 242" role="img" aria-label={label} className={`block ${className}`}>
      <rect x={-2} y={210} width={444} height={32} className="fill-mutS stroke-line" strokeWidth={1.5} />
      <rect x={180} y={PLATE_TOP} width={80} height={18} className="fill-accS stroke-acc" strokeWidth={2} />
      {Mark ? <Mark zero={zero} /> : null}
      <g transform={`translate(0 ${-gap})`}>
        <path d="M210 100 H230 V192 H210 Z" className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" />
        <path d="M210 158 L230 150 M210 170 L230 162 M210 182 L230 174" className="stroke-ink" fill="none" strokeWidth={2} strokeLinecap="round" />
      </g>
      {arrow ? (
        <>
          <line x1={244} y1={arrow.to > arrow.from ? arrow.from + 2 : arrow.from - 2} x2={244} y2={arrow.to > arrow.from ? arrow.to - 9 : arrow.to + 9} className="stroke-acc" strokeWidth={2.5} />
          <Head x={244} at={arrow.to} down={arrow.to > arrow.from} />
          <path d={`M237 ${arrow.to} H251`} className="stroke-acc" strokeWidth={1.5} />
        </>
      ) : null}
      {contact ? <circle cx={220} cy={PLATE_TOP} r={4.5} className="fill-amb" /> : null}
      {badge ? <Badge x={badge.x} y={badge.y} text={badge.text} /> : null}
    </svg>
  );
};

export default ZPlateScene;
