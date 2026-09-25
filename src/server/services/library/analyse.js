import Toolpath from 'gcode-toolpath';
import { Planner, arcPoints } from './estimate';
import { createCheck } from './check';

/**
 * What the Pliki screen shows about a program, worked out on the server.
 *
 * Mateusz, 2026-09-25: the panel computes nothing, and the value is there
 * when the screen asks — so this runs when a file arrives, not when it is
 * looked at. See `Library`.
 *
 * `lines` counts the file's non-blank lines, as the sender does — but on
 * load the Grbl controller appends a `%wait` of its own, so the job's total
 * is one more than this. Bounds are of the moves, in
 * millimetres, from work zero; the starting point is not a move and is left
 * out. `seconds` is null when no machine has said its limits yet. `wcs` is
 * the coordinate systems the file itself sets, in the order it sets them —
 * empty when it takes whichever is active.
 *
 * `check` is whether Grbl will take it — see `check`; `start` is what the
 * `gcode:start` events send before every program.
 */

/**
 * Lines parsed between two turns of the event loop. The sender streams a
 * running program from this same loop, and a whole large file at once
 * (half a second for 190 000 lines) would starve the controller's buffer.
 */
const BATCH_LINES = 200;

const INCH = 25.4;

/** Grbl's default `$12`, for bounds when no machine has said its own. */
const ARC_TOLERANCE = 0.002;

/** Where motion comes to a stop before the line's moves: a dwell, spindle, coolant, tool. */
const STOPS_BEFORE = new Set(['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9']);

/** And after them: the program pauses or ends. */
const STOPS_AFTER = new Set(['M0', 'M1', 'M2', 'M30']);

const WCS = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'];

const turn = () => new Promise((resolve) => setImmediate(resolve));

/**
 * gcode-toolpath hands an arc over in its plane's own axes — for G18 `x` is
 * Z and `y` is X — so it is turned back once, here, and everything after it
 * reads the machine's axes.
 */
const MACHINE_AXES = {
  G18: ({ x, y, z }) => ({ x: y, y: z, z: x }),
  G19: ({ x, y, z }) => ({ x: z, y: x, z: y }),
};

const analyse = async (text, machine, start = '') => {
  const check = createCheck(start);
  const planner = machine ? new Planner(machine) : null;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  const tools = new Set();
  const wcs = new Set();
  let feed = 0;
  let inches = false;
  let pending = [];
  let number = 0;

  const reach = (point) => {
    for (const axis of ['x', 'y', 'z']) {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  };

  const toolpath = new Toolpath({
    addLine: (modal, from, to) => {
      reach(to);
      pending.push({ kind: 'line', modal, from: { ...from }, to: { ...to } });
    },
    addArcCurve: (modal, ...points) => {
      const [from, to, center] = points.map(MACHINE_AXES[modal.plane] || (point => point));
      // An arc bulges past its ends; its chords are where the tool goes.
      const clockwise = modal.motion === 'G2';
      arcPoints(from, to, center, { plane: modal.plane, clockwise }, machine?.arcTolerance || ARC_TOLERANCE).forEach(reach);
      pending.push({ kind: 'arc', modal, from: { ...from }, to: { ...to }, center: { ...center } });
    },
  });

  // A line's moves arrive before the line itself, so they wait here for the
  // F, the dwell and the stops that the line carries.
  const onLine = (data) => {
    const { words } = data;
    number++;
    const codes = new Set(words.map(([letter, value]) => `${letter}${value}`));
    const word = (letter) => words.find(([l]) => l === letter)?.[1];

    if (codes.has('G20')) {
      inches = true;
    } else if (codes.has('G21')) {
      inches = false;
    }
    if (word('F') !== undefined) {
      feed = word('F') * (inches ? INCH : 1);
    }
    if (word('T') !== undefined) {
      tools.add(word('T'));
    }
    WCS.filter(code => codes.has(code)).forEach(code => wcs.add(code));

    if (planner) {
      if (codes.has('G4')) {
        planner.stop(word('P') || 0);
      } else if ([...codes].some(code => STOPS_BEFORE.has(code))) {
        planner.stop();
      }
      for (const move of pending) {
        const inverseTime = move.modal.feedrate === 'G93';
        // mm/min in the program, mm/s in the planner; G93's F is a rate, not a speed.
        const rate = inverseTime ? feed / (inches ? INCH : 1) : feed / 60;
        const options = { feed: move.modal.motion === 'G0' ? null : rate, inverseTime };
        if (move.kind === 'line') {
          planner.line(move.from, move.to, options);
        } else {
          planner.arc(move.from, move.to, move.center, { ...options, plane: move.modal.plane, clockwise: move.modal.motion === 'G2' });
        }
      }
      if ([...codes].some(code => STOPS_AFTER.has(code))) {
        planner.stop();
      }
    }
    check.line(number, data, pending);
    pending = [];
  };

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += BATCH_LINES) {
    toolpath.loadFromStringSync(lines.slice(i, i + BATCH_LINES).join('\n'), onLine);
    await turn();
  }

  const moved = Number.isFinite(min.x);

  return {
    lines: lines.filter(line => line.trim().length > 0).length,
    bounds: moved ? { min, max } : null,
    tools: [...tools].sort((a, b) => a - b),
    wcs: [...wcs],
    seconds: planner ? planner.finish() : null,
    check: check.result(),
  };
};

export default analyse;
