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
