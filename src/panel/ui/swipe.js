import { useEffect } from 'react';

/** How far a finger has to travel sideways before it is a swipe, in pixels. */
export const SWIPE_PIXELS = 60;

/**
 * Which way a finger's travel turns the page: `1` to the next, `-1` to the
 * one before, `0` for none — too short, or more up and down than across,
 * which is the screen being scrolled. Pure, for Jest.
 */
export const swipeTurn = (dx, dy) => {
  if (Math.abs(dx) < SWIPE_PIXELS || Math.abs(dx) < 2 * Math.abs(dy)) {
    return 0;
  }
  return dx < 0 ? 1 : -1;
};

/**
 * A finger's sideways swipe over `ref`'s element, as `onTurn(1 | -1)`.
 *
 * Touch events rather than pointer events: the content under the finger
 * scrolls, and the browser cancels a pointer the moment it takes the gesture
 * for a pan — the swipe never ended, measured on the settings. A touch ends
 * whatever the page did with it. A mouse drag is a selection, not a page turn.
 */
export const useSwipe = (ref, onTurn) => {
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }
    let from = null;
    const start = (event) => {
      const touch = event.touches.length === 1 ? event.touches[0] : null;
      from = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const end = (event) => {
      const touch = event.changedTouches[0];
      if (!from || !touch) {
        return;
      }
      const turn = swipeTurn(touch.clientX - from.x, touch.clientY - from.y);
      from = null;
      if (turn) {
        onTurn(turn);
      }
    };
    const cancel = () => {
      from = null;
    };
    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchend', end);
    node.addEventListener('touchcancel', cancel);
    return () => {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', cancel);
    };
  }, [ref, onTurn]);
};
