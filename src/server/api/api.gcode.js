import get from 'lodash/get';
import store from '../store';
import journal from '../services/journal';
import {
  ERR_BAD_REQUEST,
  ERR_CONFLICT,
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

export const upload = (req, res) => {
  const { port, name, gcode, context = {} } = req.body;

  if (!port) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'No port specified'
    });
    return;
  }
  if (!gcode) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'Empty G-code'
    });
    return;
  }

  const controller = store.get('controllers["' + port + '"]');
  if (!controller) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'Controller not found'
    });
    return;
  }

  // Loading stops whatever program is loaded, so it is a client's request like
  // any other and meets the same rule — see `program-gate.js`.
  const reason = controller.clientRefusal?.('gcode:load');
  if (reason) {
    journal.record({ level: 'warn', source: 'server', event: 'refused', code: reason, port, data: { cmd: 'gcode:load', name } });
    res.status(ERR_CONFLICT).send({
      msg: 'A program is under way',
      reason
    });
    return;
  }

  // Load G-code
  controller.command('gcode:load', name, gcode, context, (err, state) => {
    if (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: 'Failed to load G-code: ' + err
      });
      return;
    }

    res.send({ ...state });
  });
};

export const fetch = (req, res) => {
  const port = req.query.port;

  if (!port) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'No port specified'
    });
    return;
  }

  const controller = store.get('controllers["' + port + '"]');
  if (!controller) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'Controller not found'
    });
    return;
  }

  const { sender } = controller;

  res.send({
    ...sender.toJSON(),
    data: sender.state.gcode
  });
};

export const download = (req, res) => {
  const port = get(req, 'query.port') || get(req, 'body.port');

  if (!port) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'No port specified'
    });
    return;
  }

  const controller = store.get('controllers["' + port + '"]');
  if (!controller) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'Controller not found'
    });
    return;
  }

  const { sender } = controller;

  const filename = sender.state.name || 'noname.txt';
  const content = sender.state.gcode || '';

  res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(filename));
  res.setHeader('Connection', 'close');

  res.write(content);
  res.end();
};
