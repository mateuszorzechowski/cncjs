import corner from './corner';
import zPlate from './z-plate';

/**
 * The probing methods, by the name a client asks for. Each is a strategy:
 *
 * - `fields` — the figures it uses, in the order the wizard shows them;
 * - `options` — the choices made per measurement, each with its values;
 * - `check(options)` — why these choices will not do, or null;
 * - `steps(params, options)` — the moves, see `moves`;
 * - `zero(params, options, seen)` — the new work zero, machine coordinates,
 *   from the touches kept.
 *
 * A new method is a new file here; nothing that runs them changes.
 */
export const STRATEGIES = {
  z: zPlate,
  corner,
};

/** What a panel needs to offer the methods: their figures and choices. */
export const describeStrategies = () => Object.fromEntries(
  Object.entries(STRATEGIES).map(([name, { fields, options }]) => [name, { fields, options }]),
);

export default STRATEGIES;
