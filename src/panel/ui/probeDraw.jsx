/**
 * The pieces every probing drawing is made of, by the proposals' one rule
 * (Claude Design, `templates/probe-*-proposal`, 2026-09-30): a move's arrow
 * with its feed on one side, a grey dimension with the form's figure on the
 * other; lines at screen widths — shapes 2 px, dimension lines 1.5, ticks 1 —
 * one dash (5 4), labels rounded as the controls are.
 *
 * The animation rules, for every probing drawing and without exceptions
 * (Mateusz, 2026-10-01: *"bez wyjątków, zapisz to jako reguły animacji"*):
 *
 * Arrows
 * - an arrow shows only while its move runs, from where it starts to where
 *   it ends, beside the tool's way, never on it;
 * - a probing move (G38) solid in the accent, a G0 dashed in the rapid
 *   colour with a tick where it sets off;
 * - an arrow carries only its feed (F50, F15); a G0 carries nothing.
 *
 * Distances
 * - every distance of a move's way is a grey dimension on the other side of
 *   the way from the arrow, its figure beside it, never on it; a distance
 *   that says the part or the set-up (its width, the way out past its side)
 *   stands just outside the part, by its edge (Mateusz, 2026-10-02);
 * - a search's reach is a dashed dimension, one head, its figure "≤ v";
 * - a slow touch's reach is one dashed line, heads only at its ends, a short
 *   tick at the surface, and one figure — the sum, "≤ 10 mm" — with where it
 *   comes from under the title (rule 1; replaces "5 mm" + "≤ 5 mm", 2026-10-02);
 * - a dimension is fixed to the move's geometry, never to where the tool is;
 * - a way made of several of the form's figures (back-off and depth, lift
 *   and back-off, the way out and half the part) is one dimension with one
 *   figure, their sum, and a short tick where they meet; where the sum comes
 *   from is said under the step's title ("≤ 35 mm = 20 mm za bok + połowa z
 *   30 mm"), and every field it is made of is lit in the form (Mateusz,
 *   2026-10-02 — replaces a figure on each part, 2026-10-01).
 *
 * Labels
 * - 8.5 screen px, in rounded boxes (Mateusz, 2026-10-02);
 * - over the lines and the tool, never under them; never on a line, on
 *   another label, or past the drawing's edge, 2 px short of it;
 * - still through a move: they keep off the tool's whole way through it and
 *   its arrow all along, drawn or not;
 * - a touch a green beating dot; walls touched before stay as faint dots;
 * - a zero written a dashed accent line, named X0, Y0 or Z0.
 *
 * Where a label stands — `placeTags`, one rule for every drawing (map §4a/4b,
 * Mateusz 2026-10-01):
 * - beside its line, a gap g of 6 screen px past its ticks' ends — every
 *   label of a line, and of lines in a row, aligned; never glued;
 * - centred on its part of the line, also when it is longer than the part;
 * - two labels each centred on its part; when they would meet, one under the
 *   other, in the parts' order, the stack centred on the whole line;
 * - on the far side from the tool's way: an arrow's feed beyond the arrow, a
 *   dimension's figure beyond the dimension;
 * - in this order: centred on its part; the one that meets a line it must
 *   not cross (a zero) aligned to its part's end; slid along its own line
 *   just clear of it, still beside it; on the other side of its line; past
 *   the line's ends — one over its start, two one at each end; in the other
 *   view's free edge (`probePair`).
 *
 * Views
 * - a move is drawn in the view it lies in: X and Y from above, Z from the
 *   side — and nowhere else, with no words standing in for it;
 * - the Z plate and the paper have a side view only; the corner, the hole
 *   and the part both side by side as one drawing with no line between them,
 *   one at a time on a phone with a switch;
 * - the side view is always from the front, along X; a way along Y is depth
 *   — the tool larger nearer, smaller further, dashed behind the work;
 * - from above, height is the tool's size: higher, larger.
 *
 * The bar and the caption
 * - every line of G-code is a move of its own: a segment on the bar, its own
 *   title (Mateusz, 2026-10-02 — a set-up is no longer one move in parts);
 * - the stage under way about two thirds of the bar, its sub-stage under way
 *   a segment a move; done and coming sub-stages and stages folded to one bar;
 * - the caption keeps its height: the line saying where a sum comes from is
 *   kept when empty;
 * - a step lights in the form every field its figures come from.
 *
 * A figure being set
 * - its field focused loops its step; its part of the drawing lit, the rest
 *   faded to 30%.
 *
 * `k` is the drawing's screen pixels per unit (`useViewScale`): sizes that
 * must read the same at any scale are divided by it.
 */

