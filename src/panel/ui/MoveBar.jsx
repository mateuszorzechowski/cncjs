/**
 * The probing cycle as one bar under the drawing (Claude Design, probe
 * proposals, 2026-09-30): its moves grouped by stage — the Z plate's Z and
 * zero, the corner's Z · X · Y · zero — and within a stage by step, each
 * move a segment of its own. Every level can be tapped — a stage, a step, a
 * move, a leg — and the player goes there (review of 2026-09-30: the bar is
 * the player's timeline, its chapters the stages).
 *
 * The stage playing opens out over most of the bar, its steps named and each
 * move a segment; the others fold to their name and one bar of how far
 * through them the cycle is — the width moving smoothly, the steps fading
 * in and out (review note, 2026-09-30: *"niezużywane zwijają się do jednej
 * kreski, aktywny rozwija się … płynnie"*).
 *
 * One gap between every two steps, stage or no stage, and a small one
 * between the moves of a step (review note, 2026-09-30).
 *
 * `groups` is `[{ id, name, subs: [{ name, moves: [{ id, label }] }] }]`,
 * `active` the move playing, `fills` how full each segment is, keyed
 * `move:part` — see `fillsAt`, the one measure the player stops by. `onPick(ids,
 * part)` is told the moves tapped — a stage's, a step's, one — and the leg;
 * without it — the machine playing — nothing can be tapped. `picked`, the
 * same, is the part a repeat plays, underlined; `marked`, moves to point
 * out — those using the figures of a group open — by a dot over them, not a
 * colour: the bar's blues are the playing's alone (review note, 2026-10-01:
 * *"nie mam jak odróżnić zaznaczonej kategorii od animacji i wykonanego
 * etapu"*).
 */

// A bar in SVG, so its fill can follow the progress without a style written into the page;
// what is done a pale accent, the move playing the full one (review note, 2026-09-30). In
// per cent of its width with the corners in pixels, so a short bar is the same rounded
// rectangle as a long one, not an oval (review note, 2026-09-30).
const Bar = ({ on, fill }) => (
  <svg aria-hidden="true" className="block h-1.5 w-full">
    <rect width="100%" height="100%" rx={2} className="fill-line" />
    {fill > 0 ? <rect width={`${100 * Math.min(1, fill)}%`} height="100%" rx={2} className={on ? 'fill-acc' : 'fill-accM'} /> : null}
  </svg>
);

const BUTTON = 'button';

// The mark over a segment whose move an open group's figures act in.
const Dot = () => <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0.5 size-1.5 -translate-x-1/2 rounded-full bg-acc" />;

// Holds a nameless stage's line at the height of a name.
const NO_NAME = ' ';

// As wide as its moves: written out, so every class is one the stylesheet has.
const GROW = {
  1: 'flex-[1_1_0]', 2: 'flex-[2_2_0]', 3: 'flex-[3_3_0]', 4: 'flex-[4_4_0]', 5: 'flex-[5_5_0]', 6: 'flex-[6_6_0]',
};

/**
 * The bar's groups with their words: `groups` as the cycle modules keep them
 * (`name` a literal axis or `key` a translation), `titleOf(id)` a move's
 * spoken name.
 */
export const namedGroups = (groups, t, titleOf, partsOf = () => 1) => groups.map((group) => ({
  id: group.id,
  name: group.name || (group.key ? t(group.key) : ''),
  folded: Boolean(group.folded),
  subs: group.subs.map((sub) => ({ name: t(sub.key), moves: sub.moves.map((id) => ({ id, label: titleOf(id), parts: partsOf(id) })) })),
}));

// A segment's tap target, underlined when it is the part a repeat plays.
// Positioned, so the dot stands over it.
const PLACED = 'relative';
const segment = (chosen) => `${PLACED} flex h-9 min-w-0 flex-1 items-center border-b-2 ${chosen ? 'border-acc' : 'border-transparent'}`;

