import { get } from 'lodash';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
  TINYG_MACHINE_STATE_INITIALIZING,
  TINYG_MACHINE_STATE_READY,
  TINYG_MACHINE_STATE_ALARM,
  TINYG_MACHINE_STATE_STOP,
  TINYG_MACHINE_STATE_END,
  TINYG_MACHINE_STATE_RUN,
  TINYG_MACHINE_STATE_HOLD,
  TINYG_MACHINE_STATE_PROBE,
  TINYG_MACHINE_STATE_CYCLE,
  TINYG_MACHINE_STATE_HOMING,
  TINYG_MACHINE_STATE_JOG,
  TINYG_MACHINE_STATE_INTERLOCK,
  TINYG_MACHINE_STATE_SHUTDOWN,
  TINYG_MACHINE_STATE_PANIC,
} from 'app/constants';
import { stateTone as grblStateTone } from '../grbl/selectors';

/**
 * What state a machine is in, whichever firmware is answering.
 *
 * The four controllers do not agree on the question, let alone the answer.
 * Grbl and Smoothie both put a word in `status.activeState`; TinyG puts a
 * number in `sr.machineState`; **Marlin has no machine state at all** and says
 * so by having nowhere to put one. Reconciling that in one place is the whole
 * job of this module — a top bar that asked each controller its own way would
 * be four top bars.
 */

// TinyG's numbering, translated into the vocabulary the rest of the
// application already speaks. The names are chosen to read like Grbl's
// because the chip shows one word and an operator should not have to know
// which firmware they are looking at to read it.
const TINYG_STATES = {
  [TINYG_MACHINE_STATE_INITIALIZING]: { word: 'Initializing', tone: 'inactive' },
  [TINYG_MACHINE_STATE_READY]: { word: 'Ready', tone: 'ready' },
  [TINYG_MACHINE_STATE_ALARM]: { word: 'Alarm', tone: 'stopped' },
  [TINYG_MACHINE_STATE_STOP]: { word: 'Stop', tone: 'ready' },
  [TINYG_MACHINE_STATE_END]: { word: 'End', tone: 'ready' },
  [TINYG_MACHINE_STATE_RUN]: { word: 'Run', tone: 'running' },
  [TINYG_MACHINE_STATE_HOLD]: { word: 'Hold', tone: 'ready' },
  [TINYG_MACHINE_STATE_PROBE]: { word: 'Probe', tone: 'running' },
  [TINYG_MACHINE_STATE_CYCLE]: { word: 'Cycle', tone: 'running' },
  [TINYG_MACHINE_STATE_HOMING]: { word: 'Home', tone: 'running' },
  [TINYG_MACHINE_STATE_JOG]: { word: 'Jog', tone: 'running' },
  [TINYG_MACHINE_STATE_INTERLOCK]: { word: 'Interlock', tone: 'stopped' },
  [TINYG_MACHINE_STATE_SHUTDOWN]: { word: 'Shutdown', tone: 'stopped' },
  [TINYG_MACHINE_STATE_PANIC]: { word: 'Panic', tone: 'stopped' },
};

/**
 * The chip's two readings: the word it shows and the colour it shows it in.
 *
 * With no port open it says so outright. "Disconnected" is a state an operator
 * acts on — it is the answer to "why did nothing happen when I pressed that" —
 * so it is said rather than left as an empty chip.
 */
export const machineState = ({ port, type, state } = {}) => {
  if (!port) {
    return { word: 'Disconnected', tone: 'inactive', known: false };
  }

  if (type === GRBL || type === SMOOTHIE) {
    const activeState = get(state, 'status.activeState');
    if (!activeState) {
      return { word: 'Connected', tone: 'inactive', known: false };
    }
    // Smoothie reports Grbl's vocabulary, so it takes Grbl's mapping. That is
    // not a shortcut: it is the same state machine, reimplemented.
    return { word: activeState, tone: grblStateTone(activeState), known: true };
  }

  if (type === TINYG) {
    const reading = TINYG_STATES[get(state, 'sr.machineState')];
    if (!reading) {
      return { word: 'Connected', tone: 'inactive', known: false };
    }
    return { ...reading, known: true };
  }

  // Marlin, and anything else that turns up. A chip that invented a state for
  // a firmware that does not report one would be worse than a chip that says
  // only what it knows: that something is on the other end of the port.
  return { word: 'Connected', tone: 'inactive', known: false };
};

export { GRBL, MARLIN, SMOOTHIE, TINYG };
