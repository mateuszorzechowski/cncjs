import events from 'events';

/**
 * The height map the server keeps: the last one measured and confirmed, in
 * `.cncrc`, so a restart does not cost the operator the measurement. One map
 * — the surface under the work on the table now. See `compensate` for what
 * it is.
 *
 * Kept with the port it was measured on (`port`), when (`at`), and whether it
 * can still be trusted (`doubt`). A map is the surface where it was in
 * machine coordinates; once Grbl may have lost its position — the port closed,
 * the server restarted, an alarm that loses it — the same coordinates need not
 * be the same place, and the map is in doubt until measured again (Mateusz,
 * 2026-10-03: "nie ma sensu używać mapy, która może być niewiarygodna").
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

  /** The map from `.cncrc`: a server that was down may have missed the machine losing its position. */
  open(saved) {
    const map = validMap(saved);
    this.map = map && !map.doubt ? { ...map, doubt: { code: 'restart', at: new Date().toISOString() } } : map;
  }

  /** The map for `port`, or null: one measured on another port is not this machine's surface. */
  current(port) {
    const { map } = this;
    return map && (!map.port || port === undefined || map.port === port) ? map : null;
  }

  /** Keep `map` (null: none), measured on `port` — trusted, with when it was measured. */
  set(map, port) {
    this.map = map ? { ...map, port: port || map.port || null, at: map.at || new Date().toISOString(), doubt: null } : null;
    this.emit('change', this.map);
  }

  /** The machine on `port` may have lost its position (`code`): its map is in doubt. Whether it changed. */
  doubt(code, port) {
    const map = this.current(port);
    if (!map || map.doubt) {
      return false;
    }
    this.map = { ...map, doubt: { code, at: new Date().toISOString() } };
    this.emit('change', this.map);
    return true;
  }
}

const heightMap = new HeightMap();

export default heightMap;
