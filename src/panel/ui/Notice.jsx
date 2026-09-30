import { t } from '../i18n';

/**
 * A triangle, for the one thing on a screen that wants reading before it is
 * acted on.
 *
 * Its own component because it is now in three places — the status sheet, and
 * the two notices below — and a warning drawn slightly differently in each is
 * a warning that stops reading as one thing.
 */
export const Triangle = ({ className = 'size-4' }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`${className} shrink-0`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4.5 1.8 20h20.4z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.4v.2" />
  </svg>
);

/**
 * Something the operator should read before doing the thing next to it.
 *
 * Amber and marked, because the panel spends red on a machine that will not
 * move and has nothing left for "this is a decision". The triangle is what
 * makes it a warning rather than a paragraph — the same mark the status sheet
 * uses when there is something to act on.
 *
 * `role="note"` rather than `alert`: nothing here interrupts, and an assertive
 * live region that announced itself every time a settings tab was opened
 * would be the panel shouting at somebody who came to read.
 */
/*
 * `action`, a button at the end of the line — the undo of a discard. Then
 * the triangle, the words and the button stand on one line, centred on it:
 * with the triangle at the top of a first line of text, a button taller than
 * the text left it hanging above the rest (review note, 2026-09-28:
 * *"wyrównać wertykalnie treść"*). Without one, the triangle stays with the
 * first line of a paragraph.
 */
/*
 * `lapsing`: the notice goes by itself, and a thin bar along its foot runs
 * out as it does (`animate-lapse`, the same six seconds as `SHOWN_FOR`).
 */
// A zero-width space: a line's height and nothing to see.
const LINE = '​';

const Notice = ({ children, action, lapsing = false, className = '' }) => (
  <div
    role="note"
    aria-label={t('notice.warning')}
    className={`relative flex shrink-0 gap-3 overflow-hidden rounded-ctl border border-amb bg-ambS px-4 py-3 ${action ? 'items-center' : 'items-start'} ${className}`}
  >
    {lapsing ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 origin-left animate-lapse bg-amb opacity-60" /> : null}
    {/*
      * As tall as a line of the words, the triangle centred in it: with a
      * nudge down instead, one line of words sat a pixel over the middle
      * and the triangle one under (review note, 2026-09-30: *"ikona i tekst
      * nie wyśrodkowane wertykalnie"*). The empty mark gives it the line.
      */}
    <span className="flex items-center text-base text-amb">
      {LINE}
      <Triangle className="size-5" />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-2 text-base text-ambT">{children}</div>
    {action}
  </div>
);

export default Notice;
