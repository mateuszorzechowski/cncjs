/**
 * Where a wizard is: every step in a row, the ones behind ticked, the one
 * it is on in the accent. The names on a wide screen; on a phone the
 * current one's on a line of its own under the marks — beside them, in
 * 390px, it came out as `Płyt…`.
 *
 * The marks are `StepRow`'s — a number in a round chip, green once done —
 * so a sequence reads the same on the Install tab and here.
 */
const StepTrack = ({ steps, current, label }) => {
  const at = steps.findIndex((step) => step.id === current);
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <ol aria-label={label} className="m-0 flex list-none items-center gap-2 p-0">
        {steps.map((step, index) => {
          const done = index < at;
          const now = index === at;
          let mark = 'bg-mutS text-mut';
          if (done) {
            mark = 'bg-grnS text-grn';
          } else if (now) {
            mark = 'bg-acc text-white';
          }
          return (
            <li key={step.id} aria-current={now ? 'step' : undefined} className="flex min-w-0 items-center gap-2">
              <span className={`flex size-chiph shrink-0 items-center justify-center rounded-full font-num text-base font-semibold ${mark}`}>
                {done ? '✓' : index + 1}
              </span>
              <span className={`hidden truncate text-note @3xl/shell:inline ${now ? 'font-semibold text-ink' : 'text-mut'}`}>{step.name}</span>
              {index < steps.length - 1 ? <span aria-hidden="true" className="hidden h-px w-4 shrink-0 bg-line @3xl/shell:block" /> : null}
            </li>
          );
        })}
      </ol>
      <p aria-hidden="true" className="m-0 text-base font-semibold text-ink @3xl/shell:hidden">{steps[at]?.name}</p>
    </div>
  );
};

export default StepTrack;
