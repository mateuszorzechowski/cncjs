const { test, expect, TEST_PORT } = require('./fixtures');

test.skip(
  !TEST_PORT,
  'Set CNCJS_TEST_PORT to the controller\'s serial port (e.g. COM3) to run the hardware tier.'
);

test.describe('grbl controller', () => {
  test('connects and reports an idle controller', async ({ grbl }) => {
    // Waits for Idle itself, so reaching the next line is half the case.
    await grbl.connect();

    const state = await grbl.readControllerState();
    expect(state, `no controller reported on ${TEST_PORT}`).not.toBeNull();
    expect(state.ready).toBe(true);
    expect(state.controller.type).toBe('Grbl');
    // Grbl reports its version in the welcome banner; an empty version means
    // the handshake never completed.
    expect(state.controller.settings.version).toMatch(/^\d+\.\d+/);
  });

  test('reports the firmware settings it read at startup', async ({ grbl }) => {
    await grbl.connect();

    const state = await grbl.readControllerState();
    const settings = state.controller.settings.settings;

    // $100-$102 are steps/mm — every Grbl build reports them, so their absence
    // means the settings query never round-tripped.
    for (const key of ['$100', '$101', '$102']) {
      expect(settings[key], `${key} should have been read from the firmware`).toBeDefined();
    }
  });
});
