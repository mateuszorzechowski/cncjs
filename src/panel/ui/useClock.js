import { useEffect, useState } from 'react';

/**
 * A drawing's clock that can be paused: milliseconds played since `what`
 * last changed, counting only while `running` and never past `until` (the
 * proposals' pause in the drawing's corner, 2026-09-30: it plays the move
 * under way to its end and stops there). A new `what` starts from the top.
 */
export const useClock = (what, running = true, until = null) => {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    setMs(0);
  }, [what]);
  useEffect(() => {
    if (!running) {
      return undefined;
    }
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setMs((was) => (until === null ? was + dt : Math.min(until, was + dt)));
    }, 33);
    return () => clearInterval(id);
  }, [running, what, until]);
  return ms;
};

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the system asks for less motion; the drawings then show each
 * move's end frame rather than playing it (proposal: *"przy ogranicz ruch
 * w systemie — klatki końcowe bez animacji"*).
 */
export const useReducedMotion = () => {
  const [reduce, setReduce] = useState(() => Boolean(typeof window !== 'undefined' && window.matchMedia?.(QUERY).matches));
  useEffect(() => {
    const media = window.matchMedia?.(QUERY);
    if (!media) {
      return undefined;
    }
    const change = () => setReduce(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return reduce;
};
