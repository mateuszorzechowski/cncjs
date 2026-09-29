import { STAGES } from '../machine/probeCycle';
import { t } from '../i18n';

/**
 * The cycle's three stages in a row over the drawing — finding the plate,
 * the measurement, the zero — with the one playing underlined in the accent
 * (the design's 1g and 1l).
 */
const CycleStages = ({ stage }) => (
  <div className="grid shrink-0 grid-cols-3 border-b border-line">
    {STAGES.map(({ n, key }) => {
      const on = n === stage;
      return (
        <div
          key={n}
          className={`flex h-chiph items-center justify-center truncate px-1 text-note ${on ? 'border-b-4 border-acc bg-accS font-semibold text-acc' : 'text-mut'}`}
        >
          {t('probe.stage.label', { n, name: t(key) })}
        </div>
      );
    })}
  </div>
);

export default CycleStages;
