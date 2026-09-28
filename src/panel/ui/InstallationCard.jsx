import Card from './Card';
import JogTiming from './JogTiming';
import StatTile from './StatTile';
import { NO_READING } from '../machine/readings';
import { inMm } from '../machine/units';
import { THIS_BUILD, buildName } from '../machine/update';
import { useUnits } from './units';
import { t } from '../i18n';

/**
 * This installation: which controller, on which port, which panel — and what
 * a jog costs here, part by part.
 *
 * `JogTiming` is the jog sheet's block unchanged: it was always diagnostics
 * (the kickoff said so, 2026-09-22), shown where somebody would only find it
 * by opening the jog keys' help. Here at the jog rates the server offers.
 */
const InstallationCard = ({ machine }) => {
  const units = useUnits();
  const firmware = machine.machineSettings?.firmware;
  const controllerText = firmware?.name ? [firmware.name, firmware.version].filter(Boolean).join(' ') : machine.type;
  const portText = machine.port ? [machine.port, machine.baudrate].filter(Boolean).join(' · ') : null;
  const jogRates = units.rule?.jog;

  return (
    <Card label={t('diag.installation')} bodyClassName="gap-3">
      <div className="flex flex-col gap-2">
        <StatTile compact label={t('diag.controller')} value={controllerText || NO_READING} />
        <StatTile compact label={t('diag.port')} value={portText || NO_READING} />
        <StatTile compact label={t('diag.panel')} value={buildName(THIS_BUILD) || NO_READING} />
      </div>
      <JogTiming
        timing={machine.timing}
        linkMs={machine.linkMs}
        beatMs={machine.beatMs}
        settings={machine.settings}
        xySpeed={inMm(jogRates?.xy.rate, units.rule)}
        zSpeed={inMm(jogRates?.z.rate, units.rule)}
      />
    </Card>
  );
};

export default InstallationCard;
