# 🦊 DXF Viewer

A local desktop DXF viewer by **AbyssTail Designs**.
Built with Electron for fast, offline viewing and quick measurements.

## What It Does
- Opens `.dxf` files from file picker or drag-and-drop
- Displays drawings with zoom/pan controls
- Supports Light and Dark themes
- Includes rulers in millimeters
- Supports draggable measurement guides with `ΔX` and `ΔY`
- Optional snap-to-geometry for more precise guide placement
- Adjustable rendered line thickness

## Keyboard Shortcuts
- `Ctrl+O`: Open DXF
- `Ctrl+,`: Toggle Settings
- `Ctrl+R`: Toggle rulers
- `Ctrl+F`: Fit drawing to view
- `Ctrl+=` / `Ctrl+-`: Line thickness up/down
- `Ctrl+T`: Toggle theme
- `Ctrl+X`: Close app window
- `F1`: Open Help

## Installation
```bash
npm install
```

## Run (Development)
```bash
npm start
```

## Build Packages
```bash
npm run dist
```

## Tech Stack
- Electron
- dxf-viewer
- three.js
- esbuild

## Acknowledgements
Special thanks to **Artyom Lebedev**, creator of the [`dxf-viewer`](https://github.com/vagran/dxf-viewer) library that powers core DXF rendering in this app.

## License
MIT
