import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { gridLabels, labelStep, nearSides } from './grid-numbers';
import { useUnits } from '../ui/units';

/**
 * The numbers on the ground.
 *
 * **Lying in the grid's own plane**, not turned to face the camera. A figure
 * that always faces you is a label on a picture; one that lies on the surface
 * is a mark on the floor, and it foreshortens with everything else, which is
 * most of how it says which way the view is turned.
 *
 * `PlaneGeometry` already lies in XY and faces +Z, so in a Z-up world it wants
 * no rotation at all — it is flat on the floor as built.
 *
 * Drawn as text painted into a canvas and used as a texture. The alternatives
 * are a font file and `TextGeometry`, or a second dependency; this is a dozen
 * lines, reads at any distance the camera is likely to be, and takes its
 * colour from the token sheet like everything else in the scene.
 */

/**
 * How tall a figure is drawn, in screen pixels, at every zoom.
 *
 * **Held on screen rather than in millimetres.** Sized in the world a number
 * is legible at the default fit and then dissolves the moment the view closes
 * in on a corner — which is exactly when somebody is reading it.
 *
 * Nothing collides as a result, because the *spacing* is what gives way
 * instead: `labelStep` counts in coarser round numbers as the view pulls
 * back. Size and spacing are two different problems and this only solves the
 * first one.
 *
 * 26 is what the default fit already produced, so nothing changed size the
 * day this stopped being a world measurement.
 */
const TEXT_PIXELS = 20;

/**
 * How far outside the machine a figure sits, in screen pixels.
 *
 * On screen for the same reason the size is: as a fraction of the label
 * spacing it marched away from the axis every time the numbers coarsened,
 * which is exactly backwards — the coarser the count, the further the figures
 * drifted from the thing they label.
 */
const GAP_PIXELS = 22;

/**
 * The room the figures take outside the grid's edge, in screen pixels: the
 * gap and about two figure-heights of text. A view is framed with this much
 * clear on every side (`Controls`), so the rulers are in the picture.
 */
export const RULER_PIXELS = GAP_PIXELS + (2 * TEXT_PIXELS);

// Pixels per world unit in the texture. Three times the size a label is ever
// drawn on screen, so it stays sharp when the view is zoomed into a corner.
const RESOLUTION = 64;

const paint = (text, color) => {
  const canvas = document.createElement('canvas');
  // Not a sentence: a CSS font shorthand, which happens to have two words in
  // it because a typeface has a name.
  // eslint-disable-next-line panel/no-untranslated-text
  const font = `600 ${RESOLUTION}px 'IBM Plex Sans', system-ui, sans-serif`;

  // Measured before the canvas is sized, because sizing it clears the context
  // and resets the font with it.
  const probe = canvas.getContext('2d');
  probe.font = font;
  const width = Math.ceil(probe.measureText(text).width);

  canvas.width = Math.max(1, width);
  canvas.height = Math.ceil(RESOLUTION * 1.4);

  const context = canvas.getContext('2d');
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  // The canvas was painted in sRGB; saying so is what stops the figures
  // coming out washed out against the ground.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return { texture, aspect: canvas.width / canvas.height };
};

// Scratch vectors for the per-frame projection, so a frame allocates nothing.
const FORWARD = new THREE.Vector3();
const AT = new THREE.Vector3();
const ALONG = new THREE.Vector3();

/** Whether a world direction runs leftward on screen — text along it would read backwards. */
const runsLeft = (camera, dx, dy) => {
  AT.set(0, 0, 0).project(camera);
  ALONG.set(dx, dy, 0).project(camera);
  return ALONG.x - AT.x < -1e-6;
};

/**
 * `rulers` is the scene's: `zero` along the zero lines, figures as they
 * lie (the file preview); `near` along the edges nearest the camera, turned
 * to read from the left, with a title per axis (the Ścieżka screen, design
 * 03a). See `grid-numbers`.
 */
