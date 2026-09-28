import Button from './Button';
import { t } from '../i18n';

/**
 * Every write the server has seen to the controller's settings, newest
 * first (settings handoff, 2026-09-28, frame E4): when, from where, which
 * settings — and "restore the state before" it.
 *
 * One entry is one write, as the server groups them: a write from a panel
 * with every change it made, or a change found at a `$$` that nobody here
 * asked for, "outside the panel". Restoring does not write: it puts the
 * values from before back as changes waiting to be saved, and they go the
 * usual way, through the review.
 */

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

/** Who made it: the device by its name, else from the panel or from outside it. */
const who = (entry) => entry.deviceName ||
  t(entry.source === 'external' ? 'machine.history.external' : 'machine.history.fromPanel');

/** The settings a write changed, each once, in its order. */
const names = (entry) => [...new Set(entry.changes.map(({ name }) => name))];

const today = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const earlier = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' });

/** When, as short as it can be said: the time today, the date before. */
const shortWhen = (time) => {
  const at = new Date(time);
  return at.toDateString() === new Date().toDateString() ? today.format(at) : earlier.format(at);
};

/** The history's line in the list: the state of the last write rather than a count. */
export const historyLine = (history) => {
  const last = history[history.length - 1];
  if (!last) {
    return t('machine.history.empty');
  }
  return t(last.source === 'external' ? 'machine.history.lastExternal' : 'machine.history.last', { time: shortWhen(last.time) });
};

const SettingsHistory = ({ history, disabled, onRestore }) => (
  <div className="flex flex-col gap-gap">
    {history.length === 0 ? <p className="m-0 text-note text-mut">{t('machine.history.none')}</p> : null}
    <ul className="m-0 flex list-none flex-col p-0">
      {[...history].reverse().slice(0, 50).map((entry) => (
        <li key={entry.id} className="flex flex-col gap-2 border-b border-line py-3 first:pt-0 last:border-b-0">
          <span className="text-base font-semibold text-ink">
            {t('machine.history.entry', { when: when.format(new Date(entry.time)), who: who(entry) })}
          </span>
          <span className="font-num text-note text-mut">
            {t('machine.history.changes', { names: names(entry).join(', '), count: names(entry).length })}
          </span>
          <Button className="h-ctl" disabled={disabled} onClick={() => onRestore(entry)}>{t('machine.history.restore')}</Button>
        </li>
      ))}
    </ul>
    {history.length > 0 ? <p className="m-0 text-note text-mut">{t('machine.history.restoreNote')}</p> : null}
  </div>
);

export default SettingsHistory;
