// Offline app shell, cache-first (spec §4, §42). Registered only when version.txt is non-empty.
// Updates don't change this file: the update button compares version.txt with the server
// and, if it differs, clears this cache and re-registers (spec §43).

const CACHE = 'shell'

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/cards.js',
  'js/config.js',
  'js/distractors.js',
  'js/pwa.js',
  'js/question.js',
  'js/scheduler.js',
  'js/stats.js',
  'js/storage.js',
  'version.txt',
  'vendor/alpine.esm.min.js',
  'fonts/inter-latin-wght-normal.woff2',
  'fonts/inter-latin-ext-wght-normal.woff2',
  'fonts/inter-cyrillic-wght-normal.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'data/cards.json',
]

self.addEventListener('install', event => {
  // cache: 'reload' bypasses the HTTP cache so a reinstall never precaches stale files.
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))))
})

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  // version.txt always from the network: the update check compares it with the cached copy (§43).
  // Not keyed on req.cache — browsers don't reliably pass 'no-store' through to the worker.
  if (url.pathname.endsWith('/version.txt')) return
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit ?? fetch(req)))
})
