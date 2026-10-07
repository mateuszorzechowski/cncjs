import { useEffect, useState } from 'react';
import {
  START, advance, pause, play, seek, setMode, shownAt, stepBy,
} from '../machine/player';
import { segmentsOf, totalOf } from '../machine/timeline';

// The clock's tick: about thirty frames a second.
const TICK_MS = 33;

/**
 * The Setup drawing's player on a clock — see `machine/player`: `items` the
 * cycle laid out, `hold` how long a loop's end is held, `running` false to
 * stand the clock still (a figure being set plays a loop of its own).
 */
const usePlayer = (items, { hold, running = true }) => {
  const [state, setState] = useState(START);
  const total = totalOf(items);
  const segments = segmentsOf(items);
  const idle = !running || state.ended || (state.paused && state.stopAt === null);
  useEffect(() => {
    if (idle) {
      return undefined;
    }
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setState((was) => advance(was, dt, { total, hold }));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [idle, total, hold]);
  return {
    t: shownAt(state, total),
    mode: state.mode,
    paused: state.paused,
    ended: state.ended,
    range: state.range,
    play: () => setState(play),
    pause: () => setState((was) => pause(was, segments)),
    seek: (range) => setState((was) => seek(was, range)),
    setMode: (mode) => setState((was) => setMode(was, mode, segments)),
    step: (dir) => setState((was) => stepBy(was, dir, segments)),
  };
};

export default usePlayer;
