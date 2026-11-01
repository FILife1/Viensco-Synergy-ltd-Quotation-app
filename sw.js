/* Viensco Synergy Ltd – offline cache. Bump CACHE whenever you upload new files. */
const CACHE = 'viensco-synergy-v2';
const FILES = ['./', 'index.html', 'style.css', 'assets.js', 'data.js', 'core.js', 'exporter.js', 'ui.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'splash.jpg'];
// cache each file on its own, so one missing file can never break the install
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const same = new URL(req.url).origin === location.origin;
  const keep = r => { if (r && r.ok && same) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; };
  if (req.mode === 'navigate') {   // pages: network first (fresh when online), cached app when offline
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match('index.html') || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => { const net = fetch(req).then(keep).catch(() => hit); return hit || net; }));
});
