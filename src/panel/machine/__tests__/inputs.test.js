import { accessoriesOf, pinsLit } from '../inputs';

describe('the controller\'s inputs', () => {
  test('lights the pins Grbl names, and keeps every one in its place', () => {
    const lit = pinsLit('PZ');
    expect(lit.map(({ letter }) => letter)).toEqual(['X', 'Y', 'Z', 'P', 'D', 'H', 'R', 'S']);
    expect(lit.filter(({ lit: on }) => on).map(({ letter }) => letter)).toEqual(['Z', 'P']);
  });

  test('nothing triggered is an answer; not reported is not', () => {
    expect(pinsLit('').every(({ lit }) => lit === false)).toBe(true);
    expect(pinsLit(null).every(({ lit }) => lit === null)).toBe(true);
  });
});

describe('the spindle and the coolant', () => {
  test('from A:', () => {
    expect(accessoriesOf('SF')).toEqual({ spindle: 'cw', flood: true, mist: false });
    expect(accessoriesOf('CM')).toEqual({ spindle: 'ccw', flood: false, mist: true });
    expect(accessoriesOf('')).toEqual({ spindle: 'off', flood: false, mist: false });
    expect(accessoriesOf(undefined)).toBeNull();
  });
});
