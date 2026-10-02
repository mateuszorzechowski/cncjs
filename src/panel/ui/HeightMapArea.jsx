import { useState } from 'react';
import Button from './Button';
import Card from './Card';
import FadeScroller from './FadeScroller';
import HeightMapGrid from './HeightMapGrid';
import Notice from './Notice';
import SegmentedChoice from './SegmentedChoice';
import SettingRow from './SettingRow';
import Sheet from './Sheet';
import TextField from './TextField';
import { Foot } from './ProbeSteps';
import JogWidget from '../widgets/JogWidget';
import { AREA_MODES } from './useHeightMapAsk';
import { useIsPhone } from './shell';
import { useUnits } from './units';
import { t } from '../i18n';

// A figure and nothing else, a comma taken as a point; a corner may be below zero.
const figureOnly = (text) => text.replace(/[^0-9.,-]/g, '');
const countOnly = (text) => text.replace(/[^0-9]/g, '');
const BAD = 'bad';

const MODES = { point: 'probe.map.mode.point', corners: 'probe.map.mode.corners', program: 'probe.map.mode.program' };
const NAMES = {
  x: 'probe.map.x', y: 'probe.map.y', w: 'probe.map.w', d: 'probe.map.d', nx: 'probe.map.nx', ny: 'probe.map.ny',
};
// What the server says of a grid it would not measure, as the operator reads it.
const REASONS = { 'bad-area': 'probe.map.badArea', 'bad-grid': 'probe.map.badGrid', 'no-server': 'probe.map.noServer' };

/**
 * Where the height map measures (Mateusz, 2026-10-02): the area — a corner
 * and a size, the corner at the work zero to start with; two corners on the
 * diagonal, the tool jogged to each and taken; or the program's extent — and
 * the points along each side. The step between them is the server's answer,
 * shown under the drawing. The jog beside it, as the position step has it;
 * on a phone, in a sheet.
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

  const field = (name, mask = figureOnly) => (
    <SettingRow key={name} title={t(NAMES[name])}>
      <TextField
        label={t(NAMES[name])}
        inputMode="decimal"
        unit={name === 'nx' || name === 'ny' ? null : length}
        value={texts[name] ?? ''}
        state={reason && (name.startsWith('n') ? reason === 'bad-grid' : reason === 'bad-area') ? BAD : undefined}
        onChange={(event) => map.onText(name, mask(event.target.value))}
      />
    </SettingRow>
  );
  const corner = (which) => (
    <SettingRow key={which} title={t(which === 'a' ? 'probe.map.cornerA' : 'probe.map.cornerB')}>
      <div className="flex items-center gap-3">
        <span className="font-num text-base text-ink">{t('probe.map.at', { x: texts[`${which}x`] ?? '—', y: texts[`${which}y`] ?? '—', unit: length })}</span>
        <Button className="h-chiph px-4" disabled={!machine.connected} onClick={() => map.take(which)}>{t('probe.map.here')}</Button>
      </div>
    </SettingRow>
  );

  const area = grid?.xs ? { x: [grid.xs[0], grid.xs[grid.xs.length - 1]], y: [grid.ys[0], grid.ys[grid.ys.length - 1]] } : null;
  const card = (
    <Card className="min-w-0 flex-1" bodyClassName="gap-3">
      <SegmentedChoice
        options={AREA_MODES.filter((one) => one !== 'program' || map.outline)}
        value={mode}
        onChange={map.setMode}
        format={(one) => t(MODES[one])}
        label={t('probe.map.area')}
        joined
      />
      <div className="flex min-w-0 flex-col">
        {mode === 'point' ? ['x', 'y', 'w', 'd'].map((name) => field(name)) : null}
        {mode === 'corners' ? ['a', 'b'].map(corner) : null}
        {mode === 'program' ? (
          <p className="m-0 font-num text-base text-ink">{t('probe.map.span', { ...map.program, unit: length })}</p>
        ) : null}
        {field('nx', countOnly)}
        {field('ny', countOnly)}
      </div>
      {area ? (
        <HeightMapGrid area={area} nx={grid.nx} ny={grid.ny} outline={map.outline} label={t('probe.map.drawing')} className="mx-auto h-auto w-full max-w-sm" />
      ) : null}
      {grid?.nx ? (
        <p className="m-0 text-note text-mut">{t('probe.map.stepIs', { step: `${units.figure(grid.stepX)} × ${units.figure(grid.stepY)} ${length}`, n: grid.nx * grid.ny })}</p>
      ) : null}
      {map.waiting ? <p className="m-0 text-base text-ink">{t('probe.map.takeCorners')}</p> : null}
      {reason ? <Notice>{t(REASONS[reason] || 'probe.map.noServer')}</Notice> : null}
      <p className="m-0 text-note text-mut">{t('probe.map.start')}</p>
      <Foot back={onBack}>
        {phone && mode === 'corners' ? <Button tone="outline" onClick={() => setJogging(true)} className="h-ctl">{t('nav.jog')}</Button> : null}
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
      {phone ? null : <JogWidget machine={machine} className="min-h-0 w-jcard shrink-0" />}
      {phone && jogging ? (
        <Sheet title={t('nav.jog')} onClose={() => setJogging(false)} tall>
          <JogWidget machine={machine} className="min-h-0 flex-1" />
        </Sheet>
      ) : null}
    </div>
  );
};

export default HeightMapArea;
