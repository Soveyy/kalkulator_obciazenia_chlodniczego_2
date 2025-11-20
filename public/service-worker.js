const CACHE_NAME = 'heat-gain-calculator-v0.31';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/data/baza_danych_NSRDB.json',
  '/data/baza_danych_PVGIS.json',
  '/data/rts_factors.json',
  '/data/shading_database.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Failed to cache during install:', error);
        });
      })
  );
});

self.addEventListener('activate', event => {
  // Immediately grab control of the clients
  event.waitUntil(clients.claim());

  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches to free up space and ensure fresh data
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Special handling for navigation requests (HTML) to ensure we don't get stuck on old versions
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(error => {
            // Fallback logic for specific files if network fails
            const url = new URL(event.request.url);
            if (url.pathname.endsWith('/index.tsx')) {
              return caches.match('/index.tsx');
            }
        });
      })
  );
});