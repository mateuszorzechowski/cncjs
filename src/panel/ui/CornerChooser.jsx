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

// Each probe from outside a wall as a label: a small solid drop whose point touches the wall
// it goes into, and in its white middle the way it goes, X+ or Y− (review notes, 2026-09-30:
// *"łezka"*, *"delikatniejsze, lite … w środku białe kółko ma X+"*).
const DROP = 13;
const TIP = 21;
const Probe = ({ wall, angle, dir }) => {
  const rad = (angle * Math.PI) / 180;
  const cx = wall[0] - TIP * Math.cos(rad);
  const cy = wall[1] - TIP * Math.sin(rad);
  const c = DROP / TIP;
  const s = Math.sqrt(1 - c * c);
  const drop = `M${cx + TIP} ${cy} L${cx + DROP * c} ${cy - DROP * s} A${DROP} ${DROP} 0 1 0 ${cx + DROP * c} ${cy + DROP * s} Z`;
  return (
    <>
      <path d={drop} transform={`rotate(${angle} ${cx} ${cy})`} className="fill-acc" />
      <circle cx={cx} cy={cy} r={10.5} className="fill-surf" />
      <text x={cx} y={cy + 2.8} textAnchor={MIDDLE} fontSize={8} className="fill-acc font-num font-semibold">{dir}</text>
    </>
  );
};

const Chosen = ({ corner }) => {
  const { flipX, flipY, dirs } = cornerSides(corner);
  const x = (v) => (flipX ? 440 - v : v);
  const y = (v) => (flipY ? 280 - v : v);
  const plate = { x: Math.min(x(80), x(160)), y: Math.min(y(150), y(230)) };
  return (
    <>
      <rect x={plate.x} y={plate.y} width={80} height={80} className="fill-accS stroke-acc" strokeWidth={2} />
      <path d={`M${x(90)} ${y(150)} V${y(220)} H${x(160)}`} className="stroke-acc" fill="none" strokeWidth={1.2} strokeDasharray="4 3" />
      {/* Into the walls: X from the side, Y from the front or back. */}
      <Probe wall={[x(80), y(184)]} angle={flipX ? 180 : 0} dir={dirs[0]} />
      <Probe wall={[x(126), y(230)]} angle={flipY ? 90 : -90} dir={dirs[1]} />
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
              {/* The tap target, well past the ring: about 64 px across on a phone (review note, 2026-09-30). */}
              <circle cx={cx} cy={cy} r={40} className="fill-transparent" />
              <circle cx={cx} cy={cy} r={7} className={on ? 'fill-acc stroke-acc' : 'fill-panel stroke-mut'} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {/* The corner and its directions together, under the drawing they describe
        * (review note, 2026-09-29: the directions far off at the right read as
        * something else). */}
      <p className="m-0 flex flex-wrap items-baseline justify-center gap-x-3 text-center">
        <span className="text-base font-semibold text-ink">{t('probe.corner.chosen', { name: name ? t(name.key) : '' })}</span>
        <span className="font-num text-base font-semibold text-acc">{t('probe.corner.dirs', { x: dirs[0], y: dirs[1] })}</span>
      </p>
      <p className="m-0 text-center text-note text-mut">{t('probe.corner.pickHow')}</p>
    </div>
  );
};

export default CornerChooser;
