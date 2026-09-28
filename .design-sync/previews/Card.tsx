import { Card, StatTile, Meter, DroStack, WcsBadge, Button, DeviceFrame } from 'cncjs';

export const JobProgress = () => (
  // Telefon / tablet / PC: one frame everywhere; only the header's `?` differs — hidden on a phone (the screen lifts it into the top bar), shown at the header's end from 48rem.
  // The one repeating container. `label` is the quiet caption, `aside` the
  // second reading at the right — here the job's figures and the tool card,
  // as the dashboard stacks them.
  <Card label="Przebieg zadania" className="w-side" bodyClassName="justify-between gap-2">
    <div className="flex items-baseline gap-2">
      <span className="font-num text-head font-medium tabular-nums text-ink">42</span>
      <span className="min-w-0 truncate font-num text-note text-mut">% · linia 1284/3051</span>
    </div>
    <Meter percent={42} label="Przebieg zadania" tone="bg-grn" />
    <div className="grid shrink-0 grid-cols-2 gap-x-gap gap-y-1 font-num text-note text-mut">
      <span className="truncate">posuw 1200 mm/min</span>
      <span className="truncate">wrzeciono 12000 obr/min</span>
      <span className="truncate">plik obudowa-front.nc</span>
      <span className="truncate">pozostało 14 min</span>
    </div>
  </Card>
);

export const WorkPosition = () => (
  // With an aside: the coordinate system beside the caption.
  <Card label="Pozycja robocza" aside={<WcsBadge wcs="G54" />} className="w-side" bodyClassName="gap-0">
    <DroStack
      position={{ x: 125.4, y: 48.25, z: 5 }}
      machinePosition={{ x: -174.6, y: -151.75, z: -20 }}
    />
  </Card>
);

export const TextAside = () => (
  // A plain aside, a text reading — the Z height card's machine figure.
  <Card label="Narzędzie i wrzeciono" aside="masz. -20.000 mm" className="w-side" bodyClassName="gap-gap">
    <div className="flex flex-col gap-gap">
      <StatTile label="narzędzie" value="T3" />
      <StatTile label="wrzeciono" value="12000" unit="obr/min" />
    </div>
  </Card>
);

export const Row = () => (
  // `row` lays the body sideways — the two tiles in one line.
  <Card label="Narzędzie i wrzeciono" row className="w-side" bodyClassName="gap-gap">
    <StatTile label="narzędzie" value="T3" />
    <StatTile label="wrzeciono" value="12000" unit="obr/min" />
  </Card>
);

export const WithHelp = () => (
  // `onHelp` puts the `?` at the end of the header (on a wide shell; a phone
  // lifts it into the top bar).
  <Card
    label="Zerowanie"
    aside={<WcsBadge wcs="G54" />}
    onHelp={() => {}}
    helpLabel="Czym jest zerowanie"
    className="w-full"
    bodyClassName="gap-4"
  >
    <DroStack
      position={{ x: 0, y: 0, z: 12.5 }}
      machinePosition={{ x: -300, y: -200, z: -12.5 }}
    />
    <p className="m-0 shrink-0 text-note text-mut">Ustawia zero robocze układu G54 w aktualnej pozycji maszynowej.</p>
  </Card>
);

export const Phone = () => (
  // Telefon (shell < 48rem): caption at the left, the aside (G54) at the right,
  // no `?` in the header — `onHelp` is hidden here, the screen puts it in the
  // top bar. Header items on the text baseline.
  <DeviceFrame device="phone">
    <Card label="Zerowanie" aside={<WcsBadge wcs="G54" />} onHelp={() => {}} helpLabel="Czym jest zerowanie" className="w-full" bodyClassName="gap-4">
      <p className="m-0 shrink-0 text-note text-mut">Ustawia zero robocze układu G54 w aktualnej pozycji maszynowej.</p>
      <div className="flex shrink-0 gap-2">
        <Button className="h-ctl min-w-0 flex-1">Zeruj X</Button>
        <Button className="h-ctl min-w-0 flex-1">Zeruj Y</Button>
        <Button className="h-ctl min-w-0 flex-1">Zeruj Z</Button>
      </div>
    </Card>
  </DeviceFrame>
);

export const Tablet = () => (
  // Tablet (from 48rem): the `?` appears at the end of the header, after the
  // aside, and the header centres its items against that square button.
  <DeviceFrame device="tablet">
    <Card label="Zerowanie" aside={<WcsBadge wcs="G54" />} onHelp={() => {}} helpLabel="Czym jest zerowanie" className="w-full" bodyClassName="gap-4">
      <p className="m-0 shrink-0 text-note text-mut">Ustawia zero robocze układu G54 w aktualnej pozycji maszynowej.</p>
      <div className="flex shrink-0 gap-2">
        <Button className="h-ctl min-w-0 flex-1">Zeruj X</Button>
        <Button className="h-ctl min-w-0 flex-1">Zeruj Y</Button>
        <Button className="h-ctl min-w-0 flex-1">Zeruj Z</Button>
      </div>
    </Card>
  </DeviceFrame>
);

export const PC = () => (
  // PC (1920): the tablet header, the card simply as wide as its column; nothing
  // inside the frame changes size, only the body gets wider.
  <DeviceFrame device="pc">
    <Card label="Zerowanie" aside={<WcsBadge wcs="G54" />} onHelp={() => {}} helpLabel="Czym jest zerowanie" className="w-full" bodyClassName="gap-4">
      <p className="m-0 shrink-0 text-note text-mut">Ustawia zero robocze układu G54 w aktualnej pozycji maszynowej.</p>
      <div className="flex shrink-0 gap-2">
        <Button className="h-ctl min-w-0 flex-1">Zeruj X</Button>
        <Button className="h-ctl min-w-0 flex-1">Zeruj Y</Button>
        <Button className="h-ctl min-w-0 flex-1">Zeruj Z</Button>
      </div>
    </Card>
  </DeviceFrame>
);

export const WithSublabel = () => (
  // `sublabel`, a second header line: the firmware under PAMIĘĆ STEROWNIKA, in the number face and not in capitals; it wraps rather than truncates.
  <Card label="Pamięć sterownika" sublabel="Grbl 1.1h" aside={<Button compact className="size-chiph">↻</Button>} className="w-setcol">
    <p className="m-0 text-note text-mut">Lista grup.</p>
  </Card>
);
