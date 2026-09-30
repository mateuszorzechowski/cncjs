import ProbeDrop from './ProbeDrop';
import { EDGES } from '../machine/probe';
import { t } from '../i18n';

/**
 * Which surface the paper finds, picked on the work seen from above, the way
 * the corner is (`CornerChooser`; review note, 2026-09-30: *"ten wybór do
 * ekranu wcześniej, podobnie jak to jest w xyz … uwzględniając tylko jeden
 * bok albo górę"*): a ring on each side and one in the middle for the top;
 * the one chosen shows the sheet on it and the way the tool comes — into a
 * side as the corner's drops do, down onto the top as the tool from above.
 */

const MIDDLE = 'middle';
// The way the tool comes onto the top.
const DOWN = 'Z−';

// The work, as the corner's drawing has it.
const WORK = {
  x: 90, y: 60, w: 260, h: 160,
};

// Each surface: its ring, the sheet on it, and where the tool touches it and from which way.
const SURFACES = {
  z: { ring: [220, 140], sheet: [190, 110, 60, 60] },
  'x-left': {
    ring: [90, 140], sheet: [83, 105, 7, 70], wall: [83, 140], angle: 0, dir: 'X+',
  },
  'x-right': {
    ring: [350, 140], sheet: [350, 105, 7, 70], wall: [357, 140], angle: 180, dir: 'X−',
  },
  'y-front': {
    ring: [220, 220], sheet: [185, 220, 70, 7], wall: [220, 227], angle: -90, dir: 'Y+',
  },
  'y-back': {
    ring: [220, 60], sheet: [185, 53, 70, 7], wall: [220, 53], angle: 90, dir: 'Y−',
  },
};

const Chosen = ({ edge }) => {
  const one = SURFACES[edge];
  const [x, y, w, h] = one.sheet;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} className="fill-plate stroke-plateEdge" strokeWidth={1.5} />
      {one.wall ? (
        <ProbeDrop wall={one.wall} angle={one.angle} dir={one.dir} />
      ) : (
        // The top: the tool from above over the sheet, and the way it comes.
        <>
          <circle cx={one.ring[0]} cy={one.ring[1]} r={16} className="fill-field stroke-ink" strokeWidth={2} />
          <text x={one.ring[0]} y={one.ring[1] + 34} textAnchor={MIDDLE} fontSize={12} className="fill-acc font-num font-semibold">{DOWN}</text>
        </>
      )}
    </>
  );
};

const PaperChooser = ({ value, onChange }) => {
  const chosen = EDGES.find((edge) => edge.id === value);
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox="0 0 440 280" role="group" aria-label={t('probe.edgeLabel')} className="mx-auto block w-full max-w-lg rounded-ctl border border-line bg-panel">
        <rect x={WORK.x} y={WORK.y} width={WORK.w} height={WORK.h} className="fill-mutS stroke-line" strokeWidth={1.5} />
        <text x={220} y={96} textAnchor={MIDDLE} className="fill-mut text-cap">{t('probe.corner.work')}</text>
        <Chosen edge={value} />
        {EDGES.map((edge) => {
          const [cx, cy] = SURFACES[edge.id].ring;
          const on = edge.id === value;
          return (
            <g
              key={edge.id}
              role="button"
              tabIndex={0}
              aria-label={t(edge.key)}
              aria-pressed={on}
              onClick={() => onChange(edge.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onChange(edge.id);
                }
              }}
              className="cursor-pointer outline-none"
            >
              {/* The corner's tap target, well past the ring. */}
              <circle cx={cx} cy={cy} r={36} className="fill-transparent" />
              <circle cx={cx} cy={cy} r={7} className={on ? 'fill-acc stroke-acc' : 'fill-panel stroke-mut'} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      <p className="m-0 text-center text-base font-semibold text-ink">{t('probe.paper.chosen', { name: chosen ? t(chosen.key) : '' })}</p>
      <p className="m-0 text-center text-note text-mut">{t('probe.paper.pickHow')}</p>
    </div>
  );
};

export default PaperChooser;
