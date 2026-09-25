import { REFUSAL_KEYS } from './refusal';

/**
 * What a journal entry says, as a translation key and its values.
 *
 * The server keeps facts and codes — `{ event: 'alarm', code: 'ALARM:3' }` —
 * and this is where they become words, so an entry recorded yesterday reads
 * in whatever language the panel is in today. Pure, so Jest can check the
 * whole vocabulary without a browser.
 *
 * Every key written out rather than built from the code (rule 8): a key
 * assembled at runtime is one nothing can grep for, and a misspelling would
 * reach an operator.
 *
 * The firmware's own text — a `[MSG:…]`, the startup banner, a line on the
 * wire — is returned as `text`, untranslated, the same as the firmware's
 * state words everywhere else on the panel.
 */

const ALARMS = {
  'ALARM:1': 'grbl.alarm.1',
  'ALARM:2': 'grbl.alarm.2',
  'ALARM:3': 'grbl.alarm.3',
  'ALARM:4': 'grbl.alarm.4',
  'ALARM:5': 'grbl.alarm.5',
  'ALARM:6': 'grbl.alarm.6',
  'ALARM:7': 'grbl.alarm.7',
  'ALARM:8': 'grbl.alarm.8',
  'ALARM:9': 'grbl.alarm.9',
  'ALARM:10': 'grbl.alarm.10',
};

const ERRORS = {
  'error:1': 'grbl.error.1',
  'error:2': 'grbl.error.2',
  'error:3': 'grbl.error.3',
  'error:4': 'grbl.error.4',
  'error:5': 'grbl.error.5',
  'error:6': 'grbl.error.6',
  'error:7': 'grbl.error.7',
  'error:8': 'grbl.error.8',
  'error:9': 'grbl.error.9',
  'error:10': 'grbl.error.10',
  'error:11': 'grbl.error.11',
  'error:12': 'grbl.error.12',
  'error:13': 'grbl.error.13',
  'error:14': 'grbl.error.14',
  'error:15': 'grbl.error.15',
  'error:16': 'grbl.error.16',
  'error:17': 'grbl.error.17',
  'error:20': 'grbl.error.20',
  'error:21': 'grbl.error.21',
  'error:22': 'grbl.error.22',
  'error:23': 'grbl.error.23',
  'error:24': 'grbl.error.24',
  'error:25': 'grbl.error.25',
  'error:26': 'grbl.error.26',
  'error:27': 'grbl.error.27',
  'error:28': 'grbl.error.28',
  'error:29': 'grbl.error.29',
  'error:30': 'grbl.error.30',
  'error:31': 'grbl.error.31',
  'error:32': 'grbl.error.32',
  'error:33': 'grbl.error.33',
  'error:34': 'grbl.error.34',
  'error:35': 'grbl.error.35',
  'error:36': 'grbl.error.36',
  'error:37': 'grbl.error.37',
  'error:38': 'grbl.error.38',
};

const PROGRAM = {
  start: 'journal.program.start',
  resume: 'journal.program.resume',
  finish: 'journal.program.finish',
  abort: 'journal.program.abort',
};

// A pause is said by its reason, which is the part worth reading.
const PAUSE = {
  M0: 'journal.pause.m0',
  M1: 'journal.pause.m1',
  M6: 'journal.pause.m6',
  error: 'journal.pause.error',
  request: 'journal.pause.request',
};

const COMMANDS = {
  reset: 'journal.command.reset',
  estop: 'journal.command.estop',
  unlock: 'journal.command.unlock',
  homing: 'journal.command.homing',
  feedhold: 'journal.command.feedhold',
  cyclestart: 'journal.command.cyclestart',
  sleep: 'journal.command.sleep',
  zero: 'journal.command.zero',
  goToWorkZero: 'journal.command.goToWorkZero',
  goToPoint: 'journal.command.goToPoint',
  'macro:run': 'journal.command.macro',
  gcode: 'journal.command.line',
  write: 'journal.command.line',
  jogStart: 'journal.command.jogStart',
  jogStep: 'journal.command.jogStep',
  jogStop: 'journal.command.jogStop',
  jogCancel: 'journal.command.jogStop',
};

