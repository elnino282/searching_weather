const CACHE_NAME = 'weclifor-pwa-cache-v2';
const DYNAMIC_CACHE_NAME = 'weclifor-dynamic-cache-v2';
const API_CACHE_NAME = 'weclifor-api-cache-v2';

// Assets to cache immediately on install
const INITIAL_CACHED_RESOURCES = [
  '/',
  '/manifest.json',
  '/icon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(INITIAL_CACHED_RESOURCES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName.startsWith('weclifor-') &&
            cacheName !== CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE_NAME &&
            cacheName !== API_CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests (Network First, fallback to cache)
  if (url.href.includes('/api')) { 
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If the network request succeeded and the response is OK, cache it
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            return response;
          }
          
          // If the response is NOT ok (e.g. 502 from backend), try to serve from cache
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || response;
          });
        })
        .catch(() => {
          // If the network request failed entirely (e.g. server down), serve from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            throw new Error('No offline data available');
          });
        })
    );
    return;
  }

  // Handle static assets and navigation (Stale-while-revalidate or Cache First)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache valid responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback logic for offline can go here
      });

      return cachedResponse || fetchPromise;
    })
  );
});
