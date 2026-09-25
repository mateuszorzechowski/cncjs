import { currentToken } from './session';

/**
 * The server's file library, from the panel — see `src/server/api/api.files.js`.
 *
 * Everything the screen shows about a file comes ready from the server (its
 * `analysis`); what is here is asking for it and putting it into parts the
 * screen words. Nothing is worked out of the program's text.
 */

const headers = () => {
  const token = currentToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * A refusal keeps the server's reason code, so the screen can say it in its
 * own words; a status with no code is still a failure with a number.
 */
const request = async (url, options) => {
  const res = await fetch(url, { headers: headers(), ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.msg || String(res.status)), { reason: body.reason || null, status: res.status });
  }
  return body;
};

const path = (name) => `/api/files/${encodeURIComponent(name)}`;

export const fetchFiles = () => request('/api/files');

export const readFile = (name) => request(path(name));

export const writeFile = (name, data) => request(path(name), { method: 'PUT', body: JSON.stringify({ data }) });

export const deleteFile = (name) => request(path(name), { method: 'DELETE' });

export const loadFile = (name, port) => request(`${path(name)}/load`, { method: 'POST', body: JSON.stringify({ port }) });

/**
 * Why `$C` cannot be asked for now, as a code the screen words, or null.
 * The same order the server refuses in.
 */
export const checkBlocker = (machine) => {
  if (!machine.connected) {
    return 'notConnected';
  }
  if (machine.fileCheck) {
    return 'checking';
  }
  if (machine.workflow !== 'idle') {
    return 'programRunning';
  }
  return machine.canCheckFile ? null : 'notIdle';
};

/** The reasons the server gives, and which of them the screen has words for. */
export const REASONS = ['bad-name', 'not-found', 'no-space', 'program-running'];

export const reasonOf = (error) => (REASONS.includes(error?.reason) ? error.reason : 'failed');

/**
 * Whether this panel may make a file the program. The server's rule
 * (`program-gate.js`): no loading while a program runs or is paused, a tool
 * change included — so greyed out before it is pressed.
 */
export const canLoad = (machine) => Boolean(machine.connected && machine.workflow === 'idle');

/** Whether a file is the one loaded — by name, which is what the sender keeps. */
export const isLoaded = (machine, name) => Boolean(machine.gcode?.name) && machine.gcode.name === name;

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];

/** A byte count as a number and a unit, in thousands as a disk is sold. */
export const sizeParts = (bytes) => {
  let value = Math.max(0, Number(bytes) || 0);
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return { value, unit: UNITS[unit] };
};

/** Seconds as whole hours, minutes and seconds — rounded to the second. */
export const durationParts = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
};

/**
 * When the disk is short enough to say so: under half a gigabyte, or under
 * a twentieth of the disk, whichever comes first. A program is kilobytes, so
 * neither is about the next upload — it is about the machine the server runs
 * on, and the journal and the sessions that grow beside the library.
 */
export const LOW_BYTES = 500 * 1000 * 1000;
export const LOW_SHARE = 0.05;

export const diskLow = (disk) => Boolean(disk) && (disk.free < LOW_BYTES || disk.free < disk.total * LOW_SHARE);

/** How much of the disk is used, as a percentage for a meter. */
export const diskUsed = (disk) => (disk && disk.total > 0 ? ((disk.total - disk.free) / disk.total) * 100 : 0);

/** The share of what is used that is cncjs's own files, as a percentage of it. */
export const diskLibrary = (disk) => {
  const used = disk ? disk.total - disk.free : 0;
  return used > 0 && disk.library > 0 ? Math.min(100, (disk.library / used) * 100) : 0;
};
