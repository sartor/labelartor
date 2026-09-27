# P300BT Labels

Web app for designing and printing labels on the **Brother PT-P300BT** label printer.
It talks to the printer directly from the browser over **Web Serial** (Bluetooth Classic
RFCOMM/SPP), with no drivers or backend.

**Live:** <https://sartor.github.io/labelartor/>

## Requirements

- **Browser:** Chrome or Edge 117+ on desktop, or Chrome on Android (Web Serial). Other
  browsers can design labels but cannot print.
- **Printer:** paired with the computer in the OS Bluetooth settings. The browser's port
  chooser lists it after clicking **Connect printer**.
- **Tooling:** [Bun](https://bun.sh) 1.4+. Node.js is not required.

## Scripts

```bash
bun install        # install dependencies
bun run dev        # dev server on http://localhost:5173
bun run build      # type-check + production build into dist/
bun run preview    # serve the production build
bun test           # unit tests (protocol, raster, layout)
bun run type-check # vue-tsc (see scripts/vue-tsc-bun.cjs)
bun run lint       # ESLint (auto-fix)
bun run format     # Prettier
```

Web Serial needs a secure context: `localhost` or HTTPS.

## Deploying

`.github/workflows/deploy.yml` runs lint, type check, tests and the build on every push and
pull request, and publishes `main` to GitHub Pages. One-time setup: in the repository's
Settings → Pages set **Source** to "GitHub Actions". The workflow builds with
`BASE_PATH=/<repository>/` because Pages serves project sites under that path; for any
other host, build with `BASE_PATH` set to the path the app is served from (default `/`).

## Stack

Vue 3 (`<script setup>`, TypeScript) · Vite · Pinia · Vue Router (hash history) ·
[Halfmoon 2](https://www.gethalfmoon.com) (Bootstrap 5 compatible CSS) · Bootstrap 5 JS
plugins, wrapped in Vue components · Tabler Icons (`@tabler/icons-vue`, inline SVG) ·
Fontsource variable fonts.

## Architecture

```
src/
├── core/                  Framework-free TypeScript: no Vue, no CSS imports. Unit-tested.
│   ├── printer/
│   │   ├── protocol/      Brother raster command set: packet builders, PackBits,
│   │   │                  status register parsing, command sequences
│   │   ├── transport/     PrinterTransport interface + Web Serial implementation
│   │   ├── device.ts      PT-P300BT constants: 128-dot head, 180 dpi, tape specs
│   │   ├── printer.ts     PtPrinter: status query and print job flow, serialised
│   │   ├── raster.ts      RasterImage: 1-bit, one line per dot along the tape
│   │   └── errors.ts
│   ├── label/             Label model, text layout (auto-fit), extra tape spacing,
│   │                      canvas rendering, rasterisation (pixels <-> printer raster)
│   └── fonts/             Bundled font catalogue, font loading
├── stores/                Pinia setup stores: printer, label, labelRender, rasterCache,
│                          queue, projects, history, settings
├── composables/           useAppStatus, useBackup, useColorMode, useDelayedFlag,
│                          useLabelActions, useOpenInEditor, usePersistedRef
├── components/
│   ├── ui/                Vue wrappers for Bootstrap JS (AppDropdown, CollapsibleCard), AppIcon,
│   │                      SegmentedControl, NumberField
│   ├── layout/            App shell (navbar, backup menu, theme toggle)
│   ├── editor/            Editing controls (font, bold, line height, alignment, text, tape
│   │                      length) and the tape preview
│   ├── label/             LabelTile (a saved label at real size), LabelListPanel (folding list
│   │                      with count, tape total and clear; tiles flow in rows)
│   ├── panels/            The page's sections, all on CollapsibleCard: Preview, Text (with the
│   │                      print / queue / save actions), Queue, Projects, History
│   └── printer/           Status/connect control with printer menu and error text
├── views/                 Routed pages
├── router/
└── styles/                Global CSS (bundled @font-face rules)
```

**Data flow:** `label` store → `core/label/pipeline.ts` (`renderDocument`: font load →
layout → canvas → `rasterize`) → `RasterImage`. The editor runs it through the
`labelRender` store; queue and history entries go through the `rasterCache` store. One
raster per label feeds both its preview (`rasterToPixels`) and its print job, so what you
see is what prints.

**Queue and history:** both hold label documents (not images) in localStorage and are
re-rendered for the current tape. `queue.printAll` sends the labels as one batch through
`PtPrinter.printBatch`, which chains every label but the last (no feed between them, so
the tape lead is spent once — verified on the printer), and moves each label to the
history when the printer confirms it. Direct prints go to the history too. The navbar's
backup menu exports both lists to a JSON file (`core/label/backup.ts` validates it on
import; labels are merged by id).

**Projects:** named snapshots of the queue (`core/label/projects.ts`, `stores/projects.ts`).
The queue remembers the project it was saved to or loaded from, so Save overwrites it and
"Save as…" starts a new one; loading replaces the queue after a confirmation. Projects
have their own file format (`createProjectFile` / `parseProjectFile`; import replaces a
project with the same id) and are part of the full backup as well.

**Printer connection:** the store reopens the last granted port on load (`reconnect`),
without the chooser; a deliberate Disconnect turns that off until the next Connect.

**Pixel-exact text:** the label is thresholded to 1 bit, so the layout puts every line
on a whole-dot baseline and `fillTextSnapped` starts every glyph on a whole dot.
Fractional positions make the same letter rasterise with different widths.

### Conventions

- `core/` must stay free of Vue and bundler-specific imports so it can be tested with
  `bun test` and reused elsewhere. Browser APIs are fine there (Web Serial, canvas).
- Tests live next to the code in `__tests__/` folders.
- **Styling:** use Halfmoon/Bootstrap components and utility classes as they are. App CSS
  never overrides Bootstrap classes or variables. Scoped CSS is reserved for visuals
  Bootstrap has no equivalent for (the tape drawing in `LabelPreview`, a max-height on
  the log).
- **Icons:** Tabler icons through `components/ui/AppIcon.vue`: import the icon component
  from `@tabler/icons-vue` and pass it as `icon`. Sizes are whole pixels (16 / 18 / 22)
  so the strokes stay crisp.
- **Bootstrap JS:** use a plugin (Dropdown, Collapse, Modal, Tooltip, Toast, …) only
  through a Vue wrapper in `components/ui/`. The wrapper creates the instance in
  `onMounted`, calls `dispose()` in `onBeforeUnmount`, and never binds classes Bootstrap
  toggles (such as `show`) from Vue. Import plugins individually from
  `bootstrap/js/dist/*`.
- Device handles (serial port, `PtPrinter`) live outside reactive state in the stores.
- User preferences and the label draft persist to `localStorage` under the `pt-labels:`
  prefix.

### Bun and vue-tsc

vue-tsc adds `.vue` support by patching `fs.readFileSync` before `require()`-ing
TypeScript's compiler. Bun's module loader does not read files through that function, so
under Bun the patch silently does nothing. `scripts/vue-tsc-bun.cjs` applies vue-tsc's
own transform and evaluates the compiler directly. On Node.js, call `vue-tsc --build`
instead.

## Printer protocol notes

- Before each operation: 64 × `NUL` (clears the buffer), `ESC @` (reset), `ESC i a 01`
  (raster mode).
- Status: `ESC i S` returns a 32-byte register with tape width and type, errors and phase.
- Job: `ESC i z` (media and line count), `ESC i K` / `ESC i M` (chaining and cut flags),
  `ESC i d` (margin), `M 02` (PackBits compression), then one `G` (data) or `Z` (blank)
  packet per raster line, and `Control-Z` to print. The printer then sends status
  packets until "printing completed".
- Each raster line is 16 bytes covering the 128-dot head. On 12 mm tape the printable
  band is 64 dots (~9 mm), centred on the head.

## License

[MIT](LICENSE). The bundled fonts keep their own licenses (SIL OFL, Apache 2.0, or the
GNU font-embedding exception for Unifont), and the icons are Tabler Icons (MIT).

## Credits

The printer protocol layer was re-implemented from the JavaScript port in
[Ircama/PT-P300BT](https://github.com/Ircama/PT-P300BT) (`web/printer.js`). That port is
based on the work in gists by [stecman](https://gist.github.com/stecman/ee1fd9a8b1b6f0fdd170ee87ba2ddafd),
[dogtopus](https://gist.github.com/dogtopus/64ae743825e42f2bb8ec79cea7ad2057) and
[vsigler](https://gist.github.com/vsigler/98eafaf8cdf2374669e590328164f5fc).
Note: that repository has no license file.
