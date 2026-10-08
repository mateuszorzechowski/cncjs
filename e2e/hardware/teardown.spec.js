const { test, expect, TEST_PORT } = require('./fixtures');

test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

/**
 * Leave the machine as this tier found it: with nothing connected.
 *
 * The server keeps a serial port open after every client has gone —
 * `CNCEngine` drops the socket from the controller and leaves the controller
 * itself running — so a hardware run that simply ends leaves the port open
 * indefinitely. The next tier then runs against a connected machine without
 * knowing it, and every spec whose premise is "nothing is plugged in" is
 * asserting something that is no longer true.
 *
 * A project teardown rather than an `afterAll`: this has to run once after the
 * whole tier, not once per file.
 */
test('closes the port the tier opened', async ({ grbl }) => {
  // Whatever state the machine is in: one sulking in alarm is not a reason
  // to leave its port open. Closed, then *confirmed closed against the server*, which is the one
  // holding the serial port.
  await grbl.close();

  await expect
    .poll(
      async () => (await grbl.readControllerState()) === null,
      { message: `${TEST_PORT} should be closed when the tier ends`, timeout: 30000 }
    )
    .toBe(true);
});
