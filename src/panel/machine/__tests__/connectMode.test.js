import { CONNECT_MODES, connectMode, connectPlan, connectScope, serverBeside } from '../connectMode';

describe('the connection mode, one control over two settings', () => {
  test('ordered from the least automatic', () => {
    expect(CONNECT_MODES).toEqual(['manual', 'panel', 'server']);
  });

  test('this device’s own choice is what is shown, whatever the server does', () => {
    expect(connectMode('server', true)).toBe('panel');
    expect(connectMode('manual', true)).toBe('panel');
  });

  test('without one, the server’s', () => {
    expect(connectMode('server', false)).toBe('server');
    expect(connectMode('manual', false)).toBe('manual');
  });

  test('the server’s mode, whichever it is, shows beside this device’s own choice', () => {
    expect(serverBeside('server', true)).toBe('server');
    expect(serverBeside('manual', true)).toBe('manual');
    expect(serverBeside('server', false)).toBe(null);
    expect(serverBeside(null, true)).toBe(null);
  });

  test('the panel choice turns on and off again, leaving the server’s; the other two leave the device’s', () => {
    expect(connectPlan('panel', false)).toEqual({ onOpen: true });
    expect(connectPlan('panel', true)).toEqual({ onOpen: false });
    expect(connectPlan('server', true)).toEqual({ server: 'server' });
    expect(connectPlan('manual', true)).toEqual({ server: 'manual' });
  });

  test('the panel is this device’s setting; the other two are the server’s', () => {
    expect(connectScope('panel')).toBe('device');
    expect(connectScope('manual')).toBe('server');
    expect(connectScope('server')).toBe('server');
  });
});
