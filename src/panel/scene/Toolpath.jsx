import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { closedLoops } from './shadow-shapes';
import buildSegments, { colorsFromHex, completedCount } from 'lib/toolpath/toolpath-segments';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

/**
 * The program, drawn.
 *
 * Two objects rather than one, and not for tidiness: a line material carries
 * a single width, so cuts and rapids have to be separate draw sets before
 * either can be drawn at its own thickness. `buildSegments` has already split
 * them and coloured every endpoint, so there is nothing to decide here.
 *
 * `Line2` rather than `line`, because `LineBasicMaterial.linewidth` is
 * ignored by WebGL on nearly every platform — the reason a plain three.js
 * toolpath comes out as a one-pixel trace whatever width is asked for. The
 * fat-line material builds its own screen-space geometry and honours it.
 */

/*
 * Thickness in CSS pixels.
 *
 * Thinner than they were, twice. A toolpath doubles back on itself hundreds
 * of times, and at two pixels a pocket cleared into a solid block of colour
 * where the individual passes should still be countable; at one it still
 * crowded the line being cut (*"ścieżki toru zrób cieńsze"*, 2026-09-25). The
 * cut still reads as the heavier of the two, so both came down together.
 */
const CUT_WIDTH = 0.6;
const RAPID_WIDTH = 0.4;

/*
 * The line of the program being cut, drawn over the rest — *"zaznaczaj
 * aktualne polecenie G-code na ścieżce"* — in its own colour (`current` in
 * the scene palette), and thick enough to find at a glance.
 */
const CURRENT_WIDTH = 2.5;

/*
 * What has been cut, faded almost into the ground: *"zrób blade, prawie
 * niewidoczne ścieżki wykonane"*. A mix towards the background colour rather
 * than transparency, because the fat-line material takes one opacity for the
 * whole path and the done part is a prefix of it.
 */
const DONE_FADE = 0.88;

// Dash lengths in millimetres — the material measures them in world units.
// A rapid is dashed as well as thinner because that is the distinction that
// survives being glanced at from a metre away.
const RAPID_DASH = 2;
const RAPID_GAP = 2;

/*
 * The program's own shadow, laid flat on the floor.
 *
 * **It is what tells you where the work is, from any angle.** In a parallel
 * projection height and depth are the same movement on screen, so a path
 * hanging in space gives the eye nothing to place it against; its outline on
 * the ground does, because the ground is the one surface everything else is
 * measured from too.
 *
 * Built from the segments that are already parsed rather than from a second
 * read of the program — parsing is the one expensive thing on this screen.
 * Flattened by writing the floor into every Z, which costs one pass over the
 * vertices and no new geometry when the camera moves.
 *
 * Plain `lineSegments`, not the fat line the path itself uses: a shadow wants
 * to be one pixel and unnoticed, and it is drawn once per program.
 *
 * **Filled wherever the path closes.** Hairlines alone come out as a scribble
 * — the eye reads a filled patch as an object lying on the table and a tangle
 * of lines as noise. So every closed contour gets a face, at about a third
 * the weight of the outline that bounds it, and anything that never closes
 * stays a line. See `shadow-shapes.js` for how a loop is recognised.
 */
const SHADOW_OPACITY = 0.1;
const SHADOW_FILL_OPACITY = 0.05;

/**
 * The faces under the closed parts of the path.
 *
 * Built from the cutting moves only: a rapid that happens to return to its
 * own start encloses nothing — it is the tool travelling, not a shape.
 *
 * Each loop is triangulated as a fan about its own centroid. A fan is exact
 * for a convex outline and close enough for the gently concave ones a
 * toolpath produces; a real triangulator would be a dependency to shade
 * something drawn at five percent.
 */
