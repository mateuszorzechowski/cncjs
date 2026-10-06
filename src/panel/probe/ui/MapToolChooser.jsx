import { MAP_TOOLS } from '../machine/probe';
import { t } from '../../i18n/index';

/*
 * What touches the height map's points, as a tile each (Mateusz, 2026-10-02):
 * the tool on the board, or a 3D probe — drawn as the probe's pictograms draw
 * them (review notes #5–#7): the tool or the probe the Z plate's and the
 * hole's, the accent arrow as far under it as theirs, and the points of the
 * grid beside it, two each side, smaller arrows down onto the board.
 */
const BOARD = 'M2 40 Q24 36 46 40 V46 H2 Z';
// The board's top under each smaller arrow, and the arrows down onto it.
const POINTS = [5, 13, 35, 43];
// The board's top: the quadratic its outline is, X straight along it.
const topAt = (x) => {
  const u = (x - 2) / 44;
  return 40 - 8 * u * (1 - u);
};
const Points = () => POINTS.map((x) => <path key={x} d={`M${x - 2.4} ${topAt(x) - 3.6} H${x + 2.4} L${x} ${topAt(x) - 0.4} Z`} className="fill-acc" />);

const Board = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-20 w-24 overflow-visible">
    <path d={BOARD} className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M20.5 11 H27.5 V21.4 L24 27.5 L20.5 21.4 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M20 31.5 H28 L24 37 Z" className="fill-acc stroke-acc" strokeWidth={0.96} strokeLinejoin="round" />
    <Points />
  </svg>
);

const Probe = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-20 w-24 overflow-visible">
    <path d={BOARD} className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M19 3 H29 V15 L26 18 H22 L19 15 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M24 18 V23" className="stroke-ink" strokeWidth={1.6} />
    <circle cx={24} cy={25.6} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    <path d="M20 31.5 H28 L24 37 Z" className="fill-acc stroke-acc" strokeWidth={0.96} strokeLinejoin="round" />
    <Points />
  </svg>
);

// The tool over a Z plate lying on the board, among the points it is moved to.
const Plate = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-20 w-24 overflow-visible">
    <path d={BOARD} className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M20.5 3 H27.5 V13.4 L24 19.5 L20.5 13.4 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M20 22 H28 L24 27.5 Z" className="fill-acc stroke-acc" strokeWidth={0.96} strokeLinejoin="round" />
    <rect x={18} y={29.5} width={12} height={6} className="fill-plate stroke-plateEdge" strokeWidth={1.6} />
    <Points />
  </svg>
);

const PICTURES = { board: Board, probe: Probe, plate: Plate };

const MapToolChooser = ({ value, onChange }) => (
  <div className="grid gap-3 @3xl/shell:grid-cols-3" role="group" aria-label={t('probe.map.toolLabel')}>
    {MAP_TOOLS.map((tool) => {
      const Picture = PICTURES[tool.id];
      const on = tool.id === value;
      return (
        <button
          key={tool.id}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(tool.id)}
          className={`flex flex-col items-center gap-3 rounded-ctl border p-4 text-center ${on ? 'border-acc bg-accS' : 'border-line bg-field hover:border-acc'}`}
        >
          <Picture />
          <span className="text-base font-semibold text-ink">{t(tool.key)}</span>
          <span className="text-note text-mut">{t(tool.note)}</span>
        </button>
      );
    })}
  </div>
);

export default MapToolChooser;
