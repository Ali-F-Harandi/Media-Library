/**
 * Movie Library - UI Renderer Module
 * Handles rendering movies in different view modes (grid, detail, list)
 * Manages poster/logo loading and display state
 */

var currentView = localStorage.getItem('movieLibView') || 'grid';

// Display mode constants: grid, detail (extended info), list
var VIEW_MODES = {
    GRID: 'grid',
    DETAIL: 'detail',
    LIST: 'list'
};

function updateStats() {
    var ts = window.allMovies.reduce(function(s, m) { return s + m.fileSize; }, 0);
    var movieCount = window.allMovies.filter(function(m) { return !m.isTVShow; }).length;
    var tvShowCount = window.allMovies.filter(function(m) { return m.isTVShow; }).length;
    document.getElementById('headerStats').textContent =
        window.allMovies.length + ' titles (' + movieCount + ' movies' + (tvShowCount > 0 ? ', ' + tvShowCount + ' TV shows' : '') + ') \u2022 ' + window.Utils.formatBytes(ts) + ' total';
    document.getElementById('skippedCount').textContent = window.skippedFolders.length;
    document.getElementById('skippedList').innerHTML = window.skippedFolders.map(function(s) {
        return '<li><strong>' + window.Utils.escHtml(s.name) + '</strong> \u2014 ' + window.Utils.escHtml(s.reason) + '</li>';
    }).join('');
}

function toggleSkippedPanel() {
    document.getElementById('skippedPanel').classList.toggle('active');
}

function filterMovies() {
    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var s = document.getElementById('sortSelect').value;

    window.filteredMovies = window.allMovies.filter(function(m) {
        if (!q) return true;
        if (m.title.toLowerCase().includes(q)) return true;
        if (m.year.includes(q)) return true;
        if (m.quality && m.quality.toLowerCase().includes(q)) return true;
        if (m.nfoData && m.nfoData.genres && m.nfoData.genres.some(function(g) {
            return g.toLowerCase().includes(q);
        })) return true;
        if (m.nfoData && m.nfoData.tags && m.nfoData.tags.some(function(t) {
            return t.toLowerCase().includes(q);
        })) return true;
        return false;
    });

    window.filteredMovies.sort(function(a, b) {
        if (s === 'name-asc') return a.title.localeCompare(b.title);
        if (s === 'name-desc') return b.title.localeCompare(a.title);
        if (s === 'year-asc') return parseInt(a.year) - parseInt(b.year);
        if (s === 'year-desc') return parseInt(b.year) - parseInt(a.year);
        if (s === 'rating-desc') {
            var ra = (a.nfoData && a.nfoData.rating) || 0;
            var rb = (b.nfoData && b.nfoData.rating) || 0;
            return rb - ra;
        }
        if (s === 'size-desc') return b.fileSize - a.fileSize;
        return 0;
    });

    renderMovies();
    // Also render TV shows tab if visible
    renderTVShows();
}

// ============================================================================
// TV SHOW FILTERING & RENDERING
// ============================================================================

/**
 * Filter and render TV shows separately for the TV Shows tab
 */
window.filterTVShows = function() {
    renderTVShows();
};

/**
 * Render TV shows in their dedicated tab
 * Shows a grid of TV show cards with season/episode info
 */
