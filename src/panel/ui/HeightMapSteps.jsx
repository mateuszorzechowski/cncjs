import { useState } from 'react';
import MapStartScene from './MapStartScene';
import MapPreview3D from './MapPreview3D';
import SegmentedChoice from './SegmentedChoice';
import Slider from './Slider';
import useBentProgram from './useBentProgram';
import StatTile from './StatTile';
import { phaseWords } from '../machine/probe';
import { figureSaid } from '../machine/probeFields';
import { useUnits } from './units';
import { t } from '../i18n';

/*
 * The height map's drawings past its Setup (Mateusz, 2026-10-02): the tool
 * over the first point, the points as the server goes through them, and the
 * surface it found.
 */

const signed = (text) => (text.startsWith('-') ? text : `+${text}`);

/** Into place: only the height counts — over the clamps, under the limit (`MapStartScene`). */
export const HeightMapPosition = ({ choice, texts }) => {
  const units = useUnits();
  return (
    <MapStartScene
      maxZ={figureSaid('maxZ', texts?.maxZ ?? '', units.rule)}
      tool={choice}
      label={t('probe.map.startDrawing')}
      className="w-full max-w-md self-center rounded-ctl border border-line bg-panel"
    />
  );
};

// How much the heights are brought out in 3D: a step on the slider, kept from the measuring to the result.
const SCALES = [1, 2, 5, 10, 20, 50, 100, 200];
// How the sheet is drawn (Mateusz, 2026-10-03): smooth through the points, and in the heatmap's colours; either, both or neither.
const LOOKS = ['smooth', 'heat'];
const LOOK_WORDS = { smooth: 'probe.map.smooth', heat: 'probe.map.heat' };
const kept = { scale: 20, looks: [] };

/**
 * The height map on the machine in 3D, the same while it is measured and once
 * it is (Mateusz, 2026-10-03: "pomiar i wynik to praktycznie te same
 * widoki"): the area, its points filled as each is measured, the sheet raised
 * by the heights times the scale on the slider and shaded by them, the tool
 * where it is; under it the lowest point, the highest and the spread so far.
 * `heights` is `{ heights: [{ i, j, dz }], low, high }`, or null; `children`
 * goes between the drawing and the figures.
 */
const HeightMapView = ({
  probe, machine, done, heights, bent = null, children = null,
}) => {
  const units = useUnits();
  const [scale, setScale] = useState(kept.scale);
  const [looks, setLooks] = useState(kept.looks);
  const options = probe?.options;
  if (!options?.x) {
    return null;
  }
  const said = (mm) => (heights ? signed(units.figure(mm)) : '—');
  return (
    <div className="flex flex-col gap-3">
      <MapPreview3D
        machine={machine}
        grid={{ xs: options.x, ys: options.y, nx: options.nx, ny: options.ny }}
        done={done}
        heights={heights}
        scale={scale}
        smooth={looks.includes('smooth')}
        heat={looks.includes('heat')}
        bent={bent}
        className="h-64 @3xl/shell:h-80"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Slider
          steps={SCALES}
          value={scale}
          onChange={(next) => {
            kept.scale = next;
            setScale(next);
          }}
          label={t('probe.map.scale')}
          say={(value) => `×${value}`}
          className="min-w-64 flex-1"
        />
        <SegmentedChoice
          options={LOOKS}
          isOn={(one) => looks.includes(one)}
          onChange={(one) => {
            const next = looks.includes(one) ? looks.filter((other) => other !== one) : [...looks, one];
            kept.looks = next;
            setLooks(next);
          }}
          format={(one) => t(LOOK_WORDS[one])}
          label={t('probe.map.look')}
          compact
        />
      </div>
      {children}
      <div className="grid gap-2 @3xl/shell:grid-cols-3">
        <StatTile label={t('probe.map.low')} value={said(heights?.low)} unit={units.length} />
        <StatTile label={t('probe.map.high')} value={said(heights?.high)} unit={units.length} />
        <StatTile label={t('probe.map.spread')} value={heights ? units.figure(heights.high - heights.low) : '—'} unit={units.length} />
      </div>
    </div>
  );
};

/** Measuring: the view, with which point the tool is at and what it is doing there. */
export const HeightMapCycle = ({ probe, machine }) => {
  const marks = probe?.marks || [];
  const at = marks.length ? marks[marks.length - 1] : null;
  const total = (probe?.options?.nx || 0) * (probe?.options?.ny || 0);
  // What the tool is doing at the point: its phase, said on Z (`p3-fast` is the fast touch).
  const doing = phaseWords(String(probe?.step?.phase || '').replace(/^p\d+/, 'z'));
  return (
    <HeightMapView probe={probe} machine={machine} done={marks.slice(0, -1)} heights={probe?.partial}>
      <StatTile
        label={at ? t('probe.map.point', { n: at.n + 1, total }) : t('probe.step.measure')}
        value={probe?.step ? t(doing.key, { axis: doing.axis }) : '—'}
      />
    </HeightMapView>
  );
};

/** Measured: the same view, every point filled, the map's own heights. */
export const HeightMapResult = ({ probe, machine }) => {
  const {
    xs, ys, dz, low, high,
  } = probe.result.map;
  const heights = { heights: ys.flatMap((y, j) => xs.map((x, i) => ({ i, j, dz: dz[j][i] }))), low, high };
  // The loaded program bent by this map, as the server has it before the map is kept.
  const bent = useBentProgram({
    machine, of: 'result', enabled: true, key: JSON.stringify([xs, ys, low, high, machine.gcode?.name]),
  });
  return (
    <div className="flex flex-col gap-3">
      <HeightMapView probe={probe} machine={machine} done={heights.heights} heights={heights} bent={bent} />
      <p className="m-0 text-note text-mut">{t('probe.map.note')}</p>
    </div>
  );
};
