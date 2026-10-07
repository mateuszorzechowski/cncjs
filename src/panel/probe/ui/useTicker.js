import { useEffect, useState } from 'react';

/**
 * Milliseconds since `what` last changed, ticking at the design's 30 frames
 * a second — the clock a looped drawing plays against. A new `what` (another
 * figure picked, the machine's next step) starts its loop from the top.
 * Zero, and no timer at all, while `what` is nothing.
 */
const useTicker = (what) => {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    setMs(0);
    if (!what) {
      return undefined;
    }
    const start = performance.now();
    const id = setInterval(() => setMs(performance.now() - start), 33);
    return () => clearInterval(id);
  }, [what]);
  return what ? ms : 0;
};

export default useTicker;
