import { useEffect, useId, useMemo, useState } from 'react';
import Scene from '../scene/Scene';
import WrittenPath from '../scene/WrittenPath';
import MapArea, { surfaceOf, tintOf } from '../scene/MapArea';
import { contourStep } from '../scene/contours';
import StageOptions from './StageOptions';
import { layerItems, viewItems } from './stageItems';
import { useUnits } from './units';
import { useSceneColors } from '../scene/colors';
import { composeScene, toolPoint } from '../scene/compose';
import { DEFAULT_VIEW } from '../scene/views';
import { workOffset } from '../machine/envelope';
import { readToolpath } from '../machine/toolpath';
import { t } from '../i18n';

/**
 * The height map's area on the machine, in 3D (Mateusz, 2026-10-02: the
 * Ścieżka's and the jog's scene, not a drawing of its own): the travel, the
 * loaded program's path, the work zero and the tool where it stands — so a
 * corner taken by jog is seen where it is — and the area with its points at
 * Z0 (`MapArea`). It turns and zooms.
 *
 * Framed on the area the first time it is drawn, and again when the area
 * changes — until the operator moves the camera: from then on it stays where
 * they put it, and comes back there on the next of these steps (Mateusz,
 * 2026-10-03: *"jak zmienię ustawienia kamery to nie przywracaj"*). The
 * scene's memory (`memory="map"`) keeps the pose between them.
 *
 * Its menu is the Ścieżka's (Mateusz, 2026-10-03): the four views, a frame
 * on the map's area, and the layers that are drawn here — the travel, the
 * program's path, the work zero. Measured, a tap on the sheet says the
 * height of the point nearest it, and a legend in the corner gives the
 * colours' range in figures.
 */

const NO_OFFSET = { x: 0, y: 0, z: 0 };

// Kept across these steps, as the camera is: the area last framed, whether the operator has moved the view since, the layers.
const framing = { area: null, moved: false, layers: { machineArea: true, path: true, wcsAxes: true } };

// The legend's colours: so many stops along the range — the sheet's own, at full strength, to be read.
const LEGEND_STOPS = 5;

const signed = (text) => (text.startsWith('-') ? text : `+${text}`);

