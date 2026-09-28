import Button from './Button';
import Card from './Card';
import Icon from './Icon';
import Notice from './Notice';
import SettingSummary from './SettingSummary';
import { historyLine } from './SettingsHistory';
import { useIsPhone, useIsWide } from './shell';
import { GROUPS, groupLine } from '../machine/machineSettings';
import { figure, lengthLabel } from '../machine/units';
import { t } from '../i18n';

/**
 * The card PAMIĘĆ STEROWNIKA (settings handoff, 2026-09-28): what it is
 * reading — the firmware under the caption — and ↻ to read it again; each
 * group as a line with its values, from the server; under a rule, the two
 * things that are not groups, the history of writes and Grbl's own `$$`.
 *
 * What a line's tap does depends on the device, and so does its mark: a
 * sheet on a phone (⌄), the group in the list's place on a tablet (›), and
 * on a PC the group chosen beside the list — lit, and no mark at all.
 * Geometria is a line only on a phone; wider it is a column of its own.
 *
 * On a phone the whole card scrolls with its head, as the other tabs do;
 * wider the head stands and the rest of the card scrolls under it, going
 * under the bar of changes below (`Card scrolls`).
 *
 * `aboveBar`: on a phone the shell gives its last card room for the menu's
 * mound, and this card is last inside its scroller — but with the bar of
 * changes under it, the bar is what stands on the mound and takes that room.
 * The card then ends like any card (Mateusz, 2026-09-28: *"wolny obszar
 * dotyczy tylko karty"*). `!`, because the shell's rule is a descendant
 * selector and would otherwise win on specificity.
 */

const title = (id) => t(GROUPS.find((g) => g.id === id).titleKey);

const ControllerMemory = ({
  view, groups, chosen, changedGroups = [], rule, canWrite, aboveBar = false, onRead, onGroup, onGeometry, onHistory, onRaw,
}) => {
  const phone = useIsPhone();
  const wide = useIsWide();
  const { firmware, geometry } = view;
  const travel = geometry?.summary.find(({ id }) => id === 'travel')?.value;
  // A group's line by the server's rule — its switches, then one limit — or, with neither, how many settings it has.
  const lineOf = (id) => {
    const line = groupLine((view.groups ?? []).find(({ group }) => group === id), rule);
    return line.length ? line : [{ value: t('machine.raw.count', { count: view.rows.filter((row) => row.group === id).length }) }];
  };
  // The groups, the history and `$$` all open in the same place.
  const opens = (phone && 'sheet') || (wide ? null : 'view');

  const list = (
    <div className="flex flex-col gap-2">
      {!canWrite ? <Notice>{t('machine.readOnly')}</Notice> : null}
      {groups.map(({ id }) => (
        <SettingSummary
          key={id}
          title={title(id)}
          values={lineOf(id)}
          opens={opens}
          selected={wide && id === chosen}
          changed={changedGroups.includes(id)}
          onOpen={() => onGroup(id)}
        />
      ))}
      {geometry && phone ? (
        <SettingSummary
          title={title('geo')}
          values={travel ? [{ value: ['x', 'y', 'z'].map((axis) => figure(travel[axis], rule, 'extent')).join(' × '), unit: lengthLabel(rule) }] : []}
          onOpen={onGeometry}
        />
      ) : null}
      <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
        <SettingSummary
          title={t('machine.history.title')}
          values={[{ value: historyLine(view.history ?? []) }]}
          opens={opens}
          selected={wide && chosen === 'history'}
          onOpen={onHistory}
        />
        <SettingSummary
          title={t('machine.raw.title')}
          values={[{ value: t('machine.raw.count', { count: view.rows.length }) }]}
          opens={opens}
          selected={wide && chosen === 'raw'}
          onOpen={onRaw}
        />
      </div>
    </div>
  );

  return (
    <Card
      label={t('machine.card.title')}
      sublabel={firmware?.version ? `${firmware.name} ${firmware.version}` : firmware?.name}
      aside={(
        <Button compact className="size-chiph" aria-label={t('machine.card.read')} title={t('machine.card.read')} disabled={!canWrite} onClick={onRead}>
          <Icon name="refresh" className="size-5" weight={2} />
        </Button>
      )}
      scrolls={!phone}
      gapBelow={aboveBar}
      className={(phone && (aboveBar ? 'flex-1 !pb-pad' : 'flex-1')) || 'min-h-0 flex-1'}
    >
      {list}
    </Card>
  );
};

export default ControllerMemory;
