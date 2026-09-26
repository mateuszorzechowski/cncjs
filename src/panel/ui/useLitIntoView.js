import { useEffect, useRef } from 'react';

/**
 * A ref for something that may be lit — a setting reached from the Geometria
 * summary — which scrolls it to the middle of its scroller when it is. A row
 * lit below the fold is a jump that seems to have gone nowhere.
 */
const useLitIntoView = (lit) => {
  const ref = useRef(null);
  useEffect(() => {
    if (lit) {
      ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [lit]);
  return ref;
};

export default useLitIntoView;
