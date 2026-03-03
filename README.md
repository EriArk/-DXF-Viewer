# DXF Viewer Plus

A local desktop DXF viewer by **AbyssTail Designs**.
Built with Electron for fast, offline viewing, quick measurements, and practical folder workflows.

## What It Does
- Opens `.dxf` files from file picker, folder picker, drag-and-drop, or recent lists
- Displays drawings with zoom/pan controls
- Supports Light and Dark themes
- Includes rulers in millimeters
- Supports draggable measurement guides with `ΔX` and `ΔY`
- Optional snap-to-geometry for more precise guide placement
- Adjustable rendered line thickness
- Keeps recent files and recent folders
- Shows all `.dxf` files from the currently opened folder in the sidebar

## Keyboard Shortcuts
- `Ctrl+O`: Open file
- `Ctrl+Shift+O`: Open folder
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
