import get from 'lodash/get';
import store from '../store';
import { ERR_BAD_REQUEST, ERR_NOT_FOUND } from '../constants';

/**
 * `GET /api/height-map/program?port=…&of=kept|result` — the loaded program
 * bent to the kept height map, or to the one just measured and not yet kept:
 * `{ gcode }`, for a panel to draw what the machine will cut (Mateusz,
 * 2026-10-03). The server bends it; the panel only parses it to draw it.
 */
export const program = (req, res) => {
  const port = get(req, 'query.port');
  const of = get(req, 'query.of') === 'result' ? 'result' : 'kept';
  const controller = port ? store.get(`controllers["${port}"]`) : null;
  if (!controller) {
    res.status(ERR_BAD_REQUEST).send({ msg: 'Controller not found' });
    return;
  }
  const bent = controller.bentProgram ? controller.bentProgram(of) : null;
  if (!bent) {
    res.status(ERR_NOT_FOUND).send({ msg: 'No bent program', reason: 'no-bent' });
    return;
  }
  res.send(bent);
};
