// NĀḌĪ service worker: offline shell + runtime cache for MediaPipe assets
const C = 'nadi-v4';
const HOSTS = ['cdn.jsdelivr.net', 'storage.googleapis.com'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(['./', './index.html']).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== C).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const mine = u.origin === location.origin;
  if (!mine && !HOSTS.includes(u.hostname)) return;

  // the app itself: network first, so updates show up immediately; cache only when offline
  const isPage = e.request.mode === 'navigate' || (mine && (u.pathname.endsWith('/') || u.pathname.endsWith('.html')));
  if (isPage) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r && r.ok) { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); }
        return r;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  // MediaPipe runtime + model: cache first (large, versioned URLs)
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); }
      return r;
    }))
  );
});
