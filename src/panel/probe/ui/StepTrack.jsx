/**
 * Where a wizard is: every step in one row of joined rectangles, as the
 * panel's segmented choices are, the number and name inside each (review
 * note, 2026-09-30: *"nie kółka a prostokąty jak to mamy w systemie"* — the
 * marks over their names took a card of their own).
 *
 * Three states, three fills: the steps behind in a quiet accent with a tick,
 * the one it is on in the full accent, the ones ahead plain. On a phone only
 * the current one says its name; the rest are their numbers — seven names in
 * 390px are seven truncations.
 */
const FACES = {
  done: 'z-0 border-line bg-accS text-acc',
  now: 'z-10 border-acc bg-acc text-white',
  ahead: 'z-0 border-line bg-surf text-mut',
};

const StepTrack = ({ steps, current, label, className = '' }) => {
  const at = steps.findIndex((step) => step.id === current);
  return (
    <ol aria-label={label} className={`m-0 flex h-8 min-w-0 list-none p-0 ${className}`}>
      {steps.map((step, index) => {
        let state = 'ahead';
        if (index < at) {
          state = 'done';
        } else if (index === at) {
          state = 'now';
        }
        return (
          <li
            key={step.id}
            aria-current={state === 'now' ? 'step' : undefined}
            className={`relative -ml-px flex min-w-0 items-center justify-center gap-1.5 border px-2 text-note first:ml-0 first:rounded-l-ctl last:rounded-r-ctl ${state === 'now' ? 'flex-auto font-semibold' : 'flex-1'} ${FACES[state]}`}
          >
            <span className="shrink-0 font-num">{state === 'done' ? '✓' : index + 1}</span>
            <span className={`truncate ${state === 'now' ? '' : 'hidden @3xl/shell:inline'}`}>{step.name}</span>
          </li>
        );
      })}
    </ol>
  );
};

export default StepTrack;
