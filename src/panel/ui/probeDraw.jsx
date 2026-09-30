/**
 * The pieces every probing drawing is made of, by the proposals' one rule
 * (Claude Design, `templates/probe-*-proposal`, 2026-09-30): a move's arrow
 * with its feed on one side, a grey dimension with the form's figure on the
 * other; lines at screen widths — shapes 2 px, dimension lines 1.5, ticks 1 —
 * one dash (5 4), labels rounded as the controls are.
 *
 * `k` is the drawing's screen pixels per unit (`useViewScale`): sizes that
 * must read the same at any scale are divided by it.
 */

export const NS = 'non-scaling-stroke';
export const DASH = '5 4';
// A tag's face, named for what it marks.
export const FACE = { plain: 'plain', hot: 'hot', rapid: 'rapid', alarm: 'alarm' };

/** Label and arrowhead sizes, in the drawing's units, for scale `k`. */
// Arrowheads small on thin lines, every arrow alike (review note, 2026-09-30).
export const kit = (k) => ({ fs: Math.min(12.5, 13 / k), hw: 3 / k, hh: 5.4 / k, rx: 4 / k, k });

const TAG_FACES = {
  plain: { box: 'fill-surf stroke-line', line: 1, text: 'fill-acc' },
  hot: { box: 'fill-accS stroke-acc', line: 1.5, text: 'fill-acc' },
  rapid: { box: 'fill-surf stroke-line', line: 1, text: 'fill-rapid' },
  alarm: { box: 'fill-redS stroke-red', line: 1.5, text: 'fill-red' },
};

// A figure's words a little under the drawing's, and lighter (review note, 2026-09-30).
const TAG_SCALE = 0.88;

// The figures face is monospaced at about 0.62 em; `fs` the drawing's size.
export const tagWidth = (text, fs) => (text.length * 0.64 + 1) * fs * TAG_SCALE;

/** A figure in a small box centred on `y`, from `x` rightwards — or leftwards, `right`. */
export const Tag = ({ x, y, text, right = false, face = 'plain', size }) => {
  const { rx } = size;
  const w = tagWidth(text, size.fs);
  const fs = size.fs * TAG_SCALE;
  const left = right ? x - w : x;
  const look = TAG_FACES[face];
  return (
    <g>
      <rect x={left} y={y - fs * 0.9} width={w} height={fs * 1.8} rx={rx} className={look.box} strokeWidth={look.line} vectorEffect={NS} />
      <text x={left + fs / 2} y={y + fs * 0.36} fontSize={fs} className={`${look.text} font-num font-medium`}>{text}</text>
    </g>
  );
};

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
 * where it ends), or a short one (heads outside, pointing in).
 */
export const Dimension = ({
  axis = 'v', at, from, to, limit = false, lit = false, size,
}) => {
  const stroke = lit ? 'stroke-acc' : 'stroke-mut';
  const fill = lit ? 'fill-acc' : 'fill-mut';
  const { hh } = size;
  const [lo, hi] = from < to ? [from, to] : [to, from];
  const small = hi - lo < 24;
  const v = axis === 'v';
  const pt = (along, cross) => (v ? `${cross} ${along}` : `${along} ${cross}`);
  const tick = (along) => (v ? `M${at - 10} ${along} H${at + 10}` : `M${along} ${at - 10} V${at + 10}`);
  const head = (along, dir) => <Head key={`${along}${dir}`} x={v ? at : along} y={v ? along : at} dir={dir} size={size} className={fill} />;
  const [toLo, toHi] = v ? ['up', 'down'] : ['left', 'right'];
  let line;
  let heads;
  if (small) {
    line = `M${pt(lo - 16, at)} L${pt(lo, at)} M${pt(hi, at)} L${pt(hi + 16, at)}`;
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
      <path d={line} className={stroke} fill="none" strokeWidth={1} vectorEffect={NS} strokeDasharray={limit && !small ? DASH : undefined} />
      {heads}
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
  const tick = v ? `M${at - 6} ${from} H${at + 6}` : `M${from} ${at - 6} V${at + 6}`;
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
  x, y, size = null, r: radius = null,
}) => {
  // A quarter smaller than the dot it replaced, ring and all (review note, 2026-09-30).
  const r = 0.75 * (radius ?? 5.4 / size.k);
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" className="stroke-grn" strokeWidth={1} vectorEffect={NS}>
        <animate attributeName={RADIUS} values={`${r};${r * 3.2}`} dur={PULSE} repeatCount={FOREVER} />
        <animate attributeName={OPACITY} values="0.5;0" dur={PULSE} repeatCount={FOREVER} />
      </circle>
      <circle cx={x} cy={y} r={r} className="fill-grn">
        <animate attributeName={RADIUS} values={`${r};${r * 1.15};${r}`} dur={PULSE} repeatCount={FOREVER} />
      </circle>
    </g>
  );
};

/*
 * The axes in a drawing's bottom-left corner (`x`, `y` the corner): thin, each
 * with a small filled half head on the side facing the other, smaller words,
 * close to the edge whatever the drawing's size (review notes, 2026-09-30).
 */
export const AxisPair = ({
  x, y, across, up, size,
}) => {
  const { k } = size;
  const fs = size.fs * 0.85;
  const hw = size.hw * 1.33;
  const hh = size.hh * 1.33;
  const ox = x + 3 / k;
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
      <text x={ox + hw + 3 / k} y={ty + fs * 0.36} fontSize={fs} className="fill-mut font-num font-semibold">{up}</text>
    </g>
  );
};
