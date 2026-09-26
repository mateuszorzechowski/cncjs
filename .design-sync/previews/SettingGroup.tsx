import { SettingGroup, SettingRow, SettingSummary, TextField, Button, Card, DeviceFrame } from 'cncjs';
import { useState } from 'react';

export const ConnectionTab = () => {
  // Telefon / tablet / PC: the group itself never changes (a caption and its rows); what changes is its rows (SettingRow), one column on a phone, two from 48rem.
  // The connection tab: Sterownik · Serwer · Stan under quiet headings.
  const [name, setName] = useState('');
  return (
    <Card className="w-full">
      <SettingGroup title="Sterownik">
        <SettingRow title="Port">
          <SettingSummary label="Wybierz port" values={[{ value: 'COM3' }]} onOpen={() => {}} />
        </SettingRow>
        <SettingRow title="Typ sterownika">
          <SettingSummary label="Typ sterownika" values={[{ value: 'Grbl' }]} onOpen={() => {}} />
        </SettingRow>
        <SettingRow title="Prędkość transmisji">
          <SettingSummary label="Prędkość transmisji" values={[{ value: '115200', unit: 'bodów' }]} onOpen={() => {}} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="Serwer">
        <SettingRow title="Adres" note="Adres, z którym rozmawia ten panel.">
          <span className="font-num text-base text-ink">cnc.lan:8000</span>
        </SettingRow>
        <SettingRow title="Nazwa tego urządzenia" note="Tak nazywa je dziennik. Puste pole = nazwa wykryta.">
          <TextField label="Nazwa tego urządzenia" placeholder="Tablet w warsztacie" value={name} onChange={(e) => setName(e.target.value)} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="Stan">
        <SettingRow title="Połączenie ze sterownikiem" note="Żaden port nie jest otwarty.">
          <div className="flex gap-2">
            <Button className="h-ctl flex-1">Odśwież porty</Button>
            <Button tone="primary" className="h-ctl flex-1">Połącz</Button>
          </div>
        </SettingRow>
      </SettingGroup>
    </Card>
  );
};

export const Linked = () => (
  // Linked: the controller group locked while the port is open.
  <Card className="w-full">
    <SettingGroup title="Sterownik">
      <SettingRow title="Port">
        <SettingSummary label="Wybierz port" values={[{ value: 'COM3' }]} locked onOpen={() => {}} />
      </SettingRow>
      <SettingRow title="Prędkość transmisji">
        <SettingSummary label="Prędkość transmisji" values={[{ value: '115200', unit: 'bodów' }]} locked onOpen={() => {}} />
      </SettingRow>
    </SettingGroup>
    <SettingGroup title="Stan">
      <SettingRow title="Połączenie ze sterownikiem" note="Połączono z COM3 przy 115200 bodów.">
        <div className="flex gap-2">
          <Button className="h-ctl flex-1">Odśwież porty</Button>
          <Button tone="end" className="h-ctl flex-1">Rozłącz</Button>
        </div>
      </SettingRow>
    </SettingGroup>
  </Card>
);

export const Phone = () => (
  // Telefon (shell < 48rem): the caption, then each row as one column: name
  // and note, the control under them at full width. A hairline between groups.
  <DeviceFrame device="phone">
    <Card className="w-full">
      <SettingGroup title="Sterownik">
        <SettingRow title="Port">
          <SettingSummary label="Wybierz port" values={[{ value: 'COM3' }]} onOpen={() => {}} />
        </SettingRow>
        <SettingRow title="Prędkość transmisji">
          <SettingSummary label="Prędkość transmisji" values={[{ value: '115200', unit: 'bodów' }]} onOpen={() => {}} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="Serwer">
        <SettingRow title="Nazwa tego urządzenia" note="Tak nazywa je dziennik. Puste pole = nazwa wykryta.">
          <TextField label="Nazwa tego urządzenia" placeholder="Tablet w warsztacie" defaultValue="" />
        </SettingRow>
      </SettingGroup>
    </Card>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): the same caption and dividers; the rows turn two-column,
  // name and note left, control right.
  <DeviceFrame device="tablet">
    <Card className="w-full">
      <SettingGroup title="Sterownik">
        <SettingRow title="Port">
          <SettingSummary label="Wybierz port" values={[{ value: 'COM3' }]} onOpen={() => {}} />
        </SettingRow>
        <SettingRow title="Prędkość transmisji">
          <SettingSummary label="Prędkość transmisji" values={[{ value: '115200', unit: 'bodów' }]} onOpen={() => {}} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="Serwer">
        <SettingRow title="Nazwa tego urządzenia" note="Tak nazywa je dziennik. Puste pole = nazwa wykryta.">
          <TextField label="Nazwa tego urządzenia" placeholder="Tablet w warsztacie" defaultValue="" />
        </SettingRow>
      </SettingGroup>
    </Card>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet layout; the rows' control column is simply wider.
  <DeviceFrame device="pc">
    <Card className="w-full">
      <SettingGroup title="Sterownik">
        <SettingRow title="Port">
          <SettingSummary label="Wybierz port" values={[{ value: 'COM3' }]} onOpen={() => {}} />
        </SettingRow>
        <SettingRow title="Prędkość transmisji">
          <SettingSummary label="Prędkość transmisji" values={[{ value: '115200', unit: 'bodów' }]} onOpen={() => {}} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="Serwer">
        <SettingRow title="Nazwa tego urządzenia" note="Tak nazywa je dziennik. Puste pole = nazwa wykryta.">
          <TextField label="Nazwa tego urządzenia" placeholder="Tablet w warsztacie" defaultValue="" />
        </SettingRow>
      </SettingGroup>
    </Card>
  </DeviceFrame>
);
