/**
 * Where Z0 goes, against where the plate or the sheet lay (Mateusz,
 * 2026-10-01): measured on the work or on the table (`on`), the zero on the
 * work's top or on the table (`z0`). The same: the zero is where it was
 * measured, as it always was. Not: the work's thickness between them — down
 * by it from the top to the table, up by it from the table to the top.
 * For the methods that find a Z by a surface; the corner keeps its top.
 */
export const ON = ['work', 'table'];
export const Z0 = ['top', 'table'];

export const surfaceOptions = { on: ON, z0: Z0 };

/** Why these are not a surface and a zero, or null. Left out, the work and its top. */
export const checkSurface = ({ on = 'work', z0 = 'top' } = {}) => (ON.includes(on) && Z0.includes(z0) ? null : 'bad-surface');

/** How far Z0 moves from the surface measured, in mm. */
export const surfaceShift = (params, { on = 'work', z0 = 'top' } = {}) => {
  if (on === 'work' && z0 === 'table') {
    return -params.stockThickness;
  }
  if (on === 'table' && z0 === 'top') {
    return params.stockThickness;
  }
  return 0;
};
