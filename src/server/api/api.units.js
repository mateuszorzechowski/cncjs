import config from '../services/configstore';
import units, { isUnit, unitNames } from '../services/units';
import { ERR_BAD_REQUEST } from '../constants';

/** `GET /api/units` — the rule every panel formats with. */
export const read = (req, res) => {
  res.send(units.rule());
};

/**
 * `PUT /api/units` — `{ name?, restore? }`, kept in `.cncrc`.
 *
 * Every connected panel hears the change over the socket (`units:change`),
 * so the phone and the laptop cannot show different units for a moment
 * longer than it takes to send.
 */
export const update = (req, res) => {
  const { name, restore } = { ...req.body };

  if (name !== undefined && !isUnit(name)) {
    res.status(ERR_BAD_REQUEST).send({ msg: `Unknown units; one of ${unitNames.join(', ')}` });
    return;
  }
  if (restore !== undefined && typeof restore !== 'boolean') {
    res.status(ERR_BAD_REQUEST).send({ msg: '`restore` is true or false' });
    return;
  }

  const rule = units.set({ name, restore });
  config.set('units', { name: rule.name, restore: rule.restore });
  res.send(rule);
};
