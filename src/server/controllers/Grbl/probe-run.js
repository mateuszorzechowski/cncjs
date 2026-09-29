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
 * - `G38.2` touching nothing: `ALARM:5`, `[PRB:…:0]`, then **still `ok`**.
 *   The position in a `:0` report is not where the tool stopped, so a miss
 *   leaves the tool at the target, not at the report.
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

/** Machine coordinates to the work coordinates a `G38` line is written in. */
const toWork = (target, wco) => Object.fromEntries(
  Object.entries(target).map(([axis, value]) => [axis, value - (wco[axis] || 0)]),
);

/** The line for each kind of step. */
const LINE = {
  move: (step, target) => `G90 G21 G53 G0 ${words(target)}`,
  touch: (step, target, wco) => `G90 G21 G38.2 ${words(toWork(target, wco))} F${fmt(step.feed)}`,
  clear: (step, target, wco) => `G90 G21 G38.3 ${words(toWork(target, wco))} F${fmt(step.feed)}`,
};

/** Why a step's answer is a failure, or null. `prb` is the report, if one came. */
const OUTCOME = {
  move: () => null,
  touch: (prb) => (prb?.result === 1 ? null : 'no-touch'),
  // Contact on the way down beside a wall is the top of the plate.
  clear: (prb) => (prb?.result === 1 ? 'touched' : null),
};

/**
 * One run. `start` and `wco` in millimetres, machine; `restore` the line
 * that puts the modes back; `write(line)` puts a line on the cable;
 * `progress({ index, total, phase })` as each step goes out; `done(result)`
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
    const step = steps[index];
    target = step.to(here, seen);
    prb = null;
    progress({ index, total: steps.length, phase: step.phase });
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
      } else if (phase === 'alarmed') {
        // The `ok` Grbl still sends for the line the alarm ended.
        finish(failed());
      } else if (phase === 'restoring') {
        finish(failure ? failed() : { seen });
      }
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
      if (phase === 'stepping') {
        failure = code;
        phase = 'alarmed';
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