const buildFill = (sets, z) => {
  const loops = closedLoops(sets.cut.positions);
  if (!loops.length) {
    return null;
  }

  const vertices = [];

  for (const loop of loops) {
    let cx = 0;
    let cy = 0;
    for (const [x, y] of loop) {
      cx += x;
      cy += y;
    }
    cx /= loop.length;
    cy /= loop.length;

    for (let i = 1; i < loop.length; ++i) {
      vertices.push(cx, cy, z, loop[i - 1][0], loop[i - 1][1], z, loop[i][0], loop[i][1], z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(new Float32Array(vertices), 3)
  );
  return geometry;
};

const buildShadow = (sets, z) => {
  const parts = [sets.cut.positions, sets.rapid.positions].filter((p) => p && p.length);
  const total = parts.reduce((n, p) => n + p.length, 0);
  if (!total) {
    return null;
  }

  const flat = new Float32Array(total);
  let at = 0;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 3) {
      flat[at] = part[i];
      flat[at + 1] = part[i + 1];
      flat[at + 2] = z;
      at += 3;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
  return geometry;
};

const buildLine = (set, options) => {
  if (set.vertexIndex.length === 0) {
    return null;
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(set.positions);
  geometry.setColors(set.colors.slice());

  // `alphaToCoverage` smooths a sub-pixel line against the canvas's own
  // multisampling, the way three's fat-line example does; without it a 0.6px
  // line on a real GPU breaks into dashes. Headless renders cannot show it.
  const material = new LineMaterial({ vertexColors: true, alphaToCoverage: true, ...options });
  const line = new Line2(geometry, material);

  if (options.dashed) {
    // Dash phase is measured along the line, so the distances have to exist
    // before any of it can be drawn.
    line.computeLineDistances();
  }

  return line;
};

// `colors` with every endpoint pulled `amount` of the way to `ground`.
const fadeTowards = (colors, ground, amount) => {
  const out = new Float32Array(colors.length);
  const target = [ground.r, ground.g, ground.b];
  for (let i = 0; i < colors.length; i += 1) {
    out[i] = colors[i] + ((target[i % 3] - colors[i]) * amount);
  }
  return out;
};

// The segments one line of the program drew, as a line of their own.
const buildCurrent = (source, { start, end }, color) => {
  const positions = [];
  for (let v = Math.max(start, 1); v < end; v += 1) {
    const a = (v - 1) * 3;
    const b = v * 3;
    positions.push(
      source.positions[a], source.positions[a + 1], source.positions[a + 2],
      source.positions[b], source.positions[b + 1], source.positions[b + 2],
    );
  }
  if (!positions.length) {
    return null;
  }
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  // Over the path it retraces, whatever the depth buffer says.
  const material = new LineMaterial({ color, linewidth: CURRENT_WIDTH, depthTest: false });
  const line = new Line2(geometry, material);
  line.renderOrder = 10;
  return line;
};

const Toolpath = ({ toolpath, colors, shadowZ, progress }) => {
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  /*
   * Coloured here rather than where it was parsed, because the colours follow
   * the theme and the parse does not. Flipping to the dark theme rebuilds two
   * vertex buffers; it used to re-read the whole program to do it.
   */
  const sets = useMemo(
    () => buildSegments(toolpath.source, colorsFromHex(colors)),
    [toolpath, colors.rapid, colors.cutTop, colors.cutDeep]
  );

  const shadow = useMemo(
    () => (Number.isFinite(shadowZ) ? buildShadow(sets, shadowZ) : null),
    [sets, shadowZ]
  );

  const fill = useMemo(
    () => (Number.isFinite(shadowZ) ? buildFill(sets, shadowZ) : null),
    [sets, shadowZ]
  );

  useEffect(() => () => shadow?.dispose(), [shadow]);
  useEffect(() => () => fill?.dispose(), [fill]);

  const lines = useMemo(() => [
    ['cut', buildLine(sets.cut, { linewidth: CUT_WIDTH })],
    ['rapid', buildLine(sets.rapid, {
      linewidth: RAPID_WIDTH,
      dashed: true,
      dashSize: RAPID_DASH,
      gapSize: RAPID_GAP,
      opacity: 0.85,
      transparent: true,
    })],
  ].filter(([, line]) => line), [sets]);

  /*
   * The material works in screen space, so it has to be told how large the
   * screen is. Getting this wrong is not subtle — the line width is computed
   * against the resolution, so a stale one makes the whole path thicken or
   * vanish when the card is resized.
   */
  useEffect(() => {
    lines.forEach(([, line]) => line.material.resolution.set(size.width, size.height));
  }, [lines, size.width, size.height]);

  /*
   * The done part, faded in place: the colour buffer the line already has is
   * rewritten rather than the line rebuilt, since this moves four times a
   * second while a program runs. Everything before the line being cut is
   * done; with no program running, nothing is.
   */
  const faded = useMemo(() => {
    const ground = new THREE.Color(colors.ground);
    return {
      cut: fadeTowards(sets.cut.colors, ground, DONE_FADE),
      rapid: fadeTowards(sets.rapid.colors, ground, DONE_FADE),
    };
  }, [sets, colors.ground]);

  const doneBefore = progress ? progress.start : 0;
  useEffect(() => {
    lines.forEach(([name, line]) => {
      const set = sets[name];
      const done = doneBefore > 0 ? completedCount(set.vertexIndex, doneBefore - 1) : 0;
      const buffer = line.geometry.attributes.instanceColorStart.data;
      buffer.array.set(faded[name].subarray(0, done * 6), 0);
      buffer.array.set(set.colors.subarray(done * 6), done * 6);
      buffer.needsUpdate = true;
    });
    invalidate();
  }, [lines, sets, faded, doneBefore, invalidate]);

  // Rebuilt when the line changes, not on every report.
  const start = progress ? progress.start : -1;
  const end = progress ? progress.end : -1;
  const current = useMemo(
    () => (start >= 0 ? buildCurrent(toolpath.source, { start, end }, colors.current) : null),
    [toolpath, start, end, colors.current]
  );
  useEffect(() => {
    current?.material.resolution.set(size.width, size.height);
    invalidate();
  }, [current, size.width, size.height, invalidate]);
  useEffect(() => () => {
    current?.geometry.dispose();
    current?.material.dispose();
  }, [current]);

  // Nothing disposes an object handed to `primitive`; the geometry and
  // material here are built per program and would otherwise be left on the
  // GPU every time a new one is loaded.
  useEffect(() => () => lines.forEach(([, line]) => {
    line.geometry.dispose();
    line.material.dispose();
  }), [lines]);

  return (
    <>
      {fill ? (
        <mesh geometry={fill}>
          {/* `depthWrite` off so overlapping loops — a pocket inside a
            * profile — do not fight each other for the same depth, and
            * `side` double because a loop traced clockwise faces away. */}
          <meshBasicMaterial
            color={colors.edge}
            transparent
            opacity={SHADOW_FILL_OPACITY}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}

      {shadow ? (
        <lineSegments geometry={shadow}>
          <lineBasicMaterial color={colors.edge} transparent opacity={SHADOW_OPACITY} />
        </lineSegments>
      ) : null}
      {lines.map(([name, line]) => <primitive key={name} object={line} />)}
      {current ? <primitive object={current} /> : null}
    </>
  );
};

export default Toolpath;