function renderTVShows() {
    var container = document.getElementById('tvshowContainer');
    var emptyState = document.getElementById('tvshowEmptyState');
    var filterCount = document.getElementById('tvFilterCount');
    
    if (!container) return;
    
    var tvShows = window.allMovies.filter(function(m) { return m.isTVShow; });
    
    // Sort TV shows
    var sortSelect = document.getElementById('tvSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';
    
    tvShows.sort(function(a, b) {
        if (s === 'name-asc') return a.title.localeCompare(b.title);
        if (s === 'name-desc') return b.title.localeCompare(a.title);
        if (s === 'year-asc') return parseInt(a.year) - parseInt(b.year);
        if (s === 'year-desc') return parseInt(b.year) - parseInt(a.year);
        if (s === 'rating-desc') {
            var ra = (a.nfoData && a.nfoData.rating) || 0;
            var rb = (b.nfoData && b.nfoData.rating) || 0;
            return rb - ra;
        }
        if (s === 'size-desc') return b.fileSize - a.fileSize;
        return 0;
    });
    
    if (filterCount) {
        filterCount.textContent = tvShows.length + ' TV show' + (tvShows.length !== 1 ? 's' : '');
    }
    
    if (tvShows.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    var html = '<div class="movie-grid tvshow-grid">';
    
    tvShows.forEach(function(m) {
        // Find the real index in allMovies for detail page navigation
        var realIdx = window.allMovies.indexOf(m);
        var r = m.nfoData && m.nfoData.rating;
        var hasPoster = !!m.posterHandle;
        
        // Build season info text
        var seasonInfo = m.totalSeasons + ' Season' + (m.totalSeasons > 1 ? 's' : '') + ' \u2022 ' + m.totalEpisodes + ' Episode' + (m.totalEpisodes > 1 ? 's' : '');
        
        html += '<div class="movie-card tvshow-card" onclick="showTVShowFromTab(' + realIdx + ')">' +
            '<div class="poster-container">' +
                (m.logoHandle ? '<img class="logo-img" data-tv-idx="' + realIdx + '">' : '') +
                '<img class="poster-img" data-tv-idx="' + realIdx + '">' +
                '<div class="no-poster-placeholder"' + (hasPoster ? ' style="display:none"' : '') + '>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                        '<rect x="2" y="7" width="20" height="15" rx="2"/>' +
                        '<polyline points="17 2 12 7 7 2"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="card-overlay">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<circle cx="12" cy="12" r="10"/>' +
                        '<polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>' +
                    '</svg>' +
                '</div>' +
                (m.hasNfo ? '<span class="nfo-badge">NFO</span>' : '') +
                (r ? '<div class="rating-badge">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--star-color)">' +
                        '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>' +
                    '</svg>' + r.toFixed(1) +
                '</div>' : '') +
                '<span class="movie-quality tv-badge">TV Series</span>' +
            '</div>' +
            '<div class="card-info">' +
                '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                '<div class="movie-year">' + m.year + ' \u2022 ' + seasonInfo + '</div>' +
                (m.nfoData && m.nfoData.genres && m.nfoData.genres.length ?
                    '<div class="movie-genre">' + m.nfoData.genres.map(window.Utils.escHtml).join(', ') + '</div>' : '') +
                '<div class="movie-filesize">' + window.Utils.formatBytes(m.fileSize) + '</div>' +
            '</div>' +
        '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Load TV show posters
    loadTVShowAssets(tvShows);
}

/**
 * Show TV show detail from the TV Shows tab
 */
window.showTVShowFromTab = function(realIdx) {
    // Set filteredMovies to allMovies so detail page can find the show
    window.filteredMovies = window.allMovies;
    window.DetailPage.showDetailPage(realIdx);
};

/**
 * Load poster images for TV show cards
 */
async function loadTVShowAssets(tvShows) {
    var posters = document.querySelectorAll('.poster-img[data-tv-idx]');
    
    for (var i = 0; i < posters.length; i++) {
        (function(img) {
            (async function() {
                var idx = parseInt(img.dataset.tvIdx);
                var m = window.allMovies[idx];
                if (!m || !m.posterHandle) return;
                if (m.posterUrl) {
                    img.src = m.posterUrl;
                    img.classList.add('loaded');
                    var placeholder = img.parentElement.querySelector('.no-poster-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                    return;
                }
                try {
                    var f = await m.posterHandle.getFile();
                    if (m.posterUrl) URL.revokeObjectURL(m.posterUrl);
                    m.posterUrl = URL.createObjectURL(f);
                    img.src = m.posterUrl;
                    img.classList.add('loaded');
                    var placeholder = img.parentElement.querySelector('.no-poster-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                } catch(e) {}
            })();
        })(posters[i]);
    }
    
    // Load logos
    var logos = document.querySelectorAll('.logo-img[data-tv-idx]');
    for (var j = 0; j < logos.length; j++) {
        (function(img) {
            (async function() {
                var idx = parseInt(img.dataset.tvIdx);
                var m = window.allMovies[idx];
                if (!m || !m.logoHandle) return;
                if (m.logoUrl) {
                    img.src = m.logoUrl;
                    img.classList.add('loaded');
                    return;
                }
                try {
                    var f = await m.logoHandle.getFile();
                    if (m.logoUrl) URL.revokeObjectURL(m.logoUrl);
                    m.logoUrl = URL.createObjectURL(f);
                    img.src = m.logoUrl;
                    img.classList.add('loaded');
                } catch(e) {}
            })();
        })(logos[j]);
    }
}

/**
 * Load poster and logo images asynchronously
 * Shows/hides placeholder icons based on image availability
 */
async function loadAssets() {
    var posters = document.querySelectorAll('.poster-img[data-idx]');
    var logos = document.querySelectorAll('.logo-img[data-idx]');
    var promises = [];

    for (var i = 0; i < posters.length; i++) {
        (function(img) {
            promises.push((async function() {
                var idx = parseInt(img.dataset.idx);
                var m = window.filteredMovies[idx];
                if (!m || !m.posterHandle) return;
                if (m.posterUrl) {
                    img.src = m.posterUrl;
                    img.classList.add('loaded');
                    // Hide placeholder when poster loads
                    var placeholder = img.parentElement.querySelector('.no-poster-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                    return;
                }
                try {
                    var f = await m.posterHandle.getFile();
                    if (m.posterUrl) URL.revokeObjectURL(m.posterUrl);
                    m.posterUrl = URL.createObjectURL(f);
                    img.src = m.posterUrl;
                    img.classList.add('loaded');
                    // Hide placeholder when poster loads
                    var placeholder = img.parentElement.querySelector('.no-poster-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                } catch(e) {}
            })());
        })(posters[i]);
    }

    for (var j = 0; j < logos.length; j++) {
        (function(img) {
            promises.push((async function() {
                var idx = parseInt(img.dataset.idx);
                var m = window.filteredMovies[idx];
                if (!m || !m.logoHandle) return;
                if (m.logoUrl) {
                    img.src = m.logoUrl;
                    img.classList.add('loaded');
                    return;
                }
                try {
                    var f = await m.logoHandle.getFile();
                    if (m.logoUrl) URL.revokeObjectURL(m.logoUrl);
                    m.logoUrl = URL.createObjectURL(f);
                    img.src = m.logoUrl;
                    img.classList.add('loaded');
                } catch(e) {}
            })());
        })(logos[j]);
    }

    await Promise.all(promises);
}

function setView(view) {
    // Validate view mode against VIEW_MODES constants
    if (!VIEW_MODES[view.toUpperCase()]) {
        console.warn('[UI Renderer] Invalid view mode:', view);
        view = VIEW_MODES.GRID;
    }
    currentView = view;
    localStorage.setItem('movieLibView', view);
    document.querySelectorAll('.view-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    renderMovies();
}

/**
 * Render movies based on current view mode (grid, detail, list)
 */
function renderMovies() {
    var container = document.getElementById('movieContainer');
    var emptyState = document.getElementById('emptyState');

    document.getElementById('filterCount').textContent =
        'Showing ' + window.filteredMovies.length + ' of ' + window.allMovies.length;

    if (window.filteredMovies.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    var html = '';

    if (currentView === 'grid') {
        html = '<div class="movie-grid">' + window.filteredMovies.map(function(m, i) {
            var r = m.nfoData && m.nfoData.rating;
            var hasPoster = !!m.posterHandle;
            var isTV = m.isTVShow;
            var episodesInfo = isTV ? (m.totalEpisodes + ' eps' + (m.totalSeasons ? ' \\u2022 ' + m.totalSeasons + ' seasons' : '')) : '';
            return '<div class="movie-card" onclick="showDetailPage(' + i + ')">' +
                '<div class="poster-container">' +
                    (m.logoHandle ? '<img class="logo-img" data-idx="' + i + '">' : '') +
                    '<img class="poster-img" data-idx="' + i + '">' +
                    // Always show placeholder icon, hidden when poster loads
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
                    (m.hasNfo ? '<span class="nfo-badge">NFO</span>' : '') +
                    (r ? '<div class="rating-badge">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--star-color)">' +
                            '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>' +
                        '</svg>' + r.toFixed(1) +
                    '</div>' : '') +
                    (m.quality ? '<span class="movie-quality">' + window.Utils.escHtml(m.quality) + '</span>' : '') +
                    (isTV ? '<span class="movie-quality tv-badge">TV Series</span>' : '') +
                '</div>' +
                '<div class="card-info">' +
                    '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="movie-year">' + m.year +
                        (episodesInfo ? ' \\u2022 ' + episodesInfo : 
                         (m.nfoData && m.nfoData.runtime ? ' \\u2022 ' + m.nfoData.runtime + 'm' : '')) +
                    '</div>' +
                    (m.nfoData && m.nfoData.genres && m.nfoData.genres.length ?
                        '<div class="movie-genre">' + m.nfoData.genres.map(window.Utils.escHtml).join(', ') + '</div>' : '') +
                    '<div class="movie-filesize">' + window.Utils.formatBytes(m.fileSize) + '</div>' +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    } else if (currentView === 'detail') {
        html = '<div class="movie-detail-grid">' + window.filteredMovies.map(function(m, i) {
            return '<div class="movie-detail-card" onclick="showDetailPage(' + i + ')">' +
                '<div class="detail-poster">' +
                    '<img class="poster-img" data-idx="' + i + '">' +
                '</div>' +
                '<div class="detail-info">' +
                    '<div class="detail-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div style="color:var(--text-secondary);margin-bottom:.3rem">' + m.year +
                        (m.nfoData && m.nfoData.runtime ? ' \u2022 ' + m.nfoData.runtime + ' min' : '') +
                    '</div>' +
                    (m.nfoData && m.nfoData.rating ?
                        '<div style="display:flex;align-items:center;gap:.3rem;margin-bottom:.5rem;color:var(--star-color)">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--star-color)">' +
                                '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>' +
                            '</svg>' +
                            '<strong>' + m.nfoData.rating.toFixed(1) + '</strong>' +
                            '<span style="color:var(--text-muted)">(' +
                                (m.nfoData.ratingVotes ? m.nfoData.ratingVotes.toLocaleString() : '?') +
                            ')</span>' +
                        '</div>' : '') +
                    '<div class="detail-tags">' +
                        (m.quality ? '<span class="detail-tag">' + window.Utils.escHtml(m.quality) + '</span>' : '') +
                        '<span class="detail-tag">' + window.Utils.formatBytes(m.fileSize) + '</span>' +
                        (m.nfoData && m.nfoData.genres ?
                            m.nfoData.genres.slice(0, 2).map(function(g) {
                                return '<span class="detail-tag">' + window.Utils.escHtml(g) + '</span>';
                            }).join('') : '') +
                    '</div>' +
                    '<div class="detail-filename" title="' + window.Utils.escHtml(m.fileName) + '">' +
                        window.Utils.escHtml(m.fileName) +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    } else if (currentView === VIEW_MODES.LIST) {
        // List view: compact horizontal list with essential info
        html = '<div class="movie-list">' + window.filteredMovies.map(function(m, i) {
            return '<div class="movie-list-item" onclick="showDetailPage(' + i + ')">' +
                '<div class="list-poster">' +
                    '<img class="poster-img" data-idx="' + i + '">' +
                '</div>' +
                '<div class="list-info">' +
                    '<div class="list-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="list-meta">' +
                        '<span>' + m.year + '</span>' +
                        (m.quality ? '<span>' + window.Utils.escHtml(m.quality) + '</span>' : '') +
                        (m.nfoData && m.nfoData.runtime ? '<span>' + m.nfoData.runtime + 'm</span>' : '') +
                        (m.nfoData && m.nfoData.rating ?
                            '<span style="color:var(--star-color)">\u2605 ' + m.nfoData.rating.toFixed(1) + '</span>' : '') +
                        '<span>' + window.Utils.formatBytes(m.fileSize) + '</span>' +
                    '</div>' +
                '</div>' +
                '<svg class="list-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<polyline points="9 18 15 12 9 6"/>' +
                '</svg>' +
            '</div>';
        }).join('') + '</div>';
    }

    container.innerHTML = html;
    loadAssets();
}

// Export for use in other modules
window.UIRenderer = { updateStats, toggleSkippedPanel, filterMovies, loadAssets, setView, renderMovies, renderTVShows, filterTVShows };

// Also expose as global functions for inline HTML handlers
window.filterMovies = filterMovies;
window.setView = setView;
window.filterTVShows = filterTVShows;
