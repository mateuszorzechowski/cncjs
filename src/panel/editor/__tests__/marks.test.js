import { marksOf } from '../marks';

describe('the lines the editor marks', () => {
  test('the server check marks each problem at its first line, in its severity', () => {
    const file = {
      analysis: {
        check: {
          issues: [
            { code: 'undeclared', severity: 'warning', line: 5, count: 1 },
            { code: 'arc', severity: 'incompatible', line: 10, count: 3 },
          ],
        },
      },
    };
    expect(marksOf(file)).toEqual([{ line: 5, tone: 'warn' }, { line: 10, tone: 'bad' }]);
  });

  test('what Grbl refused in $C is always red', () => {
    const file = { controllerCheck: { errors: [{ code: 'error:33', line: 624, count: 5 }] } };
    expect(marksOf(file)).toEqual([{ line: 624, tone: 'bad' }]);
  });

  test('marks nothing for a file with nothing said about it, or no line to put it on', () => {
    expect(marksOf({})).toEqual([]);
    expect(marksOf({ analysis: { check: { issues: [{ severity: 'warning' }] } } })).toEqual([]);
  });
});
