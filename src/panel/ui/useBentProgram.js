import { useEffect, useState } from 'react';
import { fetchBentProgram } from '../probe/machine/probe';

/**
 * The loaded program as the machine will cut it with a height map (Mateusz,
 * 2026-10-03): `{ name, gcode }` the server bent, to be drawn in place of the
 * file — by the kept map (`of` `kept`) or the one just measured (`result`).
 * Asked again whenever `key` changes; null while `enabled` is false or there
 * is none.
 */
const useBentProgram = ({
  machine, of, enabled, key,
}) => {
  const [bent, setBent] = useState(null);
  useEffect(() => {
    if (!enabled || !machine.port) {
      setBent(null);
      return undefined;
    }
    let live = true;
    fetchBentProgram(machine.port, of).then((gcode) => {
      if (live) {
        setBent(gcode ? { name: machine.gcode?.name || '', gcode } : null);
      }
    }).catch(() => live && setBent(null));
    return () => {
      live = false;
    };
  }, [enabled, of, key, machine.port]); // eslint-disable-line react-hooks/exhaustive-deps
  return bent;
};

export default useBentProgram;
