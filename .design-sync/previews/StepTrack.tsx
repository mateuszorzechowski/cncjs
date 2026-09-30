import { StepTrack, Card } from 'cncjs';

export const Wizard = () => (
  // Where a wizard is: one row of joined rectangles, the steps behind with a
  // tick, the current one filled, the ones ahead plain.
  // Telefon / tablet / PC: wide, every step says its name; on a phone only the current one does, the rest are their numbers.
  <StepTrack
    label="Kroki"
    current="prepare"
    steps={[
      { id: 'method', name: 'Metoda' },
      { id: 'choose', name: 'Narożnik' },
      { id: 'prepare', name: 'Przygotowanie' },
      { id: 'wire', name: 'Przewód' },
      { id: 'position', name: 'Ustawienie' },
      { id: 'measure', name: 'Pomiar' },
      { id: 'result', name: 'Wynik' },
    ]}
  />
);

export const InCardHeader = () => (
  // As the Sonda screen uses it: the caption, the steps and the method in
  // one row of a card of its own.
  <Card>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <h2 className="m-0 text-cap font-semibold uppercase tracking-[0.1em] text-mut">Sonda</h2>
      <StepTrack
        label="Kroki"
        current="wire"
        className="order-3 w-full @3xl/shell:order-none @3xl/shell:w-auto @3xl/shell:flex-1"
        steps={[
          { id: 'method', name: 'Metoda' },
          { id: 'prepare', name: 'Przygotowanie' },
          { id: 'wire', name: 'Przewód' },
          { id: 'position', name: 'Ustawienie' },
          { id: 'measure', name: 'Pomiar' },
          { id: 'result', name: 'Wynik' },
        ]}
      />
      <span className="ml-auto font-num text-note text-mut @3xl/shell:ml-0">Płytka Z</span>
    </div>
  </Card>
);
