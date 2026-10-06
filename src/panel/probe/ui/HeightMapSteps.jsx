import { useState } from 'react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Notice from '../../ui/Notice';
import MapStartScene from './MapStartScene';
import MapPreview3D from './MapPreview3D';
import SegmentedChoice from '../../ui/SegmentedChoice';
import Slider from './Slider';
import useBentProgram from '../../ui/useBentProgram';
import StatTile from '../../ui/StatTile';
import { phaseWords, resumeProbe } from '../machine/probe';
import { figureSaid } from '../machine/probeFields';
import { keepMapLook, mapLook } from './mapLook';
import { useIsWide } from '../../ui/shell';
import { useUnits } from '../../ui/units';
import { t } from '../../i18n/index';

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

// How much the heights are brought out in 3D: a step on the slider, kept on this device (`mapLook`).
const SCALES = [1, 2, 5, 10, 20, 50, 100, 200];
/*
 * How the sheet is drawn (Mateusz, 2026-10-03): smooth through the points, in
 * the heatmap's colours, opaque, its grid's lines, with contours; and the
 * program as written faint under the bent one, where there is a bent one.
 * Any of them; the grid on to begin with.
 */
const LOOKS = ['smooth', 'heat', 'solid', 'gridLines', 'contours', 'before'];
const LOOK_WORDS = {
  smooth: 'probe.map.smooth', heat: 'probe.map.heat', solid: 'probe.map.solid', gridLines: 'probe.map.gridLines', contours: 'probe.map.contours', before: 'probe.map.before',
};

/**
 * The height map on the machine in 3D, the same while it is measured and once
 * it is (Mateusz, 2026-10-03: "pomiar i wynik to praktycznie te same
 * widoki"): the area, its points filled as each is measured, the sheet raised
 * by the heights times the scale on the slider and shaded by them, the tool
 * where it is; under it the lowest point, the highest and the spread so far.
 * `heights` is `{ heights: [{ i, j, dz }], low, high }`, or null; `children`
 * goes between the drawing and the figures, `after` under them.
 *
 * `split(drawing, figures)`, where the screen has the width (Mateusz,
 * 2026-10-03): the drawing a column of its own, the full height, and the
 * figures in the other — the screen lays the two out.
 */
const HeightMapView = ({
  probe, machine, done, heights, bent = null, children = null, after = null, split = null,
}) => {
  const units = useUnits();
  const wide = useIsWide();
  const [scale, setScale] = useState(() => mapLook().scale);
  const [looks, setLooks] = useState(() => mapLook().looks);
  const options = probe?.options;
  if (!options?.x) {
    return null;
  }
  const said = (mm) => (heights ? signed(units.figure(mm)) : '—');
  // On the drawing, behind its own glyph (Mateusz, 2026-10-03): the scale and the looks.
  const look = (
    <>
      <Slider
        steps={SCALES}
        value={scale}
        onChange={(next) => {
          keepMapLook({ scale: next });
          setScale(next);
        }}
        label={t('probe.map.scale')}
        say={(value) => `×${value}`}
        className="w-full"
      />
      <SegmentedChoice
        options={bent ? LOOKS : LOOKS.filter((one) => one !== 'before')}
        isOn={(one) => looks.includes(one)}
        onChange={(one) => {
          const next = looks.includes(one) ? looks.filter((other) => other !== one) : [...looks, one];
          keepMapLook({ looks: next });
          setLooks(next);
        }}
        format={(one) => t(LOOK_WORDS[one])}
        label={t('probe.map.look')}
        columns={2}
        compact
      />
    </>
  );
  const figures = (
    <>
      {children}
      <div className={`grid gap-2 ${split ? '' : '@3xl/shell:grid-cols-3'}`}>
        <StatTile label={t('probe.map.low')} value={said(heights?.low)} unit={units.length} />
        <StatTile label={t('probe.map.high')} value={said(heights?.high)} unit={units.length} />
        <StatTile label={t('probe.map.spread')} value={heights ? units.figure(heights.high - heights.low) : '—'} unit={units.length} />
      </div>
      {after}
    </>
  );
  let height = wide ? 'h-80 @3xl/shell:h-96' : 'h-80 @3xl/shell:h-[28rem]';
  if (split) {
    height = 'min-h-80 flex-1';
  }
  const drawing = (
      <MapPreview3D
        machine={machine}
        grid={{ xs: options.x, ys: options.y, nx: options.nx, ny: options.ny }}
        done={done}
        heights={heights}
        scale={scale}
        smooth={looks.includes('smooth')}
        heat={looks.includes('heat')}
        solid={looks.includes('solid')}
        gridLines={looks.includes('gridLines')}
        contours={looks.includes('contours')}
        before={looks.includes('before')}
        bent={bent}
        look={look}
        // A tablet's keys are a finger's (`IconBar`): its column of them, the views open, needs the taller drawing.
        className={height}
      />
  );
  if (split) {
    return split(drawing, figures);
  }
  return (
    <div className="flex flex-col gap-3">
      {drawing}
      {figures}
    </div>
  );
};

