# Слова — Serbian ↔ Russian vocabulary

A small offline-first PWA for learning everyday Serbian (Latin script) with Russian translations.
Multiple-choice cards in both directions, a lightweight level-based spaced-repetition scheduler,
and daily stats — all stored locally on the device. Deployed to GitHub Pages.

Specs: [`docs/app-spec.md`](docs/app-spec.md), [`docs/vocabulary-cards-generation-spec.md`](docs/vocabulary-cards-generation-spec.md).

## Tech stack

- HTML, plain CSS, JavaScript ES modules — no build step, no bundler, no npm dependencies
- [Alpine.js](https://alpinejs.dev) 3 (vendored in `vendor/`) as a thin UI layer
- `localStorage` for progress, stats and settings
- Service Worker + Web App Manifest for install and offline use
- Node.js built-ins only for tests (`node --test`) and the cards validator
- GitHub Actions → GitHub Pages (copies files, stamps `version.txt`)

## Commands

```bash
# Local server (any static server works)
npx serve .
# Server + ngrok tunnel for testing on a phone (default port 18080)
scripts/dev.sh [port]

# Tests
node --test

# Validate data/cards.json (against the latest data/history/* if present)
node scripts/validate-cards.js
```
