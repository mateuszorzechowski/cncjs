# cncjs panel — how to build with it

The components of a CNC machine's control panel (a Grbl pendant for a phone, a
tablet and a PC). Polish UI by default; figures in millimetres.

**Designing or reorganising a whole screen?** Read
`guidelines/src/panel/DESIGN.md` first: each screen's purpose and main action,
its layout on phone / tablet / PC, the interaction rules every variant must
keep, and the open questions. Screenshots of the current screens are in
`guidelines/screens/<screen>-<phone|tablet|pc>.png`.

## Always wrap in `PanelRoot`

```jsx
const { PanelRoot, Card, SettingRow, SegmentedChoice, Button } = window.CncPanel;

<PanelRoot className="h-full">{/* the whole screen */}</PanelRoot>
```

`PanelRoot` is the panel's shell: the `@container/shell` element every
component's layout queries, the providers (shell width, units, language —
`language="pl"|"en"`), and the node sheets open into. Without it components lay
out as on a phone and `Sheet`/`ConfirmSheet` crash. Give it a height: a sheet is
`fixed` inside the shell and takes at most 85% of the shell's height, so a
shell with no height shows a sheet with none. Layout switches at the shell's
width, not the window's: `@3xl/shell:` from 48rem (tablet), `@5xl/shell:` from
80rem (PC); below 48rem is the phone layout.

## Phone, tablet, PC

Components switch layout once, at a 48rem shell; below it is the phone
layout, above it the tablet one, and a PC is the tablet layout with more room
(PC differences are in how screens are composed, not in the components). Every
component's examples say how it looks on each device, and the ones that change
show it in `Phone` / `Tablet` / `PC` examples. The two navigations are a
pair: `NavRail` (left rail) on a tablet and PC, `NavTabs` (bottom bar) on a
phone — never both. To show something at a device's size use
`<DeviceFrame device="phone|tablet|pc" height={…}>` (360 / 1024 / 1920 px,
scaled to fit); build a real screen in a plain `PanelRoot` of the screen's size.

## Styling: the panel's own Tailwind classes — and only those

The stylesheet is Tailwind compiled from the panel's sources, so **a class the
panel does not use does not exist** (`w-80`, `p-4`, `h-[600px]` do nothing).
Compose with components first; for your own layout glue use this vocabulary,
all of it verified present:

| Family | Classes |
|---|---|
| Surfaces | `bg-bg` (screen), `bg-panel` (card), `bg-field` (input, 3D stage), `bg-surf` |
| Text | `text-ink`, `text-mut`; sizes `text-cap` `text-note` `text-base` `text-lead`; figures `font-num`; `font-semibold`, `uppercase` |
| Accent | `bg-acc` `text-acc` `border-acc` `bg-accS` (wash) |
| States | amber `bg-amb` `bg-ambS` `text-ambT` `border-amb` (changed, warning); red `bg-red` `bg-redS` `text-red` (stop, error); green `bg-grn` `bg-grnS` `text-grn` (running, ok); `bg-mutS` |
| Lines, radii | `border-line`, `rounded-ctl` (controls), `rounded-card` |
| Spacing | `p-pad` (card), `gap-gap`, `gap-2` `gap-3` `gap-4` |
| Sizes | `h-ctl` (a button), `h-chiph` (a chip/field), `w-full`, `w-side`, `w-[360px]`, `h-full`, `h-60`, `h-[340px]`, `h-[32rem]`, `max-w-[1180px]` |
| Layout | `flex` `flex-col` `flex-1` `min-w-0` `items-center` `justify-between` `grid` `grid-cols-2` `grid-cols-3` |

Colours are CSS custom properties defined on `:root` (light) and
`[data-theme='dark']` — never hard-code a colour.

## Where the truth lives

- `styles.css` → `_ds_bundle.css`: the compiled classes and every token
  (`--bg`, `--panel`, `--acc`, `--amb`, `--red`, `--grn`, `--ctl`, `--pad`…).
  Grep a class there before using it.
- `components/general/<Name>/<Name>.prompt.md` and `<Name>.d.ts`: each
  component's props; the preview cards show the real compositions.

## Rules the panel keeps

- One primary action per screen (`Button tone="primary"`); `go`/`hold`/`stop`
  are the job's start/pause/stop only; `end` is disconnecting.
- A setting is a `SettingRow` (name, `note`, `scope="device"|"server"`,
  `code="$22"` for a Grbl setting) inside a `Card`; groups of rows under
  `SettingGroup`; a choice among a few values is a `SegmentedChoice`, never a
  dropdown.
- An unsaved value shows what it replaces: `TextField was="…" state="changed"`,
  `SegmentedChoice was={old}`.
- Anything written to the machine asks first: `ConfirmSheet`.

## Example

```jsx
<PanelRoot className="h-full">
  <div className="flex flex-col gap-4 p-pad">
    <Card label="Posuwy jogu">
      <SettingRow title="Jednostki" note="Pozycje, kroki jogu i posuwy." scope="server">
        <SegmentedChoice label="Jednostki" options={['mm', 'inch']} value="mm"
          onChange={() => {}} format={(u) => (u === 'mm' ? 'mm' : 'cale')} />
      </SettingRow>
    </Card>
    <div className="flex gap-2">
      <Button className="h-ctl flex-1">Anuluj</Button>
      <Button tone="primary" className="h-ctl flex-1">Zapisz</Button>
    </div>
  </div>
</PanelRoot>
```
