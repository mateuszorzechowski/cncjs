const { test, expect } = require('./fixtures');

/**
 * The Maszyna tab — Grbl's `$` settings — against a controller that is not
 * there: the client's port opening and commands are replaced, and what the
 * server would say is fired at the panel directly, as `panel-preview` does.
 *
 * Firing goes through the client's own listener list, so an event missing
 * from `app/lib/controller/Controller.js` has nobody to hear it here either —
 * the one thing the unit tests cannot see.
 */

const REPORTED = { $13: '0', $22: '1', $23: '3', $100: '800.000', $101: '800.000', $102: '400.000', $110: '5000.000' };

// The server's rows for those, as `describeSettings` lists them.
const ROWS = [
  { name: '$13', group: 'report', kind: 'bool', locked: 'units', value: 0, raw: '0' },
  { name: '$22', group: 'homing', kind: 'bool', value: 1, raw: '1' },
  { name: '$23', group: 'homing', kind: 'mask', max: 7, bits: 'axes', value: 3, raw: '3' },
  { name: '$100', group: 'axes', kind: 'float', unit: 'perLength', min: 0, axis: 'x', value: 800, raw: '800.000' },
  { name: '$101', group: 'axes', kind: 'float', unit: 'perLength', min: 0, axis: 'y', value: 800, raw: '800.000' },
  { name: '$102', group: 'axes', kind: 'float', unit: 'perLength', min: 0, axis: 'z', value: 400, raw: '400.000' },
  { name: '$110', group: 'axes', kind: 'float', unit: 'feed', min: 0, axis: 'x', value: 5000, raw: '5000.000' },
];

const idle = {
  status: { activeState: 'Idle', subState: 0, mpos: { x: 0, y: 0, z: 0 }, wpos: { x: 0, y: 0, z: 0 }, ov: [100, 100, 100], feedrate: 0, spindle: 0 },
  parserstate: { modal: { wcs: 'G54', units: 'G21', distance: 'G90' }, tool: '0' },
};

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
        ['write', 'writeln', 'closePort'].forEach((name) => {
          client[name] = () => {};
        });
        window.__sent = [];
        client.command = (...args) => window.__sent.push(args);
      },
    });
    window.__fire = (name, ...args) => {
      if (name === 'controller:state') {
        client.state = { ...args[1] };
      }
      (client.listeners[name] || []).slice().forEach((listener) => listener(...args));
    };
  });
  await page.route('**/api/controllers', (route) => route.fulfill({
    json: [{ port: 'COM9', baudrate: 115200, rtscts: false, controller: { type: 'Grbl', state: idle, settings: { settings: REPORTED } } }],
  }));
  await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('banner')).not.toContainText(/brak portu|przypinanie/i, { timeout: 45000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__panelController?.port))).toBe(true);
  await page.evaluate(({ reported, rows, state }) => {
    window.__fire('controller:state', 'Grbl', state);
    window.__fire('controller:settings', 'Grbl', { settings: reported });
    window.__fire('machine:settings', { rows, history: [] });
  }, { reported: REPORTED, rows: ROWS, state: idle });
  await page.getByRole('navigation', { name: 'Nawigacja' }).getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByRole('button', { name: 'Maszyna', exact: true }).click();
};

const sent = (page) => page.evaluate(() => window.__sent.filter(([cmd]) => cmd === 'settings:write').map(([, args]) => args));

test.describe('the Maszyna tab', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('lists the settings by topic, the axes three to a row, each described', async ({ cncjs }) => {
    await open(cncjs.page);

    await expect(cncjs.page.getByRole('heading', { name: 'Kroki silnika' })).toBeVisible();
    await expect(cncjs.page.getByRole('button', { name: /X · \$100.*800\.000/ })).toBeVisible();
    await expect(cncjs.page.getByRole('button', { name: /Z · \$102.*400\.000/ })).toBeVisible();
    await expect(cncjs.page.getByRole('heading', { level: 2, name: 'Bazowanie', exact: true })).toBeVisible();
    await expect(cncjs.page.getByRole('button', { name: /\$23.*X · Y/ })).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test('a write asks first, goes to the server, and the sheet closes on the new value', async ({ cncjs }) => {
    await open(cncjs.page);

    await cncjs.page.getByRole('button', { name: /\$22/ }).click();
    const sheet = cncjs.page.getByRole('dialog');
    await expect(sheet).toContainText('EEPROM');
    const save = sheet.getByRole('button', { name: 'Zapisz w sterowniku' });
    // Nothing changed yet, nothing to write.
    await expect(save).toBeDisabled();

    await sheet.getByRole('button', { name: 'Wyłączone' }).click();
    await save.click();
    expect(await sent(cncjs.page)).toEqual([{ name: '$22', value: 0, units: 'mm' }]);
    await expect(sheet).toBeVisible();

    // `$$` read back by the server says the new value: done.
    await cncjs.page.evaluate((rows) => {
      window.__fire('machine:settings', { rows: rows.map((row) => (row.name === '$22' ? { ...row, value: 0, raw: '0' } : row)), history: [] });
    }, ROWS);
    await expect(sheet).toHaveCount(0);
    await expect(cncjs.page.getByRole('button', { name: /\$22.*Wyłączone/ })).toBeVisible();
  });

  test('Grbl\'s refusal is said in the sheet, and the value typed is kept', async ({ cncjs }) => {
    await open(cncjs.page);

    await cncjs.page.getByRole('button', { name: /X · \$110/ }).click();
    const sheet = cncjs.page.getByRole('dialog');
    await sheet.getByRole('textbox').fill('4500');
    await sheet.getByRole('button', { name: 'Zapisz w sterowniku' }).click();
    await cncjs.page.evaluate(() => window.__fire('command:refused', { cmd: 'settings:write', reason: 'error:8' }));

    await expect(sheet).toContainText('Grbl odrzucił zapis (error:8)');
    await expect(sheet.getByRole('textbox')).toHaveValue('4500');
    // Said once, in the sheet — not again in the notice over the screen.
    await expect(cncjs.page.getByRole('status').filter({ hasText: 'settings:write' })).toHaveCount(0);
  });

  test('the raw view is `$x` as Grbl said it, with `$13` locked', async ({ cncjs }) => {
    await open(cncjs.page);

    await cncjs.page.getByRole('button', { name: 'Surowe $x' }).click();
    await expect(cncjs.page.getByRole('button', { name: /^\$100.*800\.000/ })).toBeVisible();
    await expect(cncjs.page.getByRole('button', { name: /^\$13/ })).toBeDisabled();
  });

  test('nothing may be written while a program runs', async ({ cncjs }) => {
    await open(cncjs.page);
    await cncjs.page.evaluate((state) => {
      window.__fire('controller:state', 'Grbl', { ...state, status: { ...state.status, activeState: 'Run' } });
    }, idle);

    await expect(cncjs.page.getByText(/Grbl przyjmuje zmiany tylko/)).toBeVisible();
    await expect(cncjs.page.getByRole('button', { name: /X · \$100/ })).toBeDisabled();
  });
});
