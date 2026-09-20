const { test, expect } = require('./fixtures');

/**
 * The frame the workspace sits in: the top bar, the rail, and the ground the
 * panels lie on.
 *
 * None of it has ever been covered. The tiers assert a great deal about what
 * is *inside* the panels and nothing at all about the three things that hold
 * them — and all three are about to be rebuilt to the design mockup's shape,
 * which is the largest visual change in this migration so far.
 *
 * So this pins what the frame is for: the machine commands are reachable while
 * the machine is on screen and nowhere else, the rail goes where it says it
 * goes, and the workspace puts its panels either side of the view. None of
 * those should change when the frame is redrawn; everything else about it
 * should.
 *
 * Roles and accessible names throughout. The CSS-module classes are the thing
 * being deleted.
 */
test.describe('application skeleton', () => {
  const header = (page) => page.getByRole('navigation', { name: 'Application header' });
  const rail = (page) => page.getByRole('navigation', { name: 'Main navigation' });
  const commands = (page) => page.getByRole('toolbar', { name: 'Quick access toolbar' });

  /**
   * The six commands the top bar offers, in the order it offers them.
   *
   * Two of them stop a machine that is moving and one of them drops an alarm
   * lock, so this is not a list of buttons — it is the set of things an
   * operator can do without looking for a panel first. The mockup replaces the
   * row with one large STOP and demotes the rest; whatever it ends up looking
   * like, all six still have to be reachable.
   */
  const COMMANDS = ['Cycle Start', 'Feedhold', 'Homing', 'Sleep', 'Unlock', 'Reset'];

  test('the top bar is a landmark and names the product', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    await expect(header(cncjs.page)).toHaveCount(1);
    // The version is the one piece of text up there that is not a control, and
    // it is what anyone reporting a fault is asked for first.
    await expect(header(cncjs.page).getByText(/^\d+\.\d+\.\d+/)).toBeVisible();

    cncjs.expectNoPageErrors();
  });

  test('every machine command is reachable by name', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    for (const name of COMMANDS) {
      await expect(
        commands(cncjs.page).getByRole('button', { name, exact: true }),
        `"${name}" should be reachable from the top bar`
      ).toHaveCount(1);
    }
  });

  test('the machine commands are offered only where the machine is', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();
    await expect(commands(cncjs.page)).toHaveCount(1);

    await cncjs.gotoSettings('general');

    // Homing and Reset move a machine. Leaving them a click away from a
    // settings form is how someone homes an axis while reading about baud
    // rates, so the bar is not merely hidden here — it is not rendered.
    await expect(commands(cncjs.page)).toHaveCount(0);
  });

  test('the rail says where it goes', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    await expect(rail(cncjs.page)).toHaveCount(1);
    await expect(rail(cncjs.page).getByRole('link', { name: 'Workspace' })).toHaveCount(1);
    await expect(rail(cncjs.page).getByRole('link', { name: 'Settings' })).toHaveCount(1);
  });

  /**
   * KNOWN GAP, recorded rather than skipped.
   *
   * The rail marks the current destination with a CSS class and nothing else —
   * no `aria-current` — so which of the two you are looking at is available to
   * a sighted user and to nobody else. Asserting the class would be asserting
   * the thing that is about to be deleted, so the case below asserts the
   * navigation instead and this note carries the gap.
   *
   * The rail rebuild is where it closes.
   */
  test('the rail goes where it says, without reloading the page', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // A marker on the window object survives a client-side route change and
    // does not survive a document load. That is the difference being asserted:
    // this is a single-page application, and a rail that reloaded would drop
    // the controller connection every time someone opened settings.
    await cncjs.page.evaluate(() => {
      window.__skeletonMarker = 'alive';
    });

    await rail(cncjs.page).getByRole('link', { name: 'Settings' }).click();
    await expect(cncjs.page).toHaveURL(/#\/settings/);
    expect(await cncjs.page.evaluate(() => window.__skeletonMarker)).toBe('alive');

    await rail(cncjs.page).getByRole('link', { name: 'Workspace' }).click();
    await expect(cncjs.page).toHaveURL(/#\/workspace/);
    expect(await cncjs.page.evaluate(() => window.__skeletonMarker)).toBe('alive');
  });

  test('the workspace puts its panels either side of the view', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    const boxOf = async (id) => cncjs.page.locator(`[data-widget-id="${id}"]`).boundingBox();
    const [left, view, right] = await Promise.all([
      boxOf('connection'),
      boxOf('visualizer'),
      boxOf('axes'),
    ]);

    // The layout is three columns and the view is the middle one. This is the
    // arrangement the ground and the spacing are about to be redrawn under,
    // and it is the one thing about them that must not change.
    expect(left.x + left.width, 'the left column should end before the view starts')
      .toBeLessThanOrEqual(view.x + 1);
    expect(view.x + view.width, 'the view should end before the right column starts')
      .toBeLessThanOrEqual(right.x + 1);
    expect(view.width, 'the view should be the widest of the three')
      .toBeGreaterThan(Math.max(left.width, right.width));
  });

  test('there is no account menu on a server with no accounts', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // `hideUserDropdown = !sessionEnabled`, and a server with no accounts
    // configured has no session — so the account menu is not merely empty, it
    // is not offered. This is the same reason the sign-in screen is
    // unreachable here and lives in the auth tier: signing out of something
    // nobody signed in to is a control with nothing behind it.
    //
    // Pinned because the top bar is about to be rebuilt and the menu is easy
    // to bring back unconditionally while testing against this very server,
    // where it would look fine and do nothing.
    await expect(header(cncjs.page).getByRole('button', { name: 'My Account' })).toBeHidden();

    cncjs.expectNoPageErrors();
  });
});
