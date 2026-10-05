import controller from './controller';
import { currentToken } from './session';
import { SURFACE } from './surface';

export { SURFACE, surfaceShifts } from './surface';

/**
 * The probe, from the panel — the server's half is `services/probe` and the
 * controller's `probe-run`.
 *
 * The server measures, works out the zero and keeps the figures; the panel
 * shows them, asks, and words what came back. Nothing about where a touch
 * lands or what the zero is is worked out here.
 */

/*
 * The four corners as seen from above, back row first — the order a 2×2 grid
 * of them reads in, so the tile under a finger is the corner it names.
 */
export const CORNERS = [
  { id: 'back-left', key: 'probe.corner.backLeft' },
  { id: 'back-right', key: 'probe.corner.backRight' },
  { id: 'front-left', key: 'probe.corner.frontLeft' },
  { id: 'front-right', key: 'probe.corner.frontRight' },
];

/*
 * The surfaces the paper finds (Mateusz, 2026-09-29: *"wszystkie krawędzie
 * wybierane w kreatorze"*): the top, and each side by the way the tool faces
 * it — `x-left` is the tool left of the work, against its left side.
 */
export const EDGES = [
  { id: 'z', key: 'probe.edge.z' },
  { id: 'x-left', key: 'probe.edge.xLeft' },
  { id: 'x-right', key: 'probe.edge.xRight' },
  { id: 'y-front', key: 'probe.edge.yFront' },
  { id: 'y-back', key: 'probe.edge.yBack' },
];

/*
 * The wizard's steps per method. The paper has no wire to test: nothing
 * touches the probe input, the operator's eye and the paper do.
 */
const THROUGH_PROBE = ['method', 'prepare', 'wire', 'position', 'measure', 'result'];
// The corner is chosen first, on a step of its own (Mateusz, 2026-09-29: *"wybór narożnika 2a, jako 1. krok"*);
// so is the paper's surface (review note, 2026-09-30).
const CHOOSE_FIRST = ['method', 'choose', 'prepare', 'wire', 'position', 'measure', 'result'];
const BY_HAND = ['method', 'choose', 'prepare', 'position', 'measure', 'result'];
// The height map: what touches first, then its moves, then the area (Mateusz, 2026-10-02).
const MAP_STEPS = ['method', 'choose', 'prepare', 'areaWay', 'area', 'wire', 'position', 'measure', 'result'];

/*
 * What touches the height map's points (Mateusz, 2026-10-02): the tool on a
 * board wired as the plate — a PCB's copper — or a 3D probe; or the Z plate,
 * moved by hand to each point (2026-10-03), its wire tested as the Z plate's.
 * Each its own wire step.
 */
export const MAP_TOOLS = [
  { id: 'board', key: 'probe.map.tool.board', note: 'probe.map.tool.boardNote', wire: { how: 'probe.wire.howMap' } },
  { id: 'probe', key: 'probe.map.tool.probe', note: 'probe.map.tool.probeNote', wire: { plate: 'probe', how: 'probe.wire.howHole', stuck: 'probe.wire.normallyClosed' } },
  { id: 'plate', key: 'probe.map.tool.plate', note: 'probe.map.tool.plateNote', wire: {} },
];

/*
 * The methods the wizard offers, in its order. `wire`, how its wire is
 * tested, where that is not the plate's; `stuck`, what to say while the
 * input reads a touch (a 3D probe may be normally closed). `plate`, what the
 * wire step draws. `choice` is the one thing
 * chosen per measurement, sent as that option; `start` names the button that
 * sets it going — a probe measures, the paper says "here". `touches`, as the
 * server's strategy says it: works through the probe input, which must be
 * clear before it starts. `apart`: not a zero, so in a row of its own under
 * the methods that find one (Mateusz, 2026-10-02: the height map); `asks`:
 * the measurement is asked with an area and grid as well as its choice, so a
 * device that joins it measures the same.
 */
/*
 * Pomiar (Mateusz, 2026-10-03: *"odpada jeden przycisk na każdy z tych
 * elementów"*): one method, what is measured chosen first (`KINDS`), then
 * how it lies — from inside or outside, a width's axis too. Both steps set
 * one choice, the shape, the server's `size` strategy's `SHAPES`.
 */
