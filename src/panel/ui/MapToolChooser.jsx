import { MAP_TOOLS } from '../machine/probe';
import { t } from '../i18n';

/*
 * What touches the height map's points, as a tile each (Mateusz, 2026-10-02):
 * the tool on the board's copper, its lead clipped on, or a 3D probe — each
 * drawn as the probe's pictograms draw them, the accent where it touches.
 */
const Board = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-20 w-24 overflow-visible">
    <path d="M4 38 Q24 34 44 38 V44 H4 Z" className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M4 38 Q24 34 44 38" className="stroke-acc" fill="none" strokeWidth={1.6} />
    <path d="M20.5 9 H27.5 V19.4 L24 25.5 L20.5 19.4 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M27.5 14 Q36 14 38 24 T42 36" className="stroke-mut" fill="none" strokeWidth={1.2} />
    <path d="M20 28 H28 L24 33 Z" className="fill-acc" />
  </svg>
);

const Probe = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-20 w-24 overflow-visible">
    <path d="M4 38 Q24 34 44 38 V44 H4 Z" className="fill-mutS stroke-line" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M19 3 H29 V15 L26 18 H22 L19 15 Z" className="fill-field stroke-ink" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M24 18 V27" className="stroke-ink" strokeWidth={1.6} />
    <circle cx={24} cy={29} r={2.6} className="fill-field stroke-ink" strokeWidth={1.6} />
    <path d="M20.5 32 H27.5 L24 35.5 Z" className="fill-acc" />
  </svg>
);

const PICTURES = { board: Board, probe: Probe };

const MapToolChooser = ({ value, onChange }) => (
  <div className="grid gap-3 @3xl/shell:grid-cols-2" role="group" aria-label={t('probe.map.toolLabel')}>
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
