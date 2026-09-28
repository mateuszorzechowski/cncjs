import { SettingRow, SegmentedChoice, TextField, Card, DeviceFrame } from 'cncjs';
import { useState } from 'react';

export const Preferences = () => {
  // One setting: its name, what it does, whose it is, and the control — the
  // rows of the panel's Settings, as the Preferences tab stacks them.
  const [units, setUnits] = useState('mm');
  const [theme, setTheme] = useState('system');
  return (
    <Card>
      <SettingRow title="Motyw" scope="device">
        <SegmentedChoice
          label="Motyw"
          options={['system', 'light', 'dark']}
          value={theme}
          onChange={setTheme}
          format={(id) => ({ system: 'Systemowy', light: 'Jasny', dark: 'Ciemny' })[id]}
        />
      </SettingRow>
      <SettingRow title="Jednostki" note="Pozycje, kroki jogu i posuwy — na każdym urządzeniu." scope="server">
        <SegmentedChoice
          label="Jednostki"
          options={['mm', 'inch']}
          value={units}
          onChange={setUnits}
          format={(id) => (id === 'mm' ? 'mm' : 'cale')}
        />
      </SettingRow>
    </Card>
  );
};

export const WithCode = () => (
  // A controller setting: its `$` beside the name, a figure in its own field.
  <Card>
    <SettingRow title="Posuw szukania" code="$25" note="Szybki dojazd do krańcówki.">
      <TextField label="Posuw szukania" inputMode="decimal" unit="mm/min" defaultValue="500.000" />
    </SettingRow>
    <SettingRow title="Odjazd od krańcówki" code="$27" note="Odległość po bazowaniu, aby krańcówka nie była wciśnięta.">
      <TextField label="Odjazd" inputMode="decimal" unit="mm" defaultValue="2" was="1.000" state="changed" />
    </SettingRow>
  </Card>
);

export const Lit = () => (
  // Lit: the row just reached from a summary elsewhere.
  <Card>
    <SettingRow title="Bazowanie" code="$22" lit note="Wymaga cyklu $H po każdym uruchomieniu. Warunek dla limitów programowych.">
      <SegmentedChoice label="Bazowanie" options={[0, 1]} value={1} onChange={() => {}} format={(on) => (on ? 'Wł.' : 'Wył.')} />
    </SettingRow>
  </Card>
);

export const Phone = () => (
  // Telefon (shell < 48rem): one column. The name with its scope or `$` tag
  // beside it, the note under the name, the control under both at full width.
  <DeviceFrame device="phone">
    <Card>
      <SettingRow title="Jednostki" note="Pozycje, kroki jogu i posuwy — na każdym urządzeniu." scope="server">
        <SegmentedChoice label="Jednostki" options={['mm', 'inch']} value="mm" onChange={() => {}} format={(id) => (id === 'mm' ? 'mm' : 'cale')} />
      </SettingRow>
      <SettingRow title="Posuw szukania" code="$25" note="Szybki dojazd do krańcówki.">
        <TextField label="Posuw szukania" inputMode="decimal" unit="mm/min" defaultValue="500.000" />
      </SettingRow>
    </Card>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): two columns — name and note on the left (up to 22rem),
  // the control on the right; the scope tag moves under the note.
  <DeviceFrame device="tablet">
    <Card>
      <SettingRow title="Jednostki" note="Pozycje, kroki jogu i posuwy — na każdym urządzeniu." scope="server">
        <SegmentedChoice label="Jednostki" options={['mm', 'inch']} value="mm" onChange={() => {}} format={(id) => (id === 'mm' ? 'mm' : 'cale')} />
      </SettingRow>
      <SettingRow title="Posuw szukania" code="$25" note="Szybki dojazd do krańcówki.">
        <TextField label="Posuw szukania" inputMode="decimal" unit="mm/min" defaultValue="500.000" />
      </SettingRow>
    </Card>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet's two columns, the control column simply wider.
  <DeviceFrame device="pc">
    <Card>
      <SettingRow title="Jednostki" note="Pozycje, kroki jogu i posuwy — na każdym urządzeniu." scope="server">
        <SegmentedChoice label="Jednostki" options={['mm', 'inch']} value="mm" onChange={() => {}} format={(id) => (id === 'mm' ? 'mm' : 'cale')} />
      </SettingRow>
      <SettingRow title="Posuw szukania" code="$25" note="Szybki dojazd do krańcówki.">
        <TextField label="Posuw szukania" inputMode="decimal" unit="mm/min" defaultValue="500.000" />
      </SettingRow>
    </Card>
  </DeviceFrame>
);