import {
  SHORT_SPAN, SHORT_STUB, TAG_SCALE, tagWidth,
} from './probeLabels';

export const NS = 'non-scaling-stroke';
export const DASH = '5 4';
// A tag's face, named for what it marks.
export const FACE = {
  plain: 'plain', hot: 'hot', rapid: 'rapid', alarm: 'alarm', ink: 'ink', touch: 'touch', warn: 'warn',
};

/** Label and arrowhead sizes, in the drawing's units, for scale `k`. */
// Arrowheads small on thin lines, every arrow alike (review note, 2026-09-30).
export const kit = (k) => ({ fs: Math.min(12.5, 13 / k), hw: 3 / k, hh: 5.4 / k, rx: 4 / k, k });

const TAG_FACES = {
  plain: { box: 'fill-surf stroke-line', line: 1, text: 'fill-acc' },
  hot: { box: 'fill-accS stroke-acc', line: 1.5, text: 'fill-acc' },
  rapid: { box: 'fill-surf stroke-line', line: 1, text: 'fill-rapid' },
  alarm: { box: 'fill-redS stroke-red', line: 1.5, text: 'fill-red' },
  // The jog's words, in the colour of its arrow; a touch's, and a warning's.
  ink: { box: 'fill-surf stroke-line', line: 1, text: 'fill-ink' },
  touch: { box: 'fill-surf stroke-line', line: 1, text: 'fill-grn' },
  warn: { box: 'fill-surf stroke-line', line: 1, text: 'fill-ambT' },
};

/** A figure in a small box centred on `y`, from `x` rightwards — or leftwards, `right`. */
export const Tag = ({
  x, y, text, right = false, face = 'plain', ext = false, size,
}) => {
  const { rx } = size;
  const w = tagWidth(text, size.fs);
  const fs = size.fs * TAG_SCALE;
  const left = right ? x - w : x;
  const look = TAG_FACES[face];
  return (
    // `ext`: a label standing out in the other view of a pair (`probePair`).
    <g data-tag={ext ? 'ext' : 'own'}>
      <rect x={left} y={y - fs * 0.9} width={w} height={fs * 1.8} rx={rx} className={look.box} strokeWidth={look.line} vectorEffect={NS} />
      <text x={left + fs / 2} y={y + fs * 0.36} fontSize={fs} className={`${look.text} font-num font-medium`}>{text}</text>
    </g>
  );
};

// How far a dimension's ticks stand out of its line, and an arrow's start tick.
export const DIM_TICK = 10;
export const MOTION_TICK = 6;

/** An arrowhead with its tip at (x, y), pointing `dir`. */
export const Head = ({ x, y, dir, size, className }) => {
  const { hw, hh } = size;
  const d = {
    down: `M${x - hw} ${y - hh} L${x} ${y} L${x + hw} ${y - hh} Z`,
    up: `M${x - hw} ${y + hh} L${x} ${y} L${x + hw} ${y + hh} Z`,
    right: `M${x - hh} ${y - hw} L${x} ${y} L${x - hh} ${y + hw} Z`,
    left: `M${x + hh} ${y - hw} L${x} ${y} L${x + hh} ${y + hw} Z`,
  }[dir];
  return <path d={d} className={className} />;
};

/*
 * A dimension along an axis, `from` → `to` at cross position `at`, with ticks
 * across it: a way (both heads in), a search limit (`limit`: dashed, one head
 * where it ends), or a short one (heads outside, pointing in). A way made of
 * two figures and said as their sum has a short tick where they meet (`mid`).
 */
