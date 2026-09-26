import config from '../services/configstore';
import units, { isUnit, unitNames } from '../services/units';
import { ERR_BAD_REQUEST } from '../constants';

/** `GET /api/units` — the rule every panel formats with. */
export const read = (req, res) => {
  res.send(units.rule());
};

/**
 * `PUT /api/units` — `{ name?, restore?, jog? }`, kept in `.cncrc`. `jog` is
 * the operator's steps and rates for the units in force (after `name`, when
 * both are given): `{ xySteps?, zSteps?, xy?: { step?, rate? }, z?: … }`, or
 * null for the defaults — see `services/units`.
 *
 * Every connected panel hears the change over the socket (`units:change`),
 * so the phone and the laptop cannot show different units for a moment
 * longer than it takes to send.
 */
export const update = (req, res) => {
  const { name, restore, jog } = { ...req.body };

  if (name !== undefined && !isUnit(name)) {
    res.status(ERR_BAD_REQUEST).send({ msg: `Unknown units; one of ${unitNames.join(', ')}` });
    return;
  }
  if (restore !== undefined && typeof restore !== 'boolean') {
    res.status(ERR_BAD_REQUEST).send({ msg: '`restore` is true or false' });
    return;
  }

  let rule = units.set({ name, restore });
  if (jog !== undefined) {
    const { error, rule: after } = units.setJog(jog);
    if (error) {
      config.set('units', units.saved());
      res.status(ERR_BAD_REQUEST).send({ msg: error });
      return;
    }
    rule = after;
  }
  config.set('units', units.saved());
  res.send(rule);
};
