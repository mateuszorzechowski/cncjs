import {
  workOrigins,
} from '../machine/envelope';

/** Everything the scene draws when the panel has been told nothing at all. */
const UNIT = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } };

const shift = (bounds, offset) => ({
  min: {
    x: bounds.min.x + offset.x,
    y: bounds.min.y + offset.y,
    z: bounds.min.z + offset.z,
  },
  max: {
    x: bounds.max.x + offset.x,
    y: bounds.max.y + offset.y,
    z: bounds.max.z + offset.z,
  },
});

const merge = (into, box) => ({
  min: {
    x: Math.min(into.min.x, box.min.x),
    y: Math.min(into.min.y, box.min.y),
    z: Math.min(into.min.z, box.min.z),
  },
  max: {
    x: Math.max(into.max.x, box.max.x),
    y: Math.max(into.max.y, box.max.y),
    z: Math.max(into.max.z, box.max.z),
  },
});

const union = (boxes) => boxes.reduce(
  (into, box) => (into === null ? box : merge(into, box)),
  null
);

const pointBox = ({ origin }) => ({ min: origin, max: origin });

/** Where the machine measures from, which is a point the camera has to frame. */
const MACHINE_ZERO = { x: 0, y: 0, z: 0 };

/**
 * Where the tool is, or nothing.
 *
 * The one reading the scene takes live. Everything else about the picture is
 * settled and memoised; this is a point that moves four times a second, and
 * moving a marker is all it costs.
 */
export const toolPoint = (machinePosition) => {
  const { x, y, z } = machinePosition || {};

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  return { x, y, z };
};

/**
 * The readings and the loaded program, arranged as one scene.
 *
 * Kept out of the view because every hard thing about this screen is
 * arithmetic: which frame each outline is in, where the program sits once the
 * work zero moves, and what the camera should be framed on when there is no
 * program, or no machine, or neither. None of that needs a renderer to check.
 *
 * **What the camera frames is whatever is switched on.** Not the program
 * alone: with the machine layer on and a 12mm part at the corner of a 200mm
 * envelope, framing the part puts five sixths of the envelope off screen and
 * what is left crosses the view as two unexplained lines. Turning a layer on
 * and not being able to see it is the worst of both answers, so the frame is
 * the union of what is drawn — and turning the machine off is how you get
 * back to filling the view with the part.
 *
 * **It takes readings rather than the machine**, and that is not tidiness.
 * The caller memoises this, and it can only do that if nothing here is
 * recomputed from an object that arrives afresh four times a second. The work
 * offset is the example that forced it: it is derived from two positions that
 * both change during a move while their difference does not, so the caller
 * settles it to a value and hands the value in. Given the whole `machine`,
 * every outline's geometry was being rebuilt on every status report, and a
 * dragged view stuttered against it.
 *
 * @param {object} settings The controller's settings, whole.
 * @param {object|null} envelope Where the machine can reach, from the server.
 * @param {string} wcs The active coordinate system, e.g. `G54`.
 * @param {object} offset Machine minus work, settled to a value by the caller.
 * @param {object|null} toolpath The loaded program, from `readToolpath`.
 * @param {object} layers Which of the four are switched on.
 */
// The end of an axis's travel farther from machine zero.
const farEnd = (envelope, axis) => (
  Math.abs(envelope.min[axis]) >= Math.abs(envelope.max[axis]) ? envelope.min[axis] : envelope.max[axis]
);

/**
 * The corner of the travel opposite machine zero, or null without a travel.
 *
 * Where the machine's second set of axes is drawn — *"drugi znacznik osi w
 * rogu"* (Mateusz, 2026-09-25): machine zero says where the travel starts,
 * this says where it ends. Per axis, so an axis that homes to its other end
 * ($23) is followed.
 */
export const farCorner = (envelope) => (envelope
  ? { x: farEnd(envelope, 'x'), y: farEnd(envelope, 'y'), z: farEnd(envelope, 'z') }
  : null);

export const composeScene = ({ settings, envelope, wcs, offset, toolpath, layers }) => {
  const program = toolpath ? shift(toolpath.bounds, offset) : null;

  /*
   * **The one the machine is working in, and only that one.**
   *
   * All six were drawn at first, the active one solid and the rest faint.
   * On a controller where nobody has set them that is five markers in one
   * spot: an unset system reads `0,0,0`, which is machine zero, so `G55`
   * through `G59` stack on top of each other *and* on top of the machine's
   * own zero. The visible effect was that switching the work axes appeared
   * to control the machine axes too, and switching the machine axes appeared
   * to do nothing at all — neither being true, and neither being a wiring
   * fault.
   *
   * Showing only the active system is not a guess about which ones were
   * "really" set. It is the same scope the menu already has: the section is
   * called UKŁAD, singular, and the question it answers is "where is the
   * zero I am working from".
   */
  const origin = workOrigins(settings).find((system) => system.name === wcs) || null;

  const corner = farCorner(envelope);

  const drawn = union([
    (layers.path || layers.programArea) && program,
    layers.machineArea && envelope,
    layers.machineAxes && { min: MACHINE_ZERO, max: MACHINE_ZERO },
    layers.machineAxes && corner && { min: corner, max: corner },
    layers.wcsAxes && origin && pointBox(origin),
  ].filter(Boolean)) || UNIT;

  /*
   * **Down to the machine's floor, always.** The grid lies there, and it is
   * the plane everything else is read against. Framed on what is switched on
   * and nothing more, a side view with the envelope off showed the part
   * hanging in nothing, the floor out of frame below it — *"jak mam
   * odznaczone obwiednie maszyny, to w rzucie z boku nie widzę płaszczyzny
   * maszyny"* (2026-09-25). Across, the frame is still only what is on; seen
   * from above this changes nothing.
   */
  const frame = envelope
    ? { min: { ...drawn.min, z: Math.min(drawn.min.z, envelope.min.z) }, max: drawn.max }
    : drawn;

  return {
    envelope,
    farCorner: corner,
    program,
    offset,
    toolpath,
    origin,
    frame,
  };
};

export default composeScene;
