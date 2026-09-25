const fs = require('fs');
const path = require('path');
const { test, expect } = require('./fixtures');

/**
 * What the toolpath screen draws, compared against pictures of it.
 *
 * *"Coś się zepsuło z osiami/liniami, czy na podgląd są testy?"* (2026-09-25):
 * there were none that looked. Every case in `panel.spec.js` asks whether a
 * canvas exists; the guide lines at the end of the travel had gone missing
 * from three of four views and every one of those cases stayed green.
 *
 * No machine: the panel is handed an open Grbl the way the review overlay's
 * state manager hands it one — through the socket client's own listeners —
 * and `/api/controllers` is answered here, so the panel believes a port is
 * open and attaches to it. Nothing is sent anywhere: every outgoing call on
 * the client is replaced before the panel can make one.
 */

// A 1000 × 700 × 150 machine that homes to the top corner: its travel runs
// from minus the length to zero, which is what `$23=0` means.
const SETTINGS = {
  $20: '1', $22: '0', $23: '0', $130: '1000.000', $131: '700.000', $132: '150.000',
};
const ENVELOPE = { min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };

// Work zero in the middle of the bed, on the surface of the stock.
const WORK_ZERO = { x: -500, y: -350, z: -100 };
const at = (work) => ({
  mpos: {
    x: String(WORK_ZERO.x + work.x), y: String(WORK_ZERO.y + work.y), z: String(WORK_ZERO.z + work.z),
  },
  wpos: { x: String(work.x), y: String(work.y), z: String(work.z) },
});

const PROGRAM = {
  name: 'jsdc.gcode',
  text: fs.readFileSync(path.join(__dirname, '..', 'examples', 'gcode', 'jsdc.gcode'), 'utf8'),
};
const LINES = PROGRAM.text.split('\n').filter((line) => line.trim());

// Where the tool is after the first `count` lines: absolute G1 moves only,
// which is all this program has.
const toolAfter = (count) => LINES.slice(0, count).reduce((where, line) => {
  const next = { ...where };
  for (const [, axis, value] of line.replace(/;.*/, '').matchAll(/([XYZ])(-?[\d.]+)/g)) {
    next[axis.toLowerCase()] = Number(value);
  }
  return next;
}, { x: 0, y: 0, z: 0 });

const grbl = (activeState, work) => ({
  status: {
    activeState, subState: 0, ...at(work), ov: [100, 100, 100], feedrate: 0, spindle: 0,
  },
  parserstate: { modal: { wcs: 'G54', units: 'G21', distance: 'G90' }, tool: '0' },
});