export const KINDS = [
  { id: 'circle', key: 'probe.kind.circle', note: 'probe.kind.circleNote' },
  { id: 'rect', key: 'probe.kind.rect', note: 'probe.kind.rectNote' },
  { id: 'width', key: 'probe.kind.width', note: 'probe.kind.widthNote' },
];

export const SHAPES = [
  { id: 'circle-inside', kind: 'circle', key: 'probe.shape.circleInside', side: 'inside', place: 'probe.place.hole' },
  { id: 'circle-outside', kind: 'circle', key: 'probe.shape.circleOutside', side: 'outside', place: 'probe.place.boss' },
  { id: 'rect-inside', kind: 'rect', key: 'probe.shape.rectInside', side: 'inside', place: 'probe.place.pocket' },
  { id: 'rect-outside', kind: 'rect', key: 'probe.shape.rectOutside', side: 'outside', place: 'probe.place.boss' },
  { id: 'groove-x', kind: 'width', key: 'probe.shape.grooveX', side: 'inside', axis: 'x', place: 'probe.place.groove' },
  { id: 'groove-y', kind: 'width', key: 'probe.shape.grooveY', side: 'inside', axis: 'y', place: 'probe.place.groove' },
  { id: 'bar-x', kind: 'width', key: 'probe.shape.barX', side: 'outside', axis: 'x', place: 'probe.place.bar' },
  { id: 'bar-y', kind: 'width', key: 'probe.shape.barY', side: 'outside', axis: 'y', place: 'probe.place.bar' },
];

export const shapeOf = (id) => SHAPES.find((one) => one.id === id) ?? SHAPES[0];

/** The shape a kind picked comes to: the one chosen if it is of that kind, else the kind's first — lying the same way where it can. */
export const shapeOfKind = (kind, now) => {
  const was = shapeOf(now);
  if (was.kind === kind) {
    return was.id;
  }
  const same = SHAPES.find((one) => one.kind === kind && one.side === was.side);
  return (same ?? SHAPES.find((one) => one.kind === kind)).id;
};

// What is measured, then how it lies.
const MEASURE_STEPS = ['method', 'choose', 'lie', 'prepare', 'wire', 'position', 'measure', 'result'];

export const METHODS = [
  {
    id: 'z', key: 'probe.method.z', note: 'probe.method.zNote', lay: 'probe.lay.z', place: 'probe.place.z',
    start: 'probe.position.start', steps: THROUGH_PROBE, touches: true,
  },
  {
    id: 'corner', key: 'probe.method.corner', note: 'probe.method.cornerNote', lay: 'probe.lay.corner', place: 'probe.place.corner',
    start: 'probe.position.start', steps: CHOOSE_FIRST, touches: true, plate: 'l',
    choice: { option: 'corner', key: 'probe.cornerLabel', list: CORNERS, first: 'front-left', step: 'probe.step.corner' },
  },
  {
    id: 'hole', key: 'probe.method.hole', note: 'probe.method.holeNote', lay: 'probe.lay.hole', place: 'probe.place.hole',
    wire: 'probe.wire.howHole', stuck: 'probe.wire.normallyClosed', start: 'probe.position.start', steps: THROUGH_PROBE, touches: true, plate: 'probe',
  },
  {
    id: 'boss', key: 'probe.method.boss', note: 'probe.method.bossNote', lay: 'probe.lay.hole', place: 'probe.place.boss',
    wire: 'probe.wire.howHole', stuck: 'probe.wire.normallyClosed', start: 'probe.position.start', steps: THROUGH_PROBE, touches: true, plate: 'probe',
  },
  {
    id: 'paper', key: 'probe.method.paper', note: 'probe.method.paperNote', how: 'probe.how.paper', place: 'probe.place.paper',
    start: 'probe.position.here', steps: BY_HAND, touches: false,
    choice: { option: 'edge', key: 'probe.edgeLabel', list: EDGES, first: 'z', step: 'probe.step.surface' },
  },
  {
    id: 'height-map', key: 'probe.method.map', note: 'probe.method.mapNote', place: 'probe.place.map', position: 'probe.step.startHeight',
    start: 'probe.position.start', steps: MAP_STEPS, touches: true, apart: true, asks: true,
    choice: { option: 'tool', key: 'probe.map.toolLabel', list: MAP_TOOLS, first: 'board', step: 'probe.step.tool' },
  },
  // A size, not a zero (Mateusz, 2026-10-03): in the height map's row, the zero left as it is. `size` says so.
  {
    id: 'measure', key: 'probe.method.measure', note: 'probe.method.measureNote', lay: 'probe.lay.hole', place: 'probe.place.hole',
    wire: 'probe.wire.howHole', stuck: 'probe.wire.normallyClosed', start: 'probe.position.start', steps: MEASURE_STEPS, touches: true, plate: 'probe', apart: true, size: true,
    choice: { option: 'shape', key: 'probe.shapeLabel', list: SHAPES, first: 'circle-inside', step: 'probe.step.kind' },
  },
];

