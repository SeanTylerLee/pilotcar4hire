const CACHE = 'pc4h-shell-v7';
const SHELL = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/images/favicon.ico',
  '/images/favicon-32.png',
  '/images/favicon-16.png',
  '/images/apple-touch-icon.png',
  '/images/icon-192.png',
  '/images/logo.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Always fetch JS and CSS fresh so version bumps aren't stuck in cache.
  if (url.pathname.startsWith('/js/') || url.pathname.endsWith('.css')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Always try network first for HTML so pages pick up new script versions.
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
