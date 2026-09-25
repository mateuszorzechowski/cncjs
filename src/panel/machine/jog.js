import controller from './controller';
import { BEAT_MS, jogToleranceMs, observeBeatGap } from './deadman';
import { inMm } from './units';

const GRBL = 'Grbl';
const SMOOTHIE = 'Smoothie';

/**
 * A jog is a direction, not an axis.
 *
 * The four corners of the cross move two axes at once, so everything below
 * takes a map of axis to number rather than an axis and a distance. A single
 * key is `{ x: 10 }`; a corner is `{ x: 10, y: 10 }`. One shape means the
 * corners are not a second kind of control with their own rules — they hold,
 * they cancel, and they obey the step and the feed rate exactly as the sides
 * do.
 *
 * Written out in X, Y, Z order so the line is the same whichever order the
 * caller happened to build the map in, and an axis asking for nothing is left
 * off it entirely.
 */
const AXIS_ORDER = ['x', 'y', 'z'];

const words = (moves) => AXIS_ORDER
  .filter((axis) => Number.isFinite(moves[axis]) && moves[axis] !== 0)
  .map((axis) => `${axis.toUpperCase()}${moves[axis]}`)
  .join(' ');

/**
 * The lines that move the machine one step in some direction.
 *
 * Returned rather than sent, so the decision can be tested without a machine
 * and without mocking time. Sending is `jog()` below and is three lines long.
 *
 * **Grbl gets `$J=`, and that is not a detail.** The old application jogs with
 * `G91` / `G0` / `G90`, which has three problems on a machine: `G0` is a rapid,
 * so the jog speed the mockup lets an operator choose would be ignored; the
 * modal state is changed and changed back, so a jog interrupted between those
 * two lines leaves the machine in relative mode; and it cannot be cancelled —
 * once the move is in the planner it runs to the end. `$J=` is Grbl 1.1's
 * jogging command: it carries its own feed rate, leaves the modal state alone,
 * and is cancelled by `jogCancel` (0x85).
 *
 * `G21` is on the line on purpose. The distance is in millimetres whatever the
 * machine's current units happen to be, so a panel showing mm cannot send
 * inches.
 *
 * Anything that is not Grbl or Smoothie gets the old dance, with `G1` and a
 * feed rate rather than `G0` — at least the chosen speed is honoured. Marlin
 * and TinyG have their own jogging and neither is implemented here, which is
 * recorded in the panel's README rather than guessed at.
 */
export const jogLines = ({ type, moves, feedrate }) => {
  const word = words(moves);

  if (type === GRBL || type === SMOOTHIE) {
    return [`$J=G91 G21 ${word} F${feedrate}`];
  }

  return ['G91', `G1 ${word} F${feedrate}`, 'G90'];
};

/**
 * How far an axis can still go in one direction before it runs out.
 *
 * **This is what a held key has to ask, and asking the wrong question broke
 * it.** `jogTravel` answers "how long is this axis", which as a relative move
 * from wherever the tool happens to be overshoots the end of the table almost
 * every time. With `$20=1` the firmware refuses the line outright — it does
 * not clip it — so holding a key did nothing at all, silently. With soft
 * limits off the same line runs into a limit switch instead.
 *
 * Null when the machine has not reported its travel, in which case there is
 * no boundary to measure against and the bounded fallback stands.
 */
export const jogRoom = (axis, sign, envelope, position) => {
  const at = Number.parseFloat(position?.[axis]);

  if (!envelope || !Number.isFinite(at)) {
    return null;
  }

  return sign > 0 ? envelope.max[axis] - at : at - envelope.min[axis];
};

/**
 * Move by one step, never past the end of the travel.
 *
 * **On Grbl the step crosses the socket as a direction and a distance.** The
 * bounding is what made this a client's business at all: with `$20=1` the
 * firmware refuses a relative move that would leave the travel outright — it
 * does not clip it — so at the edge of the table the key did nothing at all
 * and said nothing about why, and the panel learned to shorten the step by
 * carrying `$130`-`$132` and `$23` around. The side holding the port has all
 * of that, and can answer `no-room` besides.
 *
 * The other firmwares keep the composed line, the same choice `estop`, `zero`
 * and the travels made. There the step is still shortened to what is left
 * rather than refused, so the tool ends up exactly at the limit instead of a
 * millimetre short of it, and nothing is sent once there is nothing to give.
 */
