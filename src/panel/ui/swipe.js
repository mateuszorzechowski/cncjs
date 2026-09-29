import { useEffect, useRef } from 'react';

/** How far a finger has to travel sideways before it is a swipe, in pixels. */
export const SWIPE_PIXELS = 60;

/*
 * A touch that starts on a scroll track is a drag of that track, and none of
 * the gestures here may take it: a sheet closed, a page turned or the menu
 * lifted while somebody was dragging a scrollbar (review note, 2026-09-29:
 * *"trzymanie i skrolowanie ma konflikt z zamykaniem karty"*). See `scrollGrab`.
 */
const onTrack = (event) => Boolean(event.target.closest?.('[data-scroll-grab]'));

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
      const touch = event.touches.length === 1 && !onTrack(event) ? event.touches[0] : null;
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

/** How far a finger has to travel up or down to open or close the menu, in pixels. */
export const LIFT_PIXELS = 40;

/** `up`, `down` or null: a vertical swipe, more up and down than across. */
export const swipeLift = (dx, dy) => {
  if (Math.abs(dy) < LIFT_PIXELS || Math.abs(dy) < 2 * Math.abs(dx)) {
    return null;
  }
  return dy < 0 ? 'up' : 'down';
};

/** A finger's swipe up or down over `ref`'s element, as `onLift('up' | 'down')`. */
export const useLift = (ref, onLift) => {
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }
    let from = null;
    const start = (event) => {
      const touch = event.touches.length === 1 && !onTrack(event) ? event.touches[0] : null;
      from = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const end = (event) => {
      const touch = event.changedTouches[0];
      if (!from || !touch) {
        return;
      }
      const way = swipeLift(touch.clientX - from.x, touch.clientY - from.y);
      from = null;
      if (way) {
        onLift(way);
      }
    };
    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchend', end);
    return () => {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchend', end);
    };
  }, [ref, onLift]);
};

/**
 * Whether a sheet dragged down this far, this fast, is let go of to close:
 * a quarter of its height (and never under 80px), or a flick.
 */
export const dragCloses = (dy, ms, height) => dy > Math.max(80, height * 0.25) || (dy > 30 && dy / Math.max(1, ms) > 0.6);

// The nearest thing between `node` and `top` that scrolls up and down.
const scrollerOf = (node, top) => {
  for (let at = node; at && at !== top; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at);
    if ((overflowY === 'auto' || overflowY === 'scroll') && at.scrollHeight > at.clientHeight + 1) {
      return at;
    }
  }
  return null;
};

/**
 * Dragging a sheet down to close it — told apart from scrolling it. A drag
 * starts only where there is nothing above to scroll back to: on the title
 * row, or on content already at its top. Not on a 3D view (a drag there
 * turns the scene) nor across (a page swipe). The sheet follows the finger;
 * let go far or fast enough and it closes, else it springs back.
 *
 * `around`: the scrim, where a drag down closes the sheet too — anywhere on
 * the screen, not only on the sheet (Mateusz, 2026-09-28: *"gest zamknięcia
 * arkusza w każdym miejscu ekranu"*). The sheet still follows the finger.
 */
export const useDragToClose = (ref, onClose, enabled = true, around = null) => {
  // Read through a ref: a screen redrawn by a status report every 100 ms
  // hands a new `onClose` each time, and rebinding would drop the drag.
  const closing = useRef(onClose);
  closing.current = onClose;
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const node = ref.current;
    if (!node) {
      return undefined;
    }
    let drag = null;
    const place = (dy, animate) => {
      node.style.transition = animate ? 'translate 180ms ease-out' : 'none';
      node.style.translate = dy ? `0 ${dy}px` : '';
    };
    const start = (event) => {
      const touch = event.touches.length === 1 ? event.touches[0] : null;
      if (!touch || event.target.closest('canvas') || onTrack(event)) {
        drag = null;
        return;
      }
      const scroller = scrollerOf(event.target, node);
      drag = scroller && scroller.scrollTop > 0
        ? null
        : { x: touch.clientX, y: touch.clientY, at: Date.now(), moving: false };
    };
    const move = (event) => {
      if (!drag) {
        return;
      }
      const touch = event.touches[0];
      const dx = touch.clientX - drag.x;
      const dy = touch.clientY - drag.y;
      if (!drag.moving) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
          return;
        }
        // Up, or across: a scroll or a page turn, and none of this.
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
          drag = null;
          return;
        }
        drag.moving = true;
      }
      event.preventDefault();
      place(Math.max(0, dy), false);
    };
    const end = (event) => {
      if (!drag?.moving) {
        drag = null;
        return;
      }
      const dy = event.changedTouches[0].clientY - drag.y;
      const closes = dragCloses(dy, Date.now() - drag.at, node.clientHeight);
      drag = null;
      if (closes) {
        closing.current();
      } else {
        place(0, true);
      }
    };
    const surfaces = [node, around?.current].filter(Boolean);
    surfaces.forEach((surface) => {
      surface.addEventListener('touchstart', start, { passive: true });
      surface.addEventListener('touchmove', move, { passive: false });
      surface.addEventListener('touchend', end);
      surface.addEventListener('touchcancel', end);
    });
    return () => {
      surfaces.forEach((surface) => {
        surface.removeEventListener('touchstart', start);
        surface.removeEventListener('touchmove', move);
        surface.removeEventListener('touchend', end);
        surface.removeEventListener('touchcancel', end);
      });
    };
  }, [ref, enabled, around]);
};
