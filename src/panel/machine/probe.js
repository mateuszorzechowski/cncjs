import controller from './controller';
import { currentToken } from './session';
import { settingFigure } from './units';

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
const BY_HAND = ['method', 'prepare', 'position', 'measure', 'result'];
// The corner is chosen first, on a step of its own (Mateusz, 2026-09-29: *"wybór narożnika 2a, jako 1. krok"*).
const CHOOSE_FIRST = ['method', 'choose', 'prepare', 'wire', 'position', 'measure', 'result'];

/*
 * The methods the wizard offers, in its order. `choice` is the one thing
 * chosen per measurement, sent as that option; `start` names the button that
 * sets it going — a probe measures, the paper says "here". `touches`, as the
 * server's strategy says it: works through the probe input, which must be
 * clear before it starts.
 */
export const METHODS = [
  {
    id: 'z', key: 'probe.method.z', note: 'probe.method.zNote', how: 'probe.how.z', place: 'probe.place.z',
    start: 'probe.position.start', steps: THROUGH_PROBE, touches: true,
  },
  {
    id: 'corner', key: 'probe.method.corner', note: 'probe.method.cornerNote', how: 'probe.how.corner', place: 'probe.place.corner',
    start: 'probe.position.start', steps: CHOOSE_FIRST, touches: true,
    choice: { option: 'corner', key: 'probe.cornerLabel', list: CORNERS, first: 'front-left', columns: 2, step: 'probe.step.corner' },
  },
  {
    id: 'paper', key: 'probe.method.paper', note: 'probe.method.paperNote', how: 'probe.how.paper', place: 'probe.place.paper',
    start: 'probe.position.here', steps: BY_HAND, touches: false,
    choice: { option: 'edge', key: 'probe.edgeLabel', list: EDGES, first: 'z', columns: 1 },
  },
];

export const methodOf = (id) => METHODS.find((method) => method.id === id) || null;

/** What a measurement is asked for with: the method's one choice, if it has one. */
export const optionsFor = (method, chosen) => (method?.choice ? { [method.choice.option]: chosen } : {});

/** Each figure the server keeps: what it is called and whether it is a length or a rate (`kind`, the units' word). */
export const FIELDS = {
  plateThickness: { key: 'probe.field.plateThickness', kind: 'length' },
  cornerThickness: { key: 'probe.field.cornerThickness', kind: 'length' },
  wallX: { key: 'probe.field.wallX', kind: 'length' },
  wallY: { key: 'probe.field.wallY', kind: 'length' },
  toolDiameter: { key: 'probe.field.toolDiameter', kind: 'length' },
  paperThickness: { key: 'probe.field.paperThickness', kind: 'length' },
  clear: { key: 'probe.field.clear', kind: 'length' },
  depth: { key: 'probe.field.depth', kind: 'length' },
  maxZ: { key: 'probe.field.maxZ', kind: 'length' },
  maxXY: { key: 'probe.field.maxXY', kind: 'length' },
  retract: { key: 'probe.field.retract', kind: 'length' },
  lift: { key: 'probe.field.lift', kind: 'length' },
  fast: { key: 'probe.field.fast', kind: 'feed' },
  slow: { key: 'probe.field.slow', kind: 'feed' },
};

/** A kept figure in millimetres, as the text a field starts with: `12.7`, not `12.700`. */
export const fieldText = (mm, name, rule) => {
  const { value } = settingFigure(mm, FIELDS[name].kind, rule);
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : '';
};

/** The unit a field is typed in. */
export const fieldUnit = (name, rule) => settingFigure(0, FIELDS[name].kind, rule).unit;

/*
 * Where the wizard is. The first four are the operator's own, one after
 * another; the last two are the server's — a measurement running on any
 * device shows here as running, and one measured shows its result.
 */
const STEPS = [
  { id: 'method', key: 'probe.step.method' },
  { id: 'prepare', key: 'probe.step.prepare' },
  { id: 'wire', key: 'probe.step.wire' },
  { id: 'position', key: 'probe.step.position' },
  { id: 'measure', key: 'probe.step.measure' },
  { id: 'result', key: 'probe.step.result' },
];

/** The steps a method goes through, named — every step until one is picked. */
export const stepsOf = (method) => {
  const ids = method?.steps ?? THROUGH_PROBE;
  // A choice with a step of its own is named for what it chooses.
  return ids.map((id) => (id === 'choose' ? { id, key: method.choice.step } : STEPS.find((step) => step.id === id)));
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
  out: 'probe.phase.out',
  down: 'probe.phase.down',
  up: 'probe.phase.up',
  return: 'probe.phase.return',
};

export const phaseWords = (phase) => {
  const [axis, what = 'touch'] = String(phase || '').split('-');
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

export const startProbe = (method, options = {}) => {
  controller.command('probe:start', { method, options });
};

/** Write the zero the last measurement found. */
export const applyProbe = () => {
  controller.command('probe:apply');
};

/** Put the measurement or its failure away, writing nothing. */
export const discardProbe = () => {
  controller.command('probe:discard');
};
