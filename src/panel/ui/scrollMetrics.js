/**
 * The arithmetic of a scroller: where its edges are, and where its thumb goes.
 *
 * Its own file, in `.js`, because the Jest tier only transforms `.js` and this
 * is the part worth testing. It began inside the settings screen and moved out
 * when three more scrollers wanted the same behaviour.
 */

/**
 * Which edges have something hidden behind them.
 *
 * Both fades are conditional, and each for its own reason. A permanent top
 * fade would wash out the first row of a section nobody has scrolled yet --
 * *"ten fade od gory tez przy skorlu"*, at the scroll, not before it. And a
 * permanent bottom one would hide the very thing the bottom padding was added
 * to show: the end of the section, reached.
 *
 * A pixel of slack on each comparison. `scrollTop` is fractional on a phone
 * with a scaled viewport, so `> 0` is true at rest and the top would fade by
 * a hair on a screen nobody had touched.
 */
export const edgesOf = (el) => (el ? {
  top: el.scrollTop > 1,
  bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
} : { top: false, bottom: false });

/**
 * The shortest a thumb may be, in pixels.
 *
 * Proportion alone gives a very long list a three-pixel sliver, which reads
 * as a speck of dirt rather than as a position. Every phone does this.
 */
export const MIN_THUMB = 28;

/**
 * How far short of each end of its container the track stops, in pixels.
 *
 * Run from edge to edge it began and ended exactly where the card did, and
 * read as part of the card's border rather than as a thing of its own —
 * *"troche krotszy zeby byl maly margin"* (2026-09-25). The thumb travels the
 * shortened track, so at either end of the list it sits at the track's end.
 */
export const TRACK_INSET = 6;

/**
 * Where the indicator sits, in pixels down the scroller, or nothing.
 *
 * `null` when there is nothing to scroll: a thumb as long as its track says
 * "you are looking at all of it", which is true and is also clutter on the
 * many cards here that fit.
 *
 * The travel is the track less the thumb, not the track — a thumb positioned
 * by the raw fraction hangs its bottom half off the end at the end of the
 * scroll. And once the thumb has been lengthened to `MIN_THUMB`, the travel
 * has to be measured from the lengthened one or the last screenful arrives
 * before `scrollTop` does.
 */
export const thumbOf = (el, min = MIN_THUMB, inset = 0) => {
  if (!el) {
    return null;
  }

  const { scrollTop, clientHeight, scrollHeight } = el;
  const hidden = scrollHeight - clientHeight;
  const track = clientHeight - (2 * inset);

  if (hidden <= 1 || track <= 0) {
    return null;
  }

  const height = Math.min(track, Math.max(min, Math.round((clientHeight / scrollHeight) * track)));
  const travel = track - height;
  const at = Math.min(1, Math.max(0, scrollTop / hidden));

  return { height, top: inset + Math.round(at * travel) };
};

/** The same for a row that scrolls sideways: is there more to the left, to the right. */
export const sideEdgesOf = (el) => (el ? {
  left: el.scrollLeft > 1,
  right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
} : { left: false, right: false });

/** A sideways thumb: its width and where it starts along a track as wide as the row. */
export const sideThumbOf = (el, min = MIN_THUMB) => {
  if (!el) {
    return null;
  }
  const { scrollLeft, clientWidth, scrollWidth } = el;
  const hidden = scrollWidth - clientWidth;
  if (hidden <= 1 || clientWidth <= 0) {
    return null;
  }
  const width = Math.min(clientWidth, Math.max(min, Math.round((clientWidth / scrollWidth) * clientWidth)));
  const at = Math.min(1, Math.max(0, scrollLeft / hidden));
  return { width, left: Math.round(at * (clientWidth - width)) };
};
