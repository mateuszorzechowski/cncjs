/**
 * One probing measurement on Grbl — the runner every method goes through.
 *
 * A method (`services/probe/strategies`) is geometry: a list of steps, each a
 * target in machine coordinates. This is the wire: a step becomes one line,
 * one line is sent at a time, and the next one is worked out only when the
 * answer is in, because where it goes depends on where the last touch was.
 * Nothing in here knows which method is running.
 *
 * Measured on COM3, 2026-09-29, and what the answers below rest on:
 * - a touch: `[PRB:x,y,z:1]`, then `ok`;
 * - `G38.3` touching nothing: `[PRB:…:0]`, then `ok` — no alarm;
 * - `G38.2` touching nothing: `ALARM:5`, `[PRB:…:0]`, then still `ok`.
 *   The position in a `:0` report is not where the tool stopped, so a miss
 *   leaves the tool at the target, not at the report;
 * - a target past the soft limits: `ALARM:2` and **no `ok` at all** — Grbl
 *   waits for a reset. So an alarm ends the run where it is said; an `ok`
 *   that does follow falls through to the empty feeder, as the `$#` one at
 *   port open does. Waiting for it left the machine held as by a program
 *   (2026-09-29, a start at Z+225 with limits of -150..0).
 *
 * Every line is `G90 G21`: targets are absolute, so a failure that ends in an
 * alarm leaves the parser absolute rather than relative for whatever is typed
 * after the unlock. The modes the machine was in are put back at the end.
 */

const AXES = ['x', 'y', 'z'];

const fmt = (value) => String(Math.round(value * 1000) / 1000);

const words = (target) => AXES
  .filter((axis) => Number.isFinite(target[axis]))
  .map((axis) => `${axis.toUpperCase()}${fmt(target[axis])}`)
  .join(' ');

/** The one axis a target moves along from `from`, and which way, or null when it moves along none or more than one. */
const wayOf = (from, target) => {
  const moved = AXES.filter((axis) => Number.isFinite(target[axis]) && Math.abs(target[axis] - from[axis]) > 1e-9);
  return moved.length === 1 ? { axis: moved[0], sign: Math.sign(target[moved[0]] - from[moved[0]]) } : null;
};

/** Machine coordinates to the work coordinates a `G38` line is written in. */
const toWork = (target, wco) => Object.fromEntries(
  Object.entries(target).map(([axis, value]) => [axis, value - (wco[axis] || 0)]),
);

/** The line for each kind of step. */
const LINE = {
  move: (step, target) => `G90 G21 G53 G0 ${words(target)}`,
  dwell: (step) => `G4 P${fmt(step.seconds)}`,
  touch: (step, target, wco) => `G90 G21 G38.2 ${words(toWork(target, wco))} F${fmt(step.feed)}`,
  clear: (step, target, wco) => `G90 G21 G38.3 ${words(toWork(target, wco))} F${fmt(step.feed)}`,
};

/** Why a step's answer is a failure, or null. `prb` is the report, if one came. */
const OUTCOME = {
  move: () => null,
  dwell: () => null,
  touch: (prb) => (prb?.result === 1 ? null : 'no-touch'),
  // Contact on the way down beside a wall is the top of the plate.
  clear: (prb) => (prb?.result === 1 ? 'touched' : null),
};

/**
 * One run. `start` and `wco` in millimetres, machine; `restore` the line
 * that puts the modes back; `write(line)` puts a line on the cable;
 * `progress({ index, total, phase, seen })` as each step goes out, `seen`
 * the touches kept so far; `done(result)`
 * once — `{ seen }`, the touches kept by name, or `{ failure, phase }`.
 */
