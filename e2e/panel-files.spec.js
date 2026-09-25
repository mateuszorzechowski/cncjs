const { test, expect } = require('./fixtures');

/**
 * The Pliki screen, against a library answered here.
 *
 * `/api/files` is routed rather than read, so the case never touches the
 * library on the disk of whoever runs it, and the numbers on screen can be
 * checked against numbers the case chose: they are the server's `analysis`,
 * and the panel's whole job is to show them without working anything out.
 * No port is open in this tier, so LOAD is greyed out and says why.
 */

const ANALYSED = {
  name: 'front-panel.nc',
  size: 412345,
  mtime: '2026-09-25T11:04:00.000Z',
  analysis: {
    lines: 18204,
    bounds: { min: { x: 0, y: 0, z: -6 }, max: { x: 420, y: 290, z: 5 } },
    tools: [3, 7],
    wcs: ['G54'],
    units: ['G21'],
    seconds: 1913.5,
    check: {
      verdict: 'incompatible',
      issues: [
        { code: 'undeclared', severity: 'warning', word: 'G20/G21', line: 1, count: 1 },
        { code: 'unsupported', severity: 'incompatible', word: 'G41', line: 12, count: 340 },
      ],
    },
  },
};
const PENDING = { name: 'drawer.nc', size: 88000, mtime: '2026-09-24T09:00:00.000Z', analysis: null };
const DISK = { total: 250e9, free: 58e9 };

const PROGRAM = 'G21 G90\nG0 X0 Y0 Z5\nG1 Z-1 F300\nG1 X40\nG1 Y30\nG1 X0\nG1 Y0\n';

/*
 * `stage` picks which listing is served, and only the case moves it — not
 * the number of requests, since the real server this tier runs against can
 * say `files:change` of its own and the screen then asks again.
 */
const serve = async (page, listings) => {
  const calls = { list: 0, stage: 0, deleted: [] };
  await page.route('**/api/files', (route) => {
    calls.list++;
    return route.fulfill({ json: listings[Math.min(calls.stage, listings.length - 1)] });
  });
  await page.route('**/api/files/*', (route) => {
    const name = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop());
    if (route.request().method() === 'DELETE') {
      calls.deleted.push(name);
      return route.fulfill({ json: { name } });
    }
    return route.fulfill({ json: { name, data: PROGRAM } });
  });
  return calls;
};

/**
 * How many pixels of two screenshots differ by more than a shade — decoded by
 * the browser, since the repository carries no PNG library. A camera glided
 * home lands on the same pose give or take a rounding, not on the same bytes.
 */
const differing = (page, a, b) => page.evaluate(async ([one, two]) => {
  const pixels = async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, image.width, image.height).data;
  };
  const [p, q] = [await pixels(one), await pixels(two)];
  let count = 0;
  for (let i = 0; i < p.length; i += 4) {
    if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 48) {
      count++;
    }
  }
  return count;
}, [a.toString('base64'), b.toString('base64')]);

const open = async (page) => {
  // The socket client, so a case can say what the server says.
  await page.addInitScript(() => {
    window.__fire = (name, ...args) => {
      (window.__panelController.listeners[name] || []).slice().forEach((listener) => listener(...args));
    };
  });
  await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Nawigacja' }).getByRole('button', { name: 'Pliki', exact: true }).click();
};

