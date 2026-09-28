const { test, expect } = require('./fixtures');

/**
 * The panel's version and its updating itself (Mateusz, 2026-09-28): this
 * fork's build rather than cncjs's `1.11.5`, what the server has, and a
 * reload to it — by itself when nobody is using the panel, unless this
 * device switched that off.
 *
 * The server's build is `/panel/version.json`, written by the build beside
 * the panel. A case that needs another build there answers it here.
 */
const OTHER = { label: 'panel-2099.01.01', tag: 'panel-2099.01.01', commit: 'abcdef0', dirty: false, id: 'abcdef0' };

const serveBuild = (page, build) => page.route('**/panel/version.json', (route) => route.fulfill({ json: build }));

const openInstall = async (page) => {
  // This tier's server runs without TLS, so it has no authority to describe, and says 404 — answered here, as empty.
  await page.route('**/panel/cnc-ca.json', (route) => route.fulfill({ json: {} }));
  await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Nawigacja' }).getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByText('Instalacja', { exact: true }).click();
};

test.describe('the panel version', () => {
  // The worker's own requests pass by `page.route`; the version is asked for by the page, so the cases go without it.
  test.use({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' });

  test('names this fork\'s build, and says when the server has the same', async ({ cncjs }) => {
    const served = await (await cncjs.page.request.get('/panel/version.json')).json();
    expect(served.id).toBeTruthy();
    await openInstall(cncjs.page);

    const line = cncjs.page.getByRole('heading', { name: /^Wersja panelu/ });
    await expect(line).toContainText(served.label);
    await expect(line).not.toContainText('1.11.5');
    await expect(cncjs.page.getByText('To najnowsza dostępna wersja.')).toBeVisible();
    await expect(cncjs.page.getByRole('button', { name: 'Odśwież panel' })).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test('another build is named in the top bar, which leads to Instalacja, where it waits for a tap', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.addInitScript(() => window.localStorage.setItem('panel.autoUpdate', 'off'));
    await serveBuild(page, OTHER);
    await page.route('**/panel/cnc-ca.json', (route) => route.fulfill({ json: {} }));
    await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });

    // In the bar: the version, and a way to the settings, not a reload.
    const offer = page.getByRole('banner').getByRole('button', { name: /^Dostępna nowa wersja panelu: panel-2099\.01\.01/ });
    await expect(offer).toContainText('Dostępna panel-2099.01.01');
    await offer.click();

    await expect(page.getByRole('heading', { name: /^Dostępna wersja/ })).toContainText('panel-2099.01.01');
    await expect(page.getByRole('button', { name: 'Aktualizuj', exact: true })).toBeVisible();
    await expect(cncjs.page.getByRole('radio', { name: 'Wyłączone' }).or(cncjs.page.getByRole('button', { name: 'Wyłączone' })).first()).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test('updates by itself when nobody is using it — once for a build, not in a loop', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.clock.install();
    await serveBuild(page, OTHER);
    let loads = 0;
    page.on('load', () => {
      loads++;
    });
    await openInstall(page);
    await expect(page.getByRole('button', { name: 'Aktualizuj', exact: true })).toBeVisible();
    await page.waitForLoadState('load');
    const before = loads;

    // Not while it may be in use: twenty seconds idle is not yet enough.
    await page.clock.runFor(20 * 1000);
    await page.waitForTimeout(500);
    expect(loads).toBe(before);

    // Idle past the half minute: it reloads to the server's build.
    await page.clock.runFor(20 * 1000);
    await expect.poll(() => loads).toBe(before + 1);

    // The reload brought back the same panel (the route still answers another build): not again.
    await page.waitForLoadState('domcontentloaded');
    await page.clock.runFor(2 * 60 * 1000);
    await page.waitForTimeout(500);
    expect(loads).toBe(before + 1);
  });
});