/**
 * Measuring: the view, with which point the tool is at and what it is doing
 * there — and, with the Z plate, where the machine stands for it to be put
 * under the tool: what to do, and the button that goes on once it is done.
 */
export const HeightMapCycle = ({ probe, machine, after = null, split = null }) => {
  const marks = probe?.marks || [];
  const at = marks.length ? marks[marks.length - 1] : null;
  const total = (probe?.options?.nx || 0) * (probe?.options?.ny || 0);
  // What the tool is doing at the point: its phase, said on Z (`p3-fast` is the fast touch).
  const doing = phaseWords(String(probe?.step?.phase || '').replace(/^p\d+/, 'z'));
  return (
    <HeightMapView probe={probe} machine={machine} done={marks.slice(0, -1)} heights={probe?.partial} after={after} split={split}>
      <StatTile
        label={at ? t('probe.map.point', { n: at.n + 1, total }) : t('probe.step.measure')}
        value={probe?.step ? t(doing.key, { axis: doing.axis }) : '—'}
      />
      {probe?.step?.waits && at ? (
        <div className="flex flex-col gap-2">
          <Notice>{t('probe.map.placeAsk', { n: at.n + 1 })}</Notice>
          <Button tone="primary" onClick={resumeProbe} className="h-ctl">{t('probe.map.placed')}</Button>
        </div>
      ) : null}
    </HeightMapView>
  );
};

/** Measured: the same view, every point filled, the map's own heights. */
export const HeightMapResult = ({ probe, machine, split = null }) => {
  const {
    xs, ys, dz, low, high,
  } = probe.result.map;
  const heights = { heights: ys.flatMap((y, j) => xs.map((x, i) => ({ i, j, dz: dz[j][i] }))), low, high };
  // The loaded program bent by this map, as the server has it before the map is kept.
  const bent = useBentProgram({
    machine, of: 'result', enabled: true, key: JSON.stringify([xs, ys, low, high, machine.gcode?.name]),
  });
  const note = <p className="m-0 text-note text-mut">{t('probe.map.note')}</p>;
  if (split) {
    return <HeightMapView probe={probe} machine={machine} done={heights.heights} heights={heights} bent={bent} after={note} split={split} />;
  }
  return (
    <div className="flex flex-col gap-3">
      <HeightMapView probe={probe} machine={machine} done={heights.heights} heights={heights} bent={bent} />
      {note}
    </div>
  );
};

/**
 * Measuring or measured, where there is the width (Mateusz, 2026-10-03): the
 * drawing a card of its own, the full height, and the figures with the step's
 * buttons (`foot`) in a narrower one beside it.
 */
export const HeightMapColumns = ({
  measuring, probe, machine, foot,
}) => {
  const columns = (drawing, figures) => (
    <>
      <Card className="min-h-0 min-w-0 flex-[7_7_0]" bodyClassName="min-h-0 flex-1">{drawing}</Card>
      <Card scrolls className="min-h-0 min-w-0 flex-[3_3_0]" bodyClassName="gap-3">
        {figures}
        <div className="mt-auto">{foot}</div>
      </Card>
    </>
  );
  if (measuring) {
    // Not while it stands for the Z plate: then it does not go by itself.
    const note = probe?.step?.waits ? null : <p className="m-0 text-note text-mut">{t('probe.measure.note')}</p>;
    return <HeightMapCycle probe={probe} machine={machine} after={note} split={columns} />;
  }
  return <HeightMapResult probe={probe} machine={machine} split={columns} />;
};