export const createProbeRun = ({ steps, start, wco, restore, write, done, progress = () => {} }) => {
  const seen = {};
  let here = { ...start };
  let index = -1;
  let target = null;
  let prb = null;
  let failure = null;
  let phase = 'idle';

  const finish = (result) => {
    if (phase === 'done') {
      return;
    }
    phase = 'done';
    done(result);
  };

  const failed = () => ({ failure, phase: steps[index]?.phase ?? null });

  const putBack = () => {
    phase = 'restoring';
    write(restore);
  };

  const next = () => {
    index++;
    if (index >= steps.length) {
      putBack();
      return;
    }
    target = steps[index].to(here, seen);
    /*
     * Two rapids in a row along one axis the same way are one: the tool goes
     * straight to where the second ends — off a touch and on up to the lift,
     * or on to a hole's middle (Mateusz, 2026-10-02). A rapid and a touch are
     * never joined: they are different moves.
     */
    while (steps[index].kind === 'move' && steps[index + 1]?.kind === 'move') {
      const way = wayOf(here, target);
      const further = steps[index + 1].to({ ...here, ...target }, seen);
      const then = wayOf({ ...here, ...target }, further);
      if (!way || !then || way.axis !== then.axis || way.sign !== then.sign) {
        break;
      }
      index++;
      target = { ...target, ...further };
    }
    const step = steps[index];
    prb = null;
    const waits = step.kind === 'wait';
    // `mark`, what a method says of the step besides its phase: a height map's point.
    progress({
      index, total: steps.length, phase: step.phase, seen: { ...seen }, ...(step.mark ? { mark: step.mark } : {}), ...(waits ? { waits } : {}),
    });
    // Nothing goes out for the operator's hands: the run stands until `resume`.
    if (waits) {
      phase = 'waiting';
      return;
    }
    write(LINE[step.kind](step, target, wco));
  };

  const answered = () => {
    const step = steps[index];
    failure = OUTCOME[step.kind](prb);
    if (failure) {
      putBack();
      return;
    }
    const touched = prb?.result === 1;
    here = { ...here, ...(touched ? { x: prb.x, y: prb.y, z: prb.z } : target) };
    if (step.keep) {
      seen[step.keep] = { x: prb.x, y: prb.y, z: prb.z };
    }
    next();
  };

  return {
    start() {
      phase = 'stepping';
      next();
    },

    ok() {
      if (phase === 'stepping') {
        answered();
      } else if (phase === 'restoring') {
        finish(failure ? failed() : { seen });
      }
    },

    /** The operator's hands done — a plate moved under the tool: on to the next step. */
    resume() {
      if (phase !== 'waiting') {
        return false;
      }
      phase = 'stepping';
      next();
      return true;
    },

    /** `code` as said, `error:9`. */
    error(code) {
      if (phase === 'stepping') {
        failure = code;
        putBack();
      } else if (phase === 'restoring') {
        finish(failure ? failed() : { seen });
      }
    },

    /** Nothing more can be sent in alarm, the modes included. */
    alarm(code) {
      if (phase === 'stepping' || phase === 'restoring' || phase === 'waiting') {
        failure = failure || code;
        finish(failed());
      }
    },

    /** `[PRB:…]` in millimetres, machine coordinates. */
    prb(value) {
      if (phase === 'stepping') {
        prb = value;
      }
    },

    /** Grbl's banner: somebody reset it, and the planner went with the steps. */
    startup() {
      if (phase !== 'done') {
        failure = 'reset';
        finish(failed());
      }
    },

    get running() {
      return phase !== 'done';
    },

    get waiting() {
      return phase === 'waiting';
    },
  };
};

/**
 * The `G10 L2` value that puts the work zero at `zero` (machine, mm). Grbl's
 * work position is machine less the system's offset, `G92`, and on Z the tool
 * length offset; the first is what is written, so the other two come off it.
 */
export const offsetFor = (zero, { g92 = {}, tlo = 0 }) => Object.fromEntries(
  Object.entries(zero).map(([axis, value]) => [axis, value - (g92[axis] || 0) - (axis === 'z' ? tlo : 0)]),
);

/** The line that writes it, for system `P<n>` — in millimetres whatever the modes. */
export const offsetLine = (p, offset) => `G21 G10 L2 P${p} ${words(offset)}`;

export default createProbeRun;