test.describe('the files screen', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('lists what the server keeps, and chooses nothing by itself', async ({ cncjs }) => {
    const { page } = cncjs;
    await serve(page, [{ files: [ANALYSED, PENDING], disk: DISK }]);
    await open(page);

    const rows = page.getByRole('button', { pressed: false }).filter({ hasText: /\.nc/ });
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('front-panel.nc');
    await expect(rows.nth(0)).toContainText('412,3 kB');
    await expect(page.getByText('Wybierz plik, żeby go tu zobaczyć.')).toBeVisible();
    await expect(page.getByText('wolne 58 GB z 250 GB')).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test("a chosen file shows the server's numbers, and cannot be loaded with no machine", async ({ cncjs }) => {
    const { page } = cncjs;
    await serve(page, [{ files: [ANALYSED, PENDING], disk: DISK }]);
    await open(page);

    await page.getByRole('button', { name: /front-panel\.nc/ }).click();

    await expect(page.getByText('18204', { exact: true })).toBeVisible();
    await expect(page.getByText('31 min 54 s', { exact: true })).toBeVisible();
    await expect(page.getByText('T3, T7', { exact: true })).toBeVisible();
    await expect(page.getByText('-6,0 mm', { exact: true })).toBeVisible();
    await expect(page.getByText('XYZ · 420 × 290 × 11 mm')).toBeVisible();
    await expect(page.getByText('mm (G21) · G54')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(1);
    // Held over the canvas until the scene has drawn, then gone.
    await expect(page.getByText('Czytam plik…')).toHaveCount(0);

    await expect(page.getByRole('button', { name: 'Wczytaj', exact: true })).toBeDisabled();
    await expect(page.getByText('Połącz maszynę, żeby wczytać program.')).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test('the preview can be turned, and goes home by itself when let go', async ({ cncjs }) => {
    const { page } = cncjs;
    await serve(page, [{ files: [ANALYSED], disk: DISK }]);
    await open(page);
    await page.getByRole('button', { name: /front-panel\.nc/ }).click();

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveCount(1);
    await page.waitForTimeout(500);
    const framed = await canvas.screenshot();

    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(await differing(page, await canvas.screenshot(), framed)).toBeGreaterThan(2000);

    // Four seconds untouched, then a glide of under one.
    await expect.poll(async () => differing(page, await canvas.screenshot(), framed), { timeout: 8000, intervals: [500] })
      .toBeLessThan(50);
    cncjs.expectNoPageErrors();
  });

  test("the check's verdict opens what it found, each problem once", async ({ cncjs }) => {
    const { page } = cncjs;
    await serve(page, [{ files: [ANALYSED], disk: DISK }]);
    await open(page);
    await page.getByRole('button', { name: /front-panel\.nc/ }).click();

    const verdict = page.getByRole('button', { name: /stan/ });
    await expect(verdict).toContainText('niezgodny');
    await verdict.click();

    const sheet = page.getByRole('dialog', { name: 'Kontrola pliku' });
    await expect(sheet.getByText('Grbl odrzuci część linii', { exact: false })).toBeVisible();
    await expect(sheet.getByText('G41 — Grbl 1.1 nie zna tego kodu')).toBeVisible();
    await expect(sheet.getByText('340× · pierwszy raz w linii 12')).toBeVisible();
    await expect(sheet.getByText('G20/G21 nieustawione przed pierwszym ruchem', { exact: false })).toBeVisible();
    await expect(sheet.getByText('linia 1', { exact: true })).toBeVisible();

    await sheet.getByRole('button', { name: 'Gotowe', exact: true }).click();
    await expect(sheet).toHaveCount(0);
    // Not a gate: an incompatible file is still loaded the usual way.
    await expect(page.getByText('Połącz maszynę, żeby wczytać program.')).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test("the controller's check is greyed out with no machine, and its last result is kept with the file", async ({ cncjs }) => {
    const { page } = cncjs;
    const checked = {
      ...ANALYSED,
      controllerCheck: {
        complete: true,
        total: 18204,
        errors: [{ code: 'error:33', line: 624, sent: 'G3 X21 Y-20 I20 J21', count: 5 }],
        alarm: null,
        stoppedAt: null,
        at: '2026-09-25T13:08:04.775Z',
      },
    };
    await serve(page, [{ files: [checked], disk: DISK }]);
    await open(page);
    await page.getByRole('button', { name: /front-panel\.nc/ }).click();

    const verify = page.getByRole('button', { name: /Sprawdź na sterowniku/ });
    await expect(verify).toBeDisabled();
    // Why is said by the chip and the note over LOAD, not under the button.
    await expect(page.getByText('Połącz maszynę, żeby wczytać program.')).toBeVisible();

    await page.getByRole('button', { name: /stan/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Kontrola pliku' });
    await expect(sheet.getByText('Grbl przeczytał cały program i odrzucił linie wypisane niżej.')).toBeVisible();
    await expect(sheet.getByText('error:33 — Niepoprawny cel polecenia ruchu.')).toBeVisible();
    await expect(sheet.getByText('5× · pierwszy raz w linii 624')).toBeVisible();
    await expect(sheet.getByText('G3 X21 Y-20 I20 J21')).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test('a file still being analysed shows dashes, not zeros', async ({ cncjs }) => {
    const { page } = cncjs;
    await serve(page, [{ files: [ANALYSED, PENDING], disk: DISK }]);
    await open(page);

    await page.getByRole('button', { name: /drawer\.nc/ }).click();

    const tiles = page.getByText('linie', { exact: true }).locator('..');
    await expect(tiles).toContainText('–');
    await expect(page.getByText('0', { exact: true })).toHaveCount(0);
    // Not checked yet, and nothing to open.
    await expect(page.getByText('nie sprawdzono', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /stan/ })).toHaveCount(0);
  });

  test('delete asks first, names the file in its own case, and only then deletes', async ({ cncjs }) => {
    const { page } = cncjs;
    const calls = await serve(page, [{ files: [ANALYSED], disk: DISK }]);
    await open(page);
    await page.getByRole('button', { name: /front-panel\.nc/ }).click();

    await page.getByRole('button', { name: 'Usuń', exact: true }).click();
    await expect(page.getByText('front-panel.nc zniknie z serwera')).toBeVisible();
    await page.getByRole('button', { name: 'Anuluj', exact: true }).click();
    expect(calls.deleted).toEqual([]);

    await page.getByRole('button', { name: 'Usuń', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Usuń', exact: true }).click();
    await expect.poll(() => calls.deleted).toEqual(['front-panel.nc']);
    cncjs.expectNoPageErrors();
  });

  test('a change on the server is read again, from any device', async ({ cncjs }) => {
    const { page } = cncjs;
    const calls = await serve(page, [
      { files: [ANALYSED], disk: DISK },
      { files: [PENDING, ANALYSED], disk: DISK },
    ]);
    await open(page);
    await expect(page.getByRole('button', { name: /front-panel\.nc/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /drawer\.nc/ })).toHaveCount(0);

    calls.stage = 1;
    await page.evaluate(() => window.__fire('files:change'));

    await expect(page.getByRole('button', { name: /drawer\.nc/ })).toBeVisible();
    expect(calls.list).toBeGreaterThanOrEqual(2);
  });

  test('a nearly full disk is said out loud', async ({ cncjs }) => {
    const { page } = cncjs;
    await serve(page, [{ files: [ANALYSED], disk: { total: 250e9, free: 4e9 } }]);
    await open(page);

    await expect(page.getByText('Dysk serwera jest prawie pełny.', { exact: false })).toBeVisible();
  });

  test('an empty library says so, and upload stays', async ({ cncjs }) => {
    const { page } = cncjs;
    await serve(page, [{ files: [], disk: DISK }]);
    await open(page);

    await expect(page.getByText('Nie ma jeszcze plików.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wgraj', exact: true })).toBeEnabled();
  });
});
