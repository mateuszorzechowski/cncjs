/*
 * The one thing the panel takes from the old application, and the only file
 * allowed to reach for it.
 *
 * `app/lib/controller` is framework-free — socket.io and the cncjs event
 * protocol — and rewriting it would mean rewriting the part of cncjs that
 * actually talks to a machine. Everything else in `src/app` is out of bounds,
 * which is why the lint rule forbids the whole tree and this file carries the
 * single exception: one seam, written down, instead of a rule with a hole in
 * it that nobody remembers the shape of.
 */
// eslint-disable-next-line no-restricted-imports
import controller from 'app/lib/controller';

/*
 * Handed to the review overlay's state manager, in development only.
 *
 * Every reading on the panel arrives as an event on this object, so this is
 * where a simulated alarm or a loaded program can be put in without a machine
 * or a server being asked for it — see `scripts/design-review-states.js`. The
 * production build drops the branch entirely.
 */
if (process.env.NODE_ENV !== 'production') {
  window.__panelController = controller;
}

export default controller;
