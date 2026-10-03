// Service worker per la PWA "Ricerca Bandi — Studio Tecnico"
// Strategia: network-first per la pagina e per i dati (dati-bandi.json/fonti.json/verifica.json)
// cosi' l'utente vede sempre i dati piu' recenti quando e' online; cache-first per il resto
// (icone, font), con fallback alla cache quando offline.

const CACHE_VERSION = 'bandi-pwa-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isDataRequest(url) {
  return /\/(dati-bandi|fonti|verifica)\.json(\?.*)?$/.test(url);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  const isNavigation = req.mode === 'navigate';

  if (isNavigation || isDataRequest(url)) {
    // Network-first: dati sempre aggiornati quando c'e' connessione, cache come paracadute offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first per asset statici (icone, font, ecc.)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
