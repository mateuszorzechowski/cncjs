import config from '../services/configstore';
import probe from '../services/probe';
import { describeStrategies } from '../services/probe/strategies';
import { gridOf } from '../services/height-map/grid';
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

/**
 * `POST /api/probe/grid` — `{ options, units }`: the height map's grid as
 * the server would measure it — the points in millimetres, the step and the
 * count each way, a count from a step or a step from a count — so the panel
 * shows the figure it was not given without a rule of its own. A grid it
 * would refuse is said (`reason`).
 */
export const grid = (req, res) => {
  const { options, units } = { ...req.body };
  const {
    error, xs, ys, stepX, stepY, given,
  } = gridOf(options, units);

  if (error) {
    res.status(ERR_BAD_REQUEST).send({ msg: error, reason: error });
    return;
  }
  res.send({
    xs, ys, stepX, stepY, nx: xs.length, ny: ys.length, given,
  });
};
