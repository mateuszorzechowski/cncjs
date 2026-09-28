# design-sync notes — cncjs panel

The design system is the panel's presentational components (`src/panel/ui`),
not a published package. There is no `dist/` and no `.d.ts` (the repo is
JavaScript only), so:

- **Entry**: `.design-sync/entry.jsx` re-exports the chosen components by name
  (their modules `export default`, which the converter's synth-entry
  `export *` would drop) and defines `PanelRoot`, the shell wrapper.
- **Component list**: `componentSrcMap` in config.json — one line per export
  in `entry.jsx`. Add a component in both places.
- **Excluded on purpose**: anything bound to a live machine (`machine.*`
  props, `machine/controller`, sockets, three.js scenes, the editor). The
  bundle must never import `machine/controller` — check the module graph
  after adding a component.
- **React 19**: the panel aliases `react` to `react19` (webpack). The bundle
  takes React from `window` (the converter's shim); the vendored copy comes
  from `--node-modules .design-sync/.cache/nm/node_modules`, which holds real
  COPIES of `node_modules/react19` as `react`, `react-dom19` as `react-dom`,
  and `scheduler` (0.27). Not junctions, and the folder must be named
  `node_modules`: otherwise react-dom resolves `react` from the repo root,
  which is React 17 (the old app), and every preview dies with
  "ReactDOM.createRoot is not a function". Gitignored — recreate on a fresh
  clone.
- **CSS**: `buildCmd` compiles the panel's own Tailwind (config
  `tailwind.panel.config.js`, input `src/panel/styles/base.css`, which imports
  `tokens.css`) into `.design-sync/.cache/panel.css` = `cssEntry`. Re-run it
  before every sync; it only holds classes the panel's sources use.
- **PanelRoot** mirrors App.jsx's shell: `@container/shell` div (the
  `@3xl/shell:` queries), ShellWidth/ShellNode providers (sheets portal into
  the node, so children render once it exists), UnitsProvider with the
  server's mm rule, and the language (`pl` by default).
- **Fonts**: the panel names IBM Plex Sans / Azeret Mono / IBM Plex Mono but
  ships no `@font-face`; it renders in system fonts unless installed.
  Mateusz, 2026-09-26: keep system fonts in the design system too — a
  deliberate substitute, not a miss. `[FONT_MISSING]` for those families is
  expected.
- **Only the panel's classes exist.** The CSS is Tailwind compiled from the
  panel's sources, so an arbitrary class a preview (or a design) invents —
  `h-[600px]` — is simply absent and does nothing. Use classes the panel
  already uses (`grep` the bundle CSS: `.h-[32rem]`, `.h-full`, `.h-ctl`…).
- **Sheets need a shell with a height.** `Sheet`/`ConfirmSheet` are `fixed`
  inside the `@container/shell` div (container-type makes it their
  containing block) and take `max-h-[85%]` of it. Inside a card that div has
  no height, so previews nest `<PanelRoot className="h-[32rem]">`; overrides
  give the card `cardMode: single` and a 900x620 viewport.
- **Widths and heights that exist** (checked with `grep -oF '.w-\[360px\]'`
  against the bundle CSS — escaped, `-F`; `grep -c` counts lines):
  `w-side`, `w-[360px]`, `w-rail`, `w-jcard`, `w-48`, `w-36`, `w-full`,
  `max-w-[1180px]`; `h-[32rem]`, `h-[340px]`, `h-60`, `h-full`, `h-ctl`,
  `h-chiph`. Absent: `w-80`, `w-96`, `w-64`, `w-72`, `w-[28rem]`,
  `w-[46rem]`, `p-4`, `gap-5`.
- **A card cell stretches its child**: a lone inline component (WcsBadge)
  goes full width; wrap it in `<div className="flex">`.
- **The default cell's shell is wide (≥768px)**, so components show their
  wide form; a nested `<PanelRoot className="w-[360px]">` gives the phone
  form (StateChip).
