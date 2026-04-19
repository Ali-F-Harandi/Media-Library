// Media Library - Service Worker
// Provides offline caching and PWA installability

var CACHE_NAME = 'medialib-v2';

// Static assets to pre-cache on install
var PRECACHE_URLS = [
  '/bilko/index.html',
  '/bilko/css/styles.css',
  '/bilko/js/main.js',
  '/bilko/js/modules/database.js',
  '/bilko/js/modules/utils.js',
  '/bilko/js/modules/debug.js',
  '/bilko/js/modules/nfo-parser.js',
  '/bilko/js/modules/scanner.js',
  '/bilko/js/modules/ui-renderer.js',
  '/bilko/js/modules/detail-page.js',
  '/bilko/js/modules/video-player.js',
  '/bilko/js/modules/theme.js',
  '/bilko/js/modules/folder-ops.js',
  '/bilko/js/modules/collections.js',
  '/bilko/js/modules/favorites.js',
  '/bilko/js/modules/watch-history.js',
  '/bilko/js/modules/playlist.js',
  '/bilko/js/modules/stats.js',
  '/bilko/js/modules/export.js',
  '/bilko/js/modules/playback-resume.js',
  '/bilko/manifest.json'
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
          return cachedResponse || caches.match('/bilko/index.html');
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
