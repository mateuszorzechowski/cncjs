import Button from '../ui/Button';
import Card from '../ui/Card';
import DroStack from '../ui/DroStack';
import StatTile from '../ui/StatTile';
import controller from '../machine/controller';
import { HOMING_FACTS, home, homingState } from '../machine/homing';
import { settingText } from '../machine/machineSettings';
import { NO_READING } from '../machine/readings';
import { settingFigure } from '../machine/units';
import { when } from '../ui/dates';
import { useUnits } from '../ui/units';
import { showSettingsTab } from './SettingsScreen';
import { t } from '../i18n';

// A per-axis key: drawn, and dead until a controller can home one axis.
const Axis = ({ face, name }) => (
  <Button tone="outline" compact disabled aria-label={name} className="h-ctl min-w-0 flex-1">{face}</Button>
);

/**
 * Bazowanie: whether the machine knows where it is, and the way to make it.
 *
 * Built on the night of 2026-09-29, its scope decided there — see
 * `cncjs-notes/night-2026-09-29/decisions.md`. One layout at every width,
 * the zeroing screen's: the readings, what homing runs by, and a row of
 * buttons.
 *
 * **One homing, the whole machine.** The server has one `homing` command and
 * stock Grbl has no `$HX`, so the per-axis keys are drawn and dead, as
 * decided on 2026-09-21 — they wait for a controller that can, rather than
 * being taken away from everyone (`server-backlog.md`).
 *
 * The state is the server's: `$22` says whether homing is on at all, and it
 * remembers the last `$H` that succeeded until the position is lost — Grbl
 * itself cannot say. No confirmation, as the jog pad's Bazuj has none: it is
 * a deliberate press, and the STOP is on every screen.
 */
const HomingScreen = ({ machine, onGo }) => {
  const units = useUnits();
  const { connected, canHome, envelope, homedAt, alarmed, alarm } = machine;
  const state = homingState({ connected, placed: envelope?.placed, homedAt, lock: alarmed && alarm === null });
  const stateText = state.key === 'homing.state.homed' ? t('homing.state.homed', { when: when(homedAt) }) : t(state.key);

  const rows = machine.machineSettings?.rows ?? [];
  const facts = HOMING_FACTS.map((name) => rows.find((row) => row.name === name)).filter(Boolean);

  const settings = () => {
    showSettingsTab('controller');
    onGo('settings');
  };

  return (
    <Card label={t('homing.title')} scrolls className="min-h-0 flex-1" bodyClassName="gap-4">
      <DroStack position={machine.position} machinePosition={machine.machinePosition} />

      <div className="grid shrink-0 grid-cols-2 gap-2 @3xl/shell:grid-cols-4">
        <StatTile label={t('homing.state.label')} value={stateText} tone={state.tone} />
        {facts.map((row) => {
          const shown = settingFigure(row.value, row.unit, units.rule, { brief: true });
          return <StatTile key={row.name} label={settingText(row).title} value={shown.value} unit={shown.unit} />;
        })}
        {connected && !facts.length ? <StatTile label={t('homing.facts')} value={NO_READING} /> : null}
      </div>

      {/* The action on a row of its own: beside the three dead keys it wrapped
        * into three lines on a phone. */}
      <Button tone="primary" disabled={!canHome} onClick={() => home(controller)} className="h-ctl w-full shrink-0">
        {t('homing.all')}
      </Button>
      <div className="flex shrink-0 gap-2">
        <Axis face={t('axis.x')} name={t('homing.axisX')} />
        <Axis face={t('axis.y')} name={t('homing.axisY')} />
        <Axis face={t('axis.z')} name={t('homing.axisZ')} />
      </div>
      <p className="m-0 shrink-0 text-note text-mut">{t('homing.axes')}</p>

      <Button tone="outline" onClick={settings} className="h-ctl shrink-0 self-start">{t('homing.settings')}</Button>
    </Card>
  );
};

export default HomingScreen;
