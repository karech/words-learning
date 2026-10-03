# PWA, version, deploy

- `version.txt` = single release version (app + cards). Keep EMPTY in git; only `.github/workflows/pages.yml` stamps it (UTC datetime). Test enforces.
- Empty version → dev: `pwa.setup('')` does not register the SW and unregisters old ones. Offline/install/update only testable on the deployed site.
- `service-worker.js` has no version and never needs to change for a release. Cache name constant `shell`.
- `SHELL` precache list is hand-maintained. New runtime file → add to `SHELL` AND to the `cp` line in `pages.yml`. `tests/service-worker.test.js` checks SHELL vs disk (not pages.yml).
- Update check: SW never serves `version.txt` (URL check, not `req.cache` — no-store not reliably passed to SW). Running version = `caches.match('version.txt')`; server version = `fetch` with `cache: 'no-store'` → differs → unregister SW + delete caches + reload.
- No CI tests/validation (user decision): run `node --test` and `node scripts/validate-cards.js` before push.
- Actions pinned by commit SHA with `# vX.Y.Z` comment. Resolve via `git ls-remote --tags https://github.com/actions/<name>.git`.
- All URLs relative (Pages subpath `/words-learning/`). `fetch('data/…')` resolves against the page, not the module.
- Icons: PNGs rendered from `icons/icon.svg` with `qlmanage -t -s <size> -o <dir> icons/icon.svg` (no npm).
