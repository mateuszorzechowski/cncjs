import { TAG_SCALE, placeTags, tagWidth } from '../probeLabels';

// At scale 1 the gap g is 6 drawing units; heads stand 3 out of their line.
const size = { fs: 12.5, hw: 3, k: 1 };
const H = size.fs * TAG_SCALE * 1.8;
const G = 6;
const VIEW = [0, 0, 300, 200];
const ticks = (...along) => along.map((a) => [a, 10]);
const width = (text) => tagWidth(text, size.fs);

describe('where a probing drawing puts its labels (map §4a/4b)', () => {
  test('L1: beside a long line, centred on it, g past its ticks\' ends', () => {
    const [tag] = placeTags({
      at: 100, parts: [[20, 110, '20 mm']], ticks: ticks(20, 110), view: VIEW, size,
    });
    expect(tag.y).toBeCloseTo(65);
    expect(tag.x).toBeCloseTo(100 + 10 + G);
  });

  test('labels of lines in a row stand in a row, whether a tick is under them or not', () => {
    const [long] = placeTags({
      axis: 'h', at: 40, parts: [[20, 140, '30 mm']], ticks: ticks(20, 140), view: VIEW, size,
    });
    const [short] = placeTags({
      axis: 'h', at: 40, parts: [[140, 170, '20 mm']], ticks: ticks(140, 170), view: VIEW, size,
    });
    expect(long.y).toBeCloseTo(short.y);
  });

  test('L2: beside a short one, still centred, g from the ticks\' ends', () => {
    const [tag] = placeTags({
      at: 100, parts: [[60, 70, '5 mm']], ticks: ticks(60, 70), view: VIEW, size,
    });
    expect(tag.y).toBeCloseTo(65);
    expect(tag.x).toBeCloseTo(100 + 10 + G);
  });

  test('an arrow\'s feed on its far side: right-aligned g left of its line', () => {
    const [tag] = placeTags({
      at: 100, side: -1, parts: [[20, 110, 'F50']], ticks: [[20, 6]], view: VIEW, size,
    });
    expect(tag.x + tag.w).toBeCloseTo(100 - 6 - G);
  });

  test('L3/L19: two labels with room each centred on its own part', () => {
    const [near, far] = placeTags({
      at: 100, parts: [[20, 80, '5 mm'], [80, 140, '≤ 5 mm']], ticks: ticks(20, 80, 140), view: VIEW, size,
    });
    expect(near.y).toBeCloseTo(50);
    expect(far.y).toBeCloseTo(110);
  });

  test('L4: two that would meet stand one under the other, the stack centred on the whole line', () => {
    const [near, far] = placeTags({
      at: 100, parts: [[60, 66, '5 mm'], [66, 72, '≤ 5 mm']], ticks: ticks(60, 66, 72), view: VIEW, size,
    });
    expect((near.y + far.y) / 2).toBeCloseTo(66);
    expect(far.y - near.y).toBeCloseTo(H + G);
  });

  test('L6: across, centred on its line even when wider than it, g under the ticks\' ends', () => {
    const [tag] = placeTags({
      axis: 'h', at: 40, parts: [[100, 112, '5 mm']], ticks: ticks(100, 112), view: VIEW, size,
    });
    expect(tag.x + tag.w / 2).toBeCloseTo(106);
    expect(tag.y - H / 2).toBeCloseTo(40 + 10 + G);
  });

  test('L8/L24: across, two that would meet one under the other, each centred on the line', () => {
    const [near, far] = placeTags({
      axis: 'h', at: 40, parts: [[100, 112, '5 mm'], [112, 124, '≤ 5 mm']], ticks: ticks(100, 112, 124), view: VIEW, size,
    });
    expect(near.x + near.w / 2).toBeCloseTo(112);
    expect(far.x + far.w / 2).toBeCloseTo(112);
    expect(far.y - near.y).toBeCloseTo(H + G);
  });

  test('L14a: past the drawing\'s edge it goes to the other side of its line', () => {
    const [tag] = placeTags({
      at: 290, parts: [[20, 110, '20 mm']], ticks: ticks(20, 110), view: VIEW, size,
    });
    expect(tag.x + width('20 mm')).toBeCloseTo(290 - 10 - G);
  });

  test('L15: on a line it must not cross, aligned to its first end, else its last', () => {
    const line = {
      at: 100, parts: [[20, 110, '20 mm']], ticks: ticks(20, 110), view: VIEW, size,
    };
    const [top] = placeTags({ ...line, avoid: [[0, 64, 300, 2]] });
    expect(top.y - H / 2).toBeCloseTo(20);
    const [bottom] = placeTags({ ...line, avoid: [[0, 64, 300, 2], [0, 25, 300, 2]] });
    expect(bottom.y + H / 2).toBeCloseTo(110);
  });

  test('L25: room on neither side, an arrow feed over its start, flush with its tick, reaching out to its side', () => {
    const [tag] = placeTags({
      at: 60, side: -1, parts: [[60, 100, 'F50']], ticks: [[60, 6]], view: VIEW, avoid: [[0, 0, 25, 200], [74, 0, 40, 200]], size,
    });
    expect(tag.y + H / 2).toBeCloseTo(60 - G);
    expect(tag.x + tag.w).toBeCloseTo(60 + 6);
  });

  test('L25: two labels with room on neither side, one before the line and one after it', () => {
    const [near, far] = placeTags({
      at: 290, parts: [[60, 66, '5 mm'], [66, 72, '≤ 5 mm']], ticks: ticks(60, 66, 72), view: VIEW, avoid: [[200, 0, 70, 200]], size,
    });
    expect(near.y + H / 2).toBeCloseTo(60 - G);
    expect(far.y - H / 2).toBeCloseTo(72 + G);
  });

  test('a part without a figure has no label', () => {
    expect(placeTags({
      at: 100, parts: [[20, 110, '']], ticks: ticks(20, 110), view: VIEW, size,
    })).toEqual([]);
  });
});
