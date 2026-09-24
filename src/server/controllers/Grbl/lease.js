/**
 * Who is allowed to move the machine at this moment.
 *
 * Two pendants and the old application in a tab is the ordinary case on this
 * bench, and until now nothing arbitrated between them. `jogStart` refused
 * while a program ran and `gcode:start` refused while a jog was held, which
 * covers exactly one pair of the several that collide: two devices sending
 * travels at each other, a go-to-zero fired while somebody is tapping a step,
 * a program started the instant another device let go of a key.
 *
 * **A soft lease, decided 2026-09-24: "anyone may stop it; not everyone may
 * start it".** Stopping is never arbitrated — `jogStop`, `estop`, a feed hold
 * and a reset go through from whoever is nearest, because the person who can
 * see the machine is the person who should be able to stop it, and a stop
 * asked for twice costs nothing. Starting is: the device that last moved the
 * machine holds it, briefly, and everybody else is refused with a reason.
 *
 * **Soft, because it expires rather than being handed back.** A lease that
 * has to be released is a lease that gets stranded — a pendant put down mid
 * jog, a tab closed, a phone that slept — and the machine would then belong
 * to nobody until something noticed. Here the claim simply runs out, and the
 * only thing keeping it alive is movement actually happening.
 */

/**
 * How long a claim outlives the command that made it, in milliseconds.
 *
 * It has one job: cover the gap between a movement command being accepted and
 * the machine being visibly in motion, because a lease that ended inside that
 * gap would let a second device slip a move in underneath the first. On this
 * bench that gap is a status report away — the report period is 100ms and the
 * report itself is about that far behind the wire — and the planner's own
 * lookahead sits on top of it.
 *
 * It also has to cover the rhythm of a finger, since a jog step is one command
 * per tap and a run of taps has to read as one person driving rather than as
 * the machine changing hands four times a second.
 *
 * **Stated rather than measured, and sized from the two things it has to
 * cover.** A status report every 100ms, arriving about as far behind the wire
 * again, puts the worst case for the first half at a few hundred milliseconds;
 * a finger tapping a step key is slower than that. Three quarters of a second
 * clears both with room, and is short enough that a second pendant picked up
 * after the first is put down waits less than a beat for it.
 *
 * It errs in the safe direction on purpose. A lease held a little too long
 * costs one operator one refusal they can see the reason for; a lease dropped
 * a little too early costs two devices writing to one planner, which is the
 * fault this exists to prevent.
 */
export const LEASE_MS = 750;

/**
 * The device holding movement now, or null when nobody is.
 *
 * Time is passed in rather than read, because everything here is decided
 * inside one command handler and two readings of the clock inside one decision
 * is a way to be subtly inconsistent for no benefit.
 */
export const leaseHolder = (lease, now) => (
  lease && lease.until > now ? lease.device : null
);

/** The lease after this device has moved something. */
export const renewed = (device, now) => ({ device, until: now + LEASE_MS });

/**
 * Why this device may not move the machine, or null when it may.
 *
 * **A program is not a device and is not answered here.** Whether anything
 * but a stop may go through while a job is under way is one rule for every
 * command a client sends, so it is decided before any of them is carried out
 * — see `program-gate.js`. By the time a command reaches this, the program
 * has already let it.
 *
 * **An unidentified device is its own device, not everybody's.** A client that
 * sends no identity gets its socket id, which is the honest reading: it is one
 * client, it just cannot survive its own reconnection. That belongs in
 * `CNCEngine`, where the identity is read; here a null device would compare
 * equal to a null holder and hand movement to whoever asked first, which is
 * the opposite of what this is for.
 */
export const motionRefusal = ({ lease, device, now }) => {
  const holder = leaseHolder(lease, now);
  if (holder && holder !== device) {
    return 'held-elsewhere';
  }

  return null;
};
