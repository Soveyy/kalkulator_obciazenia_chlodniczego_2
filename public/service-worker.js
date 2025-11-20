const CACHE_NAME = 'heat-gain-calculator-v0.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/data/baza_danych_NSRDB.json',
  '/data/baza_danych_PVGIS.json',
  '/data/rts_factors.json',
  '/data/shading_database.json',
  // Assuming these paths for icons based on manifest
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use addAll to fetch and cache all specified URLs.
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Failed to cache during install:', error);
        });
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can be consumed only once.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a stream.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(error => {
            console.log('Network request failed. Trying fallback for versioned script.', error);
            const url = new URL(event.request.url);
            // If the failed request was for our versioned main script, try to serve the un-versioned one from cache.
            if (url.pathname.endsWith('/index.tsx')) {
              return caches.match('/index.tsx');
            }
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});