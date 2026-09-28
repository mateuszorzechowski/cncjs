const { test, expect } = require('./fixtures');

/**
 * The panel's addresses and the browser's back (Mateusz, 2026-09-28:
 * *"nawigując nie zmienia się adres URL … przycisk wstecz, gest cofnij nie
 * działają"*): a screen is an address, back goes back a screen, a sheet is a
 * step of its own that back closes, and an address opened cold opens what it
 * names.
 */
const rail = (page) => page.getByRole('navigation', { name: 'Nawigacja' });
const current = (page) => rail(page).locator('[aria-current="page"]');

test.describe('the panel\'s addresses', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('a screen is an address, and back goes back a screen', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
    await rail(page).getByRole('button', { name: 'Jog' }).click();
    await rail(page).getByRole('button', { name: 'Dziennik' }).click();
    await expect(page).toHaveURL(/\/panel\/journal\?lng=pl$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/jog\?lng=pl$/);
    await expect(current(page)).toHaveText(/Jog/i);
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

  test('back closes an open sheet and stays on the screen; a sheet closed by hand leaves no step behind', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
    await rail(page).getByRole('button', { name: 'Jog' }).click();

    await page.getByRole('banner').getByRole('button').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/panel\/jog\?lng=pl$/);

    await page.getByRole('banner').getByRole('button').first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Gotowe' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // One back from Jog goes to the screen before it, not to a step the sheet left.
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
