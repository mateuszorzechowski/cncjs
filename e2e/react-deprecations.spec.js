const { test, expect } = require('@playwright/test');

/**
 * The React 19 bill, itemised.
 *
 * React 18 warns about four families of API that 19 removes. `fixtures.js`
 * filters them out of `expectNoPageErrors`, because every one of them is
 * raised by a third-party component and fixing them means replacing those
 * packages — which is its own piece of work, not this one.
 *
 * A filter like that is only honest if something keeps it from growing
 * quietly, so this spec collects the same warnings with no filter at all and
 * fails on anything outside the inventory below. A component of ours starting
 * to raise one cannot hide behind those four lines.
 *
 * It asserts a subset rather than an exact match on purpose: which components
 * render depends on widget state, and a component that happens not to appear
 * is not a regression. A component that appears and is not listed is.
 */

/** Warnings React 18 raises that React 19 turns into removals. */
const DEPRECATIONS = [
  ['childContextTypes', /uses the legacy childContextTypes API/],
  ['contextTypes', /uses the legacy contextTypes API/],
  ['defaultProps', /Support for defaultProps will be removed from function components/],
  ['stringRef', /contains the string ref/],
];

/**
 * Every component known to raise one, and the package it comes from. Ours are
 * absent, which is the point: PR #22 took `defaultProps` off our function
 * components and #26 took out the last `findDOMNode`.
 */
const KNOWN = new Set([
  // react-router 4.3
  'childContextTypes:Router',
  'childContextTypes:Route',
  'contextTypes:Route',
  'contextTypes:Redirect',
  'contextTypes:Link',
  'contextTypes:Switch',
  // react-bootstrap 0.32
  'childContextTypes:Navbar',
  'contextTypes:NavbarHeader',
  'contextTypes:NavbarToggle',
  'contextTypes:NavbarCollapse',
  'contextTypes:NavbarBrand',
  // react-transition-group
  'childContextTypes:Transition',
  // @trendmicro/react-grid-system
  'childContextTypes:Container',
  'childContextTypes:Row',
  'contextTypes:Col',
  // @trendmicro/react-validation
  'childContextTypes:Provider',
  // @trendmicro/react-buttons
  'defaultProps:ButtonGroup',
  // react-select 1.2 — lib/Select.js builds `ref: 'value' + index`
  'stringRef:Fragment',
  // styled-components 3, which carries its theme on legacy context
  'contextTypes:Styled(Anchor)',
  'contextTypes:Styled(Button)',
  'contextTypes:Styled(styled.span)',
  'contextTypes:styled.div',
  'contextTypes:styled.button',
  'contextTypes:styled.span',
  'contextTypes:styled.a',
  'contextTypes:styled.textarea',
]);

const classify = (text) => {
  const found = DEPRECATIONS.find(([, pattern]) => pattern.test(text));
  return found ? found[0] : null;
};

test('every React deprecation left is one of the known third-party ones', async ({ page }) => {
  const pending = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') {
      return;
    }
    const kind = classify(msg.text());
    if (!kind) {
      return;
    }
    // React formats these through `%s`, so the component name is only in the
    // arguments; msg.text() has the placeholder.
    pending.push(
      Promise.all(msg.args().slice(1).map((arg) => arg.jsonValue().catch(() => null)))
        .then((args) => `${kind}:${args.find((a) => typeof a === 'string' && a.length > 0 && !a.startsWith('\n'))}`)
        .catch(() => null)
    );
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-widget-id="connection"]').waitFor({ state: 'visible', timeout: 45 * 1000 });
  // Widgets mount over several frames; give the later ones a chance to warn.
  await page.waitForTimeout(3000);

  const seen = (await Promise.all(pending)).filter(Boolean);
  expect(seen.length, 'no deprecation warnings at all means this spec stopped measuring').toBeGreaterThan(0);

  const unknown = [...new Set(seen)].filter((entry) => !KNOWN.has(entry));
  expect(unknown, `unaccounted React deprecations:\n${unknown.join('\n')}`).toEqual([]);
});
