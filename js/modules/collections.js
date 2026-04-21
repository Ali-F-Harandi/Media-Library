// Movie Library - Collections Module
// Groups movies by their NFO <set> tag and renders a collections tab

// ============================================================================
// DATA BUILDING
// ============================================================================

function _buildCollectionsData() {
    var groups = {};
    (window.allMovies || []).forEach(function(m) {
        if (m.isTVShow) return;
        var nfo = m.nfoData || {};
        if (!nfo.setName) return;
        var key = nfo.setName;
        if (!groups[key]) {
            groups[key] = { name: key, overview: nfo.setOverview || '', movies: [] };
        }
        groups[key].movies.push(m);
    });

    var result = Object.keys(groups).map(function(k) { return groups[k]; });

    // Sort each collection's movies by year
    result.forEach(function(col) {
        col.movies.sort(function(a, b) {
            var ya = (a.nfoData && a.nfoData.year) ? parseInt(a.nfoData.year) : 0;
            var yb = (b.nfoData && b.nfoData.year) ? parseInt(b.nfoData.year) : 0;
            return ya - yb;
        });
    });

    // Sort collections alphabetically
    result.sort(function(a, b) { return a.name.localeCompare(b.name); });

    window.collectionsData = result;
    return result;
}

// ============================================================================
// HELPERS
// ============================================================================

