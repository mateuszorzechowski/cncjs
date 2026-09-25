import SegmentedChoice from './SegmentedChoice';
import { saveUnits } from '../machine/units';
import { t } from '../i18n';

// Written out, so every key is a literal the resources test can find.
const NAMES = {
  mm: 'units.choice.mm',
  inch: 'units.choice.inch',
};

const SWITCH = {
  off: 'units.restore.off',
  on: 'units.restore.on',
};

// Off first, then on: the index is the switch.
const RESTORE = Object.keys(SWITCH);

/**
 * The server's units — the control alone; its name and note are the
 * settings row's.
 *
 * Shows what the server said, never what was pressed: the answer comes back
 * over the socket to every panel, this one with them (`machine/units`). Until
 * the server has said, there is no choice drawn that might not be the one in
 * force.
 */
export const UnitsChoice = ({ units }) => (
  <SegmentedChoice
    joined
    fitWide
    label={t('units.choice.label')}
    options={Object.keys(NAMES)}
    value={units?.name ?? null}
    disabled={!units}
    onChange={(name) => saveUnits({ name }).catch(() => {})}
    format={(id) => t(NAMES[id])}
  />
);

/** Whether the machine is put back into them after a program. */
export const RestoreUnitsChoice = ({ units }) => (
  <SegmentedChoice
    joined
    fitWide
    label={t('units.restore.label')}
    options={RESTORE}
    value={units ? RESTORE[Number(units.restore)] : null}
    disabled={!units}
    onChange={(id) => saveUnits({ restore: RESTORE.indexOf(id) === 1 }).catch(() => {})}
    format={(id) => t(SWITCH[id])}
  />
);
