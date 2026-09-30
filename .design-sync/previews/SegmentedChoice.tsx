import { SegmentedChoice, Card, DeviceFrame } from 'cncjs';
import { useState } from 'react';

const LEVELS = ['debug', 'info', 'warn', 'error'];
const LEVEL_NAMES = { debug: 'Debug', info: 'Info', warn: 'Uwaga', error: 'Błąd' };

const Caption = ({ children }) => (
  <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">{children}</span>
);

export const JogStep = () => {
  // Telefon / tablet / PC: every option always on screen; only a `fitWide` row changes: equal columns across a phone, options as wide as their labels and left-aligned from 48rem.
  // The jog card's step: every option on screen, equal columns, figures in the
  // number face because `unit` says they are a quantity.
  const [step, setStep] = useState(1);
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Caption>Krok XY</Caption>
      <SegmentedChoice label="Krok XY" options={[0.1, 1, 10, 50]} value={step} onChange={setStep} unit="mm" />
    </div>
  );
};

export const Joined = () => {
  // Joined, as the Settings rows lay them out: one group, rounded at the ends.
  const [theme, setTheme] = useState('system');
  const [units, setUnits] = useState('mm');
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <SegmentedChoice
        joined
        label="Motyw"
        options={['system', 'light', 'dark']}
        value={theme}
        onChange={setTheme}
        format={(id) => ({ system: 'Systemowy', light: 'Jasny', dark: 'Ciemny' })[id]}
      />
      <SegmentedChoice
        joined
        label="Jednostki"
        options={['mm', 'inch']}
        value={units}
        onChange={setUnits}
        format={(id) => ({ mm: 'mm', inch: 'cale' })[id]}
      />
    </div>
  );
};

export const Floor = () => {
  // A floor: the journal keeps from Info up, so Uwaga and Błąd sit in a wash.
  const [level, setLevel] = useState('info');
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Caption>Dziennik zapisuje od</Caption>
      <SegmentedChoice
        joined
        label="Dziennik zapisuje od"
        options={LEVELS}
        value={level}
        covers={(id) => LEVELS.indexOf(id) > LEVELS.indexOf(level)}
        onChange={setLevel}
        format={(id) => LEVEL_NAMES[id]}
      />
    </div>
  );
};

export const FilterBar = () => {
  // The journal's filter bar: compact, several on at once, a tally per level.
  const [levels, setLevels] = useState({ debug: false, info: true, warn: true, error: true });
  const [sources, setSources] = useState({ server: true, controller: true });
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <SegmentedChoice
        compact
        joined
        label="Poziom"
        options={LEVELS}
        counts={{ debug: 1284, info: 57, warn: 3, error: 1 }}
        isOn={(id) => levels[id]}
        onChange={(id) => setLevels({ ...levels, [id]: !levels[id] })}
        format={(id) => LEVEL_NAMES[id]}
      />
      <SegmentedChoice
        compact
        joined
        label="Źródło"
        options={['server', 'controller']}
        isOn={(id) => sources[id]}
        onChange={(id) => setSources({ ...sources, [id]: !sources[id] })}
        format={(id) => ({ server: 'Serwer', controller: 'Sterownik' })[id]}
      />
    </div>
  );
};

export const Columns = () => {
  // The same filters as tiles, in the sheet a phone's Filtry button opens.
  const [levels, setLevels] = useState({ debug: false, info: true, warn: true, error: true });
  const [range, setRange] = useState('h1');
  const ranges = { m15: '15 min', h1: '1 h', today: 'Dziś', all: 'Wszystko', custom: 'Własny zakres…' };
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Caption>Poziom</Caption>
      <SegmentedChoice
        columns={2}
        label="Poziom"
        options={LEVELS}
        counts={{ debug: 1284, info: 57, warn: 3, error: 1 }}
        isOn={(id) => levels[id]}
        onChange={(id) => setLevels({ ...levels, [id]: !levels[id] })}
        format={(id) => LEVEL_NAMES[id]}
      />
      <Caption>Czas</Caption>
      <SegmentedChoice columns={4} label="Czas" options={['m15', 'h1', 'today', 'all']} value={range} onChange={setRange} format={(id) => ranges[id]} />
      <SegmentedChoice columns={1} label="Czas" options={['custom']} value={range} onChange={setRange} format={(id) => ranges[id]} />
    </div>
  );
};

export const WasAndDisabled = () => {
  // An unsaved controller setting: the amber dot marks what it held before.
  // Below, the jog step while no machine is connected — dimmed, not cleared.
  const [homing, setHoming] = useState(0);
  const [report, setReport] = useState(1);
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <SegmentedChoice label="Bazowanie" options={[0, 1]} value={homing} was={1} onChange={setHoming} format={(on) => (on ? 'Wł.' : 'Wył.')} />
      <SegmentedChoice
        label="Raport statusu"
        options={[0, 1, 2, 3]}
        value={report}
        was={3}
        onChange={setReport}
        format={(n) => ['WPos', 'MPos', 'WPos + bufor', 'MPos + bufor'][n]}
      />
      <SegmentedChoice label="Krok Z" options={[0.1, 1, 5]} value={1} onChange={() => {}} unit="mm" disabled />
    </div>
  );
};

export const Phone = () => (
  // Telefon (shell < 48rem): equal columns (`basis-0 flex-1`) splitting the
  // whole width between them, 1px side padding.
  <DeviceFrame device="phone">
    <Card label="Widok" className="w-full">
      <SegmentedChoice
        joined
        fitWide
        label="Widok"
        options={['described', 'raw']}
        value="described"
        onChange={() => {}}
        format={(id) => ({ described: 'Opisowy', raw: 'GRBL $$' })[id]}
      />
    </Card>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): each option as wide as its label plus 20px each side
  // (`basis-auto px-5`), the group at the start of the row (`self-start`), not
  // stretched.
  <DeviceFrame device="tablet">
    <Card label="Widok" className="w-full">
      <SegmentedChoice
        joined
        fitWide
        label="Widok"
        options={['described', 'raw']}
        value="described"
        onChange={() => {}}
        format={(id) => ({ described: 'Opisowy', raw: 'GRBL $$' })[id]}
      />
    </Card>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet's label-wide group; it does not widen, the row's
  // spare room simply stays empty to its right.
  <DeviceFrame device="pc">
    <Card label="Widok" className="w-full">
      <SegmentedChoice
        joined
        fitWide
        label="Widok"
        options={['described', 'raw']}
        value="described"
        onChange={() => {}}
        format={(id) => ({ described: 'Opisowy', raw: 'GRBL $$' })[id]}
      />
    </Card>
  </DeviceFrame>
);
