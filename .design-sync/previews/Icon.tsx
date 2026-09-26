import { Icon } from 'cncjs';

// The panel's own glyphs, one stroke and currentColor throughout, each shown
// with the name the panel gives it where it is used.
const Glyph = ({ name, label, className = 'size-4', weight, tone = 'text-ink' }) => (
  <div className="flex w-20 flex-col items-center gap-2">
    <span className={`flex size-chiph items-center justify-center rounded-ctl border border-line bg-panel ${tone}`}>
      <Icon name={name} className={className} weight={weight} />
    </span>
    <span className="text-center text-cap uppercase tracking-[0.08em] text-mut">{label}</span>
  </div>
);

export const Views = () => (
  // The four views on the drawing: one cube, a different face filled. 16px.
  // Telefon / tablet / PC: same glyphs on every device; size and colour are always the caller's and no caller changes them per device — the jog keys' glyphs are size-6 in both the phone pad and the tablet/PC pad.
  <div className="flex gap-3">
    <Glyph name="iso" label="IZO" />
    <Glyph name="top" label="GÓRA" />
    <Glyph name="front" label="PRZÓD" />
    <Glyph name="right" label="BOK" />
  </div>
);

export const Layers = () => (
  // The layers and the frame button — each a small picture of what it shows.
  <div className="flex gap-3">
    <Glyph name="fit" label="Kadr" />
    <Glyph name="path" label="Tor" />
    <Glyph name="area" label="Obszar" />
    <Glyph name="axes" label="Osie" />
    <Glyph name="machine" label="Maszyna" />
    <Glyph name="machineAxes" label="Zero masz." />
  </div>
);

export const Stage = () => (
  // The drawing's point readout: pick a point, go to it.
  <div className="flex gap-3">
    <Glyph name="cursor" label="Wskaż" />
    <Glyph name="goPoint" label="Jedź" />
  </div>
);

export const Jog = () => (
  // The jog pad's keys: 24px at weight 2, a diagonal turned per corner.
  <div className="flex gap-3">
    <Glyph name="diagonal" label="X+ Y+" className="size-6" weight={2} />
    <Glyph name="diagonal" label="X− Y+" className="size-6 -rotate-90" weight={2} />
    <Glyph name="diagonal" label="X− Y−" className="size-6 rotate-180" weight={2} />
    <Glyph name="diagonal" label="X+ Y−" className="size-6 rotate-90" weight={2} />
    <Glyph name="goZero" label="Do zera" className="size-6" weight={2} />
  </div>
);

export const Marks = () => (
  // Marks at weight 2: the chevron of anything that opens a sheet, and the
  // file check's verdicts in their colours.
  <div className="flex gap-3">
    <Glyph name="chevron" label="Więcej" weight={2} tone="text-mut" />
    <Glyph name="check" label="Na sterowniku" weight={2} tone="text-grn" />
    <Glyph name="check" label="OK" weight={2} tone="text-mut" />
    <Glyph name="cross" label="niezgodny" weight={2} tone="text-red" />
  </div>
);
