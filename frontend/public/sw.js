// Esperanza 9.0 Progressive Web App Service Worker
const CACHE_NAME = 'esperanza-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/esperanza-logo.png',
  '/assets/esperanza-font-logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
];

// 1. Install Event: Cache Core Static Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clear Old Cache Versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Strategy:
// - API calls: Network-First (real-time live scores & stage status)
// - Static assets & images: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET and cross-origin extension requests
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API calls: Network-First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Network connection unavailable' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Navigation requests: Stale-While-Revalidate with root fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
          return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // Static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || new Response(null, { status: 404, statusText: 'Not Found' }));

      return cachedResponse || fetchPromise;
    })
  );
});

// Support manual reload / skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
