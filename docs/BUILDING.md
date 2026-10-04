# Building DXF Viewer

[Back to the user guide](../README.md)

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
Current platform, Standard edition:
```bash
npm run dist:viewer
```

Current platform, Plus edition:
```bash
npm run dist:plus
```

Default `dist` command builds Standard:
```bash
npm run dist
```

Windows portable packages:
```bash
npm run dist:win:viewer
npm run dist:win:plus
```

Windows installers:
```bash
npm run dist:win:installer:viewer
npm run dist:win:installer:plus
```

Linux `.deb` packages:
```bash
npm run dist:linux:viewer
npm run dist:linux:plus
```
