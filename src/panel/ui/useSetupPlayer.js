import { useState } from 'react';
import { useClock } from './useClock';
import usePlayer from './usePlayer';
import { frameAt, rangeOf } from '../machine/timeline';

/**
 * A Setup drawing's clock (`ZPlateParams`, `CornerParams`, `PaperParams`):
 * the cycle on the player (`usePlayer`), and a figure being set (`picked`)
 * playing its own loop meanwhile, the player waiting.
 *
 * A pick on the bar while a figure is held plays the bar's part instead and
 * keeps the figure — its field focused, its moves pointed out (review note,
 * 2026-10-01: *"klikać po timeline i żeby fokus trzymał, kropki nie
 * znikały"*); focusing the field again loops it again.
 *
 * `playAt(ms, { field, still })` is the cycle module's.
 */
const useSetupPlayer = ({
  items, hold, playAt, still,
}) => {
  const [picked, setPicked] = useState(null);
  const [looping, setLooping] = useState(false);
  const loop = Boolean(picked && looping);
  const player = usePlayer(items, { hold, running: !loop });
  const fieldMs = useClock(picked, loop);
  const frame = loop ? playAt(fieldMs, { field: picked, still }) : { ...frameAt(items, player.t), focus: null };
  return {
    player,
    picked,
    loop,
    frame,
    p: still && !loop ? 1 : frame.p,
    onField: (name) => {
      setPicked(name);
      setLooping(Boolean(name));
    },
    pick: (ids, part = null) => {
      setLooping(false);
      player.seek({ ...rangeOf(items, ids, part), ids, part });
    },
  };
};

export default useSetupPlayer;
