import { parseLine } from 'gcode-parser';
import { replaceM6 } from '../utils/gcode';
import { TOOL_CHANGE_POLICY_SEND_M6_COMMANDS } from '../constants';

/**
 * A library file through Grbl's check mode, `$C` — the controller's half of
 * the Pliki screen's check; the server's half is `services/library/check`.
 *
 * Grbl reads every line and moves nothing, answering each one as it would
 * in a run. The file goes through the server itself rather than the sender
 * (Mateusz, 2026-09-25), so every error is collected — the sender pauses at
 * the first — and the loaded program is not touched.
 *
 * What goes to the cable is what the sender would send: no comments, no `%`
 * lines (cncjs's own), an expression filled in, and `M6` commented out unless
 * the tool-change policy sends it. Lines are numbered as the sender numbers
 * them, so they match the journal and the server's check.
 *
 * Measured on the bench, 2026-09-25: leaving `$C` is a soft reset — Grbl
 * prints its banner and stands Idle, position kept, modes back to G54 G17 G21
 * G90 G94. Soft limits still hold inside `$C`: a move off the table is
 * ALARM:2, which ends check mode and takes a reset.
 */

/** Grbl's 128-byte serial buffer, less the margin the sender keeps. */
const BUFFER = 128 - 8;

/** How often progress is said, in answered lines. */
const PROGRESS_EVERY = 100;

/** The lines to send, each with the number the sender would give it. */
export const checkLines = (text, { toolChangePolicy, translate = (line) => line } = {}) => {
  const lines = [];
  let number = 0;

  for (const raw of String(text).split('\n')) {
    if (raw.trim().length === 0) {
      continue;
    }
    number++;
    const trimmed = raw.trim();
    if (trimmed.startsWith('%')) {
      continue;
    }
    let { line } = parseLine(translate(trimmed), { lineMode: 'stripped' });
    if (toolChangePolicy !== TOOL_CHANGE_POLICY_SEND_M6_COMMANDS) {
      line = replaceM6(line, (x) => `(${x})`);
    }
    if (line.length > 0) {
      lines.push({ number, line });
    }
  }

  return { lines, total: number };
};

/**
 * One run. `write(line)` puts a line on the cable; `done(result)` is called
 * once, and `progress({ answered, total })` along the way. `firstError` stops
 * sending at the first error — the operator's choice (Mateusz, 2026-09-25) —
 * and leaves `$C` once what is already in Grbl's buffer has been answered.
 *
 * The result: `{ complete, total, errors, alarm, stoppedAt }` — `errors` said
 * once per code, at the first line, with a count and the line that was sent;
 * `alarm` the `ALARM:n` that ended it early and `stoppedAt` the line it was on;
 * `complete` false for an alarm, a reset or a stop at the first error, when
 * the rest went unread; `firstError` says it was the last.
 */
export const createCheckRun = ({ lines, total, write, done, progress = () => {}, firstError = false }) => {
  const errors = new Map();
  const outstanding = [];
  let next = 0;
  let answered = 0;
  let phase = 'idle';
  let stopped = null;

  const inFlight = () => outstanding.reduce((sum, item) => sum + item.line.length + 1, 0);

  const finish = (result) => {
    if (phase === 'done') {
      return;
    }
    phase = 'done';
    done({
      total,
      errors: [...errors.values()].sort((a, b) => a.line - b.line),
      alarm: null,
      stoppedAt: null,
      ...result,
    });
  };

  const leave = () => {
    phase = 'leaving';
    write('$C');
  };

  const pump = () => {
    while (!stopped && next < lines.length && inFlight() + lines[next].line.length + 1 <= BUFFER) {
      const item = lines[next++];
      outstanding.push(item);
      write(item.line);
    }
    if ((stopped || next >= lines.length) && outstanding.length === 0) {
      leave();
    }
  };

  const answer = (code) => {
    const item = outstanding.shift();
    if (!item) {
      return;
    }
    answered++;
    if (code) {
      const known = errors.get(code);
      if (known) {
        known.count++;
      } else {
        errors.set(code, { code, line: item.number, sent: item.line, count: 1 });
      }
      if (firstError && !stopped) {
        stopped = item.number;
      }
    }
    if (answered % PROGRESS_EVERY === 0) {
      progress({ answered, total: lines.length });
    }
    pump();
  };

  return {
    start() {
      phase = 'entering';
      write('$C');
    },

    ok() {
      if (phase === 'entering') {
        phase = 'streaming';
        pump();
      } else if (phase === 'streaming') {
        answer(null);
      }
      // `leaving`: the `ok` of `$C` itself; the banner that follows ends it.
    },

    /** `code` as Grbl says it, `error:33`. */
    error(code) {
      if (phase === 'entering') {
        // Grbl would not go into check mode — it is not idle.
        finish({ complete: false, refused: code });
      } else if (phase === 'streaming') {
        answer(code);
      }
    },

    /** An alarm ends check mode on its own; the rest of the file went unread. */
    alarm(code) {
      if (phase === 'entering' || phase === 'streaming') {
        finish({ complete: false, alarm: code, stoppedAt: outstanding[0]?.number ?? null });
      }
    },

    /** Grbl's banner: the reset that leaving `$C` is — or somebody else's. */
    startup() {
      // Stopped on the last line is every line read.
      if (phase === 'leaving' && stopped && next < lines.length) {
        finish({ complete: false, firstError: true, stoppedAt: stopped });
      } else if (phase === 'leaving') {
        finish({ complete: true });
      } else if (phase === 'entering' || phase === 'streaming') {
        finish({ complete: false, reset: true, stoppedAt: outstanding[0]?.number ?? null });
      }
    },

    get running() {
      return phase !== 'done';
    },
  };
};
