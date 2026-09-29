import { GRBL_ALARM_KEYS, GRBL_ERROR_KEYS } from './journalWords';
import { refusalMessage } from './refusal';

/**
 * MDI: a line typed and sent, and what the machine said back.
 *
 * Scope decided on the night of 2026-09-29, to be checked by Mateusz: one
 * line at a time through the server's queue (`gcode`), so it is counted and
 * acknowledged like any other line, answers to the program's rule and lands
 * in the journal as a console line. In alarm the server passes Grbl's own `$`
 * commands and refuses the rest out loud — see `GrblController`.
 *
 * What is shown is the machine's console, not this device's: every line a
 * client or the queue wrote, and every line the controller answered. A
 * second pendant typing at the same machine is part of what this one needs
 * to read, as the server's truth is shared and a selection is not.
 */

/** How much of the conversation is kept. A console, not a record — that is the journal. */
export const KEEP = 300;

/*
 * Written, but not worth a line: a status query, a realtime byte (hold,
 * resume, reset, the overrides) and a jog segment, which arrive ten a second
 * while a key is held.
 */
const realtime = (text) => {
  const code = text.charCodeAt(0);
  return text.length === 1 && (code < 0x20 || code >= 0x80 || text === '!' || text === '~');
};

const quiet = (text) => text === '?' || realtime(text) || text.startsWith('$J=');

/**
 * One line of the console, or null for one that is not shown.
 *
 * `out` is what was written to the controller, `in` what it answered.
 * An error or an alarm carries its number, so the screen can say it in the
 * panel's language; the server's English gloss after it is dropped.
 */
export const consoleLine = (direction, raw) => {
  const text = String(raw ?? '').trim();
  if (!text) {
    return null;
  }
  if (direction === 'out') {
    return quiet(text) ? null : { direction, kind: 'sent', text };
  }
  if (text.startsWith('<')) {
    return null;
  }
  if (text === 'ok') {
    return { direction, kind: 'ok', text };
  }
  const error = /^error:(\d+)/.exec(text);
  if (error) {
    return { direction, kind: 'error', text: `error:${error[1]}`, key: GRBL_ERROR_KEYS[`error:${error[1]}`] ?? null };
  }
  const alarm = /^ALARM:(\d+)/.exec(text);
  if (alarm) {
    return { direction, kind: 'alarm', text: `ALARM:${alarm[1]}`, key: GRBL_ALARM_KEYS[`ALARM:${alarm[1]}`] ?? null };
  }
  return { direction, kind: 'reply', text };
};

/**
 * The console's lines, kept for as long as the page is open.
 *
 * Outside React, so leaving the screen and coming back keeps what was said,
 * and so nothing is missed while another screen is showing. `listen` is
 * handed the controller and attaches once.
 */
export const createConsole = (keep = KEEP) => {
  let lines = [];
  let next = 1;
  let attached = false;
  // The line this device sent and has not yet seen written — the one a
  // refusal, which names only the command, is about.
  let pending = null;
  const listeners = new Set();

  // `at`, when: the console's clock (review note, 2026-09-29: *"godzina wykonania?"*).
  const push = (line) => {
    lines = [...lines, { ...line, id: next, at: Date.now() }].slice(-keep);
    next += 1;
    listeners.forEach((listener) => listener());
  };

  const add = (direction, raw) => {
    const line = consoleLine(direction, raw);
    if (line && direction === 'out' && line.text === pending) {
      pending = null;
    }
    if (line) {
      push(line);
    }
  };

  /*
   * A refused line never reaches the cable, so without this it vanished from
   * the console and survived only as the notice over the screen.
   */
  const refused = (refusal) => {
    if (refusal?.cmd !== 'gcode' || pending === null) {
      return;
    }
    push({ direction: 'out', kind: 'refused', text: pending, refusal: refusalMessage(refusal) });
    pending = null;
  };

  return {
    add,
    refused,
    sending: (line) => {
      pending = line;
    },
    lines: () => lines,
    clear: () => {
      lines = [];
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    listen: (controller) => {
      if (attached) {
        return;
      }
      attached = true;
      controller.addListener('serialport:write', (data) => add('out', data));
      controller.addListener('serialport:read', (data) => add('in', data));
      controller.addListener('command:refused', refused);
    },
  };
};

/**
 * Recall through what this device sent, as a shell does: up goes back, down
 * comes forward and past the newest to an empty line. `at` is the index into
 * `history` being shown, `history.length` for the line being typed.
 */
export const recall = (history, at, step) => Math.min(history.length, Math.max(0, at + step));

/** The history after sending `line`: newest last, no repeat of the one before, bounded. */
export const remember = (history, line, keep = 50) => (
  history[history.length - 1] === line ? history : [...history, line].slice(-keep)
);
