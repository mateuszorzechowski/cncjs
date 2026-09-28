import { createContext, useContext, useEffect, useState } from 'react';

/**
 * How wide the panel is, measured rather than inferred.
 *
 * Screens ask this and then render one layout. They used to render both and
 * hide one with a container query, which cost two things: every change made
 * for the panel had to be checked against a phone layout sitting in the same
 * file, and anything holding state had to be rendered twice or lifted out.
 *
 * Measured from the shell element, not the window. That is the number that is
 * true in both places it has to be: on a real phone the shell is the viewport,
 * and inside the review frame the shell is given the target's width outright —
 * the frame scales what is painted, not what is laid out. `matchMedia` would
 * have answered for the desktop window in the second case, which is how a
 * preview quietly stops being a preview.
 */
const PHONE_BELOW = 768;

const ShellWidth = createContext(Infinity);

/**
 * The shell element itself, for the things that must not be rendered where
 * they are written.
 *
 * A sheet is `fixed`, and `fixed` is only fixed to the viewport while no
 * ancestor establishes a containing block. `transform`, `filter` and -- the
 * one that caught this -- `mask-image` all do, so the settings screen's fade
 * quietly turned every sheet opened beneath it into a box clipped to the
 * scrolling area and scrolling away with it: *"sheety sie zepsuly po skrolu
 * chyba so ucinane i znikaja gdzies"* (2026-09-23).
 *
 * The shell rather than `document.body`, because the review frame scales the
 * panel by transforming this element and a sheet has to be scaled with it.
 */
const ShellNode = createContext(null);

export const useShellNode = () => useContext(ShellNode);
export const ShellNodeProvider = ShellNode.Provider;

export const useIsPhone = () => useContext(ShellWidth) < PHONE_BELOW;

/*
 * Wide enough for a third card beside two — the Files screen's editor, on a
 * Full HD screen (Mateusz, 2026-09-25). The shell's width rather than the
 * `fullhd` target, which only the review frame sets: a real 1920px screen
 * measures 1920 here too.
 */
const WIDE_FROM = 1800;

export const useIsWide = () => useContext(ShellWidth) >= WIDE_FROM;

export const useMeasuredShell = () => {
  const [node, setNode] = useState(null);
  const [width, setWidth] = useState(Infinity);

  useEffect(() => {
    if (!node) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref: setNode, width, node };
};

/**
 * The drawing's Full HD tokens on a real Full HD screen (decision D,
 * 2026-09-28): the `fullhd` target — a 200px rail, 26px of padding, 68px
 * controls — was set only by the review frame, so a 1920 screen ran on the
 * tablet's. Same threshold as a third card. The review frame's own `phone`
 * target is left alone; only `fullhd` is taken back.
 *
 * The app's alone, not every measured shell's: it sets the attribute on the
 * whole document, and the design-sync previews measure several shells on
 * one page — a PC cell there would have switched the phone's beside it.
 * Those scope the attribute to their own frame instead.
 */
export const useFullHdTarget = (width) => {
  const fullHd = Number.isFinite(width) && width >= WIDE_FROM;
  useEffect(() => {
    const root = document.documentElement;
    if (fullHd) {
      root.dataset.target = 'fullhd';
    } else if (root.dataset.target === 'fullhd') {
      delete root.dataset.target;
    }
  }, [fullHd]);
};

export const ShellWidthProvider = ShellWidth.Provider;
