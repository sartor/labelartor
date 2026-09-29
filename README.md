# Labelartor

**Live:** <https://sartor.github.io/labelartor/>

Design and print labels on the **Brother PT-P300BT** from the browser. The app talks to the
printer over **Web Serial** (Bluetooth Classic SPP): no drivers, no backend, nothing leaves
the browser.

<p align="center">
  <img src="docs/screenshot-light.png" width="49%" alt="Labelartor in the light theme">
  <img src="docs/screenshot-dark.png" width="49%" alt="Labelartor in the dark theme">
</p>

## Features

- Labels built from blocks side by side: text, icons and blank space; drag to reorder.
- Text of one or more lines in 30 bundled fonts, with bold, size, line gap and alignment.
- 500+ pixel-perfect icons in categories, plus your own: paste an SVG, PNG or JPEG.
- Real-size preview with a crispness score.
- Projects of labels printed as one batch, saved as you edit; history of printed labels.
- JSON backup and project files. Everything stays in the browser.

## Requirements

- **Browser:** Chrome or Edge 117+, or Firefox 156+ with Web Serial on, on desktop; Chrome on Android.
- **Printer:** paired with the computer in the OS Bluetooth settings.
- **Tooling:** [Bun](https://bun.sh) 1.4+. Vue 3 · Vite · Pinia · [Halfmoon 2](https://www.gethalfmoon.com)

## Scripts

```bash
bun install        # install dependencies
bun run dev        # dev server on http://localhost:5173
bun run build      # type-check + production build into dist/
bun run preview    # serve the production build
bun test           # unit tests (protocol, raster, layout, icons)
bun run type-check # vue-tsc (see scripts/vue-tsc-bun.cjs)
bun run lint       # ESLint (auto-fix)
bun run lint:check # ESLint + Prettier check, as in CI
bun run format     # Prettier
```

Web Serial needs a secure context: `localhost` or HTTPS.

## License

[MIT](LICENSE). The bundled fonts keep their own licenses (SIL OFL, Apache 2.0, or the
GNU font-embedding exception for Unifont).

## Credits

The printer protocol layer was re-implemented from the JavaScript port in
[Ircama/PT-P300BT](https://github.com/Ircama/PT-P300BT) (`web/printer.js`). That port is
based on the work in gists by [stecman](https://gist.github.com/stecman/ee1fd9a8b1b6f0fdd170ee87ba2ddafd),
[dogtopus](https://gist.github.com/dogtopus/64ae743825e42f2bb8ec79cea7ad2057) and
[vsigler](https://gist.github.com/vsigler/98eafaf8cdf2374669e590328164f5fc).