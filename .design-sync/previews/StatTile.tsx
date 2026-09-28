import { StatTile, Card } from 'cncjs';

export const ToolAndSpindle = () => (
  // One secondary reading in its own box — the tool in the spindle and how
  // fast it turns, as the Narzędzie i wrzeciono card on the dashboard has them.
  // Telefon / tablet / PC: same look on every device; the compact tiles in the chosen file's details sit in the Wybrany plik card beside the list on a tablet/PC and in the file's bottom sheet on a phone, and the tool/spindle pair exists only on the tablet/PC dashboard (the phone dashboard has no tool card).
  <div className="w-side">
    <Card label="Narzędzie i wrzeciono">
      <div className="flex flex-row gap-2">
        <StatTile label="narzędzie" value="T3" />
        <StatTile label="wrzeciono" value="12000" unit="obr/min" />
      </div>
    </Card>
  </div>
);

export const CompactFileStats = () => (
  // Compact: label and reading on one line, four of them under the file
  // preview on Pliki, where the drawing needs the room.
  <div className="grid w-[360px] grid-cols-2 gap-2">
    <StatTile compact label="linie" value="18432" />
    <StatTile compact label="czas" value="1 h 12 min" />
    <StatTile compact label="narzędzia" value="T1, T3" />
    <StatTile compact label="Z min" value="-6.000" />
  </div>
);

export const CheckVerdicts = () => (
  // Tone: the file check's verdict colours the whole tile — plain when it
  // passed, amber to read before running, red for what Grbl will refuse. A
  // verdict opens the check's list, so it carries the chevron.
  <div className="flex w-side flex-col gap-2">
    <StatTile label="stan" value="OK" onPress={() => {}} />
    <StatTile label="stan" value="ostrzeżenia" tone="warn" onPress={() => {}} />
    <StatTile label="stan" value="niezgodny" tone="bad" onPress={() => {}} />
  </div>
);

export const NoReading = () => (
  // No reading yet — the dash the panel shows instead of a made-up zero.
  <div className="flex w-side flex-row gap-2">
    <StatTile label="narzędzie" value="–" />
    <StatTile label="wrzeciono" value="–" unit="obr/min" />
  </div>
);
