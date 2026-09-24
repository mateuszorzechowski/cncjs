import config from '../services/configstore';
import journal from '../services/journal';
import { isLevel, LEVELS } from '../services/journal/Journal';
import { ERR_BAD_REQUEST } from '../constants';

const CONFIG_KEY = 'journal.level';
const MAX_LIMIT = 500;

const number = (value) => (value === undefined || value === '' ? undefined : Number(value));

/**
 * `GET /api/journal` — entries, newest first, filtered.
 *
 * Query: `level` (a floor), `source`, `event`, `device`, `since`, `until`
 * (ISO times), `q` (code or program name), `before` (the `next` of the
 * previous page), `limit`.
 */
export const fetch = (req, res) => {
  const { level, source, event, device, since, until, q, before, limit } = req.query;

  if (level && !isLevel(level)) {
    res.status(ERR_BAD_REQUEST).send({ msg: `Unknown level; one of ${LEVELS.join(', ')}` });
    return;
  }

  const page = journal.query(
    { level, source, event, device, since, until, q },
    { before: number(before), limit: Math.min(number(limit) || 100, MAX_LIMIT) },
  );

  res.send({ ...page, level: journal.threshold });
};

/** `GET /api/journal/settings` — the lowest level kept. */
export const readSettings = (req, res) => {
  res.send({ level: journal.threshold });
};

/**
 * `PUT /api/journal/settings` — change it, for good.
 *
 * Kept in `.cncrc`, so a restart keeps it: debug switched on to find
 * something is still on the next morning, which is the point of writing it
 * down rather than holding it in memory.
 */
export const updateSettings = (req, res) => {
  const { level } = { ...req.body };

  if (!isLevel(level)) {
    res.status(ERR_BAD_REQUEST).send({ msg: `Unknown level; one of ${LEVELS.join(', ')}` });
    return;
  }

  config.set(CONFIG_KEY, level);
  journal.setLevel(level);
  res.send({ level });
};
