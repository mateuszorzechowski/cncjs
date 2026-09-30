import { useEffect, useState } from 'react';

/**
 * How many screen pixels one unit of a drawing's viewBox takes, measured on
 * the drawing: `[ref, scale]`. The probing drawings keep their lines and
 * labels at screen sizes (Claude Design, probe proposals, 2026-09-30:
 * *"linie w pikselach ekranu"*), so they need to know how large they are
 * drawn. `width` and `height` are the viewBox's: a drawing held to a height
 * is fitted inside its box, at the smaller of the two scales. Until
 * measured, `guess`.
 */
const useViewScale = (width, height, guess = 1.5) => {
  const [node, setNode] = useState(null);
  const [scale, setScale] = useState(guess);
  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      if (box.width > 0 && box.height > 0) {
        setScale(Math.min(box.width / width, box.height / height));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, width, height]);
  return [setNode, scale];
};

export default useViewScale;
