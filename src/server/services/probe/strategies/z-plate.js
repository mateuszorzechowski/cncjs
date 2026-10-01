import { liftOver, touch } from '../moves';
import { checkSurface, surfaceOptions, surfaceShift } from '../surface';

/**
 * A flat plate on the work — or on the table — touched from above: the
 * surface under it is the touch less the plate, and Z0 is there or the
 * work's thickness away (`surface`).
 */
export default {
  fields: ['maxZ', 'fast', 'retract', 'slow', 'plateThickness', 'lift', 'stockThickness'],
  options: surfaceOptions,
  touches: true,

  check: (options) => checkSurface(options),

  steps: (params) => [...touch('z', -1, params.maxZ, 'z', params), liftOver('z', params.lift)],

  zero: (params, options, seen) => ({ z: seen.z.z - params.plateThickness + surfaceShift(params, options) }),
};
