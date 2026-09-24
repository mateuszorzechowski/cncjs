import { useEffect, useState } from 'react';
import Notice from './Notice';
import { refusalMessage } from '../machine/refusal';
import { t } from '../i18n';

/**
 * The press that got through and was turned down.
 *
 * **Second to greying out, and only for the race.** Every control that writes
 * is dark before it is pressed, which covers the ordinary case completely —
 * what it cannot cover is a button that was live when the thumb came down and
 * was not by the time the command landed. That press used to vanish: the
 * server logged a line nobody at the machine is reading and the panel showed
 * nothing at all.
 *
 * One place for all of them rather than a message on each screen. A refusal
 * can follow a press on any of them, the sentence is the same wherever it came
 * from, and three copies of it would be three things to keep in step.
 *
 * **It floats, and it cannot be pressed.** Inserted in the column it would
 * push the screen down for as long as it showed — a jog pad that moves under a
 * thumb mid-press is a worse fault than the one being reported. Over the top
 * and with no pointer events it costs the operator nothing: whatever is under
 * it stays exactly where it was and stays pressable.
 */

/**
 * How long it stays, in milliseconds.
 *
 * Long enough to be read by somebody who was looking at the machine rather
 * than the screen when they pressed, short enough that it is gone before the
 * next attempt. Nothing is lost when it goes: the reason it names is a state
 * the panel is already showing — the alarm chip, the dark buttons — and this
 * is only the answer to "why did nothing happen when I pressed it".
 */
export const SHOWN_FOR = 6000;

const RefusalNotice = ({ refusal }) => {
  /*
   * Which refusal has had its turn, by number.
   *
   * Two identical refusals are two presses, and holding the message rather
   * than the count would make the second one indistinguishable from the first
   * — the notice would stay up from the first press and never reappear. See
   * `seq` in `useMachine`.
   */
  const [done, setDone] = useState(0);
  const seq = refusal?.seq ?? 0;

  useEffect(() => {
    if (!seq) {
      return undefined;
    }
    const timer = setTimeout(() => setDone(seq), SHOWN_FOR);
    return () => clearTimeout(timer);
  }, [seq]);

  const message = refusalMessage(refusal);
  if (!message || done >= seq) {
    return null;
  }

  return (
    // Polite rather than assertive: this is the explanation of something that
    // has already failed to happen, not a warning about something about to.
    <div
      role="status"
      className="pointer-events-none absolute inset-x-shellPad top-shellPad z-20"
    >
      <Notice>{t(message.key, message.values)}</Notice>
    </div>
  );
};

export default RefusalNotice;
