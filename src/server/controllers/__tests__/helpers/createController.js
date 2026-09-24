/**
 * A controller with a connection that records rather than writes.
 *
 * The engine is a stub with the two things a controller reaches back into it
 * for: `io`, which is null because nothing here has sockets, and
 * `rememberConnection`, which a controller calls the first time its machine
 * answers. Recording that rather than stubbing it away keeps the case honest
 * — a controller that stopped calling it would otherwise still pass.
 */
export const createController = (ControllerClass, options = {}) => {
  const writes = [];
  const remembered = [];
  const engine = {
    io: null,
    rememberConnection: (connection) => remembered.push(connection),
  };
  const controller = new ControllerClass(engine, {
    port: '/dev/null',
    baudrate: 115200,
    rtscts: false,
    ...options,
  });
  controller.connection = {
    isOpen: true,
    write: (data, context) => writes.push({ data, context }),
  };
  return { controller, writes, remembered };
};