export const Dimension = ({
  axis = 'v', at, from, to, mid = null, limit = false, lit = false, size,
}) => {
  const stroke = lit ? 'stroke-acc' : 'stroke-mut';
  const fill = lit ? 'fill-acc' : 'fill-mut';
  const { hh } = size;
  const [lo, hi] = from < to ? [from, to] : [to, from];
  const small = hi - lo < SHORT_SPAN;
  const v = axis === 'v';
  const pt = (along, cross) => (v ? `${cross} ${along}` : `${along} ${cross}`);
  const tick = (along) => (v ? `M${at - DIM_TICK} ${along} H${at + DIM_TICK}` : `M${along} ${at - DIM_TICK} V${at + DIM_TICK}`);
  const head = (along, dir) => <Head key={`${along}${dir}`} x={v ? at : along} y={v ? along : at} dir={dir} size={size} className={fill} />;
  const [toLo, toHi] = v ? ['up', 'down'] : ['left', 'right'];
  let line;
  let heads;
  if (small) {
    line = `M${pt(lo - SHORT_STUB, at)} L${pt(lo, at)} M${pt(hi, at)} L${pt(hi + SHORT_STUB, at)}`;
    heads = [head(lo, toHi), head(hi, toLo)];
  } else if (limit) {
    const end = to;
    line = `M${pt(from, at)} L${pt(end > from ? end - hh : end + hh, at)}`;
    heads = [head(end, end > from ? toHi : toLo)];
  } else {
    line = `M${pt(lo + hh, at)} L${pt(hi - hh, at)}`;
    heads = [head(lo, toLo), head(hi, toHi)];
  }
  return (
    <g>
      <path d={`${tick(from)} ${tick(to)}`} className={stroke} fill="none" strokeWidth={1} vectorEffect={NS} />
      {mid === null ? null : <path d={v ? `M${at - DIM_TICK / 2} ${mid} H${at + DIM_TICK / 2}` : `M${mid} ${at - DIM_TICK / 2} V${at + DIM_TICK / 2}`} className={stroke} fill="none" strokeWidth={1} vectorEffect={NS} />}
      <path d={line} className={stroke} fill="none" strokeWidth={1} vectorEffect={NS} strokeDasharray={limit && !small ? DASH : undefined} />
      {heads}
    </g>
  );
};

/*
 * A slow touch's reach (review note, 2026-10-01: *"groty tylko na
 * zewnętrznych kreskach"*): one dashed line, as a reach is, from where it sets
 * off (`from`) to its limit (`to`), heads at those two, a short tick where it
 * passes the surface (`mid`). Its one figure, the sum, is the drawing's to
 * place (rule 1, Mateusz 2026-10-02).
 */
export const ReachDimension = ({
  axis = 'v', at, from, mid, to, lit = false, size,
}) => {
  const stroke = lit ? 'stroke-acc' : 'stroke-mut';
  const fill = lit ? 'fill-acc' : 'fill-mut';
  const { hh } = size;
  const [lo, hi] = from < to ? [from, to] : [to, from];
  const v = axis === 'v';
  const pt = (along, cross) => (v ? `${cross} ${along}` : `${along} ${cross}`);
  const tick = (along) => (v ? `M${at - DIM_TICK} ${along} H${at + DIM_TICK}` : `M${along} ${at - DIM_TICK} V${at + DIM_TICK}`);
  const [toLo, toHi] = v ? ['up', 'down'] : ['left', 'right'];
  return (
    <g>
      <path d={`${tick(from)} ${tick(to)}`} className={stroke} fill="none" strokeWidth={1} vectorEffect={NS} />
      <path d={v ? `M${at - DIM_TICK / 2} ${mid} H${at + DIM_TICK / 2}` : `M${mid} ${at - DIM_TICK / 2} V${at + DIM_TICK / 2}`} className={stroke} fill="none" strokeWidth={1} vectorEffect={NS} />
      <path d={`M${pt(lo + hh, at)} L${pt(hi - hh, at)}`} className={stroke} fill="none" strokeWidth={1} vectorEffect={NS} strokeDasharray={DASH} />
      <Head x={v ? at : lo} y={v ? lo : at} dir={toLo} size={size} className={fill} />
      <Head x={v ? at : hi} y={v ? hi : at} dir={toHi} size={size} className={fill} />
    </g>
  );
};

/*
 * A move's arrow, `from` → `to` along an axis at cross position `at`: a
 * probing move (G38.2) in the accent, a rapid (G0) dashed in the rapid
 * colour, with a tick where it sets off.
 */
