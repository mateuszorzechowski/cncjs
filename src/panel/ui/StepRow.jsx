import { t } from '../i18n';

/**
 * One step of a sequence: its number, its name, what it is for, and what to
 * do — the Install tab's two (settings design, variant 2b). A settings row
 * with a number in place of a scope, because the order is the point: step 2
 * says it waits on step 1, and a done step says so in green rather than
 * disappearing, so a device can be checked afterwards.
 *
 * `state`: `todo`, `done`, or `blocked` (dimmed, its controls dark).
 */
const StepRow = ({ number, title, note, state = 'todo', children }) => {
  const done = state === 'done';
  const blocked = state === 'blocked';
  return (
    <section className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line py-5 first:pt-0 last:border-b-0">
      <span
        className={`flex size-chiph items-center justify-center rounded-full font-num text-base font-semibold ${
          done ? 'bg-grnS text-grn' : (blocked ? 'bg-mutS text-mut' : 'bg-accS text-acc')
        }`}
      >
        {done ? '✓' : number}
      </span>
      <div className={`flex min-w-0 flex-col gap-1 ${blocked ? 'opacity-60' : ''}`}>
        <h3 className="m-0 text-base font-semibold text-ink">
          {title}
          {done ? <span className="ml-2 text-note font-normal text-grn">{t('app.stepDone')}</span> : null}
        </h3>
        {note ? <p className="m-0 text-note text-mut">{note}</p> : null}
      </div>
      <div className="col-span-2 flex min-w-0 flex-col gap-3 @3xl/shell:col-start-2 @3xl/shell:col-span-1">
        {children}
      </div>
    </section>
  );
};

export default StepRow;
