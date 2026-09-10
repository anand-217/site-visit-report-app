const CACHE_NAME = 'svr-app-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isAppShell = event.request.mode === 'navigate' ||
    url.endsWith('/') || url.endsWith('/index.html') ||
    url.endsWith('/manifest.json');

  // App shell (index.html, manifest) — always try the network first so updates
  // reach the app immediately; fall back to cache only when offline.
  if (isAppShell) {
    event.respondWith(
      fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // External CDN libraries (jsPDF, xlsx) — network-first, cached as fallback for offline use.
  if (url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Icons and everything else — cache-first (rarely change, fine to serve instantly).
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