- **NavTabs** previews closed only — whether it is open is internal state.

- **Device cells**: a capture is the viewport only (~600px usable), so a
  phone frame (scale 1) of a sheet uses `height={560}`; tablet 768 / PC 1080
  fit at 0.6 / 0.4. DroStrip reads its own `@container`, so its device cells
  put it beside the jog card as JogWide does. SegmentedChoice `fitWide` with
  the five Settings tabs is at its limit at 360px — the cells use a 2-option
  choice.
- **A comment-only preview edit clears the grade** (grade key follows the
  source) and capture deletes `<Name>.grade.json` — copy the notes aside
  first if they matter.
- **Breakpoints**: phone = shell < 768px (`useIsPhone`, same line as
  `@3xl/shell`); `useIsWide` = shell ≥ 1800px (Full HD PC). DateTimeField
  chooses its picker by `(pointer: coarse)`, not width.

- **A comment describing an example goes INSIDE its export**, as the first
  lines of the body: the converter's example slice runs from
  `export const X =` to the next export, so a comment above an export lands
  at the end of the previous example and one above the first export is
  dropped. Zero-argument helpers (`const Rows = () => (...)`) are inlined
  into each example that used them, so every example is self-contained.
  Left as helpers (re-sync risk: their examples reference names the agent
  cannot see): helpers with props (Sheet `Layer`, FadeScroller `Journal`,
  SegmentedChoice `Caption`, NavTabs `Phone`) and data constants
  (`ENTRIES`, `GROUPS`, `DESTINATIONS`, `ITEMS`, `LEVELS`, `AXES`).

## Findings about the panel itself (not sync problems)

- The `[data-target='fullhd']` token set (`--val` 46px, `--ctl` 68px,
  `fullhd:` variants) is applied only by the review frame on :8765 — a real
  1920px screen never gets it (ui/shell.jsx says so). DeviceFrame's PC cells
  therefore show what a real PC shows: the default sizes at 1920px.

- `TextField` has no disabled styling: a disabled field looks enabled (the
  panel never disables one today). Its preview has no Disabled cell.

## Known render warns

(none recorded yet)
- **Devices** (Mateusz, 2026-09-27: the design agent must know how each
  component looks on a phone, a tablet and a PC). `DeviceFrame` (entry.jsx)
  lays a PanelRoot out at 360 / 1024 / 1920 px and scales it (1, 0.6, 0.4)
  so the container queries answer as on the device. Components that change
  layout have `Phone`/`Tablet`/`PC` cells with a comment above each saying
  what changes (from the source); the rest carry a `// Telefon / tablet /
  PC:` line above their first export. The converter copies export comments
  into `.prompt.md`, which is why the notes live there and not in a docs
  file — a per-component doc (docsDir/docsMap) REPLACES the examples in
  `.prompt.md`, so don't add one.

## Screens and DESIGN.md (guidelines)

- `guidelinesGlob: ["src/panel/DESIGN.md"]` ships the panel's design brief as
  `guidelines/src/panel/DESIGN.md`; `conventions.md` points agents at it.
- Screenshots of the whole screens are NOT produced by the converter. After
  every build (the converter wipes `ds-bundle/`), and before uploading:
  1. with the panel server on :8001 (never :8000):
     `node .design-sync/capture-screens.cjs http://localhost:8001`
     (needs `output/cncjs/server` built; 36 PNGs in `.design-sync/.cache/screens`);
  2. `mkdir -p ds-bundle/guidelines/screens && cp .design-sync/.cache/screens/*.png ds-bundle/guidelines/screens/`;
  3. upload `guidelines/**` with the rest.
- `auxSha` in `_ds_sync.json` is computed before the screenshots are copied,
  so the next re-sync always sees `aux` as changed and re-uploads
  `guidelines/` — harmless, expected.
- Reshoot when a screen's layout changes; DESIGN.md §6 describes what the
  shots showed on 2026-09-27.