export const jog = ({ type, dir, distance: shown, feedrate: shownRate, units, envelope, position }) => {
  if (!units) {
    return false;
  }
  /*
   * In the units the operator was shown, and said so: the server turns them
   * into millimetres (see `services/units`).
   */
  if (type === GRBL) {
    controller.command('jogStep', { dir, distance: shown, feedrate: shownRate, units: units.name });
    return true;
  }

  /*
   * The other firmwares get a line composed here, so the millimetres are
   * worked out here too — with the server's factor, the one sum this path
   * cannot hand over while the server has no jog for them.
   */
  const distance = inMm(shown, units);
  const feedrate = inMm(shownRate, units);
  const bounded = {};

  for (const axis of Object.keys(dir)) {
    const sign = Math.sign(dir[axis]);
    const room = jogRoom(axis, sign, envelope, position);
    const allowed = room === null ? distance : Math.min(distance, Math.max(0, room));
    if (allowed > 0) {
      bounded[axis] = sign * allowed;
    }
  }

  if (!Object.keys(bounded).length) {
    return false;
  }

  jogLines({ type, moves: bounded, feedrate }).forEach((line) => {
    controller.command('gcode', line);
  });
  return true;
};

/**
 * Whether a key can be held down to keep moving.
 *
 * Only Grbl. Continuous jogging is one long move plus the ability to abandon
 * it, and `jogCancel` (0x85) is what abandons it — Smoothie takes `$J=` but has
 * no cancel, so a held key there would commit to the whole distance before the
 * finger came off. That is not a control, it is a trap.
 */
export const canJogContinuously = (type) => type === GRBL;

/**
 * Stop a jog that is already running.
 *
 * Only Grbl has this. On anything else the move is in the planner and runs to
 * the end, which is the honest answer rather than a button that pretends.
 */
/*
 * The beat that keeps a held jog alive, and when the last one went.
 *
 * Module state rather than a ref, because a jog outlives the component that
 * started it: the keyboard hook and the pad both drive this stream, and a
 * screen that re-rendered mid-hold would otherwise have two beats or none.
 */
let beatTimer = null;
let lastBeatAt = 0;

const stopBeating = () => {
  if (beatTimer) {
    clearInterval(beatTimer);
    beatTimer = null;
  }
};

/*
 * Idempotent, because aiming a running jog somewhere else is `jogStart` again
 * — and restarting the timer there would reset the rhythm on every direction
 * change and record a short gap that never happened.
 */
const startBeating = () => {
  if (beatTimer) {
    return;
  }

  lastBeatAt = Date.now();
  beatTimer = setInterval(() => {
    // The port going away mid-hold is the one way this loop outlives the jog
    // it belongs to: a release arrives from a key or from `blur`, and a socket
    // that dropped sends neither. Left running it would beat into nothing for
    // the life of the page.
    if (!controller.port) {
      stopBeating();
      return;
    }

    const now = Date.now();
    // How late this browser actually was, which is what the next jog's
    // tolerance is sized from. Handed over as it happens rather than at the
    // end of the jog: the figure is declared before a jog rather than used
    // during one, so there is nothing to change mid-move.
    observeBeatGap(now - lastBeatAt);
    lastBeatAt = now;
    controller.command('jogHold');
  }, BEAT_MS);
};

export const jogStop = (type) => {
  stopBeating();
  if (type === GRBL) {
    controller.command('jogCancel');
  }
};

/**
 * Start jogging, and keep jogging until `jogStop`.
 *
 * **The loop lives in the server**, because it is driven by `ok` — the
 * acknowledgement of each short `$J=` — and only the side holding the serial
 * port sees those. Grbl's own documentation describes the method; a client
 * can only guess at the rhythm, and a guess that sends faster than the
 * machine consumes builds a backlog that a change of direction has to wait
 * behind. See `src/server/controllers/Grbl/jog.js`.
 *
 * Aiming a running jog somewhere else is this same call again: the server
 * lets the segments in flight finish and sends the next ones the new way, so
 * turning never needs a cancel.
 *
 * Only Grbl. Smoothie takes `$J=` but has no way to call one off, so a held
 * key there would commit to the whole distance before the finger came up —
 * that is not a control, it is a trap.
 */
export const jogStart = (type, dir, feedrate, linkMs = null, units = null) => {
  if (!canJogContinuously(type)) {
    return false;
  }
  /*
   * And how long this panel can go without saying the key is still down.
   *
   * Declared here because this is the side that knows: its own timers and its
   * own link. The server clamps it and ends the jog when a confirmation is
   * later than that — which is the only thing standing between a wedged tab
   * and a machine that travels until the axis runs out. See
   * `machine/deadman`.
   */
  // The rate as shown, with its units; the server writes millimetres.
  controller.command('jogStart', dir, feedrate, jogToleranceMs(linkMs), units?.name);
  startBeating();
  return true;
};
