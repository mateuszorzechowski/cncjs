import { pathOf, routeFrom } from '../route';

describe('the panel\'s addresses', () => {
  test('a screen, and the settings screen\'s tab', () => {
    expect(routeFrom('/jog')).toEqual({ screen: 'jog', tab: null });
    expect(routeFrom('/settings/controller')).toEqual({ screen: 'settings', tab: 'controller' });
    expect(routeFrom('/journal/')).toEqual({ screen: 'journal', tab: null });
  });

  test('the bare root names no screen', () => {
    expect(routeFrom('/')).toBeNull();
    expect(routeFrom('')).toBeNull();
  });

  test('are written the way they are read', () => {
    expect(pathOf('jog')).toBe('/jog');
    expect(pathOf('settings', 'install')).toBe('/settings/install');
    expect(routeFrom(pathOf('settings', 'install'))).toEqual({ screen: 'settings', tab: 'install' });
  });
});
