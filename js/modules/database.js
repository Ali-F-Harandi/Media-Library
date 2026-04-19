// Movie Library - Database Module
// Handles IndexedDB operations for settings persistence and poster caching

// Check if IndexedDB is available (not available on some file:// contexts)
var _indexedDBAvailable = true;
try {
    if (!window.indexedDB) _indexedDBAvailable = false;
} catch(e) {
    _indexedDBAvailable = false;
}

var DB_NAME = 'MovieLibraryDB';
var STORE_NAME = 'settings';
var POSTER_CACHE_STORE = 'posterCache';
var THUMBNAIL_STORE = 'thumbnails';
var DB_VERSION = 3; // Bumped from 2 to 3 for thumbnails store

function openDB() {
    if (!_indexedDBAvailable) {
        return Promise.reject(new Error('IndexedDB not available'));
    }
    // Check if IndexedDB is available (commonly unavailable on file:// protocol)
    if (!window.indexedDB) {
        return Promise.reject(new Error('IndexedDB not available'));
    }
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            // Add posterCache object store with keyPath 'title'
            if (!db.objectStoreNames.contains(POSTER_CACHE_STORE)) {
                var posterStore = db.createObjectStore(POSTER_CACHE_STORE, { keyPath: 'title' });
                posterStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            // Add thumbnails object store with keyPath 'path'
            if (!db.objectStoreNames.contains(THUMBNAIL_STORE)) {
                var thumbStore = db.createObjectStore(THUMBNAIL_STORE, { keyPath: 'path' });
                thumbStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
        request.onsuccess = function(e) {
            resolve(e.target.result);
        };
        request.onerror = function(e) {
            // If version mismatch, delete the database and retry
            if (e.target.error && e.target.error.name === 'VersionError') {
                var deleteRequest = indexedDB.deleteDatabase(DB_NAME);
                deleteRequest.onsuccess = function() {
                    // Retry opening with the correct version
                    openDB().then(resolve).catch(reject);
                };
                deleteRequest.onerror = function() {
                    reject(e.target.error);
                };
            } else {
                reject(e.target.error);
            }
        };
    });
}

async function saveSetting(key, value) {
    if (!_indexedDBAvailable) return;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function(e) { reject(e.target.error); };
    });
}

async function getSetting(key) {
    if (!_indexedDBAvailable) return null;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = function(e) { resolve(e.target.result); };
        request.onerror = function(e) { reject(e.target.error); };
    });
}

// ============================================================================
// POSTER CACHE - Cache poster thumbnails in IndexedDB
// ============================================================================

/**
 * Cache a poster blob in IndexedDB
 * @param {string} title - Movie title (used as key)
 * @param {Blob} blob - Poster image blob
 */
async function cachePoster(title, blob) {
    if (!_indexedDBAvailable) return;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(POSTER_CACHE_STORE, 'readwrite');
        var entry = {
            title: title,
            blob: blob,
            timestamp: Date.now()
        };
        tx.objectStore(POSTER_CACHE_STORE).put(entry);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function(e) { reject(e.target.error); };
    });
}

/**
 * Get a cached poster blob from IndexedDB
 * @param {string} title - Movie title
 * @returns {Promise<Object|null>} Object with blob and timestamp, or null if not found
 */
async function getCachedPoster(title) {
    if (!_indexedDBAvailable) return null;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(POSTER_CACHE_STORE, 'readonly');
        var request = tx.objectStore(POSTER_CACHE_STORE).get(title);
        request.onsuccess = function(e) {
            var result = e.target.result;
            resolve(result || null);
        };
        request.onerror = function(e) { reject(e.target.error); };
    });
}

/**
 * Clear all cached posters from IndexedDB
 */
async function clearPosterCache() {
    if (!_indexedDBAvailable) return;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(POSTER_CACHE_STORE, 'readwrite');
        tx.objectStore(POSTER_CACHE_STORE).clear();
        tx.oncomplete = function() {
            if (typeof window.Utils !== 'undefined') {
                window.Utils.showToast('Poster cache cleared', 'success');
            }
            resolve();
        };
        tx.onerror = function(e) { reject(e.target.error); };
    });
}

/**
 * Get the count of cached posters
 * @returns {Promise<number>} Number of cached posters
 */
async function getPosterCacheSize() {
    if (!_indexedDBAvailable) return 0;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(POSTER_CACHE_STORE, 'readonly');
        var request = tx.objectStore(POSTER_CACHE_STORE).count();
        request.onsuccess = function(e) { resolve(e.target.result); };
        request.onerror = function(e) { reject(e.target.error); };
    });
}

// ============================================================================
// THUMBNAIL CACHE - Cache poster thumbnails as data URLs in IndexedDB
// ============================================================================

/**
 * Save a thumbnail data URL to the cache
 * @param {string} path - Unique path identifier for the poster
 * @param {string} dataUrl - Data URL of the poster image
 */
window.saveThumbnail = async function(path, dataUrl) {
    if (!_indexedDBAvailable) return;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(THUMBNAIL_STORE, 'readwrite');
        var entry = {
            path: path,
            dataUrl: dataUrl,
            timestamp: Date.now()
        };
        tx.objectStore(THUMBNAIL_STORE).put(entry);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function(e) { reject(e.target.error); };
    });
};

/**
 * Get a cached thumbnail from the cache
 * @param {string} path - Unique path identifier for the poster
 * @returns {Promise<Object|null>} Object with dataUrl and timestamp, or null if not found
 */
window.getThumbnail = async function(path) {
    if (!_indexedDBAvailable) return null;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(THUMBNAIL_STORE, 'readonly');
        var request = tx.objectStore(THUMBNAIL_STORE).get(path);
        request.onsuccess = function(e) {
            var result = e.target.result;
            resolve(result || null);
        };
        request.onerror = function(e) { reject(e.target.error); };
    });
};

/**
 * Clear all cached thumbnails from IndexedDB
 */
window.clearThumbnailCache = async function() {
    if (!_indexedDBAvailable) return;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(THUMBNAIL_STORE, 'readwrite');
        tx.objectStore(THUMBNAIL_STORE).clear();
        tx.oncomplete = function() {
            if (typeof window.Utils !== 'undefined') {
                window.Utils.showToast('Thumbnail cache cleared', 'success');
            }
            resolve();
        };
        tx.onerror = function(e) { reject(e.target.error); };
    });
};

/**
 * Get the count of cached thumbnails
 * @returns {Promise<number>} Number of cached thumbnails
 */
window.getThumbnailCacheSize = async function() {
    if (!_indexedDBAvailable) return 0;
    var db = await openDB();
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(THUMBNAIL_STORE, 'readonly');
        var request = tx.objectStore(THUMBNAIL_STORE).count();
        request.onsuccess = function(e) { resolve(e.target.result); };
        request.onerror = function(e) { reject(e.target.error); };
    });
};

// Export for use in other modules (using window for vanilla JS)
window.DBUtils = {
    openDB: openDB,
    saveSetting: saveSetting,
    getSetting: getSetting,
    cachePoster: cachePoster,
    getCachedPoster: getCachedPoster,
    clearPosterCache: clearPosterCache,
    getPosterCacheSize: getPosterCacheSize,
    saveThumbnail: window.saveThumbnail,
    getThumbnail: window.getThumbnail,
    clearThumbnailCache: window.clearThumbnailCache,
    getThumbnailCacheSize: window.getThumbnailCacheSize
};
