/*
 * Where Z0 goes against where the plate or the sheet lay (Mateusz,
 * 2026-10-01, `services/probe/surface`): measured on the work or the table
 * (`on`), Z0 on the work's top or the table (`z0`). Left as it is, the zero
 * is where it was measured. Apart from the wizard's talk to the server, so
 * the drawings need no machine.
 */
export const SURFACE = { on: 'work', z0: 'top' };

/** Whether Z0 lies the work's thickness away from where it is measured. */
export const surfaceShifts = (surface) => (surface.on === 'work') !== (surface.z0 === 'top');
