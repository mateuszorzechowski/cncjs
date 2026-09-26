import { useState } from 'react';
import Card from './Card';
import MachineSettingSheet from './MachineSettingSheet';
import Notice from './Notice';
import SegmentedChoice from './SegmentedChoice';
import SettingGroup from './SettingGroup';
import SettingRow from './SettingRow';
import SettingSummary from './SettingSummary';
import { useUnits } from './units';
import { axisQuantityOf, settingGroups, settingText, shownSetting } from '../machine/machineSettings';
import { t } from '../i18n';

/**
 * The Maszyna tab: Grbl's own settings, grouped by what they are about and
 * each one described, or all of them as `$x` and nothing else.
 *
 * Mateusz, 2026-09-26: settings divided and described by topic, a switch to
 * a raw view with the `$x` values as they are, `$10` among them, and every
 * write confirmed. The figures follow the server's mm/inch switch like
 * every other figure; the raw view is Grbl's own, in millimetres.
 *
 * Nothing here is worked out: the server lists the rows, converts what an
 * operator types, writes it and reads `$$` back, and keeps the copy and the
 * history shown at the bottom.
 */

const VIEWS = { described: 'machine.view.described', raw: 'machine.view.raw' };

const AXIS_KEYS = { x: 'axis.x', y: 'axis.y', z: 'axis.z' };

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

const History = ({ history }) => (
  <SettingGroup title={t('machine.history.title')}>
    {history.length === 0 ? <p className="m-0 pt-3 text-note text-mut">{t('machine.history.none')}</p> : null}
    <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-3">
      {[...history].reverse().slice(0, 20).map((entry) => (
        <li key={`${entry.time}${entry.name}`} className="flex flex-wrap gap-x-3 text-note text-mut">
          <span className="font-num">{when.format(new Date(entry.time))}</span>
          <span className="font-num text-ink">{t('machine.history.change', entry)}</span>
          <span>{entry.deviceName || t(entry.device ? 'machine.history.unnamed' : 'machine.history.elsewhere')}</span>
        </li>
      ))}
    </ul>
  </SettingGroup>
);

const MachineSettings = ({ machine }) => {
  const units = useUnits();
  const [view, setView] = useState('described');
  const [editing, setEditing] = useState(null);
  const rows = machine.machineSettings?.rows ?? [];
  const history = machine.machineSettings?.history ?? [];
  const raw = view === 'raw';
  const open = (row) => setEditing(row.name);
  const editedRow = rows.find((row) => row.name === editing);

  const summary = (row, title) => (
    <SettingSummary
      key={row.name}
      title={title}
      label={row.name}
      values={[raw ? { value: row.raw ?? String(row.value) } : shownSetting(row, units.rule)]}
      disabled={!machine.canWriteSettings}
      locked={Boolean(row.locked)}
      onOpen={() => open(row)}
    />
  );

  return (
    <Card className="flex-1">
      <SettingRow title={t('machine.view.label')} note={t('machine.view.note')} scope="controller">
        <SegmentedChoice
          label={t('machine.view.label')}
          options={Object.keys(VIEWS)}
          value={view}
          onChange={setView}
          format={(id) => t(VIEWS[id])}
        />
      </SettingRow>
      {/* Connected with no rows yet is a server still reading `$$`, or one older than this panel. */}
      {rows.length === 0 ? (
        <p className="m-0 py-4 text-note text-mut">{t(machine.connected ? 'machine.waiting' : 'machine.empty')}</p>
      ) : null}
      {rows.length > 0 && !machine.canWriteSettings ? <Notice className="my-4">{t('machine.readOnly')}</Notice> : null}
      {rows.length > 0 && raw ? (
        <div className="grid grid-cols-1 gap-2 py-4 @xl/shell:grid-cols-2 @5xl/shell:grid-cols-3">
          {rows.map((row) => summary(row, row.name))}
        </div>
      ) : null}
      {rows.length > 0 && !raw ? settingGroups(rows).map((group) => (
        <SettingGroup key={group.group} title={group.title}>
          {group.quantities.map((quantity) => (
            <SettingRow key={quantity.id} title={t(quantity.titleKey)} note={t(quantity.noteKey)}>
              <div className="grid grid-cols-1 gap-2 @xl/shell:grid-cols-3">
                {quantity.rows.map((row) => summary(row, t('machine.axisCode', { axis: t(AXIS_KEYS[row.axis]), name: row.name })))}
              </div>
            </SettingRow>
          ))}
          {group.rows.map((row) => {
            const text = settingText(row);
            return (
              <SettingRow key={row.name} title={text.title} note={text.note}>
                {summary(row, row.name)}
              </SettingRow>
            );
          })}
        </SettingGroup>
      )) : null}
      {rows.length > 0 ? <History history={history} /> : null}
      {editedRow ? (
        <MachineSettingSheet
          row={editedRow}
          text={settingText(editedRow, axisQuantityOf(editedRow.name))}
          rule={units.rule}
          raw={raw}
          refusal={machine.refusal}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Card>
  );
};

export default MachineSettings;
