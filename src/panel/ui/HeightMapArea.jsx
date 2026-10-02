import { useState } from 'react';
import Button from './Button';
import Card from './Card';
import FadeScroller from './FadeScroller';
import MapPreview3D from './MapPreview3D';
import Notice from './Notice';
import Sheet from './Sheet';
import TextField from './TextField';
import { Foot } from './ProbeSteps';
import JogWidget from '../widgets/JogWidget';
import { useIsPhone } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';

// A figure and nothing else, a comma taken as a point; a corner may be below zero.
const figureOnly = (text) => text.replace(/[^0-9.,-]/g, '');
const countOnly = (text) => text.replace(/[^0-9]/g, '');
const BAD = 'bad';

const NAMES = {
  x: 'probe.map.x', y: 'probe.map.y', cx: 'probe.map.x', cy: 'probe.map.y', ax: 'probe.map.x', ay: 'probe.map.y', bx: 'probe.map.x', by: 'probe.map.y', w: 'probe.map.w', d: 'probe.map.d', nx: 'probe.map.nx', ny: 'probe.map.ny',
};
// What the server says of a grid it would not measure, as the operator reads it.
const REASONS = { 'bad-area': 'probe.map.badArea', 'bad-grid': 'probe.map.badGrid', 'no-server': 'probe.map.noServer' };

/**
 * Where the height map measures (Mateusz, 2026-10-02): the area — a corner
 * and a size, the corner at the work zero to start with; two corners on the
 * diagonal, the tool jogged to each and taken; or the program's extent — and
 * the points along each side. The step between them is the server's answer,
 * shown under the drawing. Beside it the area measured, drawn (review note
 * #2, 2026-10-02); the jog, for a point to be taken where the tool stands,
 * in a sheet.
 */
const HeightMapArea = ({
  machine, map, onBack, onNext,
}) => {
  const phone = useIsPhone();
  const units = useUnits();
  const [jogging, setJogging] = useState(false);
  const { grid = {}, texts, mode } = map;
  const reason = grid?.reason || null;
  const length = units.length;

  // One figure: its name over it, small, the field under it.
  const field = (name, mask = figureOnly) => (
    <div key={name} className="flex min-w-0 flex-col gap-1">
      <span className="text-note text-mut">{t(NAMES[name])}</span>
      <TextField
        label={t(NAMES[name])}
        inputMode="decimal"
        unit={name === 'nx' || name === 'ny' ? null : length}
        value={texts[name] ?? ''}
        state={reason && (name.startsWith('n') ? reason === 'bad-grid' : reason === 'bad-area') ? BAD : undefined}
        onChange={(event) => map.onText(name, mask(event.target.value))}
      />
    </div>
  );
  // A section: its name, then its two figures side by side, X beside Y (Mateusz, 2026-10-02).
  const section = (key, children, wide = false) => (
    <div key={key} className="flex min-w-0 flex-col gap-2">
      <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{t(key)}</span>
      <div className={`grid items-end gap-3 ${wide ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-2'}`}>{children}</div>
    </div>
  );
  /*
   * A point: typed, or taken where the tool stands — jogged there (review
   * note, 2026-10-02: *"jog może być pomocą w obu metodach"*).
   */
  const point = (key, xName, yName) => section(key, [
    field(xName),
    field(yName),
    <Button key="here" className="h-chiph px-4" disabled={!machine.connected} onClick={() => map.take(xName, yName)}>{t('probe.map.here')}</Button>,
  ], true);

  const preview = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      {/* On the machine, in 3D (review note, 2026-10-02): the travel, the program, the tool and the area. */}
      <MapPreview3D machine={machine} grid={grid} mode={mode} className={phone ? 'h-64' : 'min-h-0 flex-1'} />
      {grid?.nx ? (
        <p className="m-0 text-center text-note text-mut">{t('probe.map.stepIs', { step: `${units.figure(grid.stepX)} × ${units.figure(grid.stepY)} ${length}`, n: grid.nx * grid.ny })}</p>
      ) : null}
    </div>
  );
  const card = (
    <Card className="min-w-0 flex-1" bodyClassName="gap-3">
      {/* Only the figures of the way chosen, then the grid. */}
      <div className="flex min-w-0 flex-col gap-4">
        {mode === 'point' ? [point('probe.map.sec.point', 'x', 'y'), section('probe.map.sec.size', [field('w'), field('d')])] : null}
        {mode === 'centre' ? [point('probe.map.sec.centre', 'cx', 'cy'), section('probe.map.sec.size', [field('w'), field('d')])] : null}
        {mode === 'corners' ? [point('probe.map.cornerA', 'ax', 'ay'), point('probe.map.cornerB', 'bx', 'by')] : null}
        {mode === 'program' ? (
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{t('probe.map.sec.area')}</span>
            <span className="font-num text-base text-ink">{t('probe.map.span', { ...map.program, unit: length })}</span>
          </div>
        ) : null}
        {section('probe.map.sec.grid', [field('nx', countOnly), field('ny', countOnly)])}
      </div>
      {phone ? preview : null}
      {map.waiting ? <p className="m-0 text-base text-ink">{t('probe.map.takeCorners')}</p> : null}
      {reason ? <Notice>{t(REASONS[reason] || 'probe.map.noServer')}</Notice> : null}
      <p className="m-0 text-note text-mut">{t('probe.map.start')}</p>
      <Foot back={onBack}>
        {mode === 'program' ? null : <Button tone="outline" onClick={() => setJogging(true)} className="h-ctl">{t('nav.jog')}</Button>}
        <Button tone="primary" disabled={!map.ready} onClick={onNext} className="h-ctl">{t('probe.next')}</Button>
      </Foot>
    </Card>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-gap @4xl/shell:flex-row">
      {/* Taller than the screen with its drawing: it scrolls, on a PC as on a phone. */}
      <FadeScroller>
        <div className="flex min-h-full flex-col">{card}</div>
      </FadeScroller>
      {phone ? null : <Card label={t('probe.map.preview')} className="min-h-0 min-w-0 flex-1" bodyClassName="min-h-0 flex-1">{preview}</Card>}
      {jogging ? (
        <Sheet title={t('nav.jog')} onClose={() => setJogging(false)} tall>
          <JogWidget machine={machine} className="min-h-0 flex-1" />
        </Sheet>
      ) : null}
    </div>
  );
};

export default HeightMapArea;
