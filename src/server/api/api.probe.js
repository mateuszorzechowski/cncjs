import config from '../services/configstore';
import probe from '../services/probe';
import { describeStrategies } from '../services/probe/strategies';
import { ERR_BAD_REQUEST } from '../constants';

/** `GET /api/probe` — the kept figures, in millimetres, and what each method uses. */
export const read = (req, res) => {
  res.send({ params: probe.params(), methods: describeStrategies() });
};

/**
 * `PUT /api/probe` — `{ params, units }`: the figures the operator
 * confirmed, in `units` (the ones the panel showed them in), or `params: null`
 * for the defaults. Kept in `.cncrc`; a wrong one keeps none and is named.
 */
export const update = (req, res) => {
  const { params, units } = { ...req.body };
  const { error, name } = probe.set(params, units);

  if (error) {
    res.status(ERR_BAD_REQUEST).send({ msg: error, name });
    return;
  }
  config.set('probe', probe.saved());
  res.send({ params: probe.params(), methods: describeStrategies() });
};
