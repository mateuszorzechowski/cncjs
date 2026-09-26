import { SWIPE_PIXELS, swipeTurn } from '../swipe';

describe('a swipe across the settings', () => {
  test('to the left is the next tab, to the right the one before', () => {
    expect(swipeTurn(-SWIPE_PIXELS - 10, 5)).toBe(1);
    expect(swipeTurn(SWIPE_PIXELS + 10, -5)).toBe(-1);
  });

  test('too short, or more down than across — a scroll — turns nothing', () => {
    expect(swipeTurn(-SWIPE_PIXELS + 1, 0)).toBe(0);
    expect(swipeTurn(-100, 80)).toBe(0);
  });
});

describe('a swipe up or down — the bottom menu', () => {
  test('up opens, down closes, across or short is neither', async () => {
    const { swipeLift, LIFT_PIXELS } = await import('../swipe');
    expect(swipeLift(0, -LIFT_PIXELS - 5)).toBe('up');
    expect(swipeLift(3, LIFT_PIXELS + 5)).toBe('down');
    expect(swipeLift(0, -LIFT_PIXELS + 5)).toBe(null);
    expect(swipeLift(100, -60)).toBe(null);
  });
});

describe('a sheet dragged down', () => {
  test('closes past a quarter of its height, or on a flick; springs back otherwise', async () => {
    const { dragCloses } = await import('../swipe');
    expect(dragCloses(130, 1000, 500)).toBe(true);
    expect(dragCloses(100, 1000, 500)).toBe(false);
    expect(dragCloses(60, 1000, 200)).toBe(false);
    expect(dragCloses(85, 1000, 200)).toBe(true);
    expect(dragCloses(50, 50, 600)).toBe(true);
    expect(dragCloses(20, 10, 600)).toBe(false);
  });
});