const PORT = {
  open: 'journal.port.open',
  close: 'journal.port.close',
  lost: 'journal.port.lost',
};

/** The column that says what kind of thing happened. */
export const EVENT_KEYS = {
  alarm: 'journal.event.alarm',
  error: 'journal.event.error',
  message: 'journal.event.message',
  startup: 'journal.event.startup',
  sent: 'journal.event.sent',
  received: 'journal.event.received',
  program: 'journal.event.program',
  refused: 'journal.event.refused',
  command: 'journal.event.command',
  port: 'journal.event.port',
  motion: 'journal.event.motion',
};

export const LEVEL_KEYS = {
  debug: 'journal.level.debug',
  info: 'journal.level.info',
  warn: 'journal.level.warn',
  error: 'journal.level.error',
};

export const SOURCE_KEYS = {
  server: 'journal.source.server',
  controller: 'journal.source.controller',
};

const keyed = (key, params = {}) => ({ key, params });

const BY_EVENT = {
  alarm: ({ code }) => (ALARMS[code] ? keyed(ALARMS[code]) : null),
  error: ({ code }) => (ERRORS[code] ? keyed(ERRORS[code]) : null),
  message: ({ data }) => ({ text: data?.text }),
  startup: ({ data }) => ({ text: data?.text }),
  sent: ({ data }) => ({ text: data?.line }),
  received: ({ data }) => ({ text: data?.line }),
  refused: ({ code }) => (REFUSAL_KEYS[code] ? keyed(REFUSAL_KEYS[code]) : null),
  program: ({ code, data, program }) => {
    const key = code === 'pause' ? PAUSE[data?.reason] : PROGRAM[code];
    return key ? keyed(key, { name: program?.name ?? '', line: program?.line ?? 0, total: program?.total ?? 0 }) : null;
  },
  command: ({ code, data }) => (COMMANDS[code] ? keyed(COMMANDS[code], { line: data?.line ?? '' }) : null),
  port: ({ code, data }) => (PORT[code]
    ? keyed(PORT[code], { type: data?.controllerType ?? '', baudrate: data?.baudrate ?? '', message: data?.message ?? '' })
    : null),
  motion: ({ device }) => keyed(device ? 'journal.motion.held' : 'journal.motion.free', { device: device ?? '' }),
};

/**
 * `{ key, params }` for an entry the panel has words for, `{ text }` for the
 * firmware's own, and the bare code for anything newer than this panel.
 */
export const describeEntry = (entry) => {
  const said = BY_EVENT[entry.event]?.(entry);
  if (said && (said.key || said.text)) {
    return said;
  }
  return { text: entry.code || entry.event };
};

// Every code with a sentence of its own, as [code, key]. A pause is one code
// with a sentence per reason, so it appears once for each.
const SENTENCES = [
  ...Object.entries({ ...ALARMS, ...ERRORS, ...PROGRAM, ...COMMANDS, ...PORT, ...REFUSAL_KEYS }),
  ...Object.values(PAUSE).map((key) => ['pause', key]),
];

/**
 * The codes whose sentence contains `needle`, for the journal's search.
 *
 * The server keeps codes and searches what it stored; the words an operator
 * reads exist only here. This is the half of the search the server cannot
 * do. Placeholders are left out, so `line` does not find every sentence
 * that has a `{{line}}` in it — the value it stands for is stored, and the
 * server finds that.
 */
export const codesSaying = (needle, say) => {
  const wanted = needle.toLowerCase();
  const found = SENTENCES
    .filter(([, key]) => say(key).replace(/\{\{[^}]*\}\}/g, '').toLowerCase().includes(wanted))
    .map(([code]) => code);
  return [...new Set(found)];
};
