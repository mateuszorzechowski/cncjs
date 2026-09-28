import { t } from '../i18n';

/**
 * Every change the server has seen to the controller's settings, newest
 * first: when, which, from and to, and on which device — or "outside the
 * panel" for one the server found at the next `$$` (Mateusz, 2026-09-26:
 * *"serwer ma kopie i historię zmian"*).
 */

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

const SettingsHistory = ({ history }) => (
  <div className="flex flex-col gap-1">
    {history.length === 0 ? <p className="m-0 text-note text-mut">{t('machine.history.none')}</p> : null}
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {/* One entry is one write, with every change it made. */}
      {[...history].reverse().slice(0, 50).map((entry) => (
        <li key={entry.id} className="flex flex-wrap gap-x-3 border-b border-line py-1.5 text-note text-mut last:border-b-0">
          <span className="font-num">{when.format(new Date(entry.time))}</span>
          {/* By place: a history kept before writes were grouped can name one setting twice. */}
          {entry.changes.map((change, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className="font-num text-ink">{t('machine.history.change', change)}</span>
          ))}
          <span>{entry.deviceName || t(entry.device ? 'machine.history.unnamed' : 'machine.history.elsewhere')}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default SettingsHistory;
