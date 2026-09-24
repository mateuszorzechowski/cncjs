/**
 * A controller with a connection that records rather than writes.
 *
 * The engine is a stub: `io` is null because nothing here has sockets, and
 * that is the whole of what a controller reaches back into it for.
 */
export const createController = (ControllerClass, options = {}) => {
  const writes = [];
  const controller = new ControllerClass({ io: null }, {
    port: '/dev/null',
    baudrate: 115200,
    rtscts: false,
    ...options,
  });
  controller.connection = {
    isOpen: true,
    write: (data, context) => writes.push({ data, context }),
  };
  return { controller, writes };
};
