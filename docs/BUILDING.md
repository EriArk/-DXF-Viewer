# Building DXF Viewer

[Back to the user guide](../README.md)

## Prerequisites

Use Git and Node.js with npm. The local renderer build was verified on 6 October 2026 with **Node 24.18.0 / npm 11.16.0**; this records the tested toolchain, not a claim that every older version is supported.

Clone the repository, enter it, and install the exact lockfile dependencies:

```bash
git clone https://github.com/EriArk/-DXF-Viewer.git
cd -- -DXF-Viewer
npm ci
```

The normal install downloads Electron and requires network access. A desktop session with working graphics is needed to launch the app. Prefer Windows for Windows installers and Linux for Linux packages; package tooling can make additional downloads.

The current Electron/build-tool dependencies have known update work. See [dependency maintenance #6](https://github.com/EriArk/-DXF-Viewer/issues/6); a successful build does not establish runtime security.

## Development
```bash
npm ci
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

## Verification and automation

See [DEVELOPMENT.md](DEVELOPMENT.md) for syntax, bundle and manual checks. GitHub Actions is disabled; a push does not build or publish packages. The repository currently has no automated application test suite.