// A move made of legs — a set-up's rise, crossing and descent — as a segment
// each, each a tap of its own (review note, 2026-09-30).
const Parts = ({
  move, on, fillOf, mark, chosen, disabled, onPick,
}) => (
  <span className="flex h-9 min-w-0 flex-1 items-center gap-0.5">
    {Array.from({ length: move.parts }, (_, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <button key={i} type={BUTTON} disabled={disabled} onClick={() => onPick([move.id], i)} aria-label={`${move.label} · ${i + 1}`} className={segment(chosen(i))}>
        {mark ? <Dot /> : null}
        <Bar on={on} fill={fillOf(i)} />
      </button>
    ))}
  </span>
);

const MoveBar = ({
  groups, active, fills, onPick = null, picked = null, marked = [],
}) => {
  // Whether a segment — or, without `part`, any of a move's — is in the part picked.
  const chosen = (id, part) => Boolean(picked && picked.ids.includes(id) && (picked.part === null || part === undefined || picked.part === part));
  const fillOf = (id, part = 0) => fills[`${id}:${part}`] || 0;
  return (
    <div className="flex gap-2 border-t border-line px-3 pb-1 pt-2">
      {groups.map((group) => {
        const moves = group.subs.flatMap((sub) => sub.moves);
        const playing = moves.some((move) => move.id === active);
        const parts = moves.flatMap((move) => Array.from({ length: move.parts }, (_, i) => fillOf(move.id, i)));
        const done = parts.reduce((all, one) => all + one, 0) / parts.length;
        return (
          <div key={group.id} className={`relative flex min-w-0 flex-col gap-0.5 overflow-hidden transition-[flex-grow] duration-500 ease-out ${playing ? 'flex-[6_6_0]' : 'flex-[1_1_0]'}`}>
            {/* A stage with no name of its own keeps the line, so its bars stand level with the others'. */}
            <button type={BUTTON} disabled={!onPick || !playing} onClick={() => onPick(moves.map((move) => move.id))} className={`truncate text-left text-note ${playing ? 'font-semibold text-acc' : 'text-mut'} ${group.name && !(group.folded && playing) ? '' : 'invisible'}`}>{group.name || NO_NAME}</button>
            <div aria-hidden={!playing} className={`flex gap-2 transition-opacity duration-300 ${playing ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
              {group.subs.map((sub) => {
                const on = sub.moves.some((move) => move.id === active);
                return (
                  <div key={sub.name} className={`flex min-w-0 flex-col ${GROW[sub.moves.length] || GROW[1]}`}>
                    <button type={BUTTON} disabled={!onPick || !playing} onClick={() => onPick(sub.moves.map((move) => move.id))} className={`truncate text-left text-cap ${on ? 'font-semibold text-ink' : 'text-mut'}`}>{sub.name}</button>
                    <div className="flex gap-1">
                      {sub.moves.map((move) => (
                        move.parts > 1 ? (
                          <Parts key={move.id} move={move} on={move.id === active} fillOf={(i) => fillOf(move.id, i)} mark={marked.includes(move.id)} chosen={(i) => chosen(move.id, i)} disabled={!onPick || !playing} onPick={onPick} />
                        ) : (
                          <button key={move.id} type={BUTTON} disabled={!onPick || !playing} onClick={() => onPick([move.id])} aria-label={move.label} className={segment(chosen(move.id, 0))}>
                            {marked.includes(move.id) ? <Dot /> : null}
                            <Bar on={move.id === active} fill={fillOf(move.id)} />
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Folded: the stage as one bar, how far through it the cycle is; a tap goes to the stage. */}
            <button type={BUTTON} disabled={!onPick || playing} onClick={() => onPick(moves.map((move) => move.id))} aria-label={group.name || moves[0].label} className={`absolute inset-x-0 bottom-0 flex h-9 items-center border-b-2 transition-opacity duration-300 ${moves.some((move) => chosen(move.id)) ? 'border-acc' : 'border-transparent'} ${playing ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
              {moves.some((move) => marked.includes(move.id)) ? <Dot /> : null}
              <Bar on={false} fill={done} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default MoveBar;