const GridLabels = ({ area, step, z, color, rulers = 'zero' }) => {
  const units = useUnits();
  const factor = units.rule?.factor ?? 1;
  const length = units.length;
  const groups = useRef([]);
  const near = rulers === 'near';

  /*
   * Which edges are nearest, as the signs of the view's direction — state,
   * like the spacing, because it changes only when the view is turned past
   * an edge. The default view's until the first frame says otherwise.
   */
  const [facing, setFacing] = useState('front-right');

  /*
   * Which round number is being counted in. It follows the zoom, so it is
   * state rather than a prop — but it only changes when the view crosses a
   * threshold, which is a handful of times across a whole zoom range.
   */
  const [spacing, setSpacing] = useState(step);

  const labels = useMemo(() => {
    const toward = { x: facing.endsWith('left') ? -1 : 1, y: facing.startsWith('back') ? 1 : -1 };
    const where = near ? { sides: nearSides(area, toward), titles: true } : {};
    return gridLabels(area, spacing, { factor, length }, where).map((label) => {
      const { texture, aspect } = paint(label.text, color);
      // Built one unit tall; the group is scaled to whatever that has to be on
      // screen, so the geometry never has to be rebuilt for a zoom.
      return { ...label, texture, width: aspect, height: 1 };
    });
  }, [area, spacing, color, factor, length, near, facing]);

  useEffect(() => () => labels.forEach(({ texture }) => texture.dispose()), [labels]);

  /*
   * One pass over the labels per frame, rather than a hook each — a hook
   * cannot be called in a loop, and the arithmetic is the same for all of
   * them. Under an on-demand renderer this only runs on frames that were
   * asked for, and a zoom asks for one.
   */
  useFrame(({ camera }) => {
    const next = labelStep(step, camera.zoom, factor);
    if (next !== spacing) {
      setSpacing(next);
    }

    // From the scene towards the camera: the reverse of where it looks.
    let flipX = false;
    let flipY = false;
    let turned = false;
    if (near) {
      camera.getWorldDirection(FORWARD);
      const now = `${-FORWARD.y > 1e-6 ? 'back' : 'front'}-${-FORWARD.x < -1e-6 ? 'left' : 'right'}`;
      if (now !== facing) {
        setFacing(now);
        turned = true;
      }
      flipX = runsLeft(camera, 1, 0);
      flipY = runsLeft(camera, 0, 1);
    }

    const scale = TEXT_PIXELS / camera.zoom;
    const gap = GAP_PIXELS / camera.zoom;
    // Figures counted for another zoom are hidden until the recount arrives,
    // one render later: shown, the first frame of a view printed every
    // millimetre on top of each other.
    const settled = next === spacing && !turned;
    for (let i = 0; i < groups.current.length; ++i) {
      const group = groups.current[i];
      const label = labels[i];
      if (group && label) {
        group.visible = settled;
        group.scale.setScalar(scale);
        // Offset in pixels rather than in millimetres, so neither the numbers
        // nor the unit drift when the counting coarsens — and measured from
        // the figure's near edge rather than its middle, so a long one keeps
        // the same gap to the axis as a short one instead of running into it.
        // A title along Y is turned a quarter, so its width runs along Y.
        const alongY = label.along === 'y';
        const spanX = (alongY ? label.height : label.width) * scale;
        const spanY = (alongY ? label.width : label.height) * scale;
        group.position.set(
          label.x + (label.push.x * (gap + (spanX / 2))) + ((label.clear?.x ?? 0) * scale),
          label.y + (label.push.y * (gap + (spanY / 2))) + ((label.clear?.y ?? 0) * scale),
          z
        );
        // Turned half round when its direction runs leftward on screen, so
        // it reads from the left whichever side the view is from (design 03a).
        if (near) {
          group.rotation.z = alongY
            ? (flipY ? -Math.PI / 2 : Math.PI / 2)
            : (flipX ? Math.PI : 0);
        }
      }
    }
  });

  return labels.map(({ key, x, y, texture, width, height, title }, index) => (
    <group
      key={key}
      position={[x, y, z]}
      ref={(node) => { groups.current[index] = node; }}
    >
    <mesh>
      <planeGeometry args={[width, height]} />
      {/*
        * `depthWrite` off so a figure never hides the grid line behind it,
        * and `opacity` matching the grid's own weight — these are reference
        * marks, read when looked for and ignorable otherwise.
        */}
      <meshBasicMaterial map={texture} transparent opacity={title ? 0.85 : 0.55} depthWrite={false} />
    </mesh>
    </group>
  ));
};

export default GridLabels;
