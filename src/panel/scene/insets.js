/**
 * How far what stands over a drawing reaches into it, in pixels from each
 * edge of its canvas — for `makeRoom`.
 *
 * Read from the page at the moment of framing rather than passed down: the
 * options column opens and closes a group, the go-to readout comes and goes,
 * and the scene is framed only when asked. Each overlay says which edge it
 * stands on with `data-stage-inset` (`right`, `bottom`, `top`), inside the
 * element marked `data-stage` that holds the canvas.
 */
export const stageInsets = (canvas) => {
  const stage = canvas?.closest?.('[data-stage]');
  if (!stage) {
    return {};
  }
  const frame = canvas.getBoundingClientRect();
  const insets = { top: 0, right: 0, bottom: 0 };
  stage.querySelectorAll('[data-stage-inset]').forEach((overlay) => {
    const box = overlay.getBoundingClientRect();
    if (!box.width || !box.height) {
      return;
    }
    const side = overlay.dataset.stageInset;
    const reach = {
      right: frame.right - box.left,
      bottom: frame.bottom - box.top,
      top: box.bottom - frame.top,
    }[side];
    if (reach > 0) {
      insets[side] = Math.max(insets[side], reach);
    }
  });
  return insets;
};

export default stageInsets;
