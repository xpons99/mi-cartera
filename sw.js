const CACHE = 'micartera-v2';
const FILES = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/constants.js',
  '/js/store.js',
  '/js/gastos.js',
  '/js/objetivos.js',
  '/js/simulador.js',
  '/js/csv.js',
  '/js/app.js',
  '/manifest.json',
  '/icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
