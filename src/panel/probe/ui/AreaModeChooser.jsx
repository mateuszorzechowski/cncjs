import { t } from '../../i18n/index';

/*
 * How the height map's area is given, as a tile each with its pictogram
 * (review notes, 2026-10-02): the area's outline dashed in all of them; a
 * corner and a size — the corner a dot, each side's length an arrow with a
 * head at both ends; a centre and a size — the dot in the middle; two
 * corners — a dot on each end of the diagonal; the program — its toolpath
 * inside its extent.
 */
const Frame = () => (
  <rect x={8} y={10} width={32} height={26} className="fill-accS stroke-acc" strokeWidth={1.6} strokeDasharray="3 2" />
);

// Each side's length, off the frame's sides: under it and left of it, a head at both ends.
const Lengths = () => (
  <>
    <path d="M11 42 H37 M2 33 V13" className="stroke-mut" strokeWidth={1.2} />
    <path d="M12 40 L8 42 L12 44 Z M36 40 L40 42 L36 44 Z M0 14 L2 10 L4 14 Z M0 32 L2 36 L4 32 Z" className="fill-mut" />
  </>
);

const Point = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-14 w-16 overflow-visible">
    <Frame />
    <Lengths />
    <circle cx={8} cy={36} r={3} className="fill-acc" />
  </svg>
);

const Centre = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-14 w-16 overflow-visible">
    <Frame />
    <Lengths />
    <circle cx={24} cy={23} r={3} className="fill-acc" />
  </svg>
);

const Corners = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-14 w-16 overflow-visible">
    <Frame />
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
  centre: { Picture: Centre, key: 'probe.map.mode.centre', note: 'probe.map.mode.centreNote' },
  corners: { Picture: Corners, key: 'probe.map.mode.corners', note: 'probe.map.mode.cornersNote' },
  program: { Picture: Program, key: 'probe.map.mode.program', note: 'probe.map.mode.programNote' },
};

const AreaModeChooser = ({ modes, value, onChange }) => (
  <div className="grid gap-3 @3xl/shell:grid-cols-4" role="group" aria-label={t('probe.map.area')}>
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
          <span className="text-base font-semibold text-ink">{t(key)}</span>
          <span className="text-note text-mut">{t(note)}</span>
        </button>
      );
    })}
  </div>
);

export default AreaModeChooser;
