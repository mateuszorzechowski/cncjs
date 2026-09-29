import { t } from '../i18n';

/**
 * The wire test as the design draws it (1j, chosen 2026-09-29): the clip on
 * the tool and the plate on its lead — apart on the left, touching on the
 * right. Live: the side the probe input is on right now stands out and the
 * other fades, so the drawing is the reading.
 *
 * The clip is two arms pinched on the shank and open at the back, a pin in
 * the middle, each arm outlined like the tool.
 */

// SVG's word for text centred on its x.
const MIDDLE = 'middle';

// One arm of the clip, outlined: a thick ink stroke with the tool's fill inside.
const Arm = ({ d }) => (
  <>
    <path d={d} className="stroke-ink" fill="none" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} className="stroke-field" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </>
);

const Clip = ({ x }) => (
  <g transform={`translate(${x} 64)`}>
    <Arm d="M-3 -3 L-20 -4 L-40 -12" />
    <Arm d="M-3 3 L-20 4 L-40 12" />
    <circle cx={-20} cy={0} r={4} className="fill-panel stroke-ink" strokeWidth={2} />
  </g>
);

const Tool = ({ x }) => (
  <>
    <path d={`M${x} 28 H${x + 20} V120 H${x} Z`} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" />
    <path d={`M${x} 86 L${x + 20} 78 M${x} 98 L${x + 20} 90 M${x} 110 L${x + 20} 102`} className="stroke-ink" fill="none" strokeWidth={2} strokeLinecap="round" />
  </>
);

const Pill = ({ x, closed, text }) => (
  <>
    <rect x={x} y={220} width={172} height={28} rx={14} className={`fill-panel ${closed ? 'stroke-grn' : 'stroke-line'}`} strokeWidth={closed ? 1.5 : 1} />
    <circle cx={x + 18} cy={234} r={5} className={closed ? 'fill-grn' : 'fill-mut'} />
    <text x={x + 30} y={238} className={`font-num text-cap font-semibold ${closed ? 'fill-grn' : 'fill-mut'}`}>{text}</text>
  </>
);

const ProbeWire = ({ lit }) => {
  // Unknown reads as neither: both halves as drawn.
  const open = lit === null ? '' : (lit ? 'opacity-30' : '');
  const closed = lit === null ? '' : (lit ? '' : 'opacity-30');
  return (
    <svg viewBox="0 0 440 280" role="img" aria-label={t('probe.wire.picture')} className="mx-auto block w-full max-w-md rounded-ctl border border-line bg-panel">
      <path d="M220.5 0 V280" className="stroke-line" strokeWidth={1} />
      <g className={open}>
        <path d="M62 178 C 48 178, 44 202, 30 202 C 14 202, 10 182, 14 152 C 18 120, 12 100, 22 90 C 30 82, 44 78, 58 78" className="stroke-ink" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={70} y={170} width={80} height={16} className="fill-accS stroke-acc" strokeWidth={2} />
        <Tool x={100} />
        <Clip x={100} />
        <rect x={62} y={174} width={8} height={8} rx={1} className="fill-field stroke-ink" strokeWidth={2} />
        <Pill x={24} closed={false} text={t('probe.wire.open')} />
        <text x={110} y={270} textAnchor={MIDDLE} className="fill-mut text-note">{t('probe.wire.before')}</text>
      </g>
      <g className={closed}>
        <path d="M282 128 C 266 128, 262 152, 248 152 C 232 152, 230 132, 234 112 C 238 96, 240 88, 250 83 C 258 79, 266 78, 278 78" className="stroke-ink" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={290} y={120} width={80} height={16} className="fill-accS stroke-acc" strokeWidth={2} />
        <Tool x={320} />
        <Clip x={320} />
        <rect x={282} y={124} width={8} height={8} rx={1} className="fill-field stroke-ink" strokeWidth={2} />
        <circle cx={330} cy={120} r={4.5} className="fill-grn" />
        <path d="M330 178 V154" className="stroke-acc" strokeWidth={2.5} />
        <path d="M322 155 H338 L330 142 Z" className="fill-acc stroke-acc" strokeWidth={1.5} strokeLinejoin="round" />
        <text x={344} y={168} className="fill-acc text-cap">{t('probe.wire.touch')}</text>
        <Pill x={244} closed text={t('probe.wire.closed')} />
        <text x={330} y={270} textAnchor={MIDDLE} className="fill-mut text-note">{t('probe.wire.after')}</text>
      </g>
    </svg>
  );
};

export default ProbeWire;
