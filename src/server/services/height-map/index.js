import events from 'events';

/**
 * The height map the server keeps: the last one measured and confirmed, in
 * `.cncrc`, so a restart does not cost the operator the measurement. One map
 * — the surface under the work on the table now. See `compensate` for what
 * it is.
 */

const isGrid = (values) => Array.isArray(values) && values.length >= 2 && values.every(Number.isFinite) &&
  values.every((v, k) => k === 0 || v > values[k - 1]);

/** A map as `compensate` needs it, or null — what `.cncrc` holds is trusted no further than a request. */
export const validMap = (map) => {
  if (!map || typeof map !== 'object' || !isGrid(map.xs) || !isGrid(map.ys) || !Number.isFinite(map.travel)) {
    return null;
  }
  const { xs, ys, dz } = map;
  if (!Array.isArray(dz) || dz.length !== ys.length || !dz.every((row) => Array.isArray(row) && row.length === xs.length && row.every(Number.isFinite))) {
    return null;
  }
  return map;
};

class HeightMap extends events.EventEmitter {
  map = null;

  open(saved) {
    this.map = validMap(saved);
  }

  current() {
    return this.map;
  }

  /** Keep `map` (null: none), with when it was measured. */
  set(map) {
    this.map = map ? { ...map, at: map.at || new Date().toISOString() } : null;
    this.emit('change', this.map);
  }
}

const heightMap = new HeightMap();

export default heightMap;
