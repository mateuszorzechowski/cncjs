const { test, expect } = require('./fixtures');

/**
 * The Sterownik tab — Grbl's `$` settings, after the settings handoff of
 * 2026-09-28 (a list of groups, a sheet per group, one review that writes),
 * on a phone — against a controller that is not there: the client's port
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
    // Straight to Ustawienia: on a phone it is not one of the menu's tabs.
    window.localStorage.setItem('panel.screen', 'settings');
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
  await page.getByRole('button', { name: 'Sterownik', exact: true }).click();
};

const sent = (page) => page.evaluate(() => window.__sent.filter(([cmd]) => cmd === 'settings:write').map(([, args]) => args));
const field = (page, name) => page.getByRole('textbox', { name, exact: true });
const sheet = (page) => page.getByRole('dialog');
const openGroup = (page, name) => page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
const done = (page) => sheet(page).getByRole('button', { name: 'Gotowe' }).click();

test.describe('the Sterownik tab', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a list of groups with their values, the firmware in the head, a group in a sheet', async ({ cncjs }) => {
    await open(cncjs.page, {
      ...VIEW,
      firmware: { name: 'Grbl', version: '1.1h' },
      groups: [{ group: 'axes', parts: [{ names: ['$110', '$111', '$112'], unit: 'feed', values: [3000, 3000, 600] }] }],
    });

    await expect(cncjs.page.getByText('Grbl 1.1h')).toBeVisible();
    await expect(cncjs.page.getByRole('button', { name: /^Osie/ })).toContainText('3000 · 3000 · 600');
    await openGroup(cncjs.page, 'Osie');
    await expect(field(cncjs.page, 'Kroki silnika X')).toHaveValue('800.000');
    await expect(field(cncjs.page, 'Kroki silnika Z')).toHaveValue('400.000');
    // No bar while nothing waits.
    await done(cncjs.page);
    await expect(cncjs.page.getByRole('button', { name: 'Przejrzyj' })).toHaveCount(0);
    cncjs.expectNoPageErrors();
  });

  test('a change waits in the bar; the review is the one way to the server', async ({ cncjs }) => {
    await open(cncjs.page);

    await openGroup(cncjs.page, 'Osie');
    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await done(cncjs.page);
    await expect(cncjs.page.getByText('Niezapisane zmiany: 1')).toBeVisible();
    await expect(cncjs.page.getByText('Osie 1')).toBeVisible();
    expect(await sent(cncjs.page)).toEqual([]);

    await cncjs.page.getByRole('button', { name: 'Przejrzyj' }).click();
    await expect(sheet(cncjs.page)).toContainText('Maks. prędkość X');
    await expect(sheet(cncjs.page)).toContainText('3000.000 → 3500 mm/min');
    await sheet(cncjs.page).getByRole('button', { name: 'Zapisz w sterowniku' }).click();
    expect(await sent(cncjs.page)).toEqual([{ changes: [{ name: '$110', value: '3500', units: 'mm' }] }]);

    // `$$` read back by the server says the new value: the bar and the review go.
    await cncjs.page.evaluate((v) => {
      window.__fire('machine:settings', { ...v, rows: v.rows.map((r) => (r.name === '$110' ? { ...r, value: 3500, raw: '3500.000' } : r)) });
    }, VIEW);
    await expect(cncjs.page.getByRole('button', { name: 'Przejrzyj' })).toHaveCount(0);
    await expect(sheet(cncjs.page)).toHaveCount(0);
  });

  test('a change taken back alone with its ✕', async ({ cncjs }) => {
    await open(cncjs.page);

    await openGroup(cncjs.page, 'Osie');
    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await field(cncjs.page, 'Kroki silnika Z').fill('500');
    await done(cncjs.page);
    await cncjs.page.getByRole('button', { name: 'Przejrzyj' }).click();
    await sheet(cncjs.page).getByRole('button', { name: 'Cofnij zmianę $110' }).click();

    await expect(sheet(cncjs.page)).toContainText('Zmiany do zapisania (1)');
    await expect(cncjs.page.getByText('Niezapisane zmiany: 1')).toBeVisible();
  });

  test('Grbl\'s refusal names the setting in the review, and the drafts stay', async ({ cncjs }) => {
    await open(cncjs.page);

    await openGroup(cncjs.page, 'Osie');
    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await done(cncjs.page);
    await cncjs.page.getByRole('button', { name: 'Przejrzyj' }).click();
    await sheet(cncjs.page).getByRole('button', { name: 'Zapisz w sterowniku' }).click();
    await cncjs.page.evaluate(() => window.__fire('command:refused', { cmd: 'settings:write', reason: 'error:9', name: '$110', written: [] }));

    await expect(sheet(cncjs.page).getByText(/Grbl odrzucił \$110 \(error:9\)/)).toBeVisible();
    await expect(cncjs.page.getByText('Niezapisane zmiany: 1')).toBeVisible();
    // Said where it was asked — not again in the notice over the screen.
    await expect(cncjs.page.getByRole('status').filter({ hasText: 'settings:write' })).toHaveCount(0);
  });

  test('discarding all asks nothing, and "Cofnij" brings them back', async ({ cncjs }) => {
    await open(cncjs.page);

    await openGroup(cncjs.page, 'Osie');
    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await done(cncjs.page);
    await cncjs.page.getByRole('button', { name: 'Przejrzyj' }).click();
    await sheet(cncjs.page).getByRole('button', { name: 'Odrzuć wszystkie' }).click();

    await expect(cncjs.page.getByRole('button', { name: 'Przejrzyj' })).toHaveCount(0);
    await expect(cncjs.page.getByText('Odrzucono zmian: 1')).toBeVisible();
    await cncjs.page.getByRole('button', { name: 'Cofnij' }).click();
    await expect(cncjs.page.getByText('Niezapisane zmiany: 1')).toBeVisible();
    expect(await sent(cncjs.page)).toEqual([]);
  });

  test('reading again over waiting changes asks first', async ({ cncjs }) => {
    await open(cncjs.page);

    await openGroup(cncjs.page, 'Osie');
    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await done(cncjs.page);
    await cncjs.page.getByRole('button', { name: 'Odczytaj ze sterownika' }).click();
    await expect(sheet(cncjs.page)).toContainText('Niezapisane zmiany (1) przepadną');
    await sheet(cncjs.page).getByRole('button', { name: 'Odczytaj', exact: true }).click();

    await expect(cncjs.page.getByRole('button', { name: 'Przejrzyj' })).toHaveCount(0);
  });

  test('restoring the state before a write puts it back as changes waiting, not written', async ({ cncjs }) => {
    const history = [{
      id: 4, time: '2026-09-26T12:00:00Z', source: 'panel', device: 'laptop', deviceName: 'Laptop', changes: [{ name: '$110', from: '2500.000', to: '3000.000' }],
    }];
    await open(cncjs.page, { ...VIEW, history });

    await cncjs.page.getByRole('button', { name: /^Historia zmian/ }).click();
    await expect(sheet(cncjs.page)).toContainText('Laptop');
    await sheet(cncjs.page).getByRole('button', { name: 'Przywróć stan sprzed' }).click();

    await expect(cncjs.page.getByText('Niezapisane zmiany: 1')).toBeVisible();
    await cncjs.page.getByRole('button', { name: 'Przejrzyj' }).click();
    await expect(sheet(cncjs.page)).toContainText('3000.000 → 2500.000 mm/min');
    expect(await sent(cncjs.page)).toEqual([]);
  });

  test('the $$ view shows the same drafts, filtered', async ({ cncjs }) => {
    await open(cncjs.page);

    await openGroup(cncjs.page, 'Osie');
    await field(cncjs.page, 'Maks. prędkość X').fill('3500');
    await done(cncjs.page);
    await cncjs.page.getByRole('button', { name: /^Widok surowy/ }).click();
    await expect(field(cncjs.page, '$110')).toHaveValue('3500');
    await expect(cncjs.page.getByText('było 3000.000')).toBeVisible();

    await field(cncjs.page, 'Filtr').fill('$10');
    await expect(field(cncjs.page, '$100')).toBeVisible();
    await expect(field(cncjs.page, '$110')).toHaveCount(0);
  });

  test('soft limits are dark while homing is off', async ({ cncjs }) => {
    await open(cncjs.page);

    await openGroup(cncjs.page, 'Bazowanie');
    await sheet(cncjs.page).getByRole('group', { name: 'Bazowanie' }).getByRole('button', { name: 'Wył.' }).click();
    await done(cncjs.page);
    await openGroup(cncjs.page, 'Limity');

    await expect(cncjs.page.getByText('Włącz bazowanie ($22), aby użyć.')).toBeVisible();
    await expect(cncjs.page.getByRole('group', { name: 'Limity programowe' }).getByRole('button', { name: 'Wył.' })).toBeDisabled();
  });

  test('a controller reporting in inches: red, and the fix asks first', async ({ cncjs }) => {
    await open(cncjs.page, { ...VIEW, rows: ROWS.map((r) => (r.name === '$13' ? { ...r, value: 1, raw: '1', wrong: true } : r)) });

    await openGroup(cncjs.page, 'Ruch i raporty');
    await expect(cncjs.page.getByText(/raportuje w calach \(\$13=1\)/).first()).toBeVisible();
    await cncjs.page.getByRole('button', { name: 'Napraw: $13=0' }).click();
    await cncjs.page.getByRole('dialog').getByRole('button', { name: 'Zapisz $13=0' }).click();
    expect(await sent(cncjs.page)).toEqual([{ changes: [{ name: '$13', value: 0 }] }]);
  });

  test('nothing may be changed while a program runs', async ({ cncjs }) => {
    await open(cncjs.page);
    await cncjs.page.evaluate((st) => window.__fire('controller:state', 'Grbl', st), state('Run'));

    await expect(cncjs.page.getByText(/GRBL przyjmuje zmiany tylko/)).toBeVisible();
    await expect(cncjs.page.getByRole('button', { name: 'Odczytaj ze sterownika' })).toBeDisabled();
    await openGroup(cncjs.page, 'Osie');
    await expect(field(cncjs.page, 'Kroki silnika X')).toBeDisabled();
  });

  test('Geometria: the server\'s summary and checks, each line going to its setting', async ({ cncjs }) => {
    const geometry = {
      summary: [
        { id: 'travel', names: ['$130', '$131', '$132'], group: 'axes', value: { x: 420, y: 290, z: 11 } },
        { id: 'homingSide', names: ['$23'], group: 'axes', value: { x: '-', y: '+', z: '+' } },
        { id: 'softLimits', names: ['$20'], group: 'limits', value: 'inactive' },
      ],
      checks: [{ level: 'error', code: 'soft-without-homing', name: '$22', group: 'homing' }],
      homing: ['x', 'y', 'z'].map((axis) => ({ axis, side: '+', range: { min: -100, max: 0 }, after: null, switchAt: 0 })),
    };
    await open(cncjs.page, { ...VIEW, geometry });
    await cncjs.page.evaluate(() => window.__fire('controller:envelope', { min: { x: -420, y: -290, z: -11 }, max: { x: 0, y: 0, z: 0 } }));

    await expect(cncjs.page.getByRole('button', { name: /^Geometria/ })).toContainText('420 × 290 × 11');
    await openGroup(cncjs.page, 'Geometria');
    await expect(sheet(cncjs.page).getByText('X− Y+ Z+')).toBeVisible();
    await expect(sheet(cncjs.page).getByText(/bazowanie jest wyłączone\. GRBL ich nie użyje/)).toBeVisible();

    await sheet(cncjs.page).getByRole('button', { name: /Limity programowe bazowanie jest wyłączone|\$22 →/ }).click();
    await expect(sheet(cncjs.page)).toHaveAttribute('aria-label', 'Bazowanie');
    cncjs.expectNoPageErrors();
  });

  test('the review and Geometria show the geometry after the write, as the server previews it', async ({ cncjs }) => {
    const line = (value) => ({ id: 'softLimits', names: ['$20'], group: 'limits', value });
    const homing = ['x', 'y', 'z'].map((axis) => ({ axis, side: '+', range: { min: -100, max: 0 }, after: -1, switchAt: 0 }));
    await open(cncjs.page, { ...VIEW, geometry: { summary: [line('on')], checks: [], homing } });

    await openGroup(cncjs.page, 'Limity');
    await sheet(cncjs.page).getByRole('group', { name: 'Limity programowe' }).getByRole('button', { name: 'Wył.' }).click();
    await done(cncjs.page);

    // The panel asks; nothing is written.
    await expect.poll(() => cncjs.page.evaluate(() => window.__sent.filter(([cmd]) => cmd === 'settings:preview').length)).toBeGreaterThan(0);
    const asked = await cncjs.page.evaluate(() => window.__sent.filter(([cmd]) => cmd === 'settings:preview').pop()[1]);
    expect(asked.changes).toEqual([{ name: '$20', value: '0', units: undefined }]);
    expect(await sent(cncjs.page)).toEqual([]);

    await cncjs.page.evaluate(({ seq, geometry }) => window.__fire('machine:preview', { seq, geometry, envelope: null, changed: ['softLimits'] }), {
      seq: asked.seq,
      geometry: { summary: [line('off')], checks: [{ level: 'info', code: 'hard-off', name: '$21', group: 'limits' }], homing },
    });

    await cncjs.page.getByRole('button', { name: 'Przejrzyj' }).click();
    await expect(sheet(cncjs.page)).toContainText('Geometria po zapisie');
    await expect(sheet(cncjs.page).locator('s', { hasText: 'włączone' })).toBeVisible();
    await expect(sheet(cncjs.page)).toContainText('Krańcówki wyłączone');
    await done(cncjs.page);

    await openGroup(cncjs.page, 'Geometria');
    await expect(sheet(cncjs.page).locator('s', { hasText: 'włączone' })).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test('connected with no rows yet says so, not "connect"', async ({ cncjs }) => {
    await open(cncjs.page, { rows: [], history: [] });

    await expect(cncjs.page.getByText(/nie podał jeszcze ustawień/)).toBeVisible();
  });
});
