const { io } = require('socket.io-client');
const { test: baseTest, expect } = require('../fixtures');

/**
 * Serial port to drive, e.g. CNCJS_TEST_PORT=COM3. Without it the whole
 * hardware tier is skipped, so `yarn test:e2e` stays runnable on a machine
 * with nothing plugged in.
 */
const TEST_PORT = process.env.CNCJS_TEST_PORT || '';
const TEST_BAUD = process.env.CNCJS_TEST_BAUD || '115200';

/**
 * The machine, reached the way any client reaches it: a token from
 * `/api/signin` and the socket protocol.
 *
 * This fixture used to open the port by clicking through the old
 * application's Connection widget. That application is no longer served
 * (2026-10-08), and the panel's own connection screen is what the panel's
 * cases are about, so the port is opened here underneath any page — the
 * panel then finds a machine already connected, which is a case of its own.
 */
const test = baseTest.extend({
  grbl: async ({ cncjs, baseURL }, use) => {
    const { page } = cncjs;

    /**
     * A token of this fixture's own.
     *
     * `POST /api/signin` with no body is how cncjs authenticates on a server
     * with no accounts configured, and it is what the panel does on every
     * load. The token is not optional even in development, where the HTTP
     * API skips verification: the socket checks it either way.
     */
    let token = null;
    const sessionToken = async () => {
      if (token === null) {
        const res = await page.request.post('/api/signin');
        expect(res.status(), `POST /api/signin returned ${res.status()}`).toBe(200);
        ({ token } = await res.json());
      }
      return token;
    };

    let socket = null;
    const server = async () => {
      if (!socket) {
        socket = io(baseURL, {
          auth: { token: await sessionToken() },
          transports: ['websocket'],
          // The suite already ignores the certificate of a TLS server in the
          // browser (`playwright.config.js`); this is the same decision here.
          rejectUnauthorized: false,
        });
        await new Promise((resolve, reject) => {
          socket.once('connect', resolve);
          socket.once('connect_error', reject);
        });
      }
      return socket;
    };

    /**
     * Live controller state straight from the server, for assertions that
     * should not depend on any page having re-rendered yet.
     */
    const readControllerState = async () => {
      const res = await page.request.get('/api/controllers', {
        headers: { Authorization: `Bearer ${await sessionToken()}` },
      });
      expect(res.status(), `GET /api/controllers returned ${res.status()}`).toBe(200);

      const list = await res.json();
      return list.find((entry) => entry.port === TEST_PORT) || null;
    };

    const activeState = async () => {
      const state = await readControllerState();
      return String(state?.controller?.state?.status?.activeState || '');
    };

    /**
     * Give an alarmed controller permission to move, but only if it is asking.
     *
     * Opening the port resets Grbl, and with `$22=1` it comes up in `Alarm`
     * rather than `Idle` — it has no idea where it is until it has been homed.
     * **In alarm the server sends no G-code at all**, so nothing this tier
     * asks of the machine would reach it.
     *
     * `$X` moves nothing. It clears the alarm lock, and an unhomed machine
     * then has permission to move on the next command — which is exactly what
     * the jog cases go on to ask for, deliberately and by a known step.
     * Conditional: `$X` on an Idle machine is a needless command sent at
     * hardware.
     *
     * Reported, not asserted: `connect` says what a stuck alarm means in its
     * own terms, and the teardown does not care at all.
     */
    const unlock = async () => {
      if (!/alarm/i.test(await activeState())) {
        return true;
      }

      // `unlock` is the server's own name for it; `GrblController` turns it
      // into `$X`.
      (await server()).emit('command', TEST_PORT, 'unlock');

      return expect
        .poll(activeState, { timeout: 15000 })
        .not.toMatch(/alarm/i)
        .then(() => true, () => false);
    };

    /**
     * Open the port, and by default wait until the machine will take a command.
     *
     * `requireIdle` is not a convenience. The teardown's whole job is to close
     * the port, and insisting first that the machine behind it is happy makes
     * the one step that *cleans up* the tier depend on the tier having gone
     * well — which is exactly when it has not. Measured 2026-09-23: a leaked
     * controller in the server's store (`sockets: []`, `ready: false`) left
     * the teardown asserting its way to a timeout instead of closing anything,
     * and the port stayed open for every run after it.
     */
    const connect = async ({ requireIdle = true } = {}) => {
      // Already open, from a previous case or by somebody else. The server
      // keeps a port open after its clients have gone.
      if (!(await readControllerState())?.ready) {
        const client = await server();
        const failed = await new Promise((resolve) => {
          client.emit('open', TEST_PORT, { controllerType: 'Grbl', baudrate: Number(TEST_BAUD) }, resolve);
        });
        expect(failed, `the server would not open ${TEST_PORT}`).toBeFalsy();

        await expect
          .poll(async () => Boolean((await readControllerState())?.ready), {
            message: `${TEST_PORT} opened but the controller never reported ready`,
            timeout: 30000,
          })
          .toBe(true);
      }

      if (!requireIdle) {
        return;
      }

      const unlocked = await unlock();
      expect(
        unlocked,
        'the controller stayed in alarm after $X. Two different things look like this, and only ' +
        'one of them is about the server:\n' +
        '  - a soft-limit alarm, which Grbl answers with `[MSG:Reset to continue]` and which $X ' +
        'cannot clear at all. A jog that left the envelope is the cause, and since the travel is ' +
        '`[-range, 0]`, a `+` move from a freshly opened port is already outside it. Every case ' +
        'after the one that did it fails here too, which is why this message must not guess.\n' +
        '  - a stale controller in the server (`ready: false`), where nothing reaches the machine ' +
        'at all. Restart the server.\n' +
        'The server log tells them apart in one line.'
      ).toBe(true);

      await expect.poll(activeState, { timeout: 30000 }).toMatch(/idle/i);
    };

    /** Close the port the tier opened. */
    const close = async () => {
      const client = await server();
      await new Promise((resolve) => {
        client.emit('close', TEST_PORT, resolve);
      });
    };

    await use({
      page,
      connect,
      close,
      readControllerState,
      port: TEST_PORT,
      baud: TEST_BAUD,
    });

    if (socket) {
      socket.close();
    }
  },
});

module.exports = { test, expect, TEST_PORT, TEST_BAUD };
