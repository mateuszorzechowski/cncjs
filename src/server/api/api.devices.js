import devices from '../services/devices';

/** `GET /api/devices` — every device seen, by its id: `{ name, ip, system, browser, model, seen }`. */
export const fetch = (req, res) => {
  res.send(devices.all());
};

/**
 * `PUT /api/devices/:id` — what a device says of itself: `{ name, system,
 * browser, model }`. The address is the server's own reading of the request.
 * A panel says it once it has worked out its full name — some browsers hand
 * over the model only when asked, after the socket is up — and again when
 * somebody renames it in Settings.
 */
export const update = (req, res) => {
  const { name, system, browser, model } = { ...req.body };
  const entry = devices.seen(req.params.id, { name, system, browser, model, ip: req.ip || req.socket?.remoteAddress });
  if (!entry) {
    res.status(400).send({ msg: 'A device id is needed' });
    return;
  }
  res.send(entry);
};
