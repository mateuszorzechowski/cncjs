import { scrollAt, scrollMarks } from '../scrollMarks';

describe('the findings on the editor scrollbar', () => {
  test('each where it is in the file, top to bottom', () => {
    const marks = scrollMarks([
      { line: 900, top: 0.9, severity: 'warning' },
      { line: 10, top: 0.01, severity: 'error' },
    ], 403);

    expect(marks).toEqual([
      { y: 4, severity: 'error', line: 10 },
      { y: 360, severity: 'warning', line: 900 },
    ]);
  });

  test('on one pixel row, one mark — the error over the warning, the first line over a later one', () => {
    const marks = scrollMarks([
      { line: 51, top: 0.5, severity: 'warning' },
      { line: 52, top: 0.5, severity: 'error' },
      { line: 53, top: 0.5, severity: 'error' },
    ], 103);

    expect(marks).toEqual([{ y: 50, severity: 'error', line: 52 }]);
  });

  test('the last line stays on the track', () => {
    expect(scrollMarks([{ line: 1, top: 1, severity: 'error' }], 100)[0].y).toBe(97);
  });
});

describe('a press on the track', () => {
  test('scrolls to that place in the file', () => {
    expect(scrollAt(0, 400, 5000, 1000)).toBe(0);
    expect(scrollAt(200, 400, 5000, 1000)).toBe(2000);
    expect(scrollAt(400, 400, 5000, 1000)).toBe(4000);
    expect(scrollAt(900, 400, 5000, 1000)).toBe(4000);
  });
});