export const Motion = ({
  axis = 'v', at, from, to, kind, size,
}) => {
  const rapid = kind === 'rapid';
  const stroke = rapid ? 'stroke-rapid' : 'stroke-acc';
  const fill = rapid ? 'fill-rapid' : 'fill-acc';
  const { hh } = size;
  const forward = to > from;
  const v = axis === 'v';
  const end = forward ? to - hh : to + hh;
  const line = v ? `M${at} ${from} V${end}` : `M${from} ${at} H${end}`;
  const tick = v ? `M${at - MOTION_TICK} ${from} H${at + MOTION_TICK}` : `M${from} ${at - MOTION_TICK} V${at + MOTION_TICK}`;
  let dir = forward ? 'right' : 'left';
  if (v) {
    dir = forward ? 'down' : 'up';
  }
  return (
    <g>
      <path d={line} className={stroke} fill="none" strokeWidth={1.25} vectorEffect={NS} strokeDasharray={rapid ? DASH : undefined} />
      <path d={tick} className={stroke} fill="none" strokeWidth={1} vectorEffect={NS} />
      <Head x={v ? at : to} y={v ? to : at} dir={dir} size={size} className={fill} />
    </g>
  );
};

const DOWN = 'down';

/*
 * A jog, the operator's own move (paper proposal, 2026-09-30): solid in the
 * text's colour, a tick where each step set off, `every` apart; down the
 * drawing from `from` to `to` at `at`. The last step reads clearly, its tick
 * full; the ones before it faint, their ticks short (review note,
 * 2026-10-01: *"ostatni krok wyraźny, poprzednie blade"*).
 */
export const Jog = ({
  at, from, to, every = null, size,
}) => {
  const ticks = [from];
  if (every) {
    for (let y = from + every; y < to - 1e-6; y += every) {
      ticks.push(y);
    }
  }
  const last = ticks[ticks.length - 1];
  const before = ticks.slice(0, -1);
  const short = before.map((y) => `M${at - 3} ${y} H${at + 3}`).join(' ');
  return (
    <g>
      {before.length ? (
        <g opacity={0.3}>
          <path d={`M${at} ${from} V${last}`} className="stroke-ink" fill="none" strokeWidth={1.25} vectorEffect={NS} />
          <path d={short} className="stroke-ink" fill="none" strokeWidth={1} vectorEffect={NS} />
        </g>
      ) : null}
      <path d={`M${at} ${last} V${to - size.hh}`} className="stroke-ink" fill="none" strokeWidth={1.25} vectorEffect={NS} />
      <path d={`M${at - 6} ${last} H${at + 6}`} className="stroke-ink" fill="none" strokeWidth={1} vectorEffect={NS} />
      <Head x={at} y={to} dir={DOWN} size={size} className="fill-ink" />
    </g>
  );
};

/** The drawing's alarm: a red dot where the tip stopped and the words in the top left. */
export const Alarm = ({
  x, y, text, size,
}) => (
  <g>
    <circle cx={x} cy={y} r={6 / size.k} className="fill-red" />
    <Tag x={6} y={8 + size.fs} text={text} face={FACE.alarm} size={size} />
  </g>
);

// SMIL's words, kept out of the markup where they would read as text.
const FOREVER = 'indefinite';
// A touch's colours, whole class names so the stylesheet has them: green, and the paper's amber and red.
export const TONES = {
  grn: { stroke: 'stroke-grn', fill: 'fill-grn' },
  amb: { stroke: 'stroke-amb', fill: 'fill-amb' },
  red: { stroke: 'stroke-red', fill: 'fill-red' },
  mut: { stroke: 'stroke-mut', fill: 'fill-mut' },
};
const PULSE = '1.2s';
const RADIUS = 'r';
const OPACITY = 'opacity';

/*
 * A touch: the green dot, beating a little, and a thin faint ring that grows
 * out of it and fades (Mateusz, 2026-09-30: *"kropka z małym pulsem i cienkim
 * delikatnym bladym obrysem, który rośnie i się rozmywa"*) — on every
 * drawing that shows one, always (*"wszędzie, nie trzeba się ograniczać"*).
 * `r` the dot's radius in the drawing's units, or a screen size by `size`.
 */
