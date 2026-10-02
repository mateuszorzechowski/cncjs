import HeightMapGrid from './HeightMapGrid';
import MapPreview3D from './MapPreview3D';
import StatTile from './StatTile';
import { phaseWords } from '../machine/probe';
import { useUnits } from './units';
import { t } from '../i18n';

/*
 * The height map's drawings past its Setup (Mateusz, 2026-10-02): the tool
 * over the first point, the points as the server goes through them, and the
 * surface it found.
 */

const RAMP = ['bg-map0', 'bg-map1', 'bg-map2', 'bg-map3', 'bg-map4'];

const signed = (text) => (text.startsWith('-') ? text : `+${text}`);

/** Into place: the area, the tool's first point ringed. */
export const HeightMapPosition = ({ grid, outline }) => (grid?.xs ? (
  <HeightMapGrid
    area={{ x: [grid.xs[0], grid.xs[grid.xs.length - 1]], y: [grid.ys[0], grid.ys[grid.ys.length - 1]] }}
    nx={grid.nx}
    ny={grid.ny}
    outline={outline}
    at={{ i: 0, j: 0 }}
    label={t('probe.map.drawing')}
    className="mx-auto h-auto w-full max-w-md"
  />
) : null);

/**
 * Measuring, on the machine in 3D (Mateusz, 2026-10-03): the area and its
 * points — filled as each is measured — with the tool moving over them, and
 * which point it is at and what it is doing there.
 */
export const HeightMapCycle = ({ probe, machine }) => {
  const options = probe?.options;
  if (!options?.x) {
    return null;
  }
  const marks = probe.marks || [];
  const at = marks.length ? marks[marks.length - 1] : null;
  const total = options.nx * options.ny;
  // What the tool is doing at the point: its phase, said on Z (`p3-fast` is the fast touch).
  const doing = phaseWords(String(probe.step?.phase || '').replace(/^p\d+/, 'z'));
  return (
    <div className="flex flex-col gap-3">
      <MapPreview3D
        machine={machine}
        grid={{ xs: options.x, ys: options.y, nx: options.nx, ny: options.ny }}
        done={marks.slice(0, -1)}
        className="h-64 @3xl/shell:h-80"
      />
      <StatTile
        label={at ? t('probe.map.point', { n: at.n + 1, total }) : t('probe.step.measure')}
        value={probe.step ? t(doing.key, { axis: doing.axis }) : '—'}
      />
    </div>
  );
};

/** Measured: the surface, coloured low to high, and its lowest and highest point from the first. */
export const HeightMapResult = ({ map }) => {
  const units = useUnits();
  const { xs, ys, dz, low, high } = map;
  // Drawn where the program will be: the map is the machine's, the drawing only its shape.
  const area = { x: [xs[0], xs[xs.length - 1]], y: [ys[0], ys[ys.length - 1]] };
  return (
    <div className="flex flex-col gap-3">
      <HeightMapGrid area={area} nx={xs.length} ny={ys.length} heights={dz} low={low} high={high} label={t('probe.map.drawing')} className="mx-auto h-auto w-full max-w-md" />
      <div className="flex items-center justify-center gap-2 text-note text-mut">
        <span className="font-num">{signed(units.figure(low))}</span>
        {RAMP.map((face) => <span key={face} aria-hidden="true" className={`h-3 w-6 rounded-ctl ${face}`} />)}
        <span className="font-num">{signed(units.figure(high))}</span>
        <span>{units.length}</span>
      </div>
      <div className="grid gap-2 @3xl/shell:grid-cols-3">
        <StatTile label={t('probe.map.low')} value={signed(units.figure(low))} unit={units.length} />
        <StatTile label={t('probe.map.high')} value={signed(units.figure(high))} unit={units.length} />
        <StatTile label={t('probe.map.spread')} value={units.figure(high - low)} unit={units.length} />
      </div>
      <p className="m-0 text-note text-mut">{t('probe.map.note')}</p>
    </div>
  );
};
