# Development guide

## Source map

| File | Responsibility |
| --- | --- |
| main.js | Electron window, OS file-open entry points and filesystem IPC |
| preload.js | Bridge exposed to the isolated renderer |
| renderer-src.js | Editable viewer UI, loading, measurements, recents and themes |
| renderer.js | Generated esbuild bundle; do not edit by hand |
| index.html | Page structure and styles |
| package.json / package-lock.json | Build commands, packaging and dependency versions |

The two editions share the viewer. Plus adds folder browsing. Verify both when changing shared behavior. No server setup is required for local development.

## Checks available today

```bash
node --check main.js
node --check preload.js
node --check renderer-src.js
npm run build:renderer
git diff --check
```

renderer.js is currently tracked. Rebuild it after changing renderer-src.js and review the resulting diff. A renderer-module and bundle-ownership refactor is tracked in [#4](https://github.com/EriArk/-DXF-Viewer/issues/4).

There is no npm test target yet. The local regression suite is tracked in [#3](https://github.com/EriArk/-DXF-Viewer/issues/3). For changes today, record the relevant manual checks: open a sample DXF, zoom/fit, rulers and guides, theme switching, recent files, and Plus folder switching. Check error behavior with a harmless invalid or missing file when changing loading.

GitHub Actions is disabled by maintainer decision (6 October 2026). Checks and packaging run locally, and release uploads are explicit. An open issue does not mean work is already implemented or a release date is promised.

## Trust boundaries and dependencies

Keep context isolation and the renderer sandbox enabled. The currently broad path-based IPC needs hardening ([#2](https://github.com/EriArk/-DXF-Viewer/issues/2)); synchronous main-process filesystem operations need replacement ([#5](https://github.com/EriArk/-DXF-Viewer/issues/5)).

Use `npm audit` to inspect the full dependency tree and assess relevance to runtime versus packaging. Electron is listed in devDependencies but ships as the application's runtime; `npm audit --omit=dev` alone is not a sufficient release check. Upgrade and test dependencies deliberately rather than applying an unreviewed major-version audit fix.

See [third-party notices](../THIRD_PARTY_NOTICES.md), [build instructions](BUILDING.md) and [contribution guidance](../CONTRIBUTING.md).
