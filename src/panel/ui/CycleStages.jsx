import { STAGES } from '../machine/probeCycle';
import { t } from '../i18n';

// The Z plate's: finding the plate, the measurement, the zero.
const plateNames = () => STAGES.map(({ key }) => t(key));

/**
 * A cycle's three stages in a row over its drawing, with the one playing
 * underlined in the accent (the design's 1g, 1l and the L plate's 1f).
 * `names` are the stages' names — the Z plate's by default, the corner's
 * its three axes.
 */
const CycleStages = ({ stage, names = plateNames() }) => (
  <div className="grid shrink-0 grid-cols-3 border-b border-line">
    {names.map((name, index) => {
      const n = index + 1;
      const on = n === stage;
      return (
        <div
          key={name}
          className={`flex h-chiph items-center justify-center truncate px-1 text-note ${on ? 'border-b-4 border-acc bg-accS font-semibold text-acc' : 'text-mut'}`}
        >
          {t('probe.stage.label', { n, name })}
        </div>
      );
    })}
  </div>
);

export default CycleStages;
