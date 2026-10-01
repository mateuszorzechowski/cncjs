import { isUnit, toMm } from '../units';

/**
 * The probe's figures — the plates, the tool and how far and fast to go —
 * remembered for the next time and shown again before every measurement
 * (Mateusz, 2026-09-29: *"pamiętaj parametry, przypominaj"*).
 *
 * In millimetres and mm/min, like everything the server holds; a panel sends
 * a figure in the units it showed it in and says which. Only what the
 * operator set is kept, so a default changed here reaches every server that
 * did not.
 *
 * **The travel limits are the fence.** A `G38.2` that touches nothing goes
 * the whole distance it was given — with the clip off, into the plate, the
 * work or the table. Without homing there is no other limit on this machine,
 * so the distance is a figure the operator sees and can change, filled in
 * with a short one.
 */
export const FIELDS = {
  // The Z plate: how thick it is.
  plateThickness: { value: 10, min: 0.1, max: 100 },
  // The L-shaped corner plate: its top, and the two walls that hang over the edges.
  cornerThickness: { value: 10, min: 0.1, max: 100 },
  wallX: { value: 10, min: 0, max: 100 },
  wallY: { value: 10, min: 0, max: 100 },
  // How far out past the wall the tool goes before it comes down, and how far down.
  clear: { value: 20, min: 1, max: 100 },
  depth: { value: 5, min: 0.5, max: 50 },
  toolDiameter: { value: 6, min: 0.1, max: 50 },
  // A 3D probe's ball, apart from the tool: measuring with one never changes the other.
  ballDiameter: { value: 2, min: 0.1, max: 20 },
  // A hole's rough diameter: how far each search across it may go.
  holeSize: { value: 20, min: 1, max: 300 },
  // The work's thickness, between its top and the table, for a zero on the other one (`surface`).
  stockThickness: { value: 18, min: 0.1, max: 500 },
  // Paper by hand: an office sheet is a tenth of a millimetre; off it by a little once measured.
  paperThickness: { value: 0.1, min: 0.01, max: 5 },
  paperLift: { value: 2, min: 0, max: 20 },
  // The fence: the furthest one probing move may go.
  maxZ: { value: 15, min: 1, max: 100 },
  maxXY: { value: 15, min: 1, max: 100 },
  // Back off between the fast touch and the slow one.
  retract: { value: 2, min: 0.5, max: 20 },
  // Up over the plate once measured, so it can be taken out from under the
  // tool (the design's "powrót po pomiarze", 2026-09-29).
  lift: { value: 10, min: 0, max: 100 },
  fast: { value: 100, min: 10, max: 2000 },
  slow: { value: 25, min: 1, max: 500 },
};

export const fieldNames = Object.keys(FIELDS);

/** Every field, the operator's own over the defaults. */
export const probeParams = (own = {}) => {
  const params = {};
  for (const name of fieldNames) {
    params[name] = own[name] ?? FIELDS[name].value;
  }
  return params;
};

/**
 * What of `patch` may be kept, or a reason it may not. `units` is what the
 * panel showed the figures in; null in `patch` is "back to the defaults".
 * Nothing is kept when one figure is wrong.
 */
export const paramsPatch = (patch, units, current = {}) => {
  if (patch === null) {
    return { own: {} };
  }
  if (typeof patch !== 'object' || Array.isArray(patch)) {
    return { error: '`params` is an object' };
  }
  if (units !== undefined && !isUnit(units)) {
    return { error: 'Unknown units' };
  }
  const own = { ...current };
  for (const [name, given] of Object.entries(patch)) {
    const field = FIELDS[name];
    if (!field) {
      return { error: `\`${name}\` is not a probe setting` };
    }
    const value = toMm(Number(given), units);
    if (!(value >= field.min && value <= field.max)) {
      return { error: `\`${name}\`: ${field.min} to ${field.max} mm`, name };
    }
    own[name] = value;
  }
  const { fast, slow } = probeParams(own);
  if (slow > fast) {
    return { error: '`slow` is above `fast`', name: 'slow' };
  }
  return { own };
};

class Probe {
  own = {};

  open(saved = {}) {
    // What `.cncrc` holds is trusted no further than a request would be.
    const { own } = paramsPatch(saved ?? null);
    this.own = own || {};
  }

  params() {
    return probeParams(this.own);
  }

  /** The operator's figures; a reason when refused, and nothing kept. */
  set(patch, units) {
    const { own, error, name } = paramsPatch(patch, units, this.own);
    if (error) {
      return { error, name };
    }
    this.own = own;
    return { params: this.params() };
  }

  /** What `.cncrc` keeps. */
  saved() {
    return { ...this.own };
  }
}

const probe = new Probe();

export default probe;
