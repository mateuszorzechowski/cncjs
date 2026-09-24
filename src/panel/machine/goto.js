import controller from './controller';

/**
 * Going somewhere, without dragging the tool through the work on the way.
 *
 * Two moves an operator asks for by pointing: back to the work zero, and to a
 * point picked off the drawing. Both are Z up first and then across, and this
 * is where the panel leaves the old application behind — cncjs sends a bare
 * `G0 X0 Y0`, so whatever the tool is buried in, it crosses the work at that
 * depth.
 *
 * **Both lines are composed on the server now**, out of `$130`-`$132`, `$23`,
 * `$110` and `$112` — four firmware settings the panel used to decode to work
 * out where the top of the travel is and how fast to cross it. See
 * `src/server/controllers/Grbl/travel.js`.
 *
 * What is left here is the intention and the two questions a screen has to
 * answer before it offers a button: is there a machine that can do this, and
 * is the point somewhere it can reach.
 */

/**
 * Whether there is a machine that can be asked for a travel at all.
 *
 * The envelope is the test because it comes from the side that makes the move:
 * the server sends one for a Grbl that has reported its travel, and for
 * nothing else. Without one there is no known top to retract to, and the move
 * that is left is exactly the one being avoided — so the key is offered as
 * disabled rather than as a `G0 X0 Y0` that looks the same and behaves like
 * the old application.
 */
export const canGoToWorkZero = (envelope) => Boolean(envelope);

/**
 * Whether the point under the cursor is somewhere the machine could go.
 *
 * Z is not checked: the travel goes to the top of it, which is inside by
 * definition. The point comes from a cursor over the grid and is in machine
 * coordinates, which is the frame everything on that grid is drawn in.
 *
 * The same question the server asks before it composes the line, asked here so
 * the button is dark rather than refused — with `$20=1` the firmware rejects a
 * move outside the travel outright rather than clipping it, so pointing
 * slightly wide of the bed used to do nothing at all and say nothing.
 */
export const canGoToPoint = (envelope, point) => Boolean(
  envelope &&
  Number.isFinite(point?.x) &&
  Number.isFinite(point?.y) &&
  point.x >= envelope.min.x && point.x <= envelope.max.x &&
  point.y >= envelope.min.y && point.y <= envelope.max.y
);

/** Retract, then travel to a point picked off the drawing. */
export const goToPoint = (point) => {
  controller.command('goToPoint', { x: point?.x, y: point?.y });
};

/** Retract, then travel to the work zero of whichever system is active. */
export const goToWorkZero = () => {
  controller.command('goToWorkZero');
};

/**
 * Call off a travel that is under way.
 *
 * The same `jogCancel` a held jog key uses, and it works here for the same
 * reason: these moves are jogs. Grbl drops whatever is left of them and
 * decelerates; nothing else in the machine's state is touched.
 */
export const cancelTravel = () => controller.command('jogCancel');

export default goToWorkZero;
