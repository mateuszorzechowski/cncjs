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

// How thick the work is drawn when the table shows under it or beside it — not to scale.
export const STOCK = 14;

/*
 * What a Z is measured on and where Z0 goes (Mateusz, 2026-10-01): the work
 * a hatch (`fill`) with its top at `y`, as before; with Z0 on the table, the
 * table under it and the line there; the plate or the sheet on the table,
 * the table at `y` and the work standing beside it, from `blockX`. `zero`
 * fades the Z0 line in, `label` at `labelX`; `stock`, `{ text, lit, fade }`,
 * the work's thickness, drawn where Z0 is that far from the surface.
 */
export const SurfaceGround = ({
  fill, y, width, surface = { on: 'work', z0: 'top' }, zero = 0, label, labelX, stock = null, blockX = 222, size,
}) => {
  const onTable = surface.on === 'table';
  const shifts = (surface.on === 'work') !== (surface.z0 === 'top');
  const top = onTable ? y - STOCK : y;
  const tableY = onTable || shifts ? top + STOCK : null;
  const zeroY = surface.z0 === 'top' ? top : tableY;
  const stockX = width - 14;
  return (
    <g>
      {onTable ? (
        <>
          <rect x={-2} y={y} width={width + 4} height={40} className="fill-mutS stroke-line" strokeWidth={1.5} vectorEffect={NS} />
          <rect x={blockX} y={top} width={width + 2 - blockX} height={STOCK} fill={fill} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
        </>
      ) : (
        <>
          <rect x={-2} y={y} width={width + 4} height={shifts ? STOCK : 40} fill={fill} className="stroke-line" strokeWidth={1.5} vectorEffect={NS} />
          {shifts ? <rect x={-2} y={tableY} width={width + 4} height={40} className="fill-mutS stroke-line" strokeWidth={1.5} vectorEffect={NS} /> : null}
        </>
      )}
      {zero > 0 ? (
        <g opacity={zero}>
          <path d={`M0 ${zeroY} H${width}`} className="stroke-acc" strokeWidth={1.5} vectorEffect={NS} strokeDasharray={DASH} />
          <text x={labelX} y={zeroY - 5} fontSize={size.fs} className="fill-acc font-num font-semibold">{label}</text>
        </g>
      ) : null}
      {stock && shifts ? (
        <g opacity={stock.fade ?? 1}>
          <Dimension at={stockX} from={top} to={top + STOCK} lit={stock.lit} size={size} />
          <Tag x={stockX - 12} y={top + STOCK / 2} text={stock.text} right face={stock.lit ? FACE.hot : FACE.plain} size={size} />
        </g>
      ) : null}
    </g>
  );
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