const MapPreview3D = ({
  machine, grid, mode = null, done = [], heights = null, scale = 1, smooth = false, heat = false, solid = false, contours = false, before = false, gridLines = true, bent = null, className = '',
}) => {
  const colors = useSceneColors();
  const units = useUnits();
  const [fit, setFit] = useState(0);
  // A fit asked before the scene has drawn has no camera to move.
  const [ready, setReady] = useState(false);
  const [layers, setLayers] = useState(framing.layers);
  const [view, setView] = useState(DEFAULT_VIEW);
  // As on the Ścieżka: a count, so pressing the same view twice moves twice; `free` once moved by hand.
  const [revision, setRevision] = useState(0);
  const [free, setFree] = useState(false);
  const [picked, setPicked] = useState(null);
  const legendId = useId();

  // The program as it will be cut when the server has bent it (`bent`), else as written.
  const parsed = useMemo(() => readToolpath(bent || machine.gcode), [bent, machine.gcode]);
  // And as written, faint under the bent one, to see what the map changes (`before`).
  const written = useMemo(() => (before && bent ? readToolpath(machine.gcode) : null), [before, bent, machine.gcode]);
  // Settled to a value, so a status report four times a second does not rebuild the scene (see `PathWidget`).
  const live = workOffset(machine.machinePosition, machine.position);
  const offsetKey = live ? `${live.x},${live.y},${live.z}` : '';
  const offset = useMemo(() => live || NO_OFFSET, [offsetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const area = grid?.xs ? { x: [grid.xs[0], grid.xs[grid.xs.length - 1]], y: [grid.ys[0], grid.ys[grid.ys.length - 1]] } : null;
  /*
   * The bent path raised with the sheet: it is bent by the true heights, so
   * the scale's extra — the height there times one less than the scale — is
   * added under each of its points, and it lies on the raised sheet.
   */
  const toolpath = useMemo(() => {
    if (!parsed || !bent || !area || !heights || scale === 1) {
      return parsed;
    }
    const byPoint = new Map(heights.heights.map(({ i, j, dz }) => [`${i},${j}`, dz]));
    const values = Array.from({ length: grid.ny }, (_, j) => Array.from({ length: grid.nx }, (__, i) => byPoint.get(`${i},${j}`) ?? 0));
    const surface = surfaceOf(values, grid.nx, grid.ny, smooth);
    const from = parsed.source.positions;
    const positions = new Float32Array(from.length);
    const clampTo = (v, n) => Math.min(n - 1, Math.max(0, v));
    for (let k = 0; k < from.length; k += 3) {
      const u = clampTo(((from[k] - area.x[0]) / (area.x[1] - area.x[0])) * (grid.nx - 1), grid.nx);
      const v = clampTo(((from[k + 1] - area.y[0]) / (area.y[1] - area.y[0])) * (grid.ny - 1), grid.ny);
      positions[k] = from[k];
      positions[k + 1] = from[k + 1];
      positions[k + 2] = from[k + 2] + surface(u, v) * (scale - 1);
    }
    return { ...parsed, source: { ...parsed.source, positions } };
  }, [parsed, bent, JSON.stringify(area), heights, scale, smooth]); // eslint-disable-line react-hooks/exhaustive-deps
  const areaKey = area ? `${area.x},${area.y}` : '';
  // The area on the machine, for the view to take in when there is no travel to frame.
  const also = useMemo(() => (area ? [{
    min: { x: area.x[0] + offset.x, y: area.y[0] + offset.y, z: offset.z },
    max: { x: area.x[1] + offset.x, y: area.y[1] + offset.y, z: offset.z },
  }] : []), [areaKey, offset]); // eslint-disable-line react-hooks/exhaustive-deps
  // Framed on a new area, unless the operator has put the camera somewhere of their own.
  useEffect(() => {
    if (ready && areaKey && !framing.moved && framing.area !== areaKey) {
      framing.area = areaKey;
      setFit((n) => n + 1);
    }
  }, [ready, areaKey]);
  const scene = useMemo(() => composeScene({
    settings: machine.settings, envelope: machine.envelope, wcs: machine.modal?.wcs, offset, toolpath, layers, factor: machine.units?.factor, also,
  }), [machine.settings, machine.envelope, machine.modal?.wcs, offset, toolpath, layers, machine.units?.factor, also]);

  const chooseView = (next) => {
    framing.moved = true;
    setView(next);
    setFree(false);
    setRevision((count) => count + 1);
  };
  const chooseLayers = (next) => {
    framing.layers = next;
    setLayers(next);
  };
  const sections = [
    { label: t('path.layers.program'), options: [{ id: 'path', label: t('path.layers.path'), disabled: !toolpath, note: t('path.layers.noProgram') }] },
    { label: t('path.layers.wcs'), options: [{ id: 'wcsAxes', label: t('path.layers.axes'), disabled: !scene.origin, note: t('path.layers.noWcs') }] },
    { label: t('path.layers.machine'), options: [{ id: 'machineArea', label: t('path.layers.area'), disabled: !scene.envelope, note: t('path.layers.noEnvelope') }] },
  ];

  // The point tapped and its height as measured; nothing for one not measured yet.
  const pickedDz = picked ? heights?.heights.find(({ i, j }) => i === picked.i && j === picked.j)?.dz : undefined;
  const length = units.length;
  // The sheet's colours from low to high, with the range's ends in figures.
  const span = heights ? heights.high - heights.low : 0;
  const every = contours && span > 1e-6 ? contourStep(heights.low, heights.high) : null;
  const legend = heights && span > 1e-6 ? (() => {
    const tint = tintOf(heat ? [colors.heat0, colors.heat1, colors.heat2, colors.heat3, colors.heat4] : null, colors.ground, colors.work);
    const stops = Array.from({ length: LEGEND_STOPS }, (_, k) => ({ offset: k / (LEGEND_STOPS - 1) }));
    const shades = stops.map(({ offset: share }) => `#${tint(share).getHexString()}`);
    return { stops, colors: shades, low: signed(units.figure(heights.low)), high: signed(units.figure(heights.high)) };
  })() : null;

  return (
    <div data-stage="" className={`relative min-h-0 overflow-hidden rounded-ctl border border-line bg-field ${className}`}>
      <Scene
        scene={scene}
        tool={toolPoint(machine.machinePosition)}
        layers={layers}
        view={view}
        revision={revision}
        memory="map"
        fit={fit}
        focus={also[0] || null}
        onFree={() => setFree(true)}
        onReady={() => setReady(true)}
        onGrab={() => {
          framing.moved = true;
        }}
      >
        {area ? (
          <MapArea
            area={area}
            nx={grid.nx}
            ny={grid.ny}
            // The points it was given by, but for the program's, whose extent is not a point given.
            given={mode === 'program' ? [] : grid.given || []}
            done={done}
            heights={heights}
            scale={scale}
            smooth={smooth}
            solid={solid}
            contours={every}
            gridLines={gridLines}
            heat={heat ? [colors.heat0, colors.heat1, colors.heat2, colors.heat3, colors.heat4] : null}
            offset={offset}
            color={colors.work}
            ground={colors.ground}
            picked={pickedDz === undefined ? null : picked}
            pickColor={colors.over}
            onPick={heights ? setPicked : null}
          />
        ) : null}
        {written && layers.path ? <WrittenPath toolpath={written} offset={offset} colors={colors} /> : null}
      </Scene>

      <StageOptions
        groups={[
          { label: t('stage.view'), items: viewItems(view, chooseView, free), closes: true },
          {
            label: t('stage.frame'),
            onDrawing: true,
            items: [{ id: 'fit', icon: 'fit', label: t('probe.map.fit'), disabled: !area, onSelect: () => setFit((n) => n + 1) }],
          },
          { label: t('stage.layers'), icon: 'layers', items: layerItems(sections, layers, chooseLayers) },
        ]}
      />

      {legend || pickedDz !== undefined ? (
        <div data-stage-inset="bottom" className="absolute bottom-2 left-2 flex flex-col gap-1 rounded-ctl bg-wash px-2 py-1 text-note">
          {pickedDz !== undefined ? (
            <span className="font-num text-ink">{t('probe.map.pointHeight', { dz: signed(units.figure(pickedDz)), unit: length, col: picked.i + 1, row: picked.j + 1 })}</span>
          ) : null}
          {legend ? (
            <div className="flex items-center gap-2 font-num text-mut">
              <span>{legend.low}</span>
              <svg aria-hidden="true" viewBox="0 0 96 8" className="h-2 w-24">
                <defs>
                  <linearGradient id={legendId}>
                    {legend.stops.map((stop, k) => <stop key={stop.offset} offset={stop.offset} stopColor={legend.colors[k]} />)}
                  </linearGradient>
                </defs>
                <rect width={96} height={8} rx={4} fill={`url(#${legendId})`} />
              </svg>
              <span>{legend.high} {length}</span>
            </div>
          ) : null}
          {every ? <span className="font-num text-mut">{t('probe.map.contoursEvery', { step: units.figure(every), unit: length })}</span> : null}
        </div>
      ) : null}
    </div>
  );
};

export default MapPreview3D;
