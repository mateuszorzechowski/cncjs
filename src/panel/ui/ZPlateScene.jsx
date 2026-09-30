import { OVER_PX, PLATE_TOP } from '../machine/probeCycle';
import { t } from '../i18n';

/**
 * The Z plate side-on, as the design draws it (`Sondowanie - grafiki
 * plaskie`, 1a/1g/1l, 2026-09-29): the work grey, the plate with its blue
 * edge, the tool as an outline — a 60° V bit, one shape for every tool
 * (Mateusz: the tool need not be chosen, and *"v 60 stopni"*).
 *
 * Everything that moves comes in: `gap`, the tool's height over the plate in
 * the drawing's pixels, and `shift` how far to the side of it; `arrow`, the move under way; `contact`, the amber dot
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
  // A few millimetres between the tip and the plate, before measuring.
  clearance: () => <Dimension x={178} top={PLATE_TOP - OVER_PX} bottom={PLATE_TOP} ticks={[170, 210]} outside />,
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

/*
 * The tool's Z in the coordinate system, in the top left corner: muted
 * against the old zero, in the accent once the new one is written.
 */
const Readout = ({ name, value, when, after }) => (
  <g>
    <rect x={12} y={12} width={150} height={52} rx={4} className={after ? 'fill-accS stroke-acc' : 'fill-panel stroke-line'} strokeWidth={1.5} />
    <text x={24} y={32} className="fill-mut text-cap">{`${name} · ${when}`}</text>
    <text x={24} y={54} className={`font-num text-lead font-semibold ${after ? 'fill-acc' : 'fill-ink'}`}>{value}</text>
  </g>
);

/*
 * The alarm the limit ends in, as the state chip shows one: red, by the tip
 * that went the whole way and touched nothing (ALARM:5 on Grbl).
 */
const Alarm = () => {
  const text = t('probe.cycle.alarm');
  // As wide as its words, and inside the drawing's right edge.
  const width = text.length * 8 + 20;
  return (
    <g>
      <circle cx={220} cy={PLATE_TOP} r={6} className="fill-red" />
      <rect x={Math.min(240, 434 - width)} y={PLATE_TOP - 36} width={width} height={24} rx={4} className="fill-redS stroke-red" strokeWidth={1.5} />
      <text x={Math.min(240, 434 - width) + 10} y={PLATE_TOP - 19} className="fill-red font-num text-cap font-semibold">{text}</text>
    </g>
  );
};

const ZPlateScene = ({
  gap = 84, shift = 0, arrow = null, contact = false, marks = null, zero = 0, badge = null, readout = null, ghost = false, alarm = false,
  label, className = '',
}) => {
  const Mark = MARKS[marks];
  return (
    <svg viewBox="0 0 440 242" role="img" aria-label={label} className={`block ${className}`}>
      <rect x={-2} y={210} width={444} height={32} className="fill-mutS stroke-line" strokeWidth={1.5} />
      {ghost ? (
        // Not there: the limit is what the probe does with nothing to touch.
        <rect x={180} y={PLATE_TOP} width={80} height={18} className="stroke-acc" fill="none" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.4} />
      ) : (
        <rect x={180} y={PLATE_TOP} width={80} height={18} className="fill-accS stroke-acc" strokeWidth={2} />
      )}
      {Mark ? <Mark zero={zero} /> : null}
      <g transform={`translate(${shift} ${-gap})`}>
        {/* A 60° V bit: the point is its half-width over tan 30° long. */}
        <path d="M210 100 H230 V174.7 L220 192 L210 174.7 Z" className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" />
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
      {readout ? <Readout {...readout} /> : null}
      {alarm ? <Alarm /> : null}
    </svg>
  );
};

export default ZPlateScene;
