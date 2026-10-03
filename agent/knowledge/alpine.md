# Alpine.js

- Vendored ESM build: `vendor/alpine.esm.min.js` = alpinejs 3.17.4 `dist/module.esm.min.js`. Version/source in `vendor/README.md`.
- `js/app.js` imports it, `Alpine.data('app', …)`, then `Alpine.start()`. `index.html` loads only `js/app.js` (no `defer` CDN tag).
- Alpine = UI glue only. Logic lives in plain modules (`scheduler`, `distractors`, `stats`, `storage`, `cards`, `question`, `words`) testable in Node. Display-state logic → `question.js`, not in the component.
- `x-if` template needs exactly one root element.
