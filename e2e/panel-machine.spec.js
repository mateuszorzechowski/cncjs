const { test, expect } = require('./fixtures');

/**
 * The Sterownik tab — Grbl's `$` settings, after the settings design of
 * 2026-09-26 — against a controller that is not there: the client's port
 * opening and commands are replaced, and what the server would say is fired
 * at the panel directly, as `panel-preview` does.
 *
 * Firing goes through the client's own listener list, so an event missing
 * from `app/lib/controller/Controller.js` has nobody to hear it here either —
 * the one thing the unit tests cannot see.
 */

const REPORTED = { $3: '2', $13: '0', $20: '1', $22: '1', $100: '800.000', $101: '800.000', $102: '400.000', $110: '3000.000' };

// The server's rows for those, as `describeSettings` lists them.
const ROWS = [
  { name: '$3', group: 'axes', kind: 'mask', max: 7, bits: 'axes', value: 2, raw: '2' },
  { name: '$100', group: 'axes', kind: 'float', unit: 'perLength', min: 0, positive: true, axis: 'x', value: 800, raw: '800.000' },
  { name: '$101', group: 'axes', kind: 'float', unit: 'perLength', min: 0, positive: true, axis: 'y', value: 800, raw: '800.000' },
  { name: '$102', group: 'axes', kind: 'float', unit: 'perLength', min: 0, positive: true, axis: 'z', value: 400, raw: '400.000' },
  { name: '$110', group: 'axes', kind: 'float', unit: 'feed', min: 0, positive: true, axis: 'x', value: 3000, raw: '3000.000' },
  { name: '$22', group: 'homing', kind: 'bool', value: 1, raw: '1' },
  { name: '$20', group: 'limits', kind: 'bool', needs: '$22', value: 1, raw: '1' },
  { name: '$13', group: 'motion', kind: 'bool', locked: 'units', required: 0, value: 0, raw: '0', wrong: false },
];
const VIEW = { rows: ROWS, history: [], readAt: '2026-09-26T12:04:00Z' };

const state = (activeState) => ({
  status: { activeState, subState: 0, mpos: { x: 0, y: 0, z: 0 }, wpos: { x: 0, y: 0, z: 0 }, ov: [100, 100, 100], feedrate: 0, spindle: 0 },
  parserstate: { modal: { wcs: 'G54', units: 'G21', distance: 'G90' }, tool: '0' },
});

const open = async (page, view = VIEW) => {
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
    json: [{ port: 'COM9', baudrate: 115200, rtscts: false, controller: { type: 'Grbl', state: state('Idle'), settings: { settings: REPORTED } } }],
  }));
  await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('banner')).not.toContainText(/brak portu|przypinanie/i, { timeout: 45000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__panelController?.port))).toBe(true);
  await page.evaluate(({ reported, v, st }) => {
    window.__fire('controller:state', 'Grbl', st);
    window.__fire('controller:settings', 'Grbl', { settings: reported });
    window.__fire('machine:settings', v);
  }, { reported: REPORTED, v: view, st: state('Idle') });
  await page.getByRole('navigation', { name: 'Nawigacja' }).getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByRole('button', { name: 'Sterownik', exact: true }).click();
};

const sent = (page) => page.evaluate(() => window.__sent.filter(([cmd]) => cmd === 'settings:write').map(([, args]) => args));
const groups = (page) => page.getByRole('tablist', { name: 'Grupy ustawień' });
const field = (page, name) => page.getByRole('textbox', { name, exact: true });

