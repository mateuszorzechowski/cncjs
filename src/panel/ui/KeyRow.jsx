/**
 * A key, or a few, and what it does — with the figure it will use, when
 * there is one. The rows of the jog's shortcuts, and of MDI's keys and
 * buttons (review note, 2026-09-29: *"przyciski i skróty klawiszowe opisane
 * — jak w jog"*).
 */
const KeyRow = ({ keys, does, value }) => (
  <div className="flex items-baseline gap-3 border-b border-line py-2 last:border-b-0">
    <span className="flex shrink-0 gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="rounded-ctl border border-line bg-field px-2 py-1 font-num text-note text-ink"
        >
          {key}
        </kbd>
      ))}
    </span>
    <span className="min-w-0 flex-1 text-base text-mut">{does}</span>
    {value ? <span className="shrink-0 font-num text-base text-ink">{value}</span> : null}
  </div>
);

export default KeyRow;
