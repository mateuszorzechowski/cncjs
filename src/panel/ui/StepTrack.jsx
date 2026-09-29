/**
 * Where a wizard is: every step in a row, centred, a mark over its name,
 * nothing between them — rules first, then arrows, and then neither
 * (review notes, 2026-09-29).
 *
 * Three states, three fills: the steps behind in a quiet accent with a tick,
 * the one it is on in the full accent and larger, the ones ahead grey and
 * a little smaller (review notes 5 and 7). The names under the marks on a
 * wide screen; on a phone the current one's on a line of its own — six names
 * in 390px are six truncations.
 */
const MARKS = {
  done: 'bg-accS text-acc',
  now: 'scale-125 bg-acc text-white',
  ahead: 'scale-90 bg-mutS text-mut',
};

const StepTrack = ({ steps, current, label }) => {
  const at = steps.findIndex((step) => step.id === current);
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <ol aria-label={label} className="m-0 flex list-none items-start justify-center gap-2 p-0 @3xl/shell:gap-6">
        {steps.map((step, index) => {
          let state = 'ahead';
          if (index < at) {
            state = 'done';
          } else if (index === at) {
            state = 'now';
          }
          return (
            <li key={step.id} aria-current={state === 'now' ? 'step' : undefined} className="flex min-w-0 flex-col items-center gap-1">
              {/* Smaller on a phone: seven of them — the corner's — did not fit in 390px (review note, 2026-09-29). */}
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full font-num text-note font-semibold @3xl/shell:size-chiph @3xl/shell:text-base ${MARKS[state]}`}>
                {state === 'done' ? '✓' : index + 1}
              </span>
              <span className={`hidden text-note @3xl/shell:inline ${state === 'now' ? 'font-semibold text-ink' : 'text-mut'}`}>{step.name}</span>
            </li>
          );
        })}
      </ol>
      <p aria-hidden="true" className="m-0 text-base font-semibold text-ink @3xl/shell:hidden">{steps[at]?.name}</p>
    </div>
  );
};

export default StepTrack;
