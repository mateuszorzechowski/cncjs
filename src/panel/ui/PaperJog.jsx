import Button from './Button';
import { jog } from '../machine/jog';
import { surfaceOf } from '../machine/paperCycle';
import { useUnits } from './units';
import { t } from '../i18n';

/*
 * The steps felt with the paper, in millimetres (review note, 2026-09-30:
 * *"przyciski kierunku 0.1 0.01 w osi którą sprawdzamy"*): the tenth to find
 * the drag, the hundredth to settle on it.
 */
const STEPS = [0.1, 0.01];
const STEP_WORDS = { 0.1: 'probe.paper.mm01', 0.01: 'probe.paper.mm001' };

// The minus sign as the panel writes an axis's way, X− not X-.
const way = (axis, sign) => `${axis.toUpperCase()}${sign > 0 ? '+' : '−'}`;

/**
 * The paper's measuring: the one axis the surface is felt on, a step at a
 * time either way, where that axis stands now, and "here" — the
 * drag found. A step goes as the jog pad's do (`machine/jog`), in the units
 * shown; "here" is the method's start.
 */
const PaperJog = ({
  machine, edge, onHere, className = '',
}) => {
  const units = useUnits();
  const { axis } = surfaceOf(edge);
  const rate = axis === 'z' ? units.rule?.jog?.z.rate : units.rule?.jog?.xy.rate;
  const step = (by, mm) => jog({
    type: machine.type,
    dir: { [axis]: by },
    distance: mm * (units.rule?.factor ?? 1),
    feedrate: rate,
    units: units.rule,
    envelope: machine.envelope,
    position: machine.machinePosition,
  });
  const at = machine.position?.[axis];
  const off = !machine.connected || !machine.canProbe;
  const key = (by, mm) => (
    <Button key={`${by}${mm}`} tone="outline" compact disabled={off} onClick={() => step(by, mm)} className="flex h-jbtnh flex-col items-center justify-center gap-0.5">
      <span className="font-num text-lead font-semibold">{way(axis, by)}</span>
      <span className="whitespace-nowrap text-note text-mut">{t(STEP_WORDS[mm])}</span>
    </Button>
  );
  const reading = <span className="font-num text-lead font-semibold text-ink">{units.figure(at)}</span>;
  /*
   * Laid along the axis, as the jog pad's keys are (review note, 2026-10-01:
   * *"w kolumnie/wierszu zgodnie z kierunkiem"*): Z and Y a column, plus at
   * the top; X a row, plus at the right — the step growing away from the
   * middle, where the axis's reading stands.
   */
  const across = axis === 'x';
  const keys = [key(1, STEPS[0]), key(1, STEPS[1]), key(-1, STEPS[1]), key(-1, STEPS[0])];
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">{t('probe.paper.jogTitle', { axis: axis.toUpperCase() })}</span>
        {across ? reading : null}
      </div>
      {across ? (
        <div className="grid grid-cols-4 gap-2">{[...keys].reverse()}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {keys.slice(0, 2)}
          <div className="flex justify-center py-1">{reading}</div>
          {keys.slice(2)}
        </div>
      )}
      <Button tone="go" disabled={off} onClick={onHere} className="mt-auto h-ctl">{t('probe.position.here')}</Button>
    </div>
  );
};

export default PaperJog;
