import { keepMapLook, mapLook } from '../mapLook';

const store = new Map();

beforeEach(() => {
  store.clear();
  global.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
    },
  };
});

afterEach(() => {
  delete global.window;
});

describe('the height map drawing as last set on this device', () => {
  test('nothing kept: ×20, the grid, every layer', () => {
    expect(mapLook()).toEqual({
      scale: 20, looks: ['gridLines'], layers: { machineArea: true, path: true, wcsAxes: true, map: true },
    });
  });

  test('each part kept on its own, the rest left as it was', () => {
    keepMapLook({ scale: 100 });
    keepMapLook({ looks: ['smooth', 'contours'] });
    keepMapLook({ layers: { machineArea: true, path: false, wcsAxes: true, map: true } });
    expect(mapLook()).toEqual({
      scale: 100, looks: ['smooth', 'contours'], layers: { machineArea: true, path: false, wcsAxes: true, map: true },
    });
  });

  test('a store that throws, or holds rubbish, gives the defaults', () => {
    store.set('panel.mapLook', '{not json');
    expect(mapLook().scale).toBe(20);
    global.window.localStorage.setItem = () => {
      throw new Error('quota');
    };
    expect(() => keepMapLook({ scale: 5 })).not.toThrow();
  });
});
