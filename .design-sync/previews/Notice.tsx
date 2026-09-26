import { Notice, Card, Button } from 'cncjs';

export const CertWarning = () => (
  // Amber and marked with the triangle: something to read before doing the
  // thing next to it. These are the panel's own notices.
  // Telefon / tablet / PC: same look on every device and the same places at every width (certificate warning, low disk on Pliki, read-only controller, changed steps); it only takes the width of what holds it.
  <Notice className="w-full">
    <span>Ten urząd certyfikacji jest ograniczony do nazw w Twojej własnej sieci — nie może poświadczyć żadnej strony w internecie. Mimo to instaluj go tylko dla maszyny, która jest Twoja, w sieci, która jest Twoja.</span>
  </Notice>
);

export const StepsChanged = () => (
  <Notice className="w-side">Zmiana kroków zmienia skalę ruchu. Po zapisie sprawdź zero przedmiotu i wykonaj bazowanie.</Notice>
);

export const DiskLow = () => (
  // Inside a card, above the thing it is about.
  <Card label="Pliki" aside="wolne 0.4 GB z 16 GB" className="w-side" bodyClassName="gap-3">
    <Notice>Dysk serwera jest prawie pełny. Usuń niepotrzebne pliki.</Notice>
    <Button className="h-ctl">Wgraj</Button>
  </Card>
);

export const ReadOnly = () => (
  <Notice className="w-side">Maszyna pracuje albo trwa zapis. GRBL przyjmuje zmiany tylko w stanie Idle lub Alarm, poza programem.</Notice>
);
