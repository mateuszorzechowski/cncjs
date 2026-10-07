import corner from './corner';
import heightMap from './height-map';
import paper from './paper';
import measure from './size';
import zPlate from './z-plate';

/**
 * The probing methods, by the name a client asks for. Each is a strategy:
 *
 * - `fields` — the figures it uses, in the order the wizard shows them;
 * - `options` — the choices made per measurement, each with its values;
 * - `touches` — whether it works through the probe input, which must then
 *   be clear before it starts;
 * - `check(options)` — why these choices will not do, or null;
 * - `steps(params, options, { start, wco })` — the moves, see `moves`;
 * - `zero(params, options, seen, start)` — the new work zero, machine
 *   coordinates, from the touches kept and where the tool started; or
 *   `map(params, options, seen, { start, wco })` instead, for a method
 *   that measures a surface to keep rather than a zero (`height-map`), or
 *   `size(params, options, seen)` for one that measures how big something
 *   is and where its middle is, and nothing else (`measure`);
 * - `read(options, units)`, if it has one — the choices in millimetres,
 *   for figures given per measurement (`{ options }` or `{ error }`);
 * - `partial(params, options, seen)`, if it has one — what the touches so
 *   far tell while it runs (a height map's heights), for every device.
 *
 * A new method is a new file here; nothing that runs them changes.
 */
export const STRATEGIES = {
  z: zPlate,
  corner,
  paper,
  'height-map': heightMap,
  measure,
};

/** What a panel needs to offer the methods: their figures and choices. */
export const describeStrategies = () => Object.fromEntries(
  Object.entries(STRATEGIES).map(([name, { fields, options }]) => [name, { fields, options }]),
);

export default STRATEGIES;
