import { CORNERS } from '../machine/probe';
import { cornerSides } from '../machine/cornerCycle';
import { t } from '../i18n';

/**
 * Which corner of the work, picked on the work seen from above (the design's
 * 2a, 2026-09-29): a ring on each corner to tap, the plate in the one chosen,
 * with the two probes that will come at its walls and which way they go. The
 * design draws front-left; the others are it mirrored about the middle of
 * the work, x 220 and y 140.
 */

// SVG's word for text centred on its x.
const MIDDLE = 'middle';

// Each corner's point on the drawing.
const POINTS = {
  'back-left': [90, 60],
  'back-right': [350, 60],
  'front-left': [90, 220],
  'front-right': [350, 220],
};

// A probe's position, from outside a wall: the tool and the arrow into the wall.
const Probe = ({ at, arrow }) => (
  <>
    <circle cx={at[0]} cy={at[1]} r={10} className="fill-field stroke-ink" strokeWidth={2} />
    <path d={arrow} className="fill-acc" />
  </>
);

const Chosen = ({ corner }) => {
  const { flipX, flipY, dirs } = cornerSides(corner);
  const x = (v) => (flipX ? 440 - v : v);
  const y = (v) => (flipY ? 280 - v : v);
  // The words stay upright, so their baseline moves with the mirror rather than turning.
  const ty = (v) => (flipY ? 280 - v + 8 : v);
  const plate = { x: Math.min(x(80), x(160)), y: Math.min(y(150), y(230)) };
  // The two arrows into the walls, X from the side and Y from the front or back.
  const intoX = `M${x(67)} ${y(189.5)} L${x(78)} ${y(184)} L${x(67)} ${y(178.5)} Z`;
  const intoY = `M${x(131.5)} ${y(243)} L${x(126)} ${y(232)} L${x(120.5)} ${y(243)} Z`;
  return (
    <>
      <rect x={plate.x} y={plate.y} width={80} height={80} className="fill-accS stroke-acc" strokeWidth={2} />
      <path d={`M${x(90)} ${y(150)} V${y(220)} H${x(160)}`} className="stroke-acc" fill="none" strokeWidth={1.2} strokeDasharray="4 3" />
      <Probe at={[x(56), y(184)]} arrow={intoX} />
      <text x={x(56)} y={ty(164)} textAnchor={MIDDLE} className="fill-acc font-num text-cap font-semibold">{dirs[0]}</text>
      <Probe at={[x(126), y(254)]} arrow={intoY} />
      <text x={x(148)} y={ty(258)} textAnchor={MIDDLE} className="fill-acc font-num text-cap font-semibold">{dirs[1]}</text>
      <circle cx={x(125)} cy={y(185)} r={10} className="fill-field stroke-ink" strokeWidth={2} />
      <circle cx={x(125)} cy={y(185)} r={3} className="fill-acc" />
    </>
  );
};

const CornerChooser = ({ value, onChange }) => {
  const { dirs } = cornerSides(value);
  const name = CORNERS.find((c) => c.id === value);
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox="0 0 440 280" role="group" aria-label={t('probe.cornerLabel')} className="mx-auto block w-full max-w-lg rounded-ctl border border-line bg-panel">
        <rect x={90} y={60} width={260} height={160} className="fill-mutS stroke-line" strokeWidth={1.5} />
        <text x={220} y={144} textAnchor={MIDDLE} className="fill-mut text-cap">{t('probe.corner.work')}</text>
        <Chosen corner={value} />
        {CORNERS.map((c) => {
          const [cx, cy] = POINTS[c.id];
          const on = c.id === value;
          return (
            <g
              key={c.id}
              role="button"
              tabIndex={0}
              aria-label={t(c.key)}
              aria-pressed={on}
              onClick={() => onChange(c.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onChange(c.id);
                }
              }}
              className="cursor-pointer outline-none"
            >
              <circle cx={cx} cy={cy} r={22} className="fill-transparent" />
              <circle cx={cx} cy={cy} r={7} className={on ? 'fill-acc stroke-acc' : 'fill-panel stroke-mut'} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-between gap-2">
        <span className="text-note font-semibold text-ink">{t('probe.corner.chosen', { name: name ? t(name.key) : '' })}</span>
        <span className="font-num text-note text-acc">{t('probe.corner.dirs', { x: dirs[0], y: dirs[1] })}</span>
      </div>
      <p className="m-0 text-note text-mut">{t('probe.corner.pickHow')}</p>
    </div>
  );
};

export default CornerChooser;
