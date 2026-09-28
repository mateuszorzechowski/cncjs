/**
 * How long it stays, in milliseconds.
 *
 * Long enough to be read by somebody who was looking at the machine rather
 * than the screen when they pressed, short enough that it is gone before the
 * next attempt. Nothing is lost when it goes: the reason it names is a state
 * the panel is already showing — the alarm chip, the dark buttons — and this
 * is only the answer to "why did nothing happen when I pressed it".
 *
 * In a module of its own so the lapse bar's test can read it
 * (`animate-lapse` in the Tailwind config is the same six seconds).
 */
export const SHOWN_FOR = 6000;

export default SHOWN_FOR;
