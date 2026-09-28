import { pathOf, routeFrom } from '../route';

describe('the panel\'s addresses', () => {
  test('a screen, and the settings screen\'s tab', () => {
    expect(routeFrom('/panel/jog')).toEqual({ screen: 'jog', tab: null });
    expect(routeFrom('/panel/settings/controller')).toEqual({ screen: 'settings', tab: 'controller' });
    expect(routeFrom('/panel/journal/')).toEqual({ screen: 'journal', tab: null });
  });

  test('the bare root, and anything outside the panel, name no screen', () => {
    expect(routeFrom('/panel/')).toBeNull();
    expect(routeFrom('/')).toBeNull();
    expect(routeFrom('')).toBeNull();
  });

  test('are written the way they are read', () => {
    expect(pathOf('jog')).toBe('/panel/jog');
    expect(pathOf('settings', 'install')).toBe('/panel/settings/install');
    expect(routeFrom(pathOf('settings', 'install'))).toEqual({ screen: 'settings', tab: 'install' });
  });
});
