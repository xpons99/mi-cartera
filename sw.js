const CACHE = 'micartera-v3';
// BASE se detecta automáticamente: funciona en localhost Y en usuario.github.io/repo/
const BASE = self.location.pathname.replace(/sw\.js$/, '');
const FILES = [
  BASE,
  BASE + 'index.html',
  BASE + 'css/app.css',
  BASE + 'js/constants.js',
  BASE + 'js/store.js',
  BASE + 'js/gastos.js',
  BASE + 'js/objetivos.js',
  BASE + 'js/simulador.js',
  BASE + 'js/csv.js',
  BASE + 'js/activos.js',
  BASE + 'js/app.js',
  BASE + 'manifest.json',
  BASE + 'icon.png',
  BASE + 'icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    // Promise.allSettled: si un archivo falla no cancela el resto del caché
    caches.open(CACHE).then(cache =>
      Promise.allSettled(FILES.map(url => cache.add(url)))
    )
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
  // Solo interceptar peticiones del mismo origen
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // Fallback para navegación: sirve index.html si el recurso no está en caché
      if (e.request.mode === 'navigate') {
        return caches.match(BASE + 'index.html') || fetch(e.request);
      }
      return fetch(e.request);
    })
  );
});
