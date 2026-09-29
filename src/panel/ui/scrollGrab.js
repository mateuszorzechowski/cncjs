import { useEffect, useRef, useState } from 'react';
import { scrollForThumb } from './scrollMetrics';

/**
 * A scroll track that can be taken hold of — by a mouse or a finger — and
 * dragged, and says while it is held (review note, 2026-09-29: *"skrol mogę
 * chwycić i skrolować ruchem myszy, nie tylko kółkiem; jakiś wskaźnik, że
 * trzymam skrol; na telefonie i tablecie tak samo"*). The panel's scrollers
 * and the editor's scrollbar both.
 *
 * Pressed on the thumb, the thumb follows the pointer where it was taken;
 * pressed on the track beside it, the thumb comes to the pointer and follows
 * from there. A button on the track (the editor's marks) is left to itself.
 *
 * `strip` is the element pressed — as long as the track, starting where it
 * starts. `geometry()` answers, when asked, `{ top, height, track, hidden,
 * scroller }`: the thumb's place and length on the track, the track's length,
 * how much is scrolled out of sight and the element to scroll. Returns
 * `[held, hot]`: taken hold of, and under a mouse.
 */
export const useScrollGrab = (strip, geometry) => {
  const [held, setHeld] = useState(false);
  const [hot, setHot] = useState(false);
  const asked = useRef(geometry);
  asked.current = geometry;

  useEffect(() => {
    const node = strip.current;
    if (!node) {
      return undefined;
    }
    let offset = 0;
    const along = (event) => event.clientY - node.getBoundingClientRect().top;
    const follow = (event) => {
      const at = asked.current();
      if (at) {
        at.scroller.scrollTop = scrollForThumb(along(event) - offset, at.track, at.height, at.hidden);
      }
    };
    const press = (event) => {
      const at = asked.current();
      if (!at || event.target.closest('button')) {
        return;
      }
      const y = along(event);
      offset = y >= at.top && y <= at.top + at.height ? y - at.top : at.height / 2;
      node.setPointerCapture(event.pointerId);
      setHeld(true);
      follow(event);
      event.preventDefault();
    };
    const drag = (event) => {
      if (node.hasPointerCapture(event.pointerId)) {
        follow(event);
      }
    };
    const release = () => setHeld(false);
    const enter = (event) => setHot(event.pointerType === 'mouse');
    const leave = () => setHot(false);
    node.addEventListener('pointerdown', press);
    node.addEventListener('pointermove', drag);
    // All three: a phone's browser does not always say the capture was lost.
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', release);
    node.addEventListener('lostpointercapture', release);
    node.addEventListener('pointerenter', enter);
    node.addEventListener('pointerleave', leave);
    return () => {
      node.removeEventListener('pointerdown', press);
      node.removeEventListener('pointermove', drag);
      node.removeEventListener('pointerup', release);
      node.removeEventListener('pointercancel', release);
      node.removeEventListener('lostpointercapture', release);
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', leave);
    };
  }, [strip]);

  return [held, hot];
};

/** The thumb's face: wider and in the accent while held, darker under a mouse. */
export const thumbFace = (held, hot) => {
  if (held) {
    return 'w-1.5 bg-acc';
  }
  return hot ? 'w-1 bg-ink' : 'w-1 bg-mut';
};

export default useScrollGrab;
