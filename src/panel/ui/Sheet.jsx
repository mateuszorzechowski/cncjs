import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useShellNode } from './shell';
import { dimPanel } from './themeColor';
import FadeScroller from './FadeScroller';
import { useDragToClose } from './swipe';
import HelpButton from './HelpButton';
import { t } from '../i18n';

/**
 * A panel that slides up over the screen, for a decision taken and finished.
 *
 * On a phone the alternative was folding the settings open in place, and that
 * moves the jog keys — the pad shrinks to make room and springs back when it
 * closes, so the keys are somewhere else each time. They are hit by a thumb
 * while the eyes are on the cutter, which is the whole reason they must not
 * move. Scrolling has the same fault by another route.
 *
 * A sheet moves nothing. It covers, it is answered, it goes, and everything is
 * exactly where it was left.
 *
 * `fixed` positions against the panel's own root when that root is transformed,
 * which is what the review frame does, and against the viewport when it is
 * not. Both are the right answer for where this should sit.
 *
 * Which is why it is rendered into the shell rather than where it is written.
 * `fixed` is only fixed while nothing above it establishes a containing block,
 * and `transform`, `filter` and `mask-image` all do -- the settings screen's
 * fade turned every sheet under it into a box clipped to the scrolling area
 * and scrolling away with it. A portal puts it back above all of that while
 * keeping it inside the element the review frame scales.
 */
/*
 * The open sheets, in the order they opened. A sheet can open another — the
 * file's check over the chosen file on a phone, the state help over the
 * state — and they are not always parent and child in React (the help is
 * the state sheet's sibling in `App`), so the order is kept here.
 *
 * The newest is the active one, and the dimming belongs to it: its scrim
 * lies over everything, the sheets under it included, and theirs go clear so
 * the page is dimmed once (Mateusz, 2026-09-25: *"przyciemnienie należy do
 * aktywnego sheeta, reszta ląduje pod"*). Escape closes it and only it.
 */
const stack = [];
const listeners = new Set();
const told = () => listeners.forEach((listener) => listener());

// Written out, because Tailwind reads the source: two layers per sheet.
const LAYERS = [
  { scrim: 'z-40', panel: 'z-50' },
  { scrim: 'z-[60]', panel: 'z-[70]' },
  { scrim: 'z-[80]', panel: 'z-[90]' },
];

const useLayer = () => {
  const id = useRef(Symbol('sheet'));
  const [, redraw] = useReducer((n) => n + 1, 0);

  useLayoutEffect(() => {
    const me = id.current;
    const listener = () => redraw();
    listeners.add(listener);
    stack.push(me);
    told();
    return () => {
      listeners.delete(listener);
      stack.splice(stack.indexOf(me), 1);
      told();
    };
  }, []);

  const index = Math.max(0, stack.indexOf(id.current));
  return { layer: LAYERS[Math.min(index, LAYERS.length - 1)], active: index === stack.length - 1 };
};

const Sheet = ({ title, onHelp, onClose, children }) => {
  const { layer, active } = useLayer();
  /*
   * Dragged down, it closes — the top sheet only, and told apart from a
   * scroll (`useDragToClose`): Mateusz, 2026-09-26, *"chowanie sheetów
   * gestem w dół, ale trzeba rozróżnić od scrollowania"*.
   */
  const panel = useRef(null);
  useDragToClose(panel, onClose, active);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && active) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, active]);

  /*
   * The scrim reaches the status bar too.
   *
   * Everything below goes grey behind the scrim while the Android bar above
   * it stayed intensely white — the one strip of the screen the panel told
   * the system about and then stopped keeping true. `dimPanel` counts,
   * because the state chip's help opens a second sheet from inside the first.
   */
  useEffect(() => dimPanel(), []);

  const host = useShellNode();

  return createPortal(
    <>
      {/* Dismiss by tapping away from it — the usual gesture, and it means the
        * sheet can be got rid of without aiming at anything. */}
      <button
        type="button"
        aria-label={t('sheet.close')}
        onClick={onClose}
        className={`fixed inset-0 ${layer.scrim} cursor-default ${active ? 'bg-scrim' : 'bg-transparent'}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        /*
         * A sheet on a phone, a dialog at the panel.
         *
         * Coming up from the bottom edge is right where the bottom edge is
         * where the thumb is. At 1280px it reads as a drawer opening on a
         * desk — *"nie wiem czy na deskotpie to jest najlepsze rozwiazanie,
         * byc moze modal/dialog na srodku ekranu"* — and the middle of the
         * screen is where something that wants answering belongs.
         *
         * One component either way. What changes is where it sits and which
         * corners are round, and both of those are the same decision said
         * twice: against an edge it keeps the edge, away from one it is a
         * shape of its own.
         */
        /*
         * `max-h-[85%]` because a sheet had no ceiling at all.
         *
         * Anchored to the bottom edge, content taller than the screen grows
         * *upwards* -- so the state help, once it described eleven states
         * instead of two, stood 968px tall on an 844px phone with its own
         * header and Done button 124px above the top of the display. Nothing
         * to scroll, nothing to press, measured.
         *
         * A percentage rather than a viewport unit: fixed inside a
         * transformed ancestor resolves against that ancestor, which is what
         * the review frame is, and against the viewport when there is none.
         * Both are the right answer.
         */
        className={`fixed inset-x-0 bottom-0 ${layer.panel} flex max-h-[85%] flex-col gap-gap rounded-t-card border-t border-line bg-panel p-pad @3xl/shell:inset-x-auto @3xl/shell:bottom-auto @3xl/shell:left-1/2 @3xl/shell:top-1/2 @3xl/shell:w-dialog @3xl/shell:-translate-x-1/2 @3xl/shell:-translate-y-1/2 @3xl/shell:rounded-card @3xl/shell:border`}
      >
        <div className="flex items-center gap-3">
          <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{title}</span>
          <span className="h-px flex-1 bg-line" />
          {/*
            * A question mark beside Done rather than a labelled button among
            * the contents — *"to jako ? kolo przycisku gotowe"*. Help is not
            * one of the things a sheet is offering to do; it is the same
            * aside a card carries in its header, and it belongs in the same
            * place with the same shape.
            */}
          {onHelp ? (
            <HelpButton
              label={t('stateHelp.open')}
              onPress={onHelp}
              // `--chiph` is what `Done` beside it is, and that is the whole
              // rule: *"rozmiar ma paswac do przycisku, w roznych kontekstach
              // ten rozmiar moze sie ronic, ale ma byc spojny z otoczeniem"*.
              // A 28px square next to a 42px button reads as a mistake.
              className="size-chiph text-base"
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-chiph rounded-ctl border border-line bg-surf px-4 text-base font-semibold uppercase tracking-[0.1em] text-ink"
          >
            {t('sheet.done')}
          </button>
        </div>
        {/*
          * The header stays, the contents move. `min-h-0` is what lets a
          * flex child be shorter than its content and therefore scroll at
          * all; without it the ceiling above would simply clip the bottom
          * off instead. `FadeScroller` carries it, with the fade that says
          * how much of a long sheet is still below.
          */}
        <FadeScroller className="flex flex-col gap-gap">
          {children}
        </FadeScroller>
      </div>
    </>,
    // Before the shell has measured itself there is no node yet. Nothing can
    // open a sheet that early, but a fallback costs one expression and an
    // exception here would take the whole panel down.
    host || document.body,
  );
};

export default Sheet;
