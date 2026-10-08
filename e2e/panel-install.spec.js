const { test, expect } = require('./fixtures');

/**
 * Step 1 of the Install tab, by whose certificate the page came with.
 *
 * With `certificate.trusted` in the server's `.cncrc` the network provides
 * the certificate — a proxy in front with one every phone already has — so
 * the panel hands nothing over (Mateusz, 2026-10-08). Without it the server's
 * own authority is offered as before. The server's answer is stood in for
 * here; `localhost` is a secure context, so step 1 is done — and folded —
 * either way.
 */
test.describe('the install tab\'s certificate step', () => {
  const download = (page) => page.getByText('Pobierz certyfikat');
  // Done, the step folds to its line; what it holds is one tap away.
  const openStep1 = (page) => page.getByRole('button', { name: /Zaufaj certyfikatowi panelu/ }).click({ timeout: 45000 });

  test('offers nothing when the network provides the certificate', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.route('**/cnc-ca.json', (route) => route.fulfill({ json: { trusted: true } }));
    await page.goto('/settings/install?lng=pl', { waitUntil: 'domcontentloaded' });
    await openStep1(page);

    await expect(page.getByText(/Certyfikat zapewnia Twoja sieć/)).toBeVisible();
    await expect(download(page)).toHaveCount(0);
    cncjs.expectNoPageErrors();
  });

  test('offers its own authority otherwise', async ({ cncjs }) => {
    const { page } = cncjs;
    await page.route('**/cnc-ca.json', (route) => route.fulfill({
      json: { subject: 'CN=cncjs local authority', validTo: 'Oct  8 12:00:00 2027 GMT', fingerprint: 'C6:D1' },
    }));
    await page.goto('/settings/install?lng=pl', { waitUntil: 'domcontentloaded' });
    await openStep1(page);

    await expect(download(page)).toBeVisible();
    await expect(page.getByText('cncjs local authority')).toBeVisible();
    cncjs.expectNoPageErrors();
  });
});