function _esc(s) {
    if (window.Utils && window.Utils.escHtml) return window.Utils.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// COLLECTION CARD POSTER LOADING
// Load up to 4 poster images per collection card directly (not lazy, since
// there are typically far fewer collection cards than movie cards)
// Uses loadPosterForMovie which caches as data URLs in IndexedDB, avoiding
// blob URL accumulation that causes memory leaks.
// ============================================================================

// Track collection poster blob URLs so they can be revoked on re-render
var _collectionPosterUrls = [];

function _revokeCollectionPosterUrls() {
    for (var i = 0; i < _collectionPosterUrls.length; i++) {
        URL.revokeObjectURL(_collectionPosterUrls[i]);
    }
    _collectionPosterUrls = [];
}

function _loadCollectionCardPosters(collections) {
    collections.forEach(function(col, colIdx) {
        var max = Math.min(col.movies.length, 4);
        for (var i = 0; i < max; i++) {
            (function(m, ci, pi) {
                var img = document.querySelector(
                    'img[data-col-idx="' + ci + '"][data-col-pos="' + pi + '"]'
                );
                if (!img) return;

                // Use loadPosterForMovie which properly caches posters as data URLs,
                // avoiding blob URL memory leaks
                if (window.loadPosterForMovie) {
                    window.loadPosterForMovie(m).then(function(url) {
                        if (url) {
                            img.src = url;
                            img.style.opacity = '1';
                        }
                    }).catch(function() {
                        // Fallback: load directly (still tracked for cleanup)
                        if (m.posterHandle) {
                            m.posterHandle.getFile().then(function(f) {
                                var blobUrl = URL.createObjectURL(f);
                                // Revoke old poster URL if it was a blob
                                if (m.posterUrl && m.posterUrl.startsWith('blob:')) {
                                    URL.revokeObjectURL(m.posterUrl);
                                }
                                m.posterUrl = blobUrl;
                                _collectionPosterUrls.push(blobUrl);
                                img.src = blobUrl;
                                img.style.opacity = '1';
                            }).catch(function() {});
                        }
                    });
                } else if (m.posterUrl) {
                    img.src = m.posterUrl;
                    img.style.opacity = '1';
                } else if (m.posterHandle) {
                    m.posterHandle.getFile().then(function(f) {
                        var blobUrl = URL.createObjectURL(f);
                        m.posterUrl = blobUrl;
                        _collectionPosterUrls.push(blobUrl);
                        img.src = blobUrl;
                        img.style.opacity = '1';
                    }).catch(function() {});
                }
            })(col.movies[i], colIdx, i);
        }
    });
}

// ============================================================================
// RENDER COLLECTIONS GRID
// ============================================================================

function renderCollections() {
    _revokeCollectionPosterUrls();
    var collections = _buildCollectionsData();
    var container = document.getElementById('collectionsContainer');
    var countEl = document.getElementById('collectionsCount');
    var emptyState = document.getElementById('collectionsEmptyState');

    if (!container) return;

    if (collections.length === 0) {
        container.innerHTML = '';
        if (countEl) countEl.textContent = '0 collections found';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (countEl) {
        countEl.textContent = collections.length + ' collection' +
            (collections.length !== 1 ? 's' : '') + ' found';
    }

    var html = '';
    collections.forEach(function(col, idx) {
        // Build up to 4 poster slots for the 2×2 grid
        var posterSlots = '';
        var max = Math.min(col.movies.length, 4);
        for (var i = 0; i < max; i++) {
            var isLastSlot = (i === 3 && col.movies.length > 4);
            posterSlots +=
                '<div class="collection-poster-item">' +
                    '<img data-col-idx="' + idx + '" data-col-pos="' + i + '" src="" alt="" style="opacity:0;width:100%;height:100%;object-fit:cover;display:block;">' +
                    (isLastSlot ? '<div class="collection-poster-overlay">+' + (col.movies.length - 3) + ' more</div>' : '') +
                '</div>';
        }
        // Pad to 4 slots so the grid stays square
        for (var j = max; j < 4; j++) {
            posterSlots += '<div class="collection-poster-item"></div>';
        }

        html +=
            '<div class="collection-card" onclick="window.Collections.showCollectionDetail(' + idx + ')">' +
                '<div class="collection-poster-grid">' + posterSlots + '</div>' +
                '<div class="collection-info">' +
                    '<div class="collection-name">' + _esc(col.name) + '</div>' +
                    '<div class="collection-movie-count">' +
                        col.movies.length + ' movie' + (col.movies.length !== 1 ? 's' : '') +
                    '</div>' +
                    (col.overview
                        ? '<div class="collection-overview">' + _esc(col.overview) + '</div>'
                        : '') +
                '</div>' +
            '</div>';
    });

    container.innerHTML = html;
    _loadCollectionCardPosters(collections);
}

// ============================================================================
// SHOW COLLECTION DETAIL VIEW
// ============================================================================

function showCollectionDetail(idx) {
    var col = window.collectionsData && window.collectionsData[idx];
    if (!col) return;

    window.switchTab('collectionDetail');

    var titleEl = document.getElementById('collectionDetailTitle');
    var overviewEl = document.getElementById('collectionDetailOverview');
    var countEl = document.getElementById('collectionDetailCount');
    var gridEl = document.getElementById('collectionDetailGrid');

    if (titleEl) titleEl.textContent = col.name;
    if (overviewEl) overviewEl.textContent = col.overview || '';
    if (countEl) {
        countEl.textContent = col.movies.length + ' movie' + (col.movies.length !== 1 ? 's' : '');
    }
    if (!gridEl) return;

    // Render movie cards using the same markup as the all-tab so the existing
    // IntersectionObserver (observeImages) can lazy-load the posters.
    var html = '';
    col.movies.forEach(function(m) {
        var realIdx = window.allMovies.indexOf(m);
        if (realIdx === -1) return;
        var nfo = m.nfoData || {};
        var hasPoster = !!m.posterHandle;
        var r = (nfo.rating && !isNaN(nfo.rating)) ? nfo.rating : null;

        html +=
            '<div class="movie-card" onclick="showItemFromTab(' + realIdx + ',\'collections\')" ondblclick="playItemDirectly(' + realIdx + ')" title="Double-click to play">' +
                '<div class="poster-container">' +
                    '<img class="poster-img" data-movie-idx="' + realIdx + '">' +
                    '<div class="no-poster-placeholder"' + (hasPoster ? ' style="display:none"' : '') + '>' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                            '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                            '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                            '<path d="m21 15-5-5L5 21"/>' +
                        '</svg>' +
                    '</div>' +
                    '<div class="card-overlay">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<circle cx="12" cy="12" r="10"/>' +
                            '<polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>' +
                        '</svg>' +
                    '</div>' +
                    (r ? '<div class="rating-badge">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--star-color)">' +
                            '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>' +
                        '</svg>' + r.toFixed(1) +
                    '</div>' : '') +
                    (m.quality ? '<span class="movie-quality">' + _esc(m.quality) + '</span>' : '') +
                '</div>' +
                '<div class="card-info">' +
                    '<div class="movie-title">' + _esc(m.title) + '</div>' +
                    '<div class="movie-year">' + (m.year || '') +
                        (nfo.runtime ? ' \u2022 ' + nfo.runtime + 'm' : '') +
                    '</div>' +
                '</div>' +
            '</div>';
    });

    gridEl.innerHTML = html;

    // Lazy-load posters using the shared IntersectionObserver from UIRenderer
    if (window.UIRenderer && window.UIRenderer.observeImages) {
        window.UIRenderer.observeImages(gridEl);
    }
}

// ============================================================================
// BACK BUTTON — return to collections grid
// ============================================================================

window.showCollectionsTab = function() {
    window.switchTab('collections');
};

// ============================================================================
// EXPORT
// ============================================================================

window.Collections = {
    renderCollections: renderCollections,
    showCollectionDetail: showCollectionDetail,
    buildCollectionsData: _buildCollectionsData
};
