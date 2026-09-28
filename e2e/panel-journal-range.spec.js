const { test, expect } = require('./fixtures');

/**
 * The journal's own window of time, and where this device's name is set
 * (review notes, 2026-09-28).
 *
 * One field for the window, one calendar behind it: the first day is where
 * it starts, the second where it ends, and the second turns to its hour on a
 * clock face. Today is ringed. Run with a mouse — on a finger the panel keeps
 * the device's own pickers.
 */
const openJournal = async (page) => {
  await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Nawigacja' }).getByRole('button', { name: 'Dziennik' }).click();
};

test.describe('the journal window', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('is one field and one calendar: two days, and the hour on a clock face', async ({ cncjs }) => {
    const { page } = cncjs;
    await openJournal(page);
    await page.getByRole('button', { name: /^Własny zakres/ }).click();

    await page.getByRole('button', { name: 'Czas', exact: true }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.locator('[aria-current="date"]')).toHaveCount(1);

    await sheet.getByRole('button', { name: '12', exact: true }).click();
    await sheet.getByRole('button', { name: '20', exact: true }).click();

    // The second day turns to its hour: 17, inside the ring, at five o'clock.
    const dial = sheet.getByRole('slider');
    const box = await dial.boundingBox();
    const inner = (64 / 256) * box.width;
    const turn = (5 / 12) * 2 * Math.PI;
    await page.mouse.click(box.x + (box.width / 2) + (inner * Math.sin(turn)), box.y + (box.height / 2) - (inner * Math.cos(turn)));
    // Then its minute: 30, straight down on the outer ring.
    await page.mouse.click(box.x + (box.width / 2), box.y + (box.height / 2) + ((100 / 256) * box.width));

    await expect(sheet.getByRole('button', { name: 'Do 17:30' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Gotowe' }).click();
    // Written in the browser's own date format (a Playwright browser is en-US), so only the parts that must be there.
    await expect(page.getByRole('button', { name: 'Czas', exact: true })).toContainText(/12\D[\s\S]*\D20\D[\s\S]*\D(17:30|5:30)\D/);
    cncjs.expectNoPageErrors();
  });
});

test.describe('this device\'s name', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('is set in the preferences, beside the language and the theme, not with the connection', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.goto('/panel/?lng=pl', { waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'Nawigacja' }).getByRole('button', { name: 'Ustawienia' }).click();

    await page.getByText('Połączenie', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: /^Nazwa tego urządzenia/ })).toHaveCount(0);

    await page.getByText('Preferencje', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: /^Nazwa tego urządzenia/ })).toBeVisible();
    cncjs.expectNoPageErrors();
  });
});
