import { HelpButton, Button, Card, WcsBadge, DroStack } from 'cncjs';

// The `?` that opens an explanation. Its size is the caller's: beside a
// 42px Done it is 42px (`size-chiph`). The name is the caller's too.

export const BesideDone = () => (
  // A sheet's header, beside Done.
  // Telefon / tablet / PC: same look on every device, size set by the caller; in the top bar at every width (chip-high 42px square on a phone, button-high and 56px wide on a tablet/PC), in a card header only on a tablet/PC (hidden on a phone, where the top bar carries it), and beside Done in a sheet header at every width.
  <div className="flex w-side items-center gap-3 rounded-card border border-line bg-panel p-pad">
    <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">Stan maszyny</span>
    <span className="h-px flex-1 bg-line" />
    <HelpButton label="Co znaczą stany" onPress={() => {}} className="size-chiph text-base" />
    <Button className="h-chiph">Gotowe</Button>
  </div>
);

export const InCardHeader = () => (
  // A card's header, after its aside (shown on a wide shell).
  <Card
    label="Zerowanie"
    aside={<WcsBadge wcs="G54" />}
    onHelp={() => {}}
    helpLabel="Czym jest zerowanie"
    className="w-full"
    bodyClassName="gap-0"
  >
    <DroStack position={{ x: 0, y: 0, z: 12.5 }} machinePosition={{ x: -300, y: -200, z: -12.5 }} />
  </Card>
);
