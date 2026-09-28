import { SHOWN_FOR } from '../shownFor';

// The bar under a notice that goes by itself runs out when the notice does: one number, said twice.
const config = require('../../../../tailwind.panel.config.js');

describe('a notice\'s lapse bar', () => {
  test('lasts exactly as long as the notice is shown', () => {
    const [, duration] = /^lapse (\d+)ms /.exec(config.theme.extend.animation.lapse);
    expect(Number(duration)).toBe(SHOWN_FOR);
  });
});