export const methodOf = (id) => METHODS.find((method) => method.id === id) || null;

/** How a method's wire is tested: the height map's by what touches, the others' as the method says. */
export const wireOf = (method, chosen) => method?.choice?.list.find((one) => one.id === chosen)?.wire || { plate: method?.plate, how: method?.wire, stuck: method?.stuck };

// The Z plate, and the paper on the top, say where Z0 goes (`surface`).
export const usesSurface = (method, chosen) => method?.id === 'z' || (method?.id === 'paper' && chosen === 'z');

/**
 * A height map's area and grid as the server takes them, from the texts
 * typed, by how the area is given (`mode`): a corner and a size (`x y w d`),
 * a centre and a size (`cx cy w d`), two corners (`ax ay bx by`), or the
 * program's extent (`px0 px1 py0 py1`);
 * and the points each way (`nx ny`). The server works out the rest.
 */
export const mapAsk = (texts, mode) => {
  const n = (text) => Number(String(text ?? '').replace(',', '.'));
  const count = { nx: n(texts.nx), ny: n(texts.ny) };
  if (mode === 'point') {
    return { at: { x: n(texts.x), y: n(texts.y) }, size: { x: n(texts.w), y: n(texts.d) }, ...count };
  }
  if (mode === 'centre') {
    return { centre: { x: n(texts.cx), y: n(texts.cy) }, size: { x: n(texts.w), y: n(texts.d) }, ...count };
  }
  if (mode === 'corners') {
    return { x: [n(texts.ax), n(texts.bx)], y: [n(texts.ay), n(texts.by)], ...count };
  }
  return { x: [n(texts.px0), n(texts.px1)], y: [n(texts.py0), n(texts.py1)], ...count };
};

/** What a measurement is asked for with: the method's one choice, if it has one, and where Z0 goes — and a height map's area. */
export const optionsFor = (method, chosen, surface = SURFACE, area = null) => {
  if (method?.asks) {
    return { ...area, [method.choice.option]: chosen };
  }
  return {
    ...(method?.choice ? { [method.choice.option]: chosen } : {}),
    ...(usesSurface(method, chosen) ? { on: surface.on, z0: surface.z0 } : {}),
  };
};

/*
 * Where the wizard is. The first four are the operator's own, one after
 * another; the last two are the server's — a measurement running on any
 * device shows here as running, and one measured shows its result.
 */
const STEPS = [
  { id: 'method', key: 'probe.step.method' },
  { id: 'prepare', key: 'probe.step.prepare' },
  { id: 'areaWay', key: 'probe.step.areaWay' },
  { id: 'lie', key: 'probe.step.lie' },
  { id: 'area', key: 'probe.step.area' },
  { id: 'wire', key: 'probe.step.wire' },
  { id: 'position', key: 'probe.step.position' },
  { id: 'measure', key: 'probe.step.measure' },
  { id: 'result', key: 'probe.step.result' },
];

/** The steps a method goes through, named — every step until one is picked. */
export const stepsOf = (method) => {
  const ids = method?.steps ?? THROUGH_PROBE;
  // A choice with a step of its own is named for what it chooses; into place, for what it sets where a method says (`position`).
  return ids.map((id) => {
    if (id === 'choose') {
      return { id, key: method.choice.step };
    }
    if (id === 'position' && method?.position) {
      return { id, key: method.position };
    }
    return STEPS.find((step) => step.id === id);
  });
};

/** The step before or after `id` for this method (`by` -1 or 1). */
export const stepBeside = (method, id, by) => {
  const ids = method?.steps ?? THROUGH_PROBE;
  return ids[ids.indexOf(id) + by] ?? id;
};

export const wizardStep = (local, probe) => {
  if (probe?.state === 'running') {
    return 'measure';
  }
  if (probe?.state === 'measured' || probe?.state === 'failed') {
    return 'result';
  }
  return local;
};

