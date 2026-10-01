import { Contact } from './probeDraw';
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
    <path d={`M${x} 28 H${x + 20} V102.7 L${x + 10} 120 L${x} 102.7 Z`} className="fill-field stroke-ink" strokeWidth={2} strokeLinejoin="round" />
  </>
);

const Pill = ({ x, closed, text }) => (
  <>
    <rect x={x} y={220} width={172} height={28} rx={14} className={`fill-panel ${closed ? 'stroke-grn' : 'stroke-line'}`} strokeWidth={closed ? 1.5 : 1} />
    <circle cx={x + 18} cy={234} r={5} className={closed ? 'fill-grn' : 'fill-mut'} />
    <text x={x + 30} y={238} className={`font-num text-cap font-semibold ${closed ? 'fill-grn' : 'fill-mut'}`}>{text}</text>
  </>
);

/*
 * The plate the lead goes to, its top at `y`: flat for the Z plate; for the
 * L plate the design's side view (1f) — a block, and dashed inside it the
 * corner of the work it sits over (review notes, 2026-09-29).
 */
const FlatPlate = ({ x, y }) => (
  <rect x={x} y={y} width={80} height={16} className="fill-accS stroke-acc" strokeWidth={2} />
);

const LPlate = ({ x, y }) => (
  <>
    <rect x={x} y={y} width={80} height={36} className="fill-accS stroke-acc" strokeWidth={2} />
    <path d={`M${x + 80} ${y + 16} H${x + 9} V${y + 36}`} className="stroke-acc" fill="none" strokeWidth={1.5} strokeDasharray="5 4" />
  </>
);

const PLATES = { flat: FlatPlate, l: LPlate };

const Plate = ({ kind, x, y }) => {
  const Shape = PLATES[kind] || FlatPlate;
  return <Shape x={x} y={y} />;
};

// Where the probe's lamp sits on its body.
const LAMP_Y = 56;

/*
 * A 3D probe in the holder, its stylus and ball under it, and its lead off
 * to the side; `tilt` the stylus deflected, in degrees about where it leaves
 * the body, and its lamp.
 */
const Stylus = ({ x, tilt = 0 }) => (
  <>
    <path d={`M${x + 18} 62 C ${x + 44} 62, ${x + 40} 30, ${x + 70} 24`} className="stroke-ink" fill="none" strokeWidth={2} strokeLinecap="round" />
    <rect x={x - 10} y={14} width={20} height={22} className="fill-field stroke-ink" strokeWidth={2} />
    <rect x={x - 20} y={36} width={40} height={72} rx={6} className="fill-field stroke-ink" strokeWidth={2} />
    {/* The probe's lamp, dark; lit, the touch's dot stands in it. */}
    <circle cx={x} cy={LAMP_Y} r={5} className="fill-field stroke-ink" strokeWidth={1.5} />
    <g transform={`rotate(${tilt} ${x} 108)`}>
      <path d={`M${x} 108 V172`} className="stroke-ink" strokeWidth={3} />
      <circle cx={x} cy={180} r={8} className="fill-field stroke-ink" strokeWidth={2} />
    </g>
  </>
);

// The finger pushing the ball aside: a rounded tip coming in from the right.
const Finger = ({ x, y }) => (
  <path d={`M${x + 70} ${y - 13} H${x + 13} A13 13 0 0 0 ${x + 13} ${y + 13} H${x + 70}`} className="fill-surf stroke-ink" strokeWidth={2} strokeLinejoin="round" />
);

// Away from the finger, which comes from the right: it pushes the ball left.
const TILT = 14;

/*
 * A 3D probe's test (Mateusz, 2026-10-01): at rest on the left, its tip
 * pushed aside by a finger on the right — the probe opens or closes there.
 */
const ProbeHalves = ({ open, closed }) => {
  // Where the ball is with the stylus tilted.
  const bx = 330 - 72 * Math.sin((TILT * Math.PI) / 180);
  return (
    <>
      <g className={open}>
        <Stylus x={110} />
        <Pill x={24} closed={false} text={t('probe.wire.open')} />
        <text x={110} y={270} textAnchor={MIDDLE} className="fill-mut text-note">{t('probe.wire.atRest')}</text>
      </g>
      <g className={closed}>
        <Stylus x={330} tilt={TILT} />
        <Finger x={bx + 8} y={178} />
        <Contact x={330} y={LAMP_Y} r={4.5} />
        <path d={`M${bx + 70} 204 H${bx + 30}`} className="stroke-acc" strokeWidth={2.5} />
        <path d={`M${bx + 31} 196 V212 L${bx + 18} 204 Z`} className="fill-acc stroke-acc" strokeWidth={1.5} strokeLinejoin="round" />
        <Pill x={244} closed text={t('probe.wire.closed')} />
        <text x={330} y={270} textAnchor={MIDDLE} className="fill-mut text-note">{t('probe.wire.deflected')}</text>
      </g>
    </>
  );
};

/* The plate's test: the clip on the tool, the plate on its lead — apart, then touching. */
const PlateHalves = ({ open, closed, plate }) => (
  <>
      <g className={open}>
        <path d="M62 178 C 48 178, 44 202, 30 202 C 14 202, 10 182, 14 152 C 18 120, 12 100, 22 90 C 30 82, 44 78, 58 78" className="stroke-ink" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Plate kind={plate} x={70} y={170} />
        <Tool x={100} />
        <Clip x={100} />
        <rect x={62} y={174} width={8} height={8} rx={1} className="fill-field stroke-ink" strokeWidth={2} />
        <Pill x={24} closed={false} text={t('probe.wire.open')} />
        <text x={110} y={270} textAnchor={MIDDLE} className="fill-mut text-note">{t('probe.wire.before')}</text>
      </g>
      <g className={closed}>
        <path d="M282 128 C 266 128, 262 152, 248 152 C 232 152, 230 132, 234 112 C 238 96, 240 88, 250 83 C 258 79, 266 78, 278 78" className="stroke-ink" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Plate kind={plate} x={290} y={120} />
        <Tool x={320} />
        <Clip x={320} />
        <rect x={282} y={124} width={8} height={8} rx={1} className="fill-field stroke-ink" strokeWidth={2} />
        <Contact x={330} y={120} r={4.5} />
        <path d="M330 204 V176" className="stroke-acc" strokeWidth={2.5} />
        <path d="M322 177 H338 L330 164 Z" className="fill-acc stroke-acc" strokeWidth={1.5} strokeLinejoin="round" />
        <text x={344} y={194} className="fill-acc text-cap">{t('probe.wire.touch')}</text>
        <Pill x={244} closed text={t('probe.wire.closed')} />
        <text x={330} y={270} textAnchor={MIDDLE} className="fill-mut text-note">{t('probe.wire.after')}</text>
      </g>
  </>
);

const ProbeWire = ({ lit, plate = 'flat' }) => {
  // Unknown reads as neither: both halves as drawn.
  const open = lit === null ? '' : (lit ? 'opacity-30' : '');
  const closed = lit === null ? '' : (lit ? '' : 'opacity-30');
  const probe = plate === 'probe';
  return (
    <svg viewBox="0 0 440 280" role="img" aria-label={t(probe ? 'probe.wire.probePicture' : 'probe.wire.picture')} className="mx-auto block w-full max-w-sm rounded-ctl border border-line bg-panel">
      <path d="M220.5 0 V280" className="stroke-line" strokeWidth={1} />
      {probe ? <ProbeHalves open={open} closed={closed} /> : <PlateHalves open={open} closed={closed} plate={plate} />}
    </svg>
  );
};

export default ProbeWire;
