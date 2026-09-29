import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Whether what is open does not fit the room it has, and so should fold.
 *
 * `room` is the box that has a height, `content` what is inside it at its
 * natural height. Open, it folds once the content is taller than the room,
 * remembering how tall it was; folded, it opens again once the room is that
 * tall — measuring the folded content would say "fits" and open it straight
 * back into not fitting.
 *
 * For the jog card, whose XY and Z settings fold to a line each where they
 * do not fit under the pad, as they always do on a phone (review note,
 * 2026-09-29: the probe's position step, beside its instructions).
 */
const useFolds = () => {
  const room = useRef(null);
  const content = useRef(null);
  const needed = useRef(0);
  const [folded, setFolded] = useState(false);

  useLayoutEffect(() => {
    const box = room.current;
    if (!box || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const check = () => {
      if (!folded && content.current) {
        needed.current = content.current.offsetHeight;
        if (needed.current > box.clientHeight + 1) {
          setFolded(true);
        }
      } else if (folded && box.clientHeight >= needed.current) {
        setFolded(false);
      }
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(box);
    return () => observer.disconnect();
  }, [folded]);

  return { room, content, folded };
};

export default useFolds;
