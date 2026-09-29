import { liftOver, touch } from '../moves';

/**
 * A flat plate on the work, touched from above: the top of the work is the
 * touch less the plate.
 */
export default {
  fields: ['maxZ', 'fast', 'retract', 'slow', 'plateThickness', 'lift'],
  options: {},
  touches: true,

  check: () => null,

  steps: (params) => [...touch('z', -1, params.maxZ, 'z', params), liftOver('z', params.lift)],

  zero: (params, options, seen) => ({ z: seen.z.z - params.plateThickness }),
};