test.describe('the toolpath, as drawn', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  const SCREENSHOT = { maxDiffPixels: 150, threshold: 0.2, animations: 'disabled' };

  const open = async (page) => {
    await page.addInitScript(() => {
      let client = null;
      Object.defineProperty(window, '__panelController', {
        configurable: true,
        get: () => client,
        set: (value) => {
          client = value;
          client.openPort = (port, options, done) => {
            client.port = port;
            client.type = 'Grbl';
            done(null);
          };
          ['command', 'write', 'writeln', 'closePort'].forEach((name) => {
            client[name] = () => {};
          });
        },
      });
      window.__fire = (name, ...args) => {
        if (name === 'controller:state') {
          client.state = { ...args[1] };
        }
        if (name === 'workflow:state') {
          client.workflow.state = args[0];
        }
        (client.listeners[name] || []).slice().forEach((listener) => listener(...args));
      };
    });

    await page.route('**/api/controllers', (route) => route.fulfill({
      json: [{
        port: 'COM9',
        baudrate: 115200,
        rtscts: false,
        controller: { type: 'Grbl', state: grbl('Idle', { x: 0, y: 0, z: 5 }), settings: { settings: SETTINGS } },
      }],
    }));

    await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'Nawigacja' }).getByRole('button', { name: 'Ścieżka' }).click();

    // Attached: the chip has stopped saying which rung is missing.
    await expect(page.getByRole('banner')).not.toContainText(/brak portu|przypinanie/i, { timeout: 45000 });
    await expect.poll(() => page.evaluate(() => Boolean(window.__panelController?.port))).toBe(true);

    await page.evaluate(({ settings, envelope, program }) => {
      window.__fire('controller:settings', 'Grbl', { settings });
      window.__fire('controller:envelope', envelope);
      window.__fire('gcode:load', program.name, program.text);
    }, { settings: SETTINGS, envelope: ENVELOPE, program: PROGRAM });

    await expect(page.getByText(PROGRAM.name).first()).toBeVisible();
  };

  const stage = (page) => page.locator('canvas').first();

  // Two frames after the last change: one to draw, one to be sure the first
  // was not the one before it.
  const settle = (page) => page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150)));
  }));

  const layer = (page, name) => page.getByRole('group', { name: 'Warstwy' })
    .getByRole('button', { name, exact: true });

  const VIEWS = [['IZO', 'iso'], ['GÓRA', 'top'], ['PRZÓD', 'front'], ['BOK', 'right']];

  for (const [button, slug] of VIEWS) {
    test(`${slug}: the program, the floor and the guides at the end of the travel`, async ({ cncjs }) => {
      await open(cncjs.page);
      await cncjs.page.getByRole('button', { name: button, exact: true }).click();
      await settle(cncjs.page);

      await expect(stage(cncjs.page)).toHaveScreenshot(`preview-${slug}.png`, SCREENSHOT);
      cncjs.expectNoPageErrors();
    });

    test(`${slug}, with the machine's outline off: the floor and the guides stay`, async ({ cncjs }) => {
      // *"Jak mam odznaczoną obwiednię maszyny, to w rzucie z boku nie widzę
      // płaszczyzny"* and *"te osie mają być zawsze, bez względu na
      // obwiednię"* — both about exactly this switch.
      await open(cncjs.page);
      const outline = layer(cncjs.page, 'Maszyna · Obszar');
      await expect(outline).toHaveAttribute('aria-pressed', 'true');
      await outline.click();
      await expect(outline).toHaveAttribute('aria-pressed', 'false');

      await cncjs.page.getByRole('button', { name: button, exact: true }).click();
      await settle(cncjs.page);

      await expect(stage(cncjs.page)).toHaveScreenshot(`preview-${slug}-no-outline.png`, SCREENSHOT);
    });
  }

  // From above, and from the side where a done line crosses in front of one
  // still to cut: *"wykonane linie przykrywają linie toru z różnych
  // perspektyw"* (2026-09-25).
  for (const [button, slug] of [['GÓRA', 'top'], ['IZO', 'iso']]) {
    test(`a running program, ${slug}: what is done fades and hides nothing`, async ({ cncjs }) => {
      await open(cncjs.page);

      // Part way through. The planner runs ahead of the tool, so the sender's
      // count is a little past the line being cut, and the tool is put there.
      const received = Math.round(LINES.length * 0.4);
      await cncjs.page.evaluate(({ state, job }) => {
        window.__fire('controller:state', 'Grbl', state);
        window.__fire('workflow:state', 'running');
        window.__fire('sender:status', job);
      }, {
        state: grbl('Run', toolAfter(received - 8)),
        job: { name: PROGRAM.name, total: LINES.length, sent: received, received, startTime: 1, elapsedTime: 60000, remainingTime: 90000, finishTime: 0 },
      });

      await cncjs.page.getByRole('button', { name: button, exact: true }).click();
      await cncjs.page.getByRole('button', { name: 'Wypełnij kadr obiektem' }).click();
      await settle(cncjs.page);

      await expect(stage(cncjs.page)).toHaveScreenshot(`preview-running-${slug}.png`, SCREENSHOT);
    });
  }

  test('two passes, the first done: from above it does not hide the second', async ({ cncjs }) => {
    // The same square twice, a millimetre deeper the second time. Seen from
    // above the done pass lies exactly over the one still to cut, and with
    // the path writing depth it hid all of it.
    const square = (z) => [`G1 Z${z} F200`, 'G1 X40 F800', 'G1 Y40', 'G1 X0', 'G1 Y0'];
    const text = ['G21 G90', 'G0 Z5', 'G0 X0 Y0', ...square(-1), ...square(-2), 'G0 Z5', ''].join('\n');

    await open(cncjs.page);
    await cncjs.page.evaluate(({ program, state, job }) => {
      window.__fire('gcode:load', 'passes.gcode', program);
      window.__fire('controller:state', 'Grbl', state);
      window.__fire('workflow:state', 'running');
      window.__fire('sender:status', job);
    }, {
      program: text,
      // Plunged for the second pass, on its first side.
      state: grbl('Run', { x: 20, y: 0, z: -2 }),
      job: { name: 'passes.gcode', total: 14, sent: 10, received: 10, startTime: 1, elapsedTime: 60000, remainingTime: 60000, finishTime: 0 },
    });

    await cncjs.page.getByRole('button', { name: 'GÓRA', exact: true }).click();
    await cncjs.page.getByRole('button', { name: 'Wypełnij kadr obiektem' }).click();
    await settle(cncjs.page);

    await expect(stage(cncjs.page)).toHaveScreenshot('preview-passes.png', SCREENSHOT);
  });
});
