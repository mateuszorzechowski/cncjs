const { test, expect } = require('./fixtures');

/**
 * The panel's addresses and the browser's back. A screen is an address, and
 * an address opened cold opens what it names (Mateusz, 2026-09-28). Back
 * does one thing at a time on a fixed path home (Mateusz, 2026-09-29): the
 * sheet opened last closes — a sheet opened from a sheet returns to the
 * first — and with nothing open a screen goes to the dashboard, whatever was
 * visited before it.
 */
const rail = (page) => page.getByRole('navigation', { name: 'Nawigacja' });
const current = (page) => rail(page).locator('[aria-current="page"]');

test.describe('the panel\'s addresses', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('a screen is an address, and back goes home, not to the screen before', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.goto('/panel/dashboard?lng=pl', { waitUntil: 'domcontentloaded' });
    await rail(page).getByRole('button', { name: 'Jog' }).click();
    await rail(page).getByRole('button', { name: 'Dziennik' }).click();
    await expect(page).toHaveURL(/\/panel\/journal\?lng=pl$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/dashboard\?lng=pl$/);
    await expect(current(page)).toHaveText(/Pulpit/i);
    cncjs.expectNoPageErrors();
  });

  test('an address opened cold opens the screen and the tab it names', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.route('**/panel/cnc-ca.json', (route) => route.fulfill({ json: {} }));
    await page.goto('/panel/settings/install?lng=pl', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Instalacja' })).toHaveAttribute('aria-pressed', 'true');
    await expect(current(page)).toHaveText(/Ustawienia/i);

    await page.getByRole('button', { name: 'Preferencje' }).click();
    await expect(page).toHaveURL(/\/panel\/settings\/preferences\?lng=pl$/);
    cncjs.expectNoPageErrors();
  });

  test('one back closes one sheet: a sheet from a sheet returns to the first, then the screen goes home', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.goto('/panel/dashboard?lng=pl', { waitUntil: 'domcontentloaded' });
    await rail(page).getByRole('button', { name: 'Jog' }).click();

    // The state sheet, and its help opened over it.
    await page.getByRole('banner').getByRole('button').first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Co znaczą stany' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(2);

    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page).toHaveURL(/\/panel\/jog\?lng=pl$/);

    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/panel\/jog\?lng=pl$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/dashboard\?lng=pl$/);
    cncjs.expectNoPageErrors();
  });

  test('a sheet closed by hand leaves nothing for back but the way home', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.goto('/panel/jog?lng=pl', { waitUntil: 'domcontentloaded' });
    await page.getByRole('banner').getByRole('button').first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Gotowe' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/dashboard\?lng=pl$/);
    cncjs.expectNoPageErrors();
  });
});

test.describe('the phone menu and back', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('back lowers the raised menu and stays on the screen', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.goto('/panel/jog?lng=pl', { waitUntil: 'domcontentloaded' });
    const more = page.getByRole('button', { name: 'Więcej' });
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');

    await page.goBack();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(/\/panel\/jog\?lng=pl$/);
    cncjs.expectNoPageErrors();
  });
});

test.describe('back on a phone\'s Chrome', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /*
   * Chrome on Android skips, on back, a step of history a page added without
   * a user's gesture. A step re-added while handling back was jumped over:
   * after closing a sheet the next back left the app instead of closing the
   * sheet under it, or going home from Settings (Mateusz's phone,
   * 2026-09-29). Playwright's back does not skip such steps, so this watches
   * the cause: every step the panel adds must be added under a tap.
   */
  test('every step of history is added under a tap, never while handling back', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.addInitScript(() => {
      window.__pushes = [];
      const push = window.history.pushState.bind(window.history);
      window.history.pushState = (...args) => {
        window.__pushes.push(navigator.userActivation?.isActive ?? true);
        return push(...args);
      };
    });
    await page.goto('/panel/settings/preferences?lng=pl', { waitUntil: 'domcontentloaded' });
    await page.getByRole('banner').getByRole('button').first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Co znaczą stany' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(2);

    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/dashboard\?lng=pl$/);

    const pushes = await page.evaluate(() => window.__pushes);
    expect(pushes.length).toBeGreaterThan(0);
    expect(pushes.every(Boolean)).toBe(true);
    cncjs.expectNoPageErrors();
  });
});
