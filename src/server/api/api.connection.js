import config from '../services/configstore';
import { AUTO_KEY, AUTO_MODES, autoMode } from '../services/cncengine/autoMode';
import { ERR_BAD_REQUEST } from '../constants';

/** `GET /api/connection/auto` — who opens the port unasked: `{ mode }`. */
export const readAuto = (req, res) => {
  res.send({ mode: autoMode() });
};

/**
 * `PUT /api/connection/auto` — `{ mode }`, one of `server`, `panel`,
 * `manual`; kept in `.cncrc`. The server reads it on its next look at the
 * ports (every few seconds), so `server` takes effect without a restart.
 */
export const updateAuto = (req, res) => {
  const { mode } = { ...req.body };

  if (!AUTO_MODES.includes(mode)) {
    res.status(ERR_BAD_REQUEST).send({ msg: `Unknown mode; one of ${AUTO_MODES.join(', ')}` });
    return;
  }

  config.set(AUTO_KEY, mode);
  res.send({ mode });
};
