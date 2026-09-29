import { touch } from '../moves';

/**
 * A flat plate on the work, touched from above: the top of the work is the
 * touch less the plate.
 */
export default {
  fields: ['plateThickness', 'maxZ', 'retract', 'fast', 'slow'],
  options: {},

  check: () => null,

  steps: (params) => touch('z', -1, params.maxZ, 'z', params),

  zero: (params, options, seen) => ({ z: seen.z.z - params.plateThickness }),
};
