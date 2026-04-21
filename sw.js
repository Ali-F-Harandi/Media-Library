// Media Library - Service Worker
// Provides offline caching and PWA installability

var CACHE_NAME = 'medialib-v11';

// Static assets to pre-cache on install
var PRECACHE_URLS = [
  '/bilkos-media-library/index.html',
  '/bilkos-media-library/css/styles.css',
  '/bilkos-media-library/js/main.js',
  '/bilkos-media-library/js/modules/database.js',
  '/bilkos-media-library/js/modules/utils.js',
  '/bilkos-media-library/js/modules/debug.js',
  '/bilkos-media-library/js/modules/nfo-parser.js',
  '/bilkos-media-library/js/modules/scanner.js',
  '/bilkos-media-library/js/modules/ui-renderer.js',
  '/bilkos-media-library/js/modules/detail-page.js',
  '/bilkos-media-library/js/modules/video-player.js',
  '/bilkos-media-library/js/modules/theme.js',
  '/bilkos-media-library/js/modules/folder-ops.js',
  '/bilkos-media-library/js/modules/collections.js',
  '/bilkos-media-library/js/modules/favorites.js',
  '/bilkos-media-library/js/modules/watch-history.js',
  '/bilkos-media-library/js/modules/playlist.js',
  '/bilkos-media-library/js/modules/stats.js',
  '/bilkos-media-library/js/modules/export.js',
  '/bilkos-media-library/js/modules/playback-resume.js',
  '/bilkos-media-library/manifest.json'
];

// Install event: pre-cache known static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    }).catch(function(err) {
      console.warn('[SW] Pre-cache failed:', err);
    })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch event: Cache-first for CSS/JS/images, Network-first for HTML
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  var isHTML = event.request.headers.get('accept') &&
               event.request.headers.get('accept').indexOf('text/html') !== -1;

  if (isHTML) {
    // Network-first for HTML pages
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request).then(function(cachedResponse) {
          return cachedResponse || caches.match('/bilkos-media-library/index.html');
        });
      })
    );
  } else {
    // Cache-first for CSS, JS, images, and other static assets
    event.respondWith(
      caches.match(event.request).then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200 && (
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.json') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.webp') ||
            url.pathname.endsWith('.ico')
          )) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(function() {
          // Return offline fallback for images
          if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
            return new Response('', { status: 204 });
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
  }
});
