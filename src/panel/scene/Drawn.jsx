import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Says once when the scene has been drawn complete — for a screen that holds
 * a note over the canvas until then (the Pliki preview, 2026-09-25: the
 * canvas came up empty, then the part, then its figures, three jumps where
 * one was wanted).
 *
 * Complete means the part and the grid's figures, and the figures are
 * counted for the zoom in the first frame and shown in the second
 * (`GridLabels`). So the call is made at the start of the third, when the
 * second is on screen. The canvas draws only on demand, so this asks for the
 * frames it counts.
 */
const FRAMES = 3;

const Drawn = ({ onReady }) => {
  const count = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  useFrame(() => {
    if (count.current >= FRAMES) {
      return;
    }
    count.current++;
    if (count.current === FRAMES) {
      onReady();
    } else {
      invalidate();
    }
  });

  return null;
};

export default Drawn;