test.describe('the Sterownik tab', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('groups in a menu, the axes as a table of X, Y and Z', async ({ cncjs }) => {
    await open(cncjs.page);

    await expect(groups(cncjs.page).getByRole('tab', { name: 'Osie' })).toHaveAttribute('aria-selected', 'true');
    await expect(field(cncjs.page, 'Kroki silnika X')).toHaveValue('800.000');
    await expect(field(cncjs.page, 'Kroki silnika Z')).toHaveValue('400.000');
    await expect(cncjs.page.getByText('Zgodne ze sterownikiem')).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test('a change waits in the bar, asks first, then goes to the server', async ({ cncjs }) => {
    await open(cncjs.page);

    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await expect(cncjs.page.getByText('Niezapisane w sterowniku: 1')).toBeVisible();
    await expect(groups(cncjs.page).getByRole('tab', { name: /Osie\s*1/ })).toBeVisible();
    expect(await sent(cncjs.page)).toEqual([]);

    await cncjs.page.getByRole('button', { name: 'Zapisz w sterowniku (1)' }).click();
    const sheet = cncjs.page.getByRole('dialog');
    await expect(sheet).toContainText('Maks. prędkość X');
    await expect(sheet).toContainText('3000.000 → 3500 mm/min');
    await sheet.getByRole('button', { name: 'Zapisz w sterowniku' }).click();
    expect(await sent(cncjs.page)).toEqual([{ changes: [{ name: '$110', value: '3500', units: 'mm' }] }]);

    // `$$` read back by the server says the new value: the bar is clean again.
    await cncjs.page.evaluate((v) => {
      window.__fire('machine:settings', { ...v, rows: v.rows.map((r) => (r.name === '$110' ? { ...r, value: 3500, raw: '3500.000' } : r)) });
    }, VIEW);
    await expect(cncjs.page.getByText('Zgodne ze sterownikiem')).toBeVisible();
    await expect(field(cncjs.page, 'Maks. prędkość X')).toHaveValue('3500.000');
  });

  test('Grbl\'s refusal names the setting in the bar, and the drafts stay', async ({ cncjs }) => {
    await open(cncjs.page);

    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await cncjs.page.getByRole('button', { name: 'Zapisz w sterowniku (1)' }).click();
    await cncjs.page.getByRole('dialog').getByRole('button', { name: 'Zapisz w sterowniku' }).click();
    await cncjs.page.evaluate(() => window.__fire('command:refused', { cmd: 'settings:write', reason: 'error:9', name: '$110', written: [] }));

    await expect(cncjs.page.getByText(/Grbl odrzucił \$110 \(error:9\)/)).toBeVisible();
    await expect(field(cncjs.page, 'Maks. prędkość X')).toHaveValue('3500');
    // Said once, in the bar — not again in the notice over the screen.
    await expect(cncjs.page.getByRole('status').filter({ hasText: 'settings:write' })).toHaveCount(0);
  });

  test('the $$ view shows the same drafts, filtered', async ({ cncjs }) => {
    await open(cncjs.page);

    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await cncjs.page.getByRole('button', { name: 'GRBL $$' }).click();
    await expect(field(cncjs.page, '$110')).toHaveValue('3500');
    await expect(cncjs.page.getByText('było 3000.000')).toBeVisible();

    await field(cncjs.page, 'Filtr').fill('$10');
    await expect(field(cncjs.page, '$100')).toBeVisible();
    await expect(field(cncjs.page, '$110')).toHaveCount(0);
    await cncjs.page.getByRole('button', { name: 'Odrzuć' }).click();
    await expect(cncjs.page.getByText('Zgodne ze sterownikiem')).toBeVisible();
  });

  test('soft limits are dark while homing is off', async ({ cncjs }) => {
    await open(cncjs.page);

    await groups(cncjs.page).getByRole('tab', { name: 'Bazowanie' }).click();
    await cncjs.page.getByRole('group', { name: 'Bazowanie' }).getByRole('button', { name: 'Wył.' }).click();
    await groups(cncjs.page).getByRole('tab', { name: 'Limity' }).click();

    await expect(cncjs.page.getByText('Włącz bazowanie ($22), aby użyć.')).toBeVisible();
    await expect(cncjs.page.getByRole('group', { name: 'Limity programowe' }).getByRole('button', { name: 'Wył.' })).toBeDisabled();
  });

  test('a controller reporting in inches: red, and the fix asks first', async ({ cncjs }) => {
    await open(cncjs.page, { ...VIEW, rows: ROWS.map((r) => (r.name === '$13' ? { ...r, value: 1, raw: '1', wrong: true } : r)) });

    await groups(cncjs.page).getByRole('tab', { name: 'Ruch i raporty' }).click();
    await expect(cncjs.page.getByText(/raportuje w calach \(\$13=1\)/).first()).toBeVisible();
    await cncjs.page.getByRole('button', { name: 'Napraw: $13=0' }).click();
    await cncjs.page.getByRole('dialog').getByRole('button', { name: 'Zapisz $13=0' }).click();
    expect(await sent(cncjs.page)).toEqual([{ changes: [{ name: '$13', value: 0 }] }]);
  });

  test('nothing may be changed while a program runs', async ({ cncjs }) => {
    await open(cncjs.page);
    await cncjs.page.evaluate((st) => window.__fire('controller:state', 'Grbl', st), state('Run'));

    await expect(cncjs.page.getByText(/GRBL przyjmuje zmiany tylko/)).toBeVisible();
    await expect(field(cncjs.page, 'Kroki silnika X')).toBeDisabled();
  });

  test('connected with no rows yet says so, not "connect"', async ({ cncjs }) => {
    await open(cncjs.page, { rows: [], history: [] });

    await expect(cncjs.page.getByText(/nie podał jeszcze ustawień/)).toBeVisible();
  });
});
