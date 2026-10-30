/**
 * sw.js - TalePickle Progressive Web App (PWA) Service Worker
 * Provides offline reading, instant app launch, and background asset caching.
 */

const CACHE_NAME = 'talepickle-v2.3';

const PRECACHE_ASSETS = [
  './',
  'index.html',
  'style.css?v=2.2',
  'analytics.js?v=1.0',
  'main.js?v=2.3',
  'tts.js?v=2.2',
  'svg-art.js?v=2.0',
  'rough.js?v=2.0',
  'manifest.webmanifest',
  'icons/icon.svg',
  'data/stories.json',
  'data/audio_manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching App Shell');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Precache partial error (continuing):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ServiceWorker] Clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests and http/https schemes
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass service worker for Google Analytics & Tag Manager
  if (url.hostname.includes('google-analytics.com') || url.hostname.includes('googletagmanager.com')) {
    return;
  }

  // 1. Navigation requests (HTML pages / clean routes /story/:id)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('index.html') || caches.match('./');
      })
    );
    return;
  }

  // 2. Data JSON files (stories.json, audio_manifest.json): Network First with Cache Fallback
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3. Static Assets (JS, CSS, SVGs, Fonts, Icons): Cache First with Network Fallback
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) return cachedRes;

      return fetch(req).then((networkRes) => {
        // Cache valid same-origin assets or Google Fonts
        if (
          networkRes &&
          networkRes.status === 200 &&
          (url.origin === self.location.origin || url.hostname.includes('fonts.'))
        ) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      }).catch((err) => {
        // Return nothing for optional assets if offline
        return null;
      });
    })
  );
});
