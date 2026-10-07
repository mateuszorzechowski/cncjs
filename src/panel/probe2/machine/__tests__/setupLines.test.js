import { createProbeRun } from '../../../../server/controllers/Grbl/probe-run';
import { probeParams } from '../../../../server/services/probe';
import { STRATEGIES } from '../../../../server/services/probe/strategies';
import { SHAPES } from '../measureShapes';
import { sizeCycle } from '../sizeCycle';

/*
 * What the Setup shows is what the server sends (Mateusz, 2026-10-06: *"w
 * ilu miejscach są takie błędy?"*): every line the server writes for a
 * measurement, beside the line the drawing says for the move it plays then.
 * A line with figures must be the same line; one said in words must be the
 * same kind of move — a rapid, or a guarded `G38.3`.
 */

// Every figure a different number, so a line says which one it used.
const PARAMS = {
  ...probeParams(), maxZ: 17, retract: 3, overTop: 11, depth: 7, clear: 23, holeSize: 41, bossSize: 33, spacing: 13, fast: 300, slow: 50, ballDiameter: 2, repeats: 1,
};
const TEXTS = Object.fromEntries(Object.entries(PARAMS).map(([k, v]) => [k, String(v)]));
const AXES = ['x', 'y', 'z'];
const wordsOf = (line) => Object.fromEntries([...line.matchAll(/([XYZ])(-?[\d.]+)/g)].map(([, a, v]) => [a.toLowerCase(), Number(v)]));
// A line said in words, by the move it is.
const GUARDED = ['probe2.edge.alongGuardedCode'];

/** The server's lines, at a bench where every touch meets the work halfway: `{ phase, g, way }`, `way` as `X+41`. */
const serverLines = (options, part, params) => {
  const start = { x: 0, y: 0, z: 0 };
  const wco = { x: 0, y: 0, z: 0 };
  const steps = STRATEGIES.measure.steps(params, options, { start, wco, ...(part ? { part } : {}) });
  let phase = null;
  const queue = [];
  const rows = [];
  let pos = { ...start };
  const run = createProbeRun({
    steps,
    start,
    wco,
    restore: 'G90 G21',
    write: (line) => queue.push(line),
    done: () => {},
    progress: (step) => {
      phase = step.phase;
    },
  });
  run.start();
  while (queue.length) {
    const line = queue.shift();
    const words = wordsOf(line);
    const target = { ...pos, ...words };
    const g = (line.match(/G38\.\d|G4|G0/) || [''])[0];
    const moved = AXES.filter((a) => Math.abs(target[a] - pos[a]) > 1e-9);
    if (g && g !== 'G4' && moved.length) {
      rows.push({ phase, g, way: moved.map((a) => `${a.toUpperCase()}${target[a] > pos[a] ? '+' : ''}${Math.round((target[a] - pos[a]) * 1000) / 1000}`).join(' ') });
    }
    if (g === 'G38.2') {
      pos = Object.fromEntries(AXES.map((a) => [a, pos[a] + (target[a] - pos[a]) / 2]));
      run.prb({ ...pos, result: 1 });
    } else if (g === 'G38.3') {
      pos = target;
      run.prb({ ...pos, result: 0 });
    } else if (g === 'G0') {
      pos = target;
    }
    run.ok();
  }
  return rows;
};

/** Each server line beside the drawing's: `[server, drawn]` where they differ. */
const differences = (options, part, drawn, passes) => {
  const cycle = sizeCycle('measure', drawn, null, part);
  let before = null;
  return serverLines(options, part, { ...PARAMS, holePasses: passes }).flatMap(({ phase, g, way }) => {
    const name = cycle.moveOfPhase(phase, before);
    before = phase;
    const code = cycle.code(name, { ...TEXTS, holePasses: String(passes) });
    const said = Array.isArray(code) ? (GUARDED.includes(code[0]) ? 'G38.3' : 'G0') : code.split(' ').slice(0, 2).join(' ');
    const sent = Array.isArray(code) ? g : `${g} ${way}`;
    return said === sent ? [] : [[`${phase}: ${g} ${way}`, `${name}: ${Array.isArray(code) ? code[0] : code}`]];
  });
};

describe('the Setup says the lines the server sends', () => {
  const zeros = SHAPES.filter((one) => ['circle', 'rect', 'edge', 'corner'].includes(one.kind)).map((one) => one.id);

  test.each(zeros)('%s', (shape) => {
    expect(differences({ shape }, null, shape, 2)).toEqual([]);
    expect(differences({ shape }, null, shape, 1)).toEqual([]);
  });

  test('a height: each surface, the upper and the lower, backed off alone', () => {
    const height = { shape: 'height', a: 'surface', b: 'surface' };
    expect(differences(height, 'a', 'surface', 1)).toEqual([]);
    expect(differences(height, 'b', 'surface', 1)).toEqual([]);
  });

  test('a distance: each end as measured on its own', () => {
    ['circle-inside', 'circle-outside', 'edge-front', 'edge-right'].forEach((end) => {
      const distance = { shape: 'distance', a: end, b: 'circle-inside' };
      expect(differences(distance, 'a', end, 2)).toEqual([]);
    });
  });
});
