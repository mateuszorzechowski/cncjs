import { t } from '../i18n';

/*
 * How the height map's area is given, as a tile each with its pictogram
 * (review note #3, 2026-10-02): a corner and a size — the corner a dot, the
 * size two arrows; two corners — a dot on each end of the diagonal; the
 * program — its toolpath inside its extent.
 */
const Frame = ({ dashed = false }) => (
  <rect x={8} y={10} width={32} height={26} className="fill-accS stroke-acc" strokeWidth={1.6} strokeDasharray={dashed ? '3 2' : undefined} />
);

const Point = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-14 w-16 overflow-visible">
    <Frame />
    {/* The size off the frame's sides, from the corner, so the frame hides neither (review note, 2026-10-02). */}
    <path d="M8 42 H36 M2 36 V14" className="stroke-mut" strokeWidth={1.2} />
    <path d="M36 40 L40 42 L36 44 Z M0 14 L2 10 L4 14 Z" className="fill-mut" />
    <circle cx={8} cy={36} r={3} className="fill-acc" />
  </svg>
);

const Corners = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-14 w-16 overflow-visible">
    <Frame dashed />
    <path d="M8 36 L40 10" className="stroke-mut" strokeWidth={1.2} strokeDasharray="3 2" />
    <circle cx={8} cy={36} r={3} className="fill-acc" />
    <circle cx={40} cy={10} r={3} className="fill-acc" />
  </svg>
);

const Program = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-14 w-16 overflow-visible">
    <Frame />
    <path d="M12 31 H22 V16 H36 V27 H28" className="stroke-ink" fill="none" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

const TILES = {
  point: { Picture: Point, key: 'probe.map.mode.point', note: 'probe.map.mode.pointNote' },
  corners: { Picture: Corners, key: 'probe.map.mode.corners', note: 'probe.map.mode.cornersNote' },
  program: { Picture: Program, key: 'probe.map.mode.program', note: 'probe.map.mode.programNote' },
};

const AreaModeChooser = ({ modes, value, onChange }) => (
  // One row on a phone too: three small tiles, their notes only where there is room.
  <div className="grid grid-cols-3 gap-2 @3xl/shell:gap-3" role="group" aria-label={t('probe.map.area')}>
    {modes.map((mode) => {
      const { Picture, key, note } = TILES[mode];
      const on = mode === value;
      return (
        <button
          key={mode}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(mode)}
          className={`flex flex-col items-center gap-2 rounded-ctl border p-3 text-center ${on ? 'border-acc bg-accS' : 'border-line bg-field hover:border-acc'}`}
        >
          <Picture />
          <span className="text-note font-semibold text-ink @3xl/shell:text-base">{t(key)}</span>
          <span className="hidden text-note text-mut @3xl/shell:block">{t(note)}</span>
        </button>
      );
    })}
  </div>
);

export default AreaModeChooser;
