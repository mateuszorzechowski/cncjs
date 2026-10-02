import { grid } from '../api.probe';

jest.mock('../../services/configstore', () => ({ set: jest.fn(), get: jest.fn() }));

const call = (handler, req) => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.send = jest.fn((payload) => {
    res.body = payload;
  });
  handler({ query: {}, body: {}, ...req }, res);
  return res;
};

describe('the height map\'s grid, over the API', () => {
  test('a step is answered with the count, and the step that divides the side', () => {
    const res = call(grid, { body: { options: { x: [0, 25], y: [0, 10], stepX: 10, ny: 3 } } });

    expect(res.body).toMatchObject({ nx: 4, ny: 3, stepY: 5 });
    expect(res.body.stepX).toBeCloseTo(25 / 3);
  });

  test('in the units it was given in', () => {
    expect(call(grid, { body: { options: { x: [0, 1], y: [0, 1], nx: 2, ny: 2 }, units: 'inch' } }).body.xs).toEqual([0, 25.4]);
  });

  test('a grid the server would refuse is said, by its reason', () => {
    const res = call(grid, { body: { options: { x: [0, 10], y: [0, 10], nx: 40, ny: 2 } } });

    expect(res.statusCode).toBe(400);
    expect(res.body.reason).toBe('bad-grid');
  });
});
