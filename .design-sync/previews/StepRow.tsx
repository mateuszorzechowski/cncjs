import { StepRow, Card, Notice, SegmentedChoice, Button, DeviceFrame } from 'cncjs';
import { useState } from 'react';

// Telefon / tablet / PC: number beside title and note everywhere; the step's controls run under both at full width on a phone, and from 48rem sit in the title's column.
// One step of a sequence — the Install tab's two. The number says the order;
// a done step turns green and stays, a blocked one is dimmed with its controls
// dark.

export const FirstVisit = () => {
  // Before anything: step 1 to do, step 2 waiting on it.
  const [platform, setPlatform] = useState('android');
  return (
    <Card className="w-full">
      <StepRow
        number={1}
        title="Zaufaj certyfikatowi panelu"
        note="To urządzenie nie ufa certyfikatowi panelu, więc nie zainstaluje go jako aplikacji. Kliknięcie „mimo to przejdź” nie wystarczy: strona się wczyta, a połączenie zostaje niezaufane."
        state="todo"
      >
        <Notice>
          <span>Ten urząd certyfikacji jest ograniczony do nazw w Twojej własnej sieci — nie może poświadczyć żadnej strony w internecie. Mimo to instaluj go tylko dla maszyny, która jest Twoja, w sieci, która jest Twoja.</span>
        </Notice>
        <SegmentedChoice
          joined
          fitWide
          label="Twoje urządzenie"
          options={['android', 'ios', 'windows', 'macos', 'linux']}
          value={platform}
          onChange={setPlatform}
          format={(id) => ({ android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux' })[id]}
        />
        <p className="m-0 text-note text-ink">Android: wybierz „Certyfikat CA”, a nie „certyfikat VPN i aplikacji”, i ustaw najpierw blokadę ekranu, jeśli jej nie masz.</p>
        <Button className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Pobierz certyfikat</Button>
      </StepRow>
      <StepRow
        number={2}
        title="Zainstaluj aplikację"
        note="Najpierw krok 1: przeglądarka instaluje aplikację tylko przez połączenie, któremu ufa."
        state="blocked"
      >
        <Button tone="primary" disabled className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Zainstaluj na tym urządzeniu</Button>
      </StepRow>
    </Card>
  );
};

export const ReadyToInstall = () => (
  // Step 1 done and kept; step 2 ready to take.
  <Card className="w-full">
    <StepRow number={1} title="Zaufaj certyfikatowi panelu" note="To urządzenie ufa certyfikatowi panelu: połączenie jest bezpieczne." state="done">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">Nazwa na telefonie</span>
        <span className="min-w-0 break-all font-num text-note text-ink">cncjs panel CA</span>
      </div>
    </StepRow>
    <StepRow number={2} title="Zainstaluj aplikację" note="Ta przeglądarka jest gotowa go zainstalować." state="todo">
      <Button tone="primary" className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Zainstaluj na tym urządzeniu</Button>
    </StepRow>
  </Card>
);

export const Installed = () => (
  // Both done.
  <Card className="w-full">
    <StepRow number={1} title="Zaufaj certyfikatowi panelu" note="To urządzenie ufa certyfikatowi panelu: połączenie jest bezpieczne." state="done" />
    <StepRow number={2} title="Zainstaluj aplikację" note="Zainstalowana na tym urządzeniu." state="done">
      <Button tone="primary" disabled className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Zainstalowano</Button>
    </StepRow>
  </Card>
);

export const Phone = () => (
  // Telefon (shell < 48rem): the number circle left of title and note; the
  // controls span both grid columns (`col-span-2`), so they start under the
  // number at full width: the platform choice in equal columns and a
  // full-width button.
  <DeviceFrame device="phone">
    <Card className="w-full">
      <StepRow number={1} title="Zaufaj certyfikatowi panelu" note="To urządzenie nie ufa certyfikatowi panelu, więc nie zainstaluje go jako aplikacji." state="todo">
        <SegmentedChoice
          joined
          fitWide
          label="Twoje urządzenie"
          options={['android', 'ios', 'windows', 'macos', 'linux']}
          value="android"
          onChange={() => {}}
          format={(id) => ({ android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux' })[id]}
        />
        <Button className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Pobierz certyfikat</Button>
      </StepRow>
      <StepRow number={2} title="Zainstaluj aplikację" note="Najpierw krok 1: przeglądarka instaluje aplikację tylko przez połączenie, któremu ufa." state="blocked">
        <Button tone="primary" disabled className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Zainstaluj na tym urządzeniu</Button>
      </StepRow>
    </Card>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): the controls move into the second column
  // (`col-start-2`), aligned under the title; the choice and the buttons (their
  // own `@3xl/shell:` classes) shrink to their labels at the start.
  <DeviceFrame device="tablet">
    <Card className="w-full">
      <StepRow number={1} title="Zaufaj certyfikatowi panelu" note="To urządzenie nie ufa certyfikatowi panelu, więc nie zainstaluje go jako aplikacji." state="todo">
        <SegmentedChoice
          joined
          fitWide
          label="Twoje urządzenie"
          options={['android', 'ios', 'windows', 'macos', 'linux']}
          value="android"
          onChange={() => {}}
          format={(id) => ({ android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux' })[id]}
        />
        <Button className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Pobierz certyfikat</Button>
      </StepRow>
      <StepRow number={2} title="Zainstaluj aplikację" note="Najpierw krok 1: przeglądarka instaluje aplikację tylko przez połączenie, któremu ufa." state="blocked">
        <Button tone="primary" disabled className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Zainstaluj na tym urządzeniu</Button>
      </StepRow>
    </Card>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet layout; the second column is wider and the controls
  // keep their label width, leaving the rest of the row empty.
  <DeviceFrame device="pc">
    <Card className="w-full">
      <StepRow number={1} title="Zaufaj certyfikatowi panelu" note="To urządzenie nie ufa certyfikatowi panelu, więc nie zainstaluje go jako aplikacji." state="todo">
        <SegmentedChoice
          joined
          fitWide
          label="Twoje urządzenie"
          options={['android', 'ios', 'windows', 'macos', 'linux']}
          value="android"
          onChange={() => {}}
          format={(id) => ({ android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux' })[id]}
        />
        <Button className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Pobierz certyfikat</Button>
      </StepRow>
      <StepRow number={2} title="Zainstaluj aplikację" note="Najpierw krok 1: przeglądarka instaluje aplikację tylko przez połączenie, któremu ufa." state="blocked">
        <Button tone="primary" disabled className="h-ctl w-full @3xl/shell:w-auto @3xl/shell:self-start">Zainstaluj na tym urządzeniu</Button>
      </StepRow>
    </Card>
  </DeviceFrame>
);
