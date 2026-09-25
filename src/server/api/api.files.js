import library from '../services/library';
import journal from '../services/journal';
import { loadProgram } from './api.gcode';
import {
  ERR_BAD_REQUEST,
  ERR_NOT_FOUND,
  ERR_INSUFFICIENT_STORAGE,
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

/**
 * The library's routes. A refusal carries a `reason` code, as a refused
 * command does, so the panel words it: `bad-name`, `not-found`, `no-space`.
 */
const fail = (res, err) => {
  if (err.code === 'bad-name') {
    res.status(ERR_BAD_REQUEST).send({ msg: err.message, reason: 'bad-name' });
  } else if (err.code === 'ENOENT') {
    res.status(ERR_NOT_FOUND).send({ msg: 'No such file', reason: 'not-found' });
  } else if (err.code === 'no-space' || err.code === 'ENOSPC') {
    res.status(ERR_INSUFFICIENT_STORAGE).send({ msg: 'No room on the disk', reason: 'no-space' });
  } else {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({ msg: err.message });
  }
};

/** `GET /api/files` — `{ files: [{ name, size, mtime }], disk: { total, free } }`. */
export const fetch = async (req, res) => {
  try {
    res.send(await library.list());
  } catch (err) {
    fail(res, err);
  }
};

/** `GET /api/files/:name` — the program's text. */
export const read = async (req, res) => {
  const { name } = req.params;

  try {
    res.send({ name, data: await library.read(name) });
  } catch (err) {
    fail(res, err);
  }
};

/**
 * `PUT /api/files/:name` with `{ data }` — keep a program, replacing one of
 * the same name.
 *
 * Not held back while a program runs: keeping a file does not touch the one
 * being cut. What is held back is loading it — see `load`.
 */
export const write = async (req, res) => {
  const { name } = req.params;
  const { data } = { ...req.body };

  if (typeof data !== 'string') {
    res.status(ERR_BAD_REQUEST).send({ msg: 'No data', reason: 'no-data' });
    return;
  }

  try {
    await library.write(name, data);
    journal.record({ level: 'info', source: 'server', event: 'file', code: 'write', data: { name, size: Buffer.byteLength(data, 'utf8') } });
    res.send({ name });
  } catch (err) {
    fail(res, err);
  }
};

/** `DELETE /api/files/:name`. */
export const remove = async (req, res) => {
  const { name } = req.params;

  try {
    await library.remove(name);
    journal.record({ level: 'info', source: 'server', event: 'file', code: 'delete', data: { name } });
    res.send({ name });
  } catch (err) {
    fail(res, err);
  }
};

/**
 * `POST /api/files/:name/load` with `{ port }` — make it the port's program.
 * The same road, and the same rule while a program runs, as `POST /api/gcode`.
 */
export const load = async (req, res) => {
  const { name } = req.params;
  const { port } = { ...req.body };

  if (!port) {
    res.status(ERR_BAD_REQUEST).send({ msg: 'No port specified' });
    return;
  }

  let gcode;
  try {
    gcode = await library.read(name);
  } catch (err) {
    fail(res, err);
    return;
  }

  loadProgram(res, { port, name, gcode });
};