export const Contact = ({
  x, y, size = null, r: radius = null, tone = 'grn',
}) => {
  // A quarter smaller than the dot it replaced, ring and all (review note, 2026-09-30).
  const r = 0.75 * (radius ?? 5.4 / size.k);
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" className={TONES[tone].stroke} strokeWidth={1} vectorEffect={NS}>
        <animate attributeName={RADIUS} values={`${r};${r * 3.2}`} dur={PULSE} repeatCount={FOREVER} />
        <animate attributeName={OPACITY} values="0.5;0" dur={PULSE} repeatCount={FOREVER} />
      </circle>
      <circle cx={x} cy={y} r={r} className={TONES[tone].fill}>
        <animate attributeName={RADIUS} values={`${r};${r * 1.15};${r}`} dur={PULSE} repeatCount={FOREVER} />
      </circle>
    </g>
  );
};

/*
 * The axes in a drawing's bottom-left corner (`x`, `y` the corner): thin, each
 * with a small filled half head on the side facing the other, smaller words,
 * close to the edge whatever the drawing's size (review notes, 2026-09-30).
 * Each letter centred on its line a little past its end, its "+" beside it:
 * X+ to the right of the end, Y+ or Z+ above it (Mateusz, 2026-10-01).
 */
export const AxisPair = ({
  x, y, across, up, size,
}) => {
  const { k } = size;
  const fs = size.fs * 0.85;
  const hw = size.hw * 1.33;
  const hh = size.hh * 1.33;
  // In by half the up letter, which stands centred on its line.
  const ox = x + fs * 0.31 + 2 / k;
  // Raised by half the words' height, so X+ beside its head stays inside.
  const oy = y - 3 / k - fs * 0.4;
  const long = 26;
  const tx = ox + long;
  const ty = oy - long;
  return (
    <g>
      <path d={`M${ox} ${oy} H${tx} M${ox} ${oy} V${ty}`} className="stroke-mut" strokeWidth={1} vectorEffect={NS} />
      <path d={`M${tx} ${oy} L${tx - hh} ${oy - hw} L${tx - hh} ${oy} Z M${ox} ${ty} L${ox + hw} ${ty + hh} L${ox} ${ty + hh} Z`} className="fill-mut" />
      <text x={tx + 3 / k} y={oy + fs * 0.36} fontSize={fs} className="fill-mut font-num font-semibold">{across}</text>
      <text x={ox - fs * 0.31} y={ty - 4 / k} fontSize={fs} className="fill-mut font-num font-semibold">{up}</text>
    </g>
  );
};

/** What `AxisPair` at (x, y) covers, its two arms with their words, as rects `[x, y, w, h]` for labels to keep off. */
export const axisRects = (x, y, size) => {
  const { k } = size;
  const fs = size.fs * 0.85;
  const ox = x + fs * 0.31 + 2 / k;
  const oy = y - 3 / k - fs * 0.4;
  const top = oy - 26 - 4 / k - fs;
  return [[x, oy - fs * 0.6, ox + 26 + 3 / k + fs * 1.4 - x, y - (oy - fs * 0.6)], [x, top, ox - x + fs * 0.62, oy - top]];
};

const USER = 'userSpaceOnUse';
const SLANT = 'rotate(45)';

/*
 * The work's hatch, as `<defs>` for `id`: the work cut or seen face on; and,
 * `${id}far`, the same paler and a little closer — work further back, the
 * bottom of a hole from above or its far wall from the front (review notes,
 * 2026-10-01: *"bledsze i trochę gęstsze"*).
 */
export const WorkHatch = ({ id }) => (
  <defs>
    <pattern id={id} width={7} height={7} patternUnits={USER} patternTransform={SLANT}>
      <rect width={7} height={7} className="fill-work" />
      <path d="M0 0 V7" className="stroke-hatch" strokeWidth={1} />
    </pattern>
    <pattern id={`${id}far`} width={5} height={5} patternUnits={USER} patternTransform={SLANT}>
      <rect width={5} height={5} className="fill-work" />
      <path d="M0 0 V5" className="stroke-hatch" strokeOpacity={0.4} strokeWidth={1} />
    </pattern>
  </defs>
);