/*
 * What the tool is doing, from the step the server is on: `z-fast`, `x-down`,
 * `y` (the slow touch that counts). The axis is the part before the dash.
 */
const PHASES = {
  fast: 'probe.phase.fast',
  back: 'probe.phase.back',
  settle: 'probe.phase.settle',
  touch: 'probe.phase.touch',
  off: 'probe.phase.off',
  out: 'probe.phase.out',
  down: 'probe.phase.down',
  up: 'probe.phase.up',
  return: 'probe.phase.return',
  // A height map's way to its next point, and its wait there for the Z plate.
  over: 'probe.phase.over',
  place: 'probe.phase.place',
};

export const phaseWords = (phase) => {
  const [step, what = 'touch'] = String(phase || '').split('-');
  // A step tagged with its pass and side — the hole's `x1a` — is still its axis.
  const axis = /^[xyz]\d/.test(step) ? step[0] : step;
  return { key: PHASES[what] || PHASES.touch, axis: axis.toUpperCase() };
};

/*
 * Why a measurement failed, as the operator needs to hear it. The codes are
 * Grbl's alarms and the runner's own words; anything else is said as it came.
 */
const FAILURES = {
  'ALARM:5': 'probe.failure.notFound',
  'no-touch': 'probe.failure.notFound',
  'ALARM:4': 'probe.failure.alreadyTouching',
  'ALARM:2': 'probe.failure.softLimit',
  touched: 'probe.failure.touched',
  reset: 'probe.failure.reset',
};

export const failureKey = (code) => FAILURES[code] || 'probe.failure.other';

const headers = () => {
  const token = currentToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/** The kept figures (mm) and what each method uses: `{ params, methods }`. */
export const fetchProbe = async () => {
  const res = await fetch('/api/probe', { headers: headers() });
  if (!res.ok) {
    throw new Error(`GET /api/probe: ${res.status}`);
  }
  return res.json();
};

/**
 * The figures as the operator confirmed them, typed in the server's units —
 * `{ name: text }`. A refusal names the figure the server would not take.
 */
export const saveProbe = async (texts, rule) => {
  const params = Object.fromEntries(Object.entries(texts).map(([name, text]) => [name, Number(String(text).replace(',', '.'))]));
  const res = await fetch('/api/probe', {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ params, units: rule?.name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.msg || String(res.status)), { name: body.name || null });
  }
  return body;
};

/**
 * Tell every device where this wizard waits on the operator's hands —
 * `{ method, options, step }` — or, null, that it no longer does. `own`:
 * this is the device the wizard was begun on, so the server ends the stage
 * if it goes away.
 */
export const sayProbeStage = (stage, own = false) => {
  controller.command('probe:stage', stage && own ? { ...stage, own: true } : stage);
};

/** `units`, what the options' figures are in — a height map's area. */
export const startProbe = (method, options = {}, units = undefined) => {
  controller.command('probe:start', { method, options, units });
};

/**
 * The height map's grid as the server would measure it — `{ xs, ys, stepX,
 * stepY, nx, ny }`, millimetres — or `{ reason }`. The step from a count, the
 * count from a step: the server's rule, not one of the panel's.
 */
export const askGrid = async (options, rule) => {
  const res = await fetch('/api/probe/grid', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ options, units: rule?.name }),
  });
  const body = await res.json().catch(() => ({}));
  // No reason: a server too old to know the height map — said so, not taken for a bad grid.
  return res.ok ? body : { reason: body.reason || 'no-server' };
};

/**
 * The loaded program bent by the kept height map (`of` `kept`) or by the one
 * just measured (`result`), as text to draw — the server bent it — or null.
 */
export const fetchBentProgram = async (port, of) => {
  const res = await fetch(`/api/height-map/program?port=${encodeURIComponent(port)}&of=${of}`, { headers: headers() });
  if (!res.ok) {
    return null;
  }
  const body = await res.json().catch(() => null);
  return body?.gcode ?? null;
};

/** The loaded program bent to the height map, or as written. */
export const bendProgram = (on) => {
  controller.command('height-map:use', Boolean(on));
};

/** The Z plate is under the tool: the measurement standing for it goes on. */
export const resumeProbe = () => {
  controller.command('probe:resume');
};

/** Write the zero the last measurement found. */
export const applyProbe = () => {
  controller.command('probe:apply');
};

/** Put the measurement or its failure away, writing nothing. */
export const discardProbe = () => {
  controller.command('probe:discard');
};
