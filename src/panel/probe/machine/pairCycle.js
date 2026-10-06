import { HOLD_MS, LOOP_HOLD_MS } from './bossMoves';
import { frameAt, totalOf } from './timeline';

/*
 * A distance's Setup as one film (Mateusz, 2026-10-06: *"scena z dwoma
 * mierzonymi obiektami według konfiguracji użytkownika, tylko w przejazdach
 * między nimi, na początku i na końcu z wynikiem pomiaru"*): both features
 * as picked, the first's own cycle, the way over to the second by the jog,
 * the second's own cycle, and both again with the measure between them.
 *
 * The features' moves are their own cycles', named `a:…` and `b:…`; the
 * three scenes of both (`SCENES`) are this cycle's own, drawn by
 * `PairOverview` rather than by the features' views.
 */
const SCENES = {
  start: { run: 2000, titleKey: 'probe2.pair.move.start', code: 'probe2.pair.startCode' },
  jog: { run: 2600, titleKey: 'probe2.pair.move.jog', code: 'probe2.height.jogCode' },
  end: { run: 2600, titleKey: 'probe2.pair.move.end', code: 'probe2.pair.endCode' },
};
const SCENE = { kind: 'scene', uses: [] };

/** One film of `pair`'s two ends, `first` and `second` their own cycles. */
export const pairCycleOf = (pair, first, second) => {
  const ends = { a: first, b: second };
  const named = (end, name) => `${end}:${name}`;
  // A feature's move: its cycle and its own name; null for a scene of both.
  const own = (name) => {
    const [end, rest] = String(name).split(':');
    return rest && ends[end] ? { cycle: ends[end], name: rest } : null;
  };

  const order = (passes = 2) => [
    'start', ...first.order(passes).map((name) => named('a', name)), 'jog', ...second.order(passes).map((name) => named('b', name)), 'end',
  ];

  const timeline = (passes = 2) => {
    const items = [];
    let start = 0;
    const scene = (name) => {
      const { run } = SCENES[name];
      items.push({
        name, start, run, span: run + HOLD_MS, parts: [[0, 1]],
      });
      start += run + HOLD_MS;
    };
    const feature = (end, cycle) => {
      const its = cycle.timeline(passes);
      its.forEach((item) => items.push({ ...item, name: named(end, item.name), start: start + item.start }));
      start += totalOf(its);
    };
    scene('start');
    feature('a', first);
    scene('jog');
    feature('b', second);
    scene('end');
    return items;
  };

  /** Which move plays at `ms`: the film, a figure's loop — the first's — or `pinned` alone. */
  const playAt = (ms, {
    pinned = null, field = null, still = false, passes = 2,
  } = {}) => {
    if (field) {
      const frame = first.playAt(ms, { field, still, passes });
      return { ...frame, name: named('a', frame.name) };
    }
    const one = pinned && own(pinned);
    if (one) {
      return { ...one.cycle.playAt(ms, { pinned: one.name, still, passes }), name: pinned };
    }
    if (pinned) {
      const { run } = SCENES[pinned];
      const span = run + LOOP_HOLD_MS;
      const into = ms % span;
      return {
        name: pinned, focus: null, p: still ? 1 : Math.min(1, into / run), span, run, into,
      };
    }
    const items = timeline(passes);
    const frame = frameAt(items, ms % totalOf(items));
    return { ...frame, focus: null, p: still ? 1 : frame.p };
  };

  // The bar: the scenes of both between and around each feature's own stages, folded under its end's name.
  const groups = (passes = 2) => {
    const scene = (id, key, folded = false) => ({
      id, key, folded, subs: [{ key, moves: [id] }],
    });
    const feature = (end, key, cycle) => ({
      id: end,
      key,
      subs: cycle.groups(passes).map((group) => ({
        name: group.name, key: group.key, moves: group.subs.flatMap((sub) => sub.moves).map((name) => named(end, name)),
      })),
    });
    return [
      scene('start', 'probe2.pair.bar.start'),
      feature('a', 'probe.distance.first', first),
      scene('jog', 'probe2.height.bar.jog'),
      feature('b', 'probe.distance.second', second),
      scene('end', 'probe2.pair.bar.end', true),
    ];
  };

  // Everything else a feature's move asks of its own cycle; a scene of both answers for itself.
  const by = (name, ask, scene) => {
    const one = own(name);
    return one ? ask(one.cycle, one.name) : scene;
  };

  return {
    pair,
    part: first.part,
    partOf: (name) => by(name, (cycle) => cycle.part, first.part),
    // A scene of both is drawn by `PairOverview`: which one, or null for a feature's move.
    overview: (name) => (own(name) ? null : name),
    side: (name, p, how) => by(name, (cycle, one) => (cycle.side ? cycle.side(one, p, how) : null), null),
    viewOf: (name, p, focus) => by(name, (cycle, one) => cycle.viewOf?.(one, p, focus) ?? 'top', 'top'),
    params: first.params,
    hold: first.hold,
    order,
    groups,
    timeline,
    playAt,
    moveOf: (name) => by(name, (cycle, one) => cycle.moveOf(one), SCENE),
    titleOf: (name) => by(name, (cycle, one) => cycle.titleOf(one), [SCENES[name]?.titleKey]),
    scene: (name, p, how) => by(name, (cycle, one) => cycle.scene(one, p, how), null),
    code: (name, texts) => by(name, (cycle, one) => cycle.code(one, texts), [SCENES[name]?.code]),
    explain: (name, texts, say) => by(name, (cycle, one) => (cycle.explain ? cycle.explain(one, texts, say) : null), null),
    usesAt: (name, p) => by(name, (cycle, one) => cycle.usesAt(one, p), []),
    positionAt: first.positionAt,
  };
};
