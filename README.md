# DXF Viewer

Fast offline DXF viewing with practical measurement tools.

This project now ships in two editions from the same codebase:

- `DXF Viewer` (standard): focused single-file workflow
- `DXF Viewer Plus`: adds folder-based workflow and extended quick access panels

## Choose Your Edition

### DXF Viewer (Standard)
- Open `.dxf` from file dialog, drag-and-drop, or recent files
- Smooth zoom/pan viewer
- Light/Dark theme
- Rulers in millimeters
- Draggable guide markers with `ΔX` / `ΔY` measurement
- Optional snap-to-geometry for guide markers
- Adjustable line thickness

### DXF Viewer Plus
Includes everything from Standard, plus:
- Open a whole folder with `.dxf` files
- Recent folders list
- Sidebar list of all `.dxf` files in the active folder
- Quick switching between files inside the current folder

## What Changed In v1.2.0 (vs v1.1.0)
- Split into two product editions: `DXF Viewer` and `DXF Viewer Plus`
- Added edition-aware UI/branding and behavior
- Kept folder workflow only in Plus edition
- Improved topbar by removing duplicated app-name chip
- Fixed packaging config to avoid oversized release artifacts

## Keyboard Shortcuts
- `Ctrl+O`: Open file
- `Ctrl+Shift+O`: Open folder (Plus only)
- `Ctrl+,`: Toggle Settings
- `Ctrl+R`: Toggle rulers
- `Ctrl+F`: Fit drawing to view
- `Ctrl+=` / `Ctrl+-`: Line thickness up/down
- `Ctrl+T`: Toggle theme
- `Ctrl+X`: Close app window
- `F1`: Open Help

## Development
```bash
npm install
npm start
```

Run Plus edition:
```bash
npm run start:plus
```

## Build Packages
Standard edition:
```bash
npm run dist:viewer
```

Plus edition:
```bash
npm run dist:plus
```

Default `dist` command builds Standard:
```bash
npm run dist
```

## Acknowledgements
Special thanks to **Artyom Lebedev**, creator of [`dxf-viewer`](https://github.com/vagran/dxf-viewer), which powers core DXF rendering in this app.

## License
MIT
