import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { gridLabels, labelStep } from './grid-numbers';
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

// The text's own box, in texture pixels: a figure's height is this.
const BOX = Math.ceil(RESOLUTION * 1.4);

/*
 * **A cut in the lines under each figure, fading at its edge.** Where a
 * figure sat on a grid line or an axis the line ran straight through the
 * digits — a `0` with a stroke in it (Mateusz, 2026-09-26: *"to nie ma być
 * poświata, tylko wycięcie na napis z fadem"*). So each figure carries a
 * patch of the ground's own colour, solid over the text's box — the lines
 * stop there — and blurred at its border, so they fade out rather than end
 * at an edge. `HALO_PAD` is the room round the text for that fade.
 */
const HALO_PAD = Math.round(RESOLUTION * 0.6);

/** The pad around the text, in figure heights, for the plane that carries it. */
const PAD = HALO_PAD / BOX;

// Between the floor's lines (the default, 0) and the path (1 and up).
const FIGURES_ORDER = 0.5;

const paint = (text, color, halo, alpha) => {
  const canvas = document.createElement('canvas');
  // Not a sentence: a CSS font shorthand, which happens to have two words in
  // it because a typeface has a name.
  // eslint-disable-next-line panel/no-untranslated-text
  const font = `600 ${RESOLUTION}px 'IBM Plex Sans', system-ui, sans-serif`;

  // Measured before the canvas is sized, because sizing it clears the context
  // and resets the font with it.
  const probe = canvas.getContext('2d');
  probe.font = font;
  const width = Math.max(1, Math.ceil(probe.measureText(text).width));

  canvas.width = width + (2 * HALO_PAD);
  canvas.height = BOX + (2 * HALO_PAD);

  const context = canvas.getContext('2d');
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const middle = [canvas.width / 2, canvas.height / 2];

  // The cut: in the ground's colour, a little smaller than the letters —
  // the box a line is dropped by is the digits, not the space above and
  // below them — and blurred wide into the pad, so the lines fade out
  // rather than stop at an edge (*"mniejszy ten box, albo większe
  // rozmycie"*, 2026-09-26).
  // Two layers: the fade, blurred wide from the letters' box, and over it
  // a solid core a little inside that box, so the middle is fully cut
  // however wide the blur — a small box blurred alone lets the line through.
  const blur = Math.round(HALO_PAD * 0.5);
  // The core is the digits' own box: the text's width, and the height of a
  // figure rather than of the line it is set in.
  const insetX = HALO_PAD;
  const insetY = HALO_PAD + (BOX * 0.12);
  const box = (grow) => context.fillRect(
    insetX - grow, insetY - grow, canvas.width - (2 * (insetX - grow)), canvas.height - (2 * (insetY - grow))
  );
  context.fillStyle = halo;
  context.filter = `blur(${blur}px)`;
  box(blur * 0.5);
  context.filter = 'none';
  box(0);

  // The figure over it, at its own strength: the material is opaque now, so
  // the faintness a reference mark wants is painted in.
  context.filter = 'none';
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillText(text, ...middle);

  const texture = new THREE.CanvasTexture(canvas);
  // The canvas was painted in sRGB; saying so is what stops the figures
  // coming out washed out against the ground.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  // The text's own proportions, for placing it; the pad goes on the plane.
  return { texture, aspect: width / BOX };
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
 * Along the edges nearest the camera, turned to read from the left, with a
 * title per axis — design 03a, on every scene. See `grid-numbers`.
 */
const GridLabels = ({ area, step, z, color, halo }) => {
  const units = useUnits();
  const factor = units.rule?.factor ?? 1;
  const length = units.length;
  const groups = useRef([]);

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
    return gridLabels(area, spacing, { factor, length }, toward).map((label) => {
      const { texture, aspect } = paint(label.text, color, halo, label.title ? 0.85 : 0.55);
      // Built one unit tall; the group is scaled to whatever that has to be on
      // screen, so the geometry never has to be rebuilt for a zoom.
      return { ...label, texture, width: aspect, height: 1 };
    });
  }, [area, spacing, color, halo, factor, length, facing]);

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
    camera.getWorldDirection(FORWARD);
    const now = `${-FORWARD.y > 1e-6 ? 'back' : 'front'}-${-FORWARD.x < -1e-6 ? 'left' : 'right'}`;
    const turned = now !== facing;
    if (turned) {
      setFacing(now);
    }
    const flipX = runsLeft(camera, 1, 0);
    const flipY = runsLeft(camera, 0, 1);

    const scale = TEXT_PIXELS / camera.zoom;
    const gap = GAP_PIXELS / camera.zoom;
    // Figures counted for another zoom are hidden until the recount arrives,
    // one render later: shown, the first frame of a view printed every
    // millimetre on top of each other.
    const settled = next === spacing && !turned;
    // How deep each row of figures is, in figure heights, for the title that
    // stands outside it: the X row is a figure tall, the Y column as wide as
    // its widest figure (the figures lie along X either way).
    const depth = {
      x: 1,
      y: Math.max(0, ...labels.filter((l) => !l.title && l.key.startsWith('y')).map((l) => l.width)),
    };
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
        // A title stands outside its row of figures: the row's depth and a
        // third of a figure of air past where a figure would stand.
        const past = label.beyond ? (depth[label.beyond] + 0.35) * scale : 0;
        group.position.set(
          label.x + (label.push.x * (gap + past + (spanX / 2))),
          label.y + (label.push.y * (gap + past + (spanY / 2))),
          z
        );
        // Turned half round when its direction runs leftward on screen, so
        // it reads from the left whichever side the view is from (design 03a).
        group.rotation.z = alongY
          ? (flipY ? -Math.PI / 2 : Math.PI / 2)
          : (flipX ? Math.PI : 0);
      }
    }
  });

  return labels.map(({ key, x, y, texture, width, height }, index) => (
    <group
      key={key}
      position={[x, y, z]}
      ref={(node) => { groups.current[index] = node; }}
    >
      {/*
        * The plane is the text and the halo's pad round it; placing goes by
        * the text alone (`width`, `height`), so the pad changes no gap.
        *
        * After the floor's lines and before the path, and over them whatever
        * the depth: the outline's top edge is nearer the camera than the
        * floor, and with the depth test it ran through the cut. So the cut
        * takes out the grid, the outline and the guides under a figure,
        * never the program, which is drawn after it.
        */}
      <mesh renderOrder={FIGURES_ORDER}>
        <planeGeometry args={[width + (2 * PAD), height + (2 * PAD)]} />
        {/* Not tone-mapped: the cut has to be the ground's exact colour, and
          * R3F's default tone mapping turned it into a grey box. */}
        <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  ));
};

export default GridLabels;
