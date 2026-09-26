import { CONNECT_MODES, connectMode, connectPlan, connectScope } from '../connectMode';

describe('the connection mode, one control over two settings', () => {
  test('ordered from the least automatic', () => {
    expect(CONNECT_MODES).toEqual(['manual', 'panel', 'server']);
  });

  test('the server connecting at its start wins what is shown, whatever this device keeps', () => {
    expect(connectMode('server', false)).toBe('server');
    expect(connectMode('server', true)).toBe('server');
  });

  test('otherwise this device says whether it connects when opened', () => {
    expect(connectMode('manual', true)).toBe('panel');
    expect(connectMode('manual', false)).toBe('manual');
  });

  test('each choice reads back as itself', () => {
    for (const mode of CONNECT_MODES) {
      const { server, onOpen } = connectPlan(mode);
      expect(connectMode(server, onOpen)).toBe(mode);
    }
  });

  test('choosing the panel turns the server back to manual, or the choice could not be seen', () => {
    expect(connectPlan('panel')).toEqual({ server: 'manual', onOpen: true });
    expect(connectPlan('manual')).toEqual({ server: 'manual', onOpen: false });
    expect(connectPlan('server')).toEqual({ server: 'server', onOpen: false });
  });

  test('the panel is this device’s setting; the other two are the server’s', () => {
    expect(connectScope('panel')).toBe('device');
    expect(connectScope('manual')).toBe('server');
    expect(connectScope('server')).toBe('server');
  });
});
