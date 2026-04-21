/**
 * Movie Library - UI Renderer Module
 * Handles rendering movies in different view modes (grid, detail, compact, posters)
 * Manages poster/logo loading and display state
 * Includes All, Animation, and Anime tab rendering
 */

var currentView = localStorage.getItem('movieLibView') || 'grid';
// Fallback: if saved view is 'list', reset to 'grid' (removed mode)
if (currentView === 'list') { currentView = 'grid'; localStorage.setItem('movieLibView', 'grid'); }
// Also sanitize per-tab view preferences for removed mode
(function _sanitizeTabViews() {
    var tabs = ['all','movies','tvshows','animation','anime','favorites','history','playlist','stats','duplicates','collections'];
    tabs.forEach(function(t) {
        var key = 'movieLibViewTab_' + t;
        var v = localStorage.getItem(key);
        if (v === 'list') { localStorage.setItem(key, 'grid'); }
    });
})();

/**
 * Get the current view mode (exposed for other modules)
 */
window.getViewMode = function() { return currentView; };

// Track logo blob URLs that couldn't be converted to data URLs,
// so they can be revoked on navigation / re-render to prevent memory leaks.
var _logoBlobUrls = [];

// Table sort state for table view column sorting
var _tableSortColumn = null; // e.g. 'title', 'year', 'rating', 'genres', 'size', 'quality'
var _tableSortDirection = 'asc'; // 'asc' or 'desc'

/**
 * Sort table view by a specific column
 * Toggles direction if same column is clicked, defaults to asc for new column
 */
window.sortTableColumn = function(column) {
    if (_tableSortColumn === column) {
        _tableSortDirection = (_tableSortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        _tableSortColumn = column;
        _tableSortDirection = 'asc';
    }
    // Re-render the active tab to apply sort
    var activeTab = _getActiveTabName();
    if (activeTab === 'movies') filterMovies();
    else if (activeTab === 'all') renderAllTab();
    else if (activeTab === 'tvshows') renderTVShows();
    else if (activeTab === 'animation') renderAnimationTab();
    else if (activeTab === 'anime') renderAnimeTab();
    else if (activeTab === 'favorites' && typeof window.renderFavoritesTab === 'function') window.renderFavoritesTab();
    else if (activeTab === 'history' && typeof window.renderHistoryTab === 'function') window.renderHistoryTab();
    else if (activeTab === 'playlist' && typeof window.renderPlaylistTab === 'function') window.renderPlaylistTab();
};

/**
 * Get the sort indicator character for a column header
 */
function _getTableSortIndicator(column) {
    if (_tableSortColumn !== column) return '';
    return _tableSortDirection === 'asc' ? ' \u25B2' : ' \u25BC';
}

/**
 * Get the CSS class for active sort header
 */
function _getTableSortClass(column) {
    return _tableSortColumn === column ? ' active' : '';
}

/**
 * Apply table-specific sorting to an items array
 * This is called within buildCardItems when currentView === 'table'
 */
function _applyTableSort(items) {
    if (!_tableSortColumn) return items;
    var col = _tableSortColumn;
    var dir = _tableSortDirection;
    items.sort(function(a, b) {
        var va, vb;
        if (col === 'title') {
            va = a.title.toLowerCase();
            vb = b.title.toLowerCase();
            return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        } else if (col === 'year') {
            va = parseInt(a.year) || 0;
            vb = parseInt(b.year) || 0;
            return dir === 'asc' ? va - vb : vb - va;
        } else if (col === 'rating') {
            va = (a.nfoData && a.nfoData.rating) || 0;
            vb = (b.nfoData && b.nfoData.rating) || 0;
            return dir === 'asc' ? va - vb : vb - va;
        } else if (col === 'genres') {
            va = (a.nfoData && a.nfoData.genres) ? a.nfoData.genres.join(',').toLowerCase() : '';
            vb = (b.nfoData && b.nfoData.genres) ? b.nfoData.genres.join(',').toLowerCase() : '';
            return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        } else if (col === 'size') {
            va = a.fileSize || 0;
            vb = b.fileSize || 0;
            return dir === 'asc' ? va - vb : vb - va;
        } else if (col === 'quality') {
            va = (a.quality || '').toLowerCase();
            vb = (b.quality || '').toLowerCase();
            return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return 0;
    });
    return items;
}

// ============================================================================
// DRAG-TO-SELECT IN TABLE VIEW
// Mousedown/mousemove/mouseup handlers for selecting multiple table rows
// ============================================================================
var _tableDragSelectActive = false;
var _tableDragStartRow = null;
var _tableDragLastRow = null;

/**
 * Initialize drag-to-select event listeners on the document
 * Delegates to movie-table-row elements
 */
(function initTableDragSelect() {
    document.addEventListener('mousedown', function(e) {
        var row = e.target.closest('.movie-table-row');
        if (!row) return;
        // Only in select mode
        if (!window._selectMode) return;
        // Don't interfere with checkbox clicks
        if (e.target.closest('.card-checkbox')) return;
        e.preventDefault();
        _tableDragSelectActive = true;
        _tableDragStartRow = row;
        _tableDragLastRow = row;
        _toggleRowSelection(row);
    });

    document.addEventListener('mousemove', function(e) {
        if (!_tableDragSelectActive) return;
        var row = e.target.closest('.movie-table-row');
        if (!row || row === _tableDragLastRow) return;
        _tableDragLastRow = row;
        _toggleRowSelection(row);
        row.classList.add('drag-selecting');
    });

    document.addEventListener('mouseup', function(e) {
        if (!_tableDragSelectActive) return;
        _tableDragSelectActive = false;
        // Clean up drag-selecting class
        document.querySelectorAll('.movie-table-row.drag-selecting').forEach(function(r) {
            r.classList.remove('drag-selecting');
        });
        _tableDragStartRow = null;
        _tableDragLastRow = null;
    });
})();

/**
 * Toggle selection on a table row
 */
function _toggleRowSelection(row) {
    var title = row.dataset.title;
    if (!title) return;
    if (typeof window.toggleItemSelection === 'function') {
        window.toggleItemSelection(title);
    }
}

/**
 * Revoke all tracked logo blob URLs and clear their references on movie objects.
 * Should be called before a tab re-render to free memory from previous logo images.
 */
function _revokeLogoBlobUrls() {
    for (var i = 0; i < _logoBlobUrls.length; i++) {
        URL.revokeObjectURL(_logoBlobUrls[i]);
    }
    _logoBlobUrls = [];
    // Also clean up any blob: logo URLs that remain on movie objects
    (window.allMovies || []).forEach(function(m) {
        if (m.logoUrl && m.logoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(m.logoUrl);
            m.logoUrl = null;
        }
    });
}

// ============================================================================
// WATCH PROGRESS HELPER - Generates progress bar HTML for a movie title
// Returns empty string if no progress or progress is <1% or >=95%
// ============================================================================
function getWatchProgressHtml(title) {
    if (!title || typeof window.getPlaybackPosition !== 'function') return '';
    var pos = window.getPlaybackPosition(title);
    if (!pos || !pos.position || !pos.duration || pos.position < 5) return '';
    var pct = Math.min(100, Math.round((pos.position / pos.duration) * 100));
    if (pct <= 0 || pct >= 95) return '';
    return '<div class="watch-progress-bar" title="Watched ' + pct + '%"><div class="watch-progress-fill" style="width:' + pct + '%"></div></div>';
}

// Display mode constants: grid, detail (extended info), compact, posters
var VIEW_MODES = {
    GRID: 'grid',
    DETAIL: 'detail',
    COMPACT: 'compact',
    POSTERS: 'posters',
    TABLE: 'table'
};

// ============================================================================
// LAZY IMAGE LOADING — IntersectionObserver
// Images are observed as they enter the viewport (+ 150px margin) and loaded
// on demand instead of all at once, which massively improves render performance
// for large libraries.
// ============================================================================
var _posterObserver = null;

function _getPosterObserver() {
    if (_posterObserver) return _posterObserver;
    _posterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            _posterObserver.unobserve(entry.target);
            _loadSingleImage(entry.target);
        });
    }, { rootMargin: '150px 0px', threshold: 0 });
    return _posterObserver;
}

async function _loadSingleImage(img) {
    var movieIdx = parseInt(img.dataset.movieIdx);
    var m = window.allMovies[movieIdx];
    if (!m) return;

    // Smooth fade-in transition setup
    img.style.transition = 'opacity 0.3s ease';
    img.style.opacity = '0';

    if (img.classList.contains('logo-img')) {
        if (!m.logoHandle) return;
        // Use thumbnail cache for logos if available
        if (window.getThumbnail && m.fullPath) {
            try {
                var logoPath = m.fullPath + '/' + m.logoHandle.name;
                var logoCached = await window.getThumbnail(logoPath);
                if (logoCached && logoCached.dataUrl && logoCached.timestamp) {
                    var logoAge = Date.now() - logoCached.timestamp;
                    if (logoAge < 7 * 24 * 60 * 60 * 1000) {
                        m.logoUrl = logoCached.dataUrl;
                        img.src = m.logoUrl;
                        img.classList.add('loaded');
                        requestAnimationFrame(function() { img.style.opacity = '1'; });
                        return;
                    }
                }
            } catch(e) {}
        }
        if (!m.logoUrl) {
            try {
                var lf = await m.logoHandle.getFile();
                var _logoBlobUrl = URL.createObjectURL(lf);
                m.logoUrl = _logoBlobUrl;
                // Cache logo to thumbnail cache as data URL
                if (window.saveThumbnail && m.fullPath) {
                    try {
                        var logoCachePath = m.fullPath + '/' + m.logoHandle.name;
                        var logoDataUrl = await new Promise(function(resolve, reject) {
                            var reader = new FileReader();
                            reader.onloadend = function() { resolve(reader.result); };
                            reader.onerror = function() { reject(new Error('FileReader failed')); };
                            reader.readAsDataURL(lf);
                        });
                        await window.saveThumbnail(logoCachePath, logoDataUrl);
                        // Replace blob URL with data URL and revoke blob to free memory
                        URL.revokeObjectURL(_logoBlobUrl);
                        m.logoUrl = logoDataUrl;
                    } catch(e2) {
                        // Caching failed — track blob URL for later cleanup
                        _logoBlobUrls.push(_logoBlobUrl);
                    }
                } else {
                    // No cache available — track blob URL for later cleanup
                    _logoBlobUrls.push(_logoBlobUrl);
                }
            } catch(e) { return; }
        }
        img.src = m.logoUrl;
        img.classList.add('loaded');
        requestAnimationFrame(function() { img.style.opacity = '1'; });
    } else {
        if (!m.posterHandle) {
            // No poster handle - show placeholder
            var ph = img.parentElement && img.parentElement.querySelector('.no-poster-placeholder');
            if (ph) ph.style.display = '';
            return;
        }
        // Try our cached poster loading
        var posterUrl = null;
        if (window.loadPosterForMovie) {
            try {
                posterUrl = await window.loadPosterForMovie(m);
            } catch(e) {
                // Cache lookup failed, try direct load
            }
        }
        if (!posterUrl && m.posterHandle) {
            try {
                var pf = await m.posterHandle.getFile();
                if (m.posterUrl && m.posterUrl.startsWith('blob:')) URL.revokeObjectURL(m.posterUrl);
                m.posterUrl = URL.createObjectURL(pf);
                posterUrl = m.posterUrl;
            } catch(e) {
                // Direct load also failed
            }
        }
        if (posterUrl) {
            img.src = posterUrl;
            img.classList.add('loaded');
            requestAnimationFrame(function() { img.style.opacity = '1'; });
            var ph = img.parentElement && img.parentElement.querySelector('.no-poster-placeholder');
            if (ph) ph.style.display = 'none';
        } else {
            // Show placeholder as fallback
            var ph = img.parentElement && img.parentElement.querySelector('.no-poster-placeholder');
            if (ph) ph.style.display = '';
        }
    }
}

function observeImages(container) {
    var observer = _getPosterObserver();
    container.querySelectorAll('.poster-img[data-movie-idx], .logo-img[data-movie-idx]').forEach(function(img) {
        observer.observe(img);
        // Fallback: if already in viewport, load directly after a short delay
        var rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
            setTimeout(function() {
                if (!img.src || img.src === '' || img.src === window.location.href) {
                    _loadSingleImage(img);
                }
            }, 200);
        }
    });
}

// ============================================================================
// INFINITE SCROLL - IntersectionObserver for loading more items
// ============================================================================
var _infiniteScrollObserver = null;

function _getInfiniteScrollObserver() {
    if (_infiniteScrollObserver) return _infiniteScrollObserver;
    _infiniteScrollObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            var tabId = entry.target.dataset.tab;
            if (tabId && typeof window.loadMoreItems === 'function') {
                window.loadMoreItems(tabId);
            }
        });
    }, { rootMargin: '400px 0px', threshold: 0 });
    return _infiniteScrollObserver;
}

function observeInfiniteScrollSentinel(container) {
    var sentinel = container.querySelector('.infinite-scroll-sentinel');
    if (sentinel) {
        _getInfiniteScrollObserver().observe(sentinel);
    }
}

// ============================================================================
// ACTIVE TAB DETECTION
// ============================================================================
function _getActiveTabName() {
    var activeNav = document.querySelector('.nav-tab.active');
    return activeNav ? activeNav.dataset.tab : 'all';
}

// ============================================================================
// SEARCH DEBOUNCE
// ============================================================================
var _filterDebounceTimer = null;

// ============================================================================
// UTILITY: Check if a movie is animation
// ============================================================================
function isAnimation(m) {
    return m.nfoData && m.nfoData.genres && m.nfoData.genres.some(function(g) {
        return g.toLowerCase() === 'animation' || g.toLowerCase() === 'animated';
    });
}

// ============================================================================
// UTILITY: Check if a movie is anime (animation + Japan)
// ============================================================================
function isAnime(m) {
    var hasAnimationGenre = isAnimation(m);
    var isJapan = m.nfoData && m.nfoData.country && (
        m.nfoData.country.toLowerCase().includes('japan') ||
        m.nfoData.country.toLowerCase().includes('jp')
    );
    return hasAnimationGenre && isJapan;
}

// ============================================================================
// GENERIC SORT FUNCTION
// ============================================================================
function sortItems(items, sortBy) {
    items.sort(function(a, b) {
        if (sortBy === 'name-asc') return a.title.localeCompare(b.title);
        if (sortBy === 'name-desc') return b.title.localeCompare(a.title);
        if (sortBy === 'year-asc') return parseInt(a.year) - parseInt(b.year);
        if (sortBy === 'year-desc') return parseInt(b.year) - parseInt(a.year);
        if (sortBy === 'rating-desc') {
            var ra = (a.nfoData && a.nfoData.rating) || 0;
            var rb = (b.nfoData && b.nfoData.rating) || 0;
            return rb - ra;
        }
        if (sortBy === 'size-desc') return b.fileSize - a.fileSize;
        if (sortBy === 'date-desc') {
            var da = a.scanDate || 0;
            var db2 = b.scanDate || 0;
            return db2 - da;
        }
        return 0;
    });
    updateSortIndicators();
    return items;
}

// ============================================================================
// SORT DIRECTION INDICATOR - Visual indicator on sort selects
// ============================================================================

function updateSortIndicators() {
    var sortSelects = document.querySelectorAll('.filter-bar select');
    sortSelects.forEach(function(select) {
        var val = select.value;
        if (val && val.includes('-')) {
            var dir = val.split('-').pop();
            if (dir === 'asc' || dir === 'desc') {
                select.setAttribute('data-sort-dir', dir);
            } else {
                select.removeAttribute('data-sort-dir');
            }
        } else {
            select.removeAttribute('data-sort-dir');
        }
    });
}

// ============================================================================
// GENERIC SEARCH FILTER
// ============================================================================
function matchesSearch(m, q) {
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
    // Search by actor/cast (nfoData.actors — array of {name, role, thumb})
    if (m.nfoData && m.nfoData.actors && m.nfoData.actors.some(function(a) {
        return (a.name && a.name.toLowerCase().includes(q)) || (a.role && a.role.toLowerCase().includes(q));
    })) return true;
    // Search by cast (nfoData.cast — array of actor name strings, alternate field name)
    if (m.nfoData && m.nfoData.cast && m.nfoData.cast.some(function(c) {
        var name = (typeof c === 'string') ? c : (c && c.name);
        return name && name.toLowerCase().includes(q);
    })) return true;
    // Search by director (nfoData.directors — array of strings)
    if (m.nfoData && m.nfoData.directors && m.nfoData.directors.some(function(d) {
        return d.toLowerCase().includes(q);
    })) return true;
    // Search by director (nfoData.director — singular string, alternate field name)
    if (m.nfoData && m.nfoData.director && typeof m.nfoData.director === 'string' && m.nfoData.director.toLowerCase().includes(q)) return true;
    // Search by writer (nfoData.writers — array of strings)
    if (m.nfoData && m.nfoData.writers && m.nfoData.writers.some(function(w) {
        return w.toLowerCase().includes(q);
    })) return true;
    // Search by writer (nfoData.writer — singular string or array, alternate field name)
    if (m.nfoData && m.nfoData.writer) {
        if (typeof m.nfoData.writer === 'string' && m.nfoData.writer.toLowerCase().includes(q)) return true;
        if (Array.isArray(m.nfoData.writer) && m.nfoData.writer.some(function(w) {
            return typeof w === 'string' && w.toLowerCase().includes(q);
        })) return true;
    }
    // Search by studio
    if (m.nfoData && m.nfoData.studio && m.nfoData.studio.toLowerCase().includes(q)) return true;
    return false;
}

// Expose matchesSearch globally so all modules (playlist, favorites, watch-history, etc.)
// can search by title, cast, director, writer, etc.
window.matchesSearch = matchesSearch;

// ============================================================================
// GENRE FILTER HELPER: Check if movie matches a selected genre
// ============================================================================
function matchesGenre(m, genre) {
    if (!genre) return true;
    if (!m.nfoData || !m.nfoData.genres) return false;
    return m.nfoData.genres.some(function(g) {
        return g.toLowerCase() === genre.toLowerCase();
    });
}

// ============================================================================
// GENRE FILTER: Populate genre dropdown from library data
// ============================================================================
function populateGenreDropdowns() {
    var genreSet = {};
    window.allMovies.forEach(function(m) {
        if (m.nfoData && m.nfoData.genres) {
            m.nfoData.genres.forEach(function(g) {
                genreSet[g] = true;
            });
        }
    });
    var genres = Object.keys(genreSet).sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    var dropdowns = ['sharedGenreSelect'];
    dropdowns.forEach(function(id) {
        var select = document.getElementById(id);
        if (!select) return;
        var currentValue = select.value;
        // Keep the "All Genres" option, rebuild the rest
        select.innerHTML = '<option value="">All Genres</option>';
        genres.forEach(function(g) {
            var opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            select.appendChild(opt);
        });
        // Restore previous selection if still valid
        if (currentValue && genres.indexOf(currentValue) !== -1) {
            select.value = currentValue;
        }
    });
}

// ============================================================================
// DOUBLE-CLICK TO PLAY: Play media directly on dblclick
// ============================================================================
window.playItemDirectly = function(realIdx) {
    var m = window.allMovies[realIdx];
    if (!m) return;
    window.filteredMovies = window.allMovies;
    var filteredIdx = window.filteredMovies.indexOf(m);
    if (m.isTVShow) {
        // Play first episode of TV show
        window.playTVShowFirstEpisode(filteredIdx);
    } else {
        window.VideoPlayer.playMovie(filteredIdx);
    }
};

// ============================================================================
// UPDATE VISIBILITY OF ANIMATION/ANIME TABS
// ============================================================================
function updateDynamicTabs() {
    var hasAnimation = window.allMovies.some(isAnimation);
    var hasAnime = window.allMovies.some(isAnime);

    var animTabBtn = document.getElementById('animationTabBtn');
    var animeTabBtn = document.getElementById('animeTabBtn');

    if (animTabBtn) {
        if (hasAnimation) {
            animTabBtn.classList.remove('hidden-tab');
        } else {
            animTabBtn.classList.add('hidden-tab');
        }
    }
    if (animeTabBtn) {
        if (hasAnime) {
            animeTabBtn.classList.remove('hidden-tab');
        } else {
            animeTabBtn.classList.add('hidden-tab');
        }
    }
}

// ============================================================================
// STATS
// ============================================================================
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

    // Update dynamic tab visibility
    updateDynamicTabs();
}

function toggleSkippedPanel() {
    document.getElementById('skippedPanel').classList.toggle('active');
}

// ============================================================================
// SHARED FILTER BAR - Sort & Genre change handlers for all tabs
// ============================================================================
window.handleSharedSortChange = function() {
    var activeTab = _getActiveTabName();
    if (activeTab === 'movies') filterMovies();
    else if (activeTab === 'all') renderAllTab();
    else if (activeTab === 'tvshows') renderTVShows();
    else if (activeTab === 'animation') renderAnimationTab();
    else if (activeTab === 'anime') renderAnimeTab();
    else if (activeTab === 'favorites' && typeof window.renderFavoritesTab === 'function') window.renderFavoritesTab();
    else if (activeTab === 'history' && typeof window.renderHistoryTab === 'function') window.renderHistoryTab();
    else if (activeTab === 'playlist' && typeof window.renderPlaylistTab === 'function') window.renderPlaylistTab();
};

window.handleSharedGenreChange = function() {
    // Deprecated: genre filtering now uses multi-genre tag buttons
    // Kept as no-op for backwards compatibility
};

// ============================================================================
// MOVIES TAB FILTER
// ============================================================================
function filterMovies() {
    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortEl = document.getElementById('sharedSortSelect');
    var s = sortEl ? sortEl.value : 'name-asc';

    window.filteredMovies = window.allMovies.filter(function(m) {
        return !m.isTVShow && matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
    });

    sortItems(window.filteredMovies, s);

    // Only re-render the currently visible tab for performance.
    // When the user switches tabs, switchTab() triggers a fresh render anyway.
    var activeTab = _getActiveTabName();
    if (activeTab === 'movies') {
        renderMovies();
    } else if (activeTab === 'all') {
        renderAllTab();
    } else if (activeTab === 'animation') {
        renderAnimationTab();
    } else if (activeTab === 'anime') {
        renderAnimeTab();
    } else if (activeTab === 'tvshows') {
        renderTVShows();
    } else {
        renderMovies();
    }
}

// ============================================================================
// ALL TAB
// ============================================================================
window.filterAllTab = function() {
    // Reset visible count when filter changes
    window.resetVisibleCount('all');
    renderAllTab();
};

/**
 * Render a horizontal shelf row with movie cards
 */
function renderShelfRow(title, movies, shelfId) {
    var html = '<div class="shelf-section">' +
        '<div class="shelf-title">' +
            '<span>' + window.Utils.escHtml(title) + '</span>' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</div>' +
        '<div class="shelf-row">';
    
    movies.forEach(function(m) {
        var realIdx = window.allMovies.indexOf(m);
        var hasPoster = !!m.posterHandle;
        var r = m.nfoData && m.nfoData.rating;
        var newBadge = (m.scanDate && (Date.now() - m.scanDate < 7 * 24 * 60 * 60 * 1000)) ? '<span class="new-badge">NEW</span>' : '';
        
        html += '<div class="shelf-card" onclick="showItemFromTab(' + realIdx + ',\'all\')" ondblclick="playItemDirectly(' + realIdx + ')" title="' + window.Utils.escHtml(m.title) + '">' +
            '<div class="shelf-poster">' +
                newBadge +
                '<img class="poster-img" data-shelf="' + shelfId + '" data-shelf-idx="' + realIdx + '">' +
                '<div class="no-poster-placeholder"' + (hasPoster ? ' style="display:none"' : '') + '>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                        '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                        '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                        '<path d="m21 15-5-5L5 21"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="shelf-overlay">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32" color="#fff"><polygon points="5,3 19,12 5,21"/></svg>' +
                '</div>' +
                (r ? '<span class="shelf-rating">\u2605 ' + r.toFixed(1) + '</span>' : '') +
                getWatchProgressHtml(m.title) +
            '</div>' +
            '<div class="shelf-info">' +
                '<div class="shelf-card-title">' + window.Utils.escHtml(m.title) + '</div>' +
                '<div class="shelf-card-year">' + m.year + '</div>' +
            '</div>' +
        '</div>';
    });
    
    html += '</div></div>';
    return html;
}

/**
 * Render Top Rated as a shelf row (replaces the old top rated row)
 */
function renderTopRatedShelf() {
    var rated = window.allMovies.filter(function(m) {
        return m.nfoData && m.nfoData.rating;
    }).slice().sort(function(a, b) {
        return b.nfoData.rating - a.nfoData.rating;
    }).slice(0, 10);

    if (rated.length < 3) return '';

    var html = '<div class="shelf-section">' +
        '<div class="shelf-title">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--star-color)">' +
                '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>' +
            '</svg>' +
            '<span>Top Rated</span>' +
        '</div>' +
        '<div class="shelf-row">';

    rated.forEach(function(m, idx) {
        var realIdx = window.allMovies.indexOf(m);
        var hasPoster = !!m.posterHandle;
        
        html += '<div class="shelf-card" onclick="showItemFromTab(' + realIdx + ',\'all\')" ondblclick="playItemDirectly(' + realIdx + ')" title="' + window.Utils.escHtml(m.title) + '">' +
            '<div class="shelf-poster">' +
                '<span class="shelf-rank">' + (idx + 1) + '</span>' +
                '<img class="poster-img" data-shelf="toprated" data-shelf-idx="' + realIdx + '">' +
                '<div class="no-poster-placeholder"' + (hasPoster ? ' style="display:none"' : '') + '>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                        '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                        '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                        '<path d="m21 15-5-5L5 21"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="shelf-overlay">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32" color="#fff"><polygon points="5,3 19,12 5,21"/></svg>' +
                '</div>' +
                '<span class="shelf-rating">\u2605 ' + m.nfoData.rating.toFixed(1) + '</span>' +
                getWatchProgressHtml(m.title) +
            '</div>' +
            '<div class="shelf-info">' +
                '<div class="shelf-card-title">' + window.Utils.escHtml(m.title) + '</div>' +
                '<div class="shelf-card-year">' + m.year + '</div>' +
            '</div>' +
        '</div>';
    });

    html += '</div></div>';
    return html;
}

/**
 * Load poster images for shelf cards
 */
async function loadShelfPosters(container) {
    var imgs = container.querySelectorAll('.poster-img[data-shelf]');
    for (var i = 0; i < imgs.length; i++) {
        (function(img) {
            (async function() {
                var idx = parseInt(img.dataset.shelfIdx);
                var m = window.allMovies[idx];
                if (!m || !m.posterHandle) return;
                var posterUrl = await window.loadPosterForMovie(m);
                if (posterUrl) {
                    img.src = posterUrl;
                    img.classList.add('loaded');
                    var ph = img.parentElement.querySelector('.no-poster-placeholder');
                    if (ph) ph.style.display = 'none';
                }
            })();
        })(imgs[i]);
    }
}

// ============================================================================
// CONTINUE WATCHING SHELF (Enhanced) - Shows partially watched items with progress
// ============================================================================
function renderContinueWatchingShelf() {
    if (typeof window.getPlaybackPosition !== 'function') return '';
    var positions = window.getPlaybackPositions();
    var keys = Object.keys(positions);
    if (keys.length === 0) return '';

    // Build list of movies with playback positions, filtered to partially watched (1%-95%)
    var cwItems = [];
    keys.forEach(function(title) {
        var pos = positions[title];
        if (!pos || !pos.position || !pos.duration) return;
        var pct = Math.min(100, Math.round((pos.position / pos.duration) * 100));
        // Only show partially watched items (>5% and <95%)
        if (pct <= 5 || pct >= 95) return;
        var m = window.allMovies.find(function(item) { return item.title === title; });
        if (!m) return;
        // Avoid duplicates
        var isDup = cwItems.some(function(c) { return c.movie.title === title; });
        if (isDup) return;
        cwItems.push({ movie: m, pct: pct, timestamp: pos.timestamp || 0 });
    });

    if (cwItems.length === 0) return '';

    // Sort by most recently watched (newest timestamp first)
    cwItems.sort(function(a, b) { return b.timestamp - a.timestamp; });
    cwItems = cwItems.slice(0, 10);

    // Build the shelf HTML with progress bars on each card
    var html = '<div class="shelf-section">' +
        '<div class="shelf-title">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M1 4v6h6"/>' +
                '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>' +
            '</svg>' +
            '<span>Continue Watching</span>' +
        '</div>' +
        '<div class="shelf-row">';

    cwItems.forEach(function(item) {
        var m = item.movie;
        var pct = item.pct;
        var realIdx = window.allMovies.indexOf(m);
        var hasPoster = !!m.posterHandle;
        var r = m.nfoData && m.nfoData.rating;
        var safeTitle = m.title.replace(/'/g, "\\'");

        html += '<div class="shelf-card continue-watching-card" onclick="resumePlayback(\'' + safeTitle + '\')" ondblclick="resumePlayback(\'' + safeTitle + '\')" title="' + window.Utils.escHtml(m.title) + ' — ' + pct + '% watched">' +
            '<div class="shelf-poster">' +
                '<img class="poster-img" data-shelf="continue-watching" data-shelf-idx="' + realIdx + '">' +
                '<div class="no-poster-placeholder"' + (hasPoster ? ' style="display:none"' : '') + '>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                        '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                        '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                        '<path d="m21 15-5-5L5 21"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="shelf-overlay">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32" color="#fff"><polygon points="5,3 19,12 5,21"/></svg>' +
                '</div>' +
                (r ? '<span class="shelf-rating">\u2605 ' + r.toFixed(1) + '</span>' : '') +
                '<div class="continue-watching-progress">' +
                    '<div class="cw-bar"><div class="cw-bar-fill" style="width:' + pct + '%"></div></div>' +
                    '<span class="cw-pct">' + pct + '%</span>' +
                '</div>' +
            '</div>' +
            '<div class="shelf-info">' +
                '<div class="shelf-card-title">' + window.Utils.escHtml(m.title) + '</div>' +
                '<div class="shelf-card-year">' + m.year + '</div>' +
            '</div>' +
        '</div>';
    });

    html += '</div></div>';
    return html;
}

function renderAllTab() {
    _revokeLogoBlobUrls();
    var container = document.getElementById('allContainer');
    var emptyState = document.getElementById('allEmptyState');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';

    var items = window.allMovies.filter(function(m) {
        return matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
    });

    sortItems(items, s);

    var filterCount = document.getElementById('sharedFilterCount');
    if (filterCount) {
        filterCount.textContent = items.length + ' title' + (items.length !== 1 ? 's' : '');
    }

    // Render Continue Watching, Recently Added, and Top Rated sections
    // Only show shelves when no advanced filters, genre filter, or search are active
    var topRatedContainer = document.getElementById('allTopRated');
    if (topRatedContainer && !q && !hasActiveAdvancedFilters()) {
        var shelvesHtml = '';
        
        // Continue Watching shelf (enhanced with progress & resume)
        var cwShelfHtml = renderContinueWatchingShelf();
        if (cwShelfHtml) {
            shelvesHtml += cwShelfHtml;
        }
        
        // Recently Added shelf (sorted by last scan - use newest by year for now)
        var recentlyAdded = window.allMovies.slice().sort(function(a, b) {
            return parseInt(b.year) - parseInt(a.year);
        }).slice(0, 10);
        if (recentlyAdded.length > 0) {
            shelvesHtml += renderShelfRow('Recently Added', recentlyAdded, 'recently-added');
        }
        
        // Top Rated shelf
        shelvesHtml += renderTopRatedShelf();
        
        topRatedContainer.innerHTML = shelvesHtml;
        loadShelfPosters(topRatedContainer);
    } else if (topRatedContainer) {
        topRatedContainer.innerHTML = '';
    }

    if (items.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    // Apply page size limit
    var visibleCount = window.getVisibleCount('all', items.length);
    var visibleItems = items.slice(0, visibleCount);

    container.innerHTML = buildCardGrid(visibleItems, 'all');
    observeImages(container);
    // Also populate multi-genre tags
    if (typeof window.populateGenreTags === 'function') {
        window.populateGenreTags();
    }
    // Also populate country tags
    if (typeof window.populateCountryTags === 'function') {
        window.populateCountryTags();
    }

    // Add infinite scroll sentinel if there are more items
    if (visibleCount < items.length) {
        container.insertAdjacentHTML('beforeend', '<div class="infinite-scroll-sentinel" data-tab="all"></div>');
        observeInfiniteScrollSentinel(container);
    }
}

// ============================================================================
// ANIMATION TAB
// ============================================================================
window.filterAnimationTab = function() {
    renderAnimationTab();
};

function renderAnimationTab() {
    _revokeLogoBlobUrls();
    var container = document.getElementById('animationContainer');
    var emptyState = document.getElementById('animationEmptyState');
    var filterCount = document.getElementById('sharedFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';

    var items = window.allMovies.filter(function(m) {
        return isAnimation(m) && matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
    });

    sortItems(items, s);

    if (filterCount) {
        filterCount.textContent = items.length + ' animation title' + (items.length !== 1 ? 's' : '');
    }

    if (items.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    // Apply page size limit
    var visibleCount = window.getVisibleCount('animation', items.length);
    var visibleItems = items.slice(0, visibleCount);

    container.innerHTML = buildCardGrid(visibleItems, 'animation');
    observeImages(container);

    // Add infinite scroll sentinel if there are more items
    if (visibleCount < items.length) {
        container.insertAdjacentHTML('beforeend', '<div class="infinite-scroll-sentinel" data-tab="animation"></div>');
        observeInfiniteScrollSentinel(container);
    }
}

// ============================================================================
// ANIME TAB
// ============================================================================
window.filterAnimeTab = function() {
    renderAnimeTab();
};

function renderAnimeTab() {
    _revokeLogoBlobUrls();
    var container = document.getElementById('animeContainer');
    var emptyState = document.getElementById('animeEmptyState');
    var filterCount = document.getElementById('sharedFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';

    var items = window.allMovies.filter(function(m) {
        return isAnime(m) && matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
    });

    sortItems(items, s);

    if (filterCount) {
        filterCount.textContent = items.length + ' anime title' + (items.length !== 1 ? 's' : '');
    }

    if (items.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    // Apply page size limit
    var visibleCount = window.getVisibleCount('anime', items.length);
    var visibleItems = items.slice(0, visibleCount);

    container.innerHTML = buildCardGrid(visibleItems, 'anime');
    observeImages(container);

    // Add infinite scroll sentinel if there are more items
    if (visibleCount < items.length) {
        container.insertAdjacentHTML('beforeend', '<div class="infinite-scroll-sentinel" data-tab="anime"></div>');
        observeInfiniteScrollSentinel(container);
    }
}

// ============================================================================
// TOP RATED ROW (All tab only)
// ============================================================================
function renderTopRatedRow(container) {
    var rated = window.allMovies.filter(function(m) {
        return m.nfoData && m.nfoData.rating;
    }).slice().sort(function(a, b) {
        return b.nfoData.rating - a.nfoData.rating;
    }).slice(0, 10);

    if (rated.length < 3) {
        container.innerHTML = '';
        return;
    }

    var html = '<div class="top-rated-section">' +
        '<div class="top-rated-title">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--star-color)">' +
                '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>' +
            '</svg>' +
            'Top Rated' +
        '</div>' +
        '<div class="top-rated-row">';

    rated.forEach(function(m, idx) {
        var realIdx = window.allMovies.indexOf(m);
        var r = m.nfoData.rating;
        var hasPoster = !!m.posterHandle;

        html += '<div class="top-rated-card" onclick="showItemFromTab(' + realIdx + ',\'all\')" ondblclick="playItemDirectly(' + realIdx + ')" title="Double-click to play">' +
            '<div class="poster-container">' +
                '<span class="top-rated-rank">' + (idx + 1) + '</span>' +
                '<img class="poster-img" data-movie-idx="' + realIdx + '">' +
                '<div class="no-poster-placeholder"' + (hasPoster ? ' style="display:none"' : '') + '>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                        '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                        '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                        '<path d="m21 15-5-5L5 21"/>' +
                    '</svg>' +
                '</div>' +
                (r ? '<div class="rating-badge">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--star-color)">' +
                        '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>' +
                    '</svg>' + r.toFixed(1) +
                '</div>' : '') +
                getWatchProgressHtml(m.title) +
            '</div>' +
            '<div class="card-info">' +
                '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                '<div class="movie-year">' + m.year + '</div>' +
            '</div>' +
        '</div>';
    });

    html += '</div></div>';
    container.innerHTML = html;

    // Lazy-load posters for top rated cards via IntersectionObserver
    observeImages(container);
}

// ============================================================================
// GENERIC CARD GRID BUILDER
// ============================================================================
function buildCardGrid(items, tabId) {
    // Fallback: ensure currentView is a valid mode
    if (currentView !== 'grid' && currentView !== 'detail' && currentView !== 'compact' && currentView !== 'posters' && currentView !== 'table') {
        currentView = 'grid';
    }
    if (currentView === 'grid') {
        return '<div class="movie-grid">' + items.map(function(m, i) {
            var r = m.nfoData && m.nfoData.rating;
            var hasPoster = !!m.posterHandle;
            var isTV = m.isTVShow;
            var episodesInfo = isTV ? (m.totalEpisodes + ' eps' + (m.totalSeasons ? ' \u2022 ' + m.totalSeasons + ' seasons' : '')) : '';
            var isAnim = isAnimation(m);
            var isAnm = isAnime(m);
            var badgeHtml = '';
            if (isTV) badgeHtml = '<span class="movie-quality tv-badge">TV Series</span>';
            else if (isAnm) badgeHtml = '<span class="movie-quality anime-badge">Anime</span>';
            else if (isAnim) badgeHtml = '<span class="movie-quality animation-badge">Animation</span>';
            else badgeHtml = '<span class="movie-quality movie-badge">Movie</span>';
            var _midx = window.allMovies.indexOf(m);
            var isFav = window.isFavorite ? window.isFavorite(m.title) : false;
            var favBtn = '<button class="card-fav-btn' + (isFav ? ' favorited' : '') + '" onclick="event.stopPropagation();toggleFavoriteCard(\'' + m.title.replace(/'/g, "\\'") + '\')" title="Toggle favorite">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '</button>';
            var isWatchedItem = window.isWatched ? window.isWatched(m.title) : false;
            var watchedBadge = isWatchedItem ? '<span class="watched-badge" title="Watched"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>' : '';
            // Watch progress bar
            var progressHtml = getWatchProgressHtml(m.title);

            var _isSelected = window._selectedItems && window._selectedItems.indexOf(m.title) !== -1;
            var _selectedClass = _isSelected ? ' selected' : '';
            return '<div class="movie-card' + _selectedClass + '" draggable="true" data-title="' + window.Utils.escHtml(m.title) + '" ondragstart="event.dataTransfer.setData(\'text/plain\',this.dataset.title||\'\')" onclick="showItemFromTab(' + _midx + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx + ')" title="Double-click to play">' +
                '<div class="poster-container">' +
                (window._selectMode ? '<div class="card-checkbox" data-title="' + window.Utils.escHtml(m.title) + '" onclick="event.stopPropagation();toggleItemSelection(\'' + m.title.replace(/'/g, "\\'") + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : '') +
                    (m.logoHandle ? '<img class="logo-img" data-movie-idx="' + _midx + '">' : '') +
                    '<img class="poster-img" data-movie-idx="' + _midx + '">' +
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
                    badgeHtml +
                    favBtn +
                    watchedBadge +
                    progressHtml +
                '</div>' +
                '<div class="card-info">' +
                    '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="movie-year">' + m.year +
                        (episodesInfo ? ' \u2022 ' + episodesInfo :
                         (m.nfoData && m.nfoData.runtime ? ' \u2022 ' + m.nfoData.runtime + 'm' : '')) +
                    '</div>' +
                    (m.nfoData && m.nfoData.genres && m.nfoData.genres.length ?
                        '<div class="movie-genre">' + m.nfoData.genres.map(window.Utils.escHtml).join(', ') + '</div>' : '') +
                    '<div class="card-user-rating">' + (typeof window.renderStarRating === 'function' ? window.renderStarRating(m.title, 'sm') : '') + '</div>' +
                    '<div class="movie-filesize">' + window.Utils.formatBytes(m.fileSize) + (m.quality ? ' \u2022 ' + window.Utils.escHtml(m.quality) : '') + '</div>' +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    } else if (currentView === 'detail') {
        return '<div class="movie-detail-grid">' + items.map(function(m, i) {
            var _midx2 = window.allMovies.indexOf(m);
            var _progressDetail = getWatchProgressHtml(m.title);
            return '<div class="movie-detail-card" data-title="' + window.Utils.escHtml(m.title) + '" onclick="showItemFromTab(' + _midx2 + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx2 + ')">' +
                (window._selectMode ? '<div class="card-checkbox card-checkbox-detail" data-title="' + window.Utils.escHtml(m.title) + '" onclick="event.stopPropagation();toggleItemSelection(\'' + m.title.replace(/'/g, "\\'") + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : '') +
                '<div class="detail-poster">' +
                    '<img class="poster-img" data-movie-idx="' + _midx2 + '">' +
                    _progressDetail +
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
    } else if (currentView === 'compact' || currentView === 'posters' || currentView === 'table') {
        // Use shared buildCardItems for compact, poster wall, and table views
        return buildCardItems(items, tabId);
    }
    return '';
}

// ============================================================================
// SHOW ITEM FROM ANY TAB (navigates to detail page)
// ============================================================================
window.showItemFromTab = function(realIdx, tabId) {
    window.filteredMovies = window.allMovies;
    window.DetailPage.showDetailPage(realIdx);
};

// ============================================================================
// LOAD ASSETS FOR GENERIC TABS (all/animation/anime)
// ============================================================================
async function loadTabAssets(tabId) {
    var posters = document.querySelectorAll('.poster-img[data-tab="' + tabId + '"]');
    var logos = document.querySelectorAll('.logo-img[data-tab="' + tabId + '"]');

    for (var i = 0; i < posters.length; i++) {
        (function(img) {
            (async function() {
                var idx = parseInt(img.dataset.tabIdx);
                // Find the movie in allMovies - we need to look at the container's rendered items
                // For simplicity, find by the onclick handler's realIdx
                var card = img.closest('.movie-card, .movie-detail-card');
                if (!card) return;
                var onclickAttr = card.getAttribute('onclick') || '';
                var match = onclickAttr.match(/showItemFromTab\((\d+)/);
                if (!match) return;
                var m = window.allMovies[parseInt(match[1])];
                if (!m || !m.posterHandle) return;

                // loadPosterForMovie checks thumbnail cache (data URLs, 7-day TTL) first,
                // then poster blob cache (24h TTL), then file system. Cached data URLs
                // are used directly as img.src without needing object URL creation.
                var posterUrl = await window.loadPosterForMovie(m);
                if (posterUrl) {
                    img.src = posterUrl;
                    img.classList.add('loaded');
                    var placeholder = img.parentElement.querySelector('.no-poster-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
            })();
        })(posters[i]);
    }

    for (var j = 0; j < logos.length; j++) {
        (function(img) {
            (async function() {
                var card = img.closest('.movie-card, .movie-detail-card');
                if (!card) return;
                var onclickAttr = card.getAttribute('onclick') || '';
                var match = onclickAttr.match(/showItemFromTab\((\d+)/);
                if (!match) return;
                var m = window.allMovies[parseInt(match[1])];
                if (!m || !m.logoHandle) return;

                // Check thumbnail cache for logo first
                if (window.getThumbnail && m.fullPath) {
                    try {
                        var logoPath = m.fullPath + '/' + m.logoHandle.name;
                        var logoCached = await window.getThumbnail(logoPath);
                        if (logoCached && logoCached.dataUrl && logoCached.timestamp) {
                            var logoAge = Date.now() - logoCached.timestamp;
                            if (logoAge < 7 * 24 * 60 * 60 * 1000) {
                                m.logoUrl = logoCached.dataUrl;
                                img.src = m.logoUrl;
                                img.classList.add('loaded');
                                return;
                            }
                        }
                    } catch(e) {}
                }

                if (m.logoUrl) {
                    img.src = m.logoUrl;
                    img.classList.add('loaded');
                    return;
                }
                try {
                    var f = await m.logoHandle.getFile();
                    if (m.logoUrl && m.logoUrl.startsWith('blob:')) URL.revokeObjectURL(m.logoUrl);
                    m.logoUrl = URL.createObjectURL(f);
                    img.src = m.logoUrl;
                    img.classList.add('loaded');

                    // Cache logo to thumbnail cache as data URL
                    if (window.saveThumbnail && m.fullPath) {
                        try {
                            var logoCachePath = m.fullPath + '/' + m.logoHandle.name;
                            var logoDataUrl = await new Promise(function(resolve, reject) {
                                var reader = new FileReader();
                                reader.onloadend = function() { resolve(reader.result); };
                                reader.onerror = function() { reject(new Error('FileReader failed')); };
                                reader.readAsDataURL(f);
                            });
                            await window.saveThumbnail(logoCachePath, logoDataUrl);
                        } catch(e2) {}
                    }
                } catch(e) {}
            })();
        })(logos[j]);
    }
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
    _revokeLogoBlobUrls();
    var container = document.getElementById('tvshowContainer');
    var emptyState = document.getElementById('tvshowEmptyState');
    var filterCount = document.getElementById('sharedFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var tvShows = window.allMovies.filter(function(m) { return m.isTVShow && matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m); });

    // Sort TV shows
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';

    sortItems(tvShows, s);

    if (filterCount) {
        filterCount.textContent = tvShows.length + ' TV show' + (tvShows.length !== 1 ? 's' : '');
    }

    if (tvShows.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    // Apply page size limit for TV shows tab
    var tvVisibleCount = window.getVisibleCount('tvshows', tvShows.length);
    var visibleTVShows = tvShows.slice(0, tvVisibleCount);

    container.innerHTML = buildCardGrid(visibleTVShows, 'tvshows');
    observeImages(container);

    // Add infinite scroll sentinel for TV shows tab if page size limits apply
    if (tvVisibleCount < tvShows.length) {
        container.insertAdjacentHTML('beforeend', '<div class="infinite-scroll-sentinel" data-tab="tvshows"></div>');
        observeInfiniteScrollSentinel(container);
    }
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
                var posterUrl = await window.loadPosterForMovie(m);
                if (posterUrl) {
                    img.src = posterUrl;
                    img.classList.add('loaded');
                    var placeholder = img.parentElement.querySelector('.no-poster-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
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
                    if (m.logoUrl && m.logoUrl.startsWith('blob:')) URL.revokeObjectURL(m.logoUrl);
                    var _tvLogoBlobUrl = URL.createObjectURL(f);
                    m.logoUrl = _tvLogoBlobUrl;
                    img.src = m.logoUrl;
                    img.classList.add('loaded');
                    // Cache as data URL and replace blob to prevent memory leak
                    if (window.saveThumbnail && m.fullPath) {
                        try {
                            var _tvLogoCachePath = m.fullPath + '/' + m.logoHandle.name;
                            var _tvLogoDataUrl = await new Promise(function(resolve, reject) {
                                var reader = new FileReader();
                                reader.onloadend = function() { resolve(reader.result); };
                                reader.onerror = function() { reject(new Error('FileReader failed')); };
                                reader.readAsDataURL(f);
                            });
                            await window.saveThumbnail(_tvLogoCachePath, _tvLogoDataUrl);
                            URL.revokeObjectURL(_tvLogoBlobUrl);
                            m.logoUrl = _tvLogoDataUrl;
                            img.src = m.logoUrl;
                        } catch(e3) {
                            _logoBlobUrls.push(_tvLogoBlobUrl);
                        }
                    } else {
                        _logoBlobUrls.push(_tvLogoBlobUrl);
                    }
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
                var posterUrl = await window.loadPosterForMovie(m);
                if (posterUrl) {
                    img.src = posterUrl;
                    img.classList.add('loaded');
                    // Hide placeholder when poster loads
                    var placeholder = img.parentElement.querySelector('.no-poster-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
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
                    if (m.logoUrl && m.logoUrl.startsWith('blob:')) URL.revokeObjectURL(m.logoUrl);
                    var _assetsLogoBlobUrl = URL.createObjectURL(f);
                    m.logoUrl = _assetsLogoBlobUrl;
                    img.src = m.logoUrl;
                    img.classList.add('loaded');
                    // Cache as data URL and replace blob to prevent memory leak
                    if (window.saveThumbnail && m.fullPath) {
                        try {
                            var _assetsLogoCachePath = m.fullPath + '/' + m.logoHandle.name;
                            var _assetsLogoDataUrl = await new Promise(function(resolve, reject) {
                                var reader = new FileReader();
                                reader.onloadend = function() { resolve(reader.result); };
                                reader.onerror = function() { reject(new Error('FileReader failed')); };
                                reader.readAsDataURL(f);
                            });
                            await window.saveThumbnail(_assetsLogoCachePath, _assetsLogoDataUrl);
                            URL.revokeObjectURL(_assetsLogoBlobUrl);
                            m.logoUrl = _assetsLogoDataUrl;
                            img.src = m.logoUrl;
                        } catch(e3) {
                            _logoBlobUrls.push(_assetsLogoBlobUrl);
                        }
                    } else {
                        _logoBlobUrls.push(_assetsLogoBlobUrl);
                    }
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

    // Update the sliding indicator on view-toggle
    var viewToggle = document.querySelector('.view-toggle');
    if (viewToggle) {
        var viewBtns = viewToggle.querySelectorAll('.view-btn');
        var activeIdx = -1;
        viewBtns.forEach(function(btn, idx) {
            if (btn.dataset.view === view) activeIdx = idx;
        });
        if (activeIdx >= 0) {
            viewToggle.setAttribute('data-active', activeIdx.toString());
            viewToggle.classList.add('has-indicator');
        }
    }

    // Re-render the currently visible tab
    renderMovies();
    renderTVShows();
    renderAllTab();
    renderAnimationTab();
    renderAnimeTab();
}

/**
 * Render movies based on current view mode (grid, detail, compact, posters)
 * This is specifically for the MOVIES tab (movies only, no TV shows)
 */
function renderMovies() {
    _revokeLogoBlobUrls();
    var container = document.getElementById('movieContainer');
    var emptyState = document.getElementById('emptyState');
    var filterCount = document.getElementById('sharedFilterCount');

    if (!container) return;

    if (filterCount) {
        filterCount.textContent = window.filteredMovies.length + ' movie' + (window.filteredMovies.length !== 1 ? 's' : '');
    }

    if (window.filteredMovies.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    // Apply page size limit for movies tab
    var movieVisibleCount = window.getVisibleCount('movies', window.filteredMovies.length);
    var visibleFiltered = window.filteredMovies.slice(0, movieVisibleCount);

    container.innerHTML = buildCardGrid(visibleFiltered, 'movies');
    observeImages(container);

    // Add infinite scroll sentinel for movies tab if page size limits apply
    if (movieVisibleCount < window.filteredMovies.length) {
        container.insertAdjacentHTML('beforeend', '<div class="infinite-scroll-sentinel" data-tab="movies"></div>');
        observeInfiniteScrollSentinel(container);
    }
}

// ============================================================================
// ADVANCED FILTER PANEL - State & Functions
// ============================================================================
var _advancedFilterState = {
    yearMin: 1900,
    yearMax: 2050,
    ratingMin: 0,
    sizeMinBytes: 0,   // 0 = no min
    sizeMaxBytes: 0     // 0 = no max
};

/**
 * Toggle the advanced filter panel visibility
 */
window.toggleAdvancedFilters = function() {
    var panel = document.getElementById('advancedFilterPanel');
    var toggle = document.getElementById('filterPanelToggle');
    if (!panel || !toggle) return;

    var isActive = panel.classList.contains('active');
    if (isActive) {
        panel.classList.remove('active');
        toggle.classList.remove('active');
    } else {
        panel.classList.add('active');
        toggle.classList.add('active');
    }
};

/**
 * Update the year range display and apply filters
 */
window.updateYearRange = function() {
    var minRange = document.getElementById('yearMinRange');
    var maxRange = document.getElementById('yearMaxRange');
    var minInput = document.getElementById('yearMinInput');
    var maxInput = document.getElementById('yearMaxInput');
    if (!minRange || !maxRange) return;

    // Sync range and input fields
    if (minInput && document.activeElement === minInput) {
        var minVal = parseInt(minInput.value) || 1900;
        minRange.value = minVal;
    } else {
        if (minInput) minInput.value = minRange.value;
    }
    if (maxInput && document.activeElement === maxInput) {
        var maxVal = parseInt(maxInput.value) || 2050;
        maxRange.value = maxVal;
    } else {
        if (maxInput) maxInput.value = maxRange.value;
    }

    var minVal = parseInt(minRange.value);
    var maxVal = parseInt(maxRange.value);

    // Ensure min <= max
    if (minVal > maxVal) {
        var temp = minVal;
        minVal = maxVal;
        maxVal = temp;
        minRange.value = minVal;
        maxRange.value = maxVal;
        if (minInput) minInput.value = minVal;
        if (maxInput) maxInput.value = maxVal;
    }

    _advancedFilterState.yearMin = minVal;
    _advancedFilterState.yearMax = maxVal;
    applyAdvancedFilters();
};

/**
 * Update the rating range display and apply filters
 */
window.updateRatingRange = function() {
    var el = document.getElementById('ratingMinRange');
    var valueEl = document.getElementById('ratingRangeValue');
    if (!el || !valueEl) return;

    var val = parseFloat(el.value);
    _advancedFilterState.ratingMin = val;
    valueEl.textContent = val > 0 ? val + '+' : '0+';
    applyAdvancedFilters();
};

/**
 * Update the file size range filter and apply
 */
window.updateFileSizeRange = function() {
    var minEl = document.getElementById('fileSizeMin');
    var maxEl = document.getElementById('fileSizeMax');
    var minUnitEl = document.getElementById('fileSizeMinUnit');
    var maxUnitEl = document.getElementById('fileSizeMaxUnit');

    var minVal = parseFloat(minEl ? minEl.value : 0) || 0;
    var maxVal = parseFloat(maxEl ? maxEl.value : 0) || 0;
    var minUnit = minUnitEl ? minUnitEl.value : 'gb';
    var maxUnit = maxUnitEl ? maxUnitEl.value : 'gb';

    // Convert to bytes
    var minBytes = 0;
    if (minVal > 0) {
        minBytes = minUnit === 'gb' ? minVal * 1024 * 1024 * 1024 : minVal * 1024 * 1024;
    }
    var maxBytes = 0;
    if (maxVal > 0) {
        maxBytes = maxUnit === 'gb' ? maxVal * 1024 * 1024 * 1024 : maxVal * 1024 * 1024;
    }

    _advancedFilterState.sizeMinBytes = minBytes;
    _advancedFilterState.sizeMaxBytes = maxBytes;
    applyAdvancedFilters();
};



/**
 * Reset all advanced filters to defaults
 */
window.resetAdvancedFilters = function() {
    _advancedFilterState = {
        yearMin: 1900,
        yearMax: 2050,
        ratingMin: 0,
        sizeMinBytes: 0,
        sizeMaxBytes: 0
    };

    // Reset UI elements
    var yearMin = document.getElementById('yearMinRange');
    var yearMax = document.getElementById('yearMaxRange');
    var yearMinInput = document.getElementById('yearMinInput');
    var yearMaxInput = document.getElementById('yearMaxInput');
    var ratingMin = document.getElementById('ratingMinRange');
    var ratingVal = document.getElementById('ratingRangeValue');
    var fileSizeMin = document.getElementById('fileSizeMin');
    var fileSizeMax = document.getElementById('fileSizeMax');

    if (yearMin) yearMin.value = 1900;
    if (yearMax) yearMax.value = 2050;
    if (yearMinInput) yearMinInput.value = 1900;
    if (yearMaxInput) yearMaxInput.value = 2050;
    if (ratingMin) ratingMin.value = 0;
    if (ratingVal) ratingVal.textContent = '0+';
    if (fileSizeMin) fileSizeMin.value = '';
    if (fileSizeMax) fileSizeMax.value = '';

    // Reset multi-genre filter
    if (typeof window.clearMultiGenreFilter === 'function') {
        window.clearMultiGenreFilter();
    }

    // Reset country filter
    if (typeof window.clearCountryFilter === 'function') {
        window.clearCountryFilter();
    }

    // Reset decade filter
    if (typeof window.clearDecadeFilter === 'function') {
        window.clearDecadeFilter();
    }

    // Reset watched filter
    if (typeof window.clearWatchedFilter === 'function') {
        window.clearWatchedFilter();
    }

    updateFilterIndicator();
    updateFilterChips();
    renderAllTab();
};

/**
 * Apply advanced filters and re-render the All tab
 */
function applyAdvancedFilters() {
    updateFilterIndicator();
    updateFilterChips();
    var activeTab = _getActiveTabName();
    if (activeTab === 'movies') filterMovies();
    else if (activeTab === 'all') renderAllTab();
    else if (activeTab === 'tvshows') renderTVShows();
    else if (activeTab === 'animation') renderAnimationTab();
    else if (activeTab === 'anime') renderAnimeTab();
}

/**
 * Update the red dot indicator on the filter toggle button
 */
function updateFilterIndicator() {
    var indicator = document.getElementById('filterActiveIndicator');
    if (!indicator) return;

    var hasActive = _advancedFilterState.yearMin > 1900 ||
                    _advancedFilterState.yearMax < 2050 ||
                    _advancedFilterState.ratingMin > 0 ||
                    _advancedFilterState.sizeMinBytes > 0 ||
                    _advancedFilterState.sizeMaxBytes > 0 ||
                    (typeof window._selectedGenres !== 'undefined' && window._selectedGenres && window._selectedGenres.size > 0) ||
                    (typeof window._selectedCountries !== 'undefined' && window._selectedCountries && window._selectedCountries.size > 0) ||
                    (document.getElementById('genreFilterSelect') && document.getElementById('genreFilterSelect').value) ||
                    (document.getElementById('countryFilterSelect') && document.getElementById('countryFilterSelect').value);

    if (hasActive) {
        indicator.classList.add('visible');
    } else {
        indicator.classList.remove('visible');
    }
}

/**
 * Update the active filter chips display
 * Shows removable pill tags for each active filter
 */
function updateFilterChips() {
    var container = document.getElementById('activeFilterChips');
    if (!container) return;

    var chips = [];

    // Search query chip
    var searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        var qVal = searchInput.value.trim();
        if (qVal.length > 20) qVal = qVal.substring(0, 20) + '…';
        chips.push({
            type: 'search',
            label: '🔍 ' + qVal,
            onRemove: function() {
                searchInput.value = '';
                if (typeof window.clearSearchFilter === 'function') {
                    window.clearSearchFilter();
                } else {
                    var activeTab = document.querySelector('.nav-tab.active');
                    if (activeTab) window.switchTab(activeTab.dataset.tab);
                }
            }
        });
    }

    // Decade filter chip
    if (typeof window._selectedDecade !== 'undefined' && window._selectedDecade) {
        chips.push({
            type: 'decade',
            label: '📅 ' + window._selectedDecade,
            onRemove: function() {
                if (typeof window.clearDecadeFilter === 'function') {
                    window.clearDecadeFilter();
                    var activeTab = document.querySelector('.nav-tab.active');
                    if (activeTab) window.switchTab(activeTab.dataset.tab);
                }
            }
        });
    }

    // Watched filter chip
    if (typeof window._watchedFilter !== 'undefined' && window._watchedFilter !== 'all') {
        var watchedLabel = window._watchedFilter === 'watched' ? '👁 Watched' : '👁 Unwatched';
        chips.push({
            type: 'watched',
            label: watchedLabel,
            onRemove: function() {
                if (typeof window.clearWatchedFilter === 'function') {
                    window.clearWatchedFilter();
                    var activeTab = document.querySelector('.nav-tab.active');
                    if (activeTab) window.switchTab(activeTab.dataset.tab);
                }
            }
        });
    }

    var genreSelect = document.getElementById('genreFilterSelect');
    if (genreSelect && genreSelect.value) {
        chips.push({
            type: 'genre',
            label: genreSelect.value,
            onRemove: function() {
                genreSelect.value = '';
                if (typeof window.handleGenreFilterChange === 'function') {
                    window.handleGenreFilterChange();
                }
            }
        });
    }

    var countrySelect = document.getElementById('countryFilterSelect');
    if (countrySelect && countrySelect.value) {
        chips.push({
            type: 'country',
            label: '\ud83c\udf0d ' + countrySelect.value,
            onRemove: function() {
                countrySelect.value = '';
                if (typeof window.handleCountryFilterChange === 'function') {
                    window.handleCountryFilterChange();
                }
            }
        });
    }

    if (_advancedFilterState.yearMin > 1900 || _advancedFilterState.yearMax < 2050) {
        var yLabel = '\ud83d\udcc5 ' + _advancedFilterState.yearMin + '–' + _advancedFilterState.yearMax;
        chips.push({
            type: 'year',
            label: yLabel,
            onRemove: function() {
                _advancedFilterState.yearMin = 1900;
                _advancedFilterState.yearMax = 2050;
                var yearMinR = document.getElementById('yearMinRange');
                var yearMaxR = document.getElementById('yearMaxRange');
                var yearMinI = document.getElementById('yearMinInput');
                var yearMaxI = document.getElementById('yearMaxInput');
                if (yearMinR) yearMinR.value = 1900;
                if (yearMaxR) yearMaxR.value = 2050;
                if (yearMinI) yearMinI.value = 1900;
                if (yearMaxI) yearMaxI.value = 2050;
                applyAdvancedFilters();
            }
        });
    }

    if (_advancedFilterState.ratingMin > 0) {
        chips.push({
            type: 'rating',
            label: '\u2b50 ' + _advancedFilterState.ratingMin + '+',
            onRemove: function() {
                _advancedFilterState.ratingMin = 0;
                var ratingMin = document.getElementById('ratingMinRange');
                var ratingVal = document.getElementById('ratingRangeValue');
                if (ratingMin) ratingMin.value = 0;
                if (ratingVal) ratingVal.textContent = '0+';
                applyAdvancedFilters();
            }
        });
    }

    if (_advancedFilterState.sizeMinBytes > 0 || _advancedFilterState.sizeMaxBytes > 0) {
        var sizeLabel = '\ud83d\udcbe ';
        if (_advancedFilterState.sizeMinBytes > 0) {
            sizeLabel += (_advancedFilterState.sizeMinBytes / (1024*1024*1024)).toFixed(1) + 'GB+';
        }
        if (_advancedFilterState.sizeMaxBytes > 0) {
            sizeLabel += '\u2264' + (_advancedFilterState.sizeMaxBytes / (1024*1024*1024)).toFixed(1) + 'GB';
        }
        chips.push({
            type: 'size',
            label: sizeLabel,
            onRemove: function() {
                _advancedFilterState.sizeMinBytes = 0;
                _advancedFilterState.sizeMaxBytes = 0;
                var fsMin = document.getElementById('fileSizeMin');
                var fsMax = document.getElementById('fileSizeMax');
                if (fsMin) fsMin.value = '';
                if (fsMax) fsMax.value = '';
                applyAdvancedFilters();
            }
        });
    }

    // Render chips
    container.innerHTML = chips.map(function(chip, idx) {
        return '<span class="afp-chip" data-chip-idx="' + idx + '">' +
            window.Utils.escHtml(chip.label) +
            '<span class="afp-chip-x" data-chip-idx="' + idx + '">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</span>' +
        '</span>';
    }).join('');

    // Bind remove handlers
    container.querySelectorAll('.afp-chip-x').forEach(function(xBtn) {
        var idx = parseInt(xBtn.dataset.chipIdx);
        if (chips[idx] && chips[idx].onRemove) {
            xBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                chips[idx].onRemove();
            });
        }
    });
}

/**
 * Check if a movie matches the advanced filter state
 * Used by renderAllTab() to filter items
 */
function matchesAdvancedFilters(m) {
    // Year range filter
    var year = parseInt(m.year) || 0;
    if (year < _advancedFilterState.yearMin || year > _advancedFilterState.yearMax) return false;

    // Rating filter
    if (_advancedFilterState.ratingMin > 0) {
        var rating = (m.nfoData && m.nfoData.rating) || 0;
        if (rating < _advancedFilterState.ratingMin) return false;
    }

    // File size filter
    if (_advancedFilterState.sizeMinBytes > 0) {
        var size = m.fileSize || 0;
        if (size < _advancedFilterState.sizeMinBytes) return false;
    }
    if (_advancedFilterState.sizeMaxBytes > 0) {
        var size = m.fileSize || 0;
        if (size > _advancedFilterState.sizeMaxBytes) return false;
    }

    // Country filter
    if (typeof window.matchesCountry === 'function' && !window.matchesCountry(m)) return false;

    // Decade filter
    if (typeof window.matchesDecade === 'function' && !window.matchesDecade(m)) return false;

    // Watched/Unwatched filter
    if (typeof window.matchesWatchedFilter === 'function' && !window.matchesWatchedFilter(m)) return false;

    // Genre filter from select dropdown
    var genreSelect = document.getElementById('genreFilterSelect');
    if (genreSelect && genreSelect.value) {
        if (!matchesGenre(m, genreSelect.value)) return false;
    }

    return true;
}

/**
 * Check if any advanced filter is active
 */
function hasActiveAdvancedFilters() {
    return _advancedFilterState.yearMin > 1900 ||
           _advancedFilterState.yearMax < 2050 ||
           _advancedFilterState.ratingMin > 0 ||
           _advancedFilterState.sizeMinBytes > 0 ||
           _advancedFilterState.sizeMaxBytes > 0 ||
           (typeof window._selectedCountries !== 'undefined' && window._selectedCountries && window._selectedCountries.size > 0) ||
           (document.getElementById('genreFilterSelect') && document.getElementById('genreFilterSelect').value) ||
           (document.getElementById('countryFilterSelect') && document.getElementById('countryFilterSelect').value);
}

// Export for use in other modules
// ============================================================================
// SKELETON LOADING - Placeholder cards shown while library is loading
// ============================================================================
window.renderSkeletonGrid = function(count) {
    count = count || 12;
    var html = '<div class="skeleton-grid">';
    for (var i = 0; i < count; i++) {
        html += '<div class="skeleton-card">' +
            '<div class="skeleton-poster"></div>' +
            '<div class="skeleton-info">' +
                '<div class="skeleton-text" style="width:' + (60 + Math.random() * 30) + '%"></div>' +
                '<div class="skeleton-text-short"></div>' +
            '</div>' +
        '</div>';
    }
    html += '</div>';
    return html;
};

window.UIRenderer = {
    updateStats: updateStats,
    toggleSkippedPanel: toggleSkippedPanel,
    filterMovies: filterMovies,
    loadAssets: loadAssets,
    observeImages: observeImages,
    setView: setView,
    renderMovies: renderMovies,
    renderTVShows: renderTVShows,
    filterTVShows: filterTVShows,
    renderAllTab: renderAllTab,
    renderAnimationTab: renderAnimationTab,
    renderAnimeTab: renderAnimeTab,
    renderTopRatedRow: renderTopRatedRow,
    renderContinueWatchingShelf: renderContinueWatchingShelf,
    populateGenreDropdowns: function() { /* deprecated - uses tag-based filter now */ },
    revokeLogoBlobUrls: _revokeLogoBlobUrls,
    isAnimation: isAnimation,
    isAnime: isAnime
};

// Also expose as global functions for inline HTML handlers
window.filterMovies = filterMovies;
window.setView = setView;

// Initialize the view-toggle indicator on page load
(function _initViewToggleIndicator() {
    var viewToggle = document.querySelector('.view-toggle');
    if (!viewToggle) return;
    var viewBtns = viewToggle.querySelectorAll('.view-btn');
    var activeIdx = -1;
    viewBtns.forEach(function(btn, idx) {
        if (btn.classList.contains('active')) activeIdx = idx;
    });
    if (activeIdx >= 0) {
        viewToggle.setAttribute('data-active', activeIdx.toString());
        viewToggle.classList.add('has-indicator');
    }
})();

window.filterTVShows = filterTVShows;
window.filterAllTab = filterAllTab;
window.filterAnimationTab = filterAnimationTab;
window.filterAnimeTab = filterAnimeTab;
window.showItemFromTab = window.showItemFromTab;
window.playItemDirectly = window.playItemDirectly;

// ============================================================================
// CARD ITEMS BUILDER - Returns card HTML without wrapping grid div
// Used by appendMoreCards to extract just the card HTML for appending
// ============================================================================
function buildCardItems(items, tabId) {
    // Fallback: ensure currentView is a valid mode
    if (currentView !== 'grid' && currentView !== 'detail' && currentView !== 'compact' && currentView !== 'posters' && currentView !== 'table') {
        currentView = 'grid';
    }
    if (currentView === 'grid') {
        return items.map(function(m, i) {
            var r = m.nfoData && m.nfoData.rating;
            var hasPoster = !!m.posterHandle;
            var isTV = m.isTVShow;
            var episodesInfo = isTV ? (m.totalEpisodes + ' eps' + (m.totalSeasons ? ' \u2022 ' + m.totalSeasons + ' seasons' : '')) : '';
            var isAnim = isAnimation(m);
            var isAnm = isAnime(m);
            var badgeHtml = '';
            if (isTV) badgeHtml = '<span class="movie-quality tv-badge">TV Series</span>';
            else if (isAnm) badgeHtml = '<span class="movie-quality anime-badge">Anime</span>';
            else if (isAnim) badgeHtml = '<span class="movie-quality animation-badge">Animation</span>';
            else badgeHtml = '<span class="movie-quality movie-badge">Movie</span>';
            var _midx = window.allMovies.indexOf(m);
            var isFav = window.isFavorite ? window.isFavorite(m.title) : false;
            var favBtn = '<button class="card-fav-btn' + (isFav ? ' favorited' : '') + '" onclick="event.stopPropagation();toggleFavoriteCard(\'' + m.title.replace(/'/g, "\\'") + '\')" title="Toggle favorite">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '</button>';
            var isWatchedItem = window.isWatched ? window.isWatched(m.title) : false;
            var watchedBadge = isWatchedItem ? '<span class="watched-badge" title="Watched"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>' : '';
            // Watch progress bar
            var progressHtml = getWatchProgressHtml(m.title);

            return '<div class="movie-card card-new" draggable="true" data-title="' + window.Utils.escHtml(m.title) + '" ondragstart="event.dataTransfer.setData(\'text/plain\',this.dataset.title||\'\')" onclick="showItemFromTab(' + _midx + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx + ')" title="Double-click to play">' +
                '<div class="poster-container">' +
                    (m.logoHandle ? '<img class="logo-img" data-movie-idx="' + _midx + '">' : '') +
                    '<img class="poster-img" data-movie-idx="' + _midx + '">' +
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
                    badgeHtml +
                    favBtn +
                    watchedBadge +
                    progressHtml +
                '</div>' +
                '<div class="card-info">' +
                    '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="movie-year">' + m.year +
                        (episodesInfo ? ' \u2022 ' + episodesInfo :
                         (m.nfoData && m.nfoData.runtime ? ' \u2022 ' + m.nfoData.runtime + 'm' : '')) +
                    '</div>' +
                    (m.nfoData && m.nfoData.genres && m.nfoData.genres.length ?
                        '<div class="movie-genre">' + m.nfoData.genres.map(window.Utils.escHtml).join(', ') + '</div>' : '') +
                    '<div class="movie-filesize">' + window.Utils.formatBytes(m.fileSize) + (m.quality ? ' \u2022 ' + window.Utils.escHtml(m.quality) : '') + '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    } else if (currentView === 'detail') {
        return items.map(function(m, i) {
            var _midx2 = window.allMovies.indexOf(m);
            var _progressDetail2 = getWatchProgressHtml(m.title);
            return '<div class="movie-detail-card card-new" data-title="' + window.Utils.escHtml(m.title) + '" onclick="showItemFromTab(' + _midx2 + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx2 + ')">' +
                (window._selectMode ? '<div class="card-checkbox card-checkbox-detail" data-title="' + window.Utils.escHtml(m.title) + '" onclick="event.stopPropagation();toggleItemSelection(\'' + m.title.replace(/'/g, "\\'") + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : '') +
                '<div class="detail-poster">' +
                    '<img class="poster-img" data-movie-idx="' + _midx2 + '">' +
                    _progressDetail2 +
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
                    '<div class="detail-filename">' + window.Utils.escHtml(m.fileName || '') + '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    } else if (currentView === 'compact') {
        // Compact: small cards in a dense grid, just poster thumbnail + title + year
        return '<div class="movie-compact-grid">' + items.map(function(m, i) {
            var _midx = window.allMovies.indexOf(m);
            var isTV = m.isTVShow;
            var typeLabel = isTV ? 'TV' : 'Movie';
            var _progressCompact = getWatchProgressHtml(m.title);
            return '<div class="compact-card card-new" data-title="' + window.Utils.escHtml(m.title) + '" onclick="showItemFromTab(' + _midx + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx + ')" title="' + window.Utils.escHtml(m.title) + '">' +
                (window._selectMode ? '<div class="card-checkbox card-checkbox-compact" data-title="' + window.Utils.escHtml(m.title) + '" onclick="event.stopPropagation();toggleItemSelection(\'' + m.title.replace(/'/g, "\\'") + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : '') +
                '<div class="compact-poster">' +
                    '<img class="poster-img" data-movie-idx="' + _midx + '">' +
                    _progressCompact +
                '</div>' +
                '<div class="compact-info">' +
                    '<div class="compact-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="compact-meta">' + m.year + ' \u2022 ' + typeLabel + '</div>' +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    } else if (currentView === 'posters') {
        // Poster Wall: dense grid of just poster images, no text. Tooltip on hover.
        return '<div class="movie-poster-wall">' + items.map(function(m, i) {
            var _midx = window.allMovies.indexOf(m);
            var r = m.nfoData && m.nfoData.rating;
            var _progressPosterWall = getWatchProgressHtml(m.title);
            var _genres = (m.nfoData && m.nfoData.genres) ? m.nfoData.genres.slice(0, 2) : [];
            var _genreHtml = _genres.map(function(g) { return '<span class="poster-wall-tooltip-genre">' + window.Utils.escHtml(g) + '</span>'; }).join('');
            return '<div class="poster-wall-item card-new" data-title="' + window.Utils.escHtml(m.title) + '" onclick="showItemFromTab(' + _midx + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx + ')">' +
                (window._selectMode ? '<div class="card-checkbox card-checkbox-poster" data-title="' + window.Utils.escHtml(m.title) + '" onclick="event.stopPropagation();toggleItemSelection(\'' + m.title.replace(/'/g, "\\'") + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : '') +
                '<img class="poster-img" data-movie-idx="' + _midx + '">' +
                '<div class="no-poster-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>' +
                (r ? '<span class="poster-wall-rating">\u2605' + r.toFixed(1) + '</span>' : '') +
                _progressPosterWall +
                '<div class="poster-wall-tooltip">' +
                    '<div class="poster-wall-tooltip-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="poster-wall-tooltip-year">' + (m.year || '') + '</div>' +
                    (r ? '<div class="poster-wall-tooltip-rating"><svg viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>' + r.toFixed(1) + '</div>' : '') +
                    (_genreHtml ? '<div class="poster-wall-tooltip-genres">' + _genreHtml + '</div>' : '') +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    } else if (currentView === 'table') {
        // Apply table-specific column sorting if active
        var _tableItems = items.slice();
        if (_tableSortColumn) {
            _tableItems = _applyTableSort(_tableItems);
        }
        return '<div class="movie-table-view">' +
            '<div class="movie-table-header">' +
                '<div class="mt-col mt-col-poster"></div>' +
                '<div class="mt-col mt-col-title"><span class="mt-sort-header' + _getTableSortClass('title') + '" onclick="sortTableColumn(\'title\')">Title<span class="mt-sort-indicator">' + _getTableSortIndicator('title') + '</span></span></div>' +
                '<div class="mt-col mt-col-year"><span class="mt-sort-header' + _getTableSortClass('year') + '" onclick="sortTableColumn(\'year\')">Year<span class="mt-sort-indicator">' + _getTableSortIndicator('year') + '</span></span></div>' +
                '<div class="mt-col mt-col-rating"><span class="mt-sort-header' + _getTableSortClass('rating') + '" onclick="sortTableColumn(\'rating\')">Rating<span class="mt-sort-indicator">' + _getTableSortIndicator('rating') + '</span></span></div>' +
                '<div class="mt-col mt-col-genres"><span class="mt-sort-header' + _getTableSortClass('genres') + '" onclick="sortTableColumn(\'genres\')">Genres<span class="mt-sort-indicator">' + _getTableSortIndicator('genres') + '</span></span></div>' +
                '<div class="mt-col mt-col-size"><span class="mt-sort-header' + _getTableSortClass('size') + '" onclick="sortTableColumn(\'size\')">Size<span class="mt-sort-indicator">' + _getTableSortIndicator('size') + '</span></span></div>' +
                '<div class="mt-col mt-col-quality"><span class="mt-sort-header' + _getTableSortClass('quality') + '" onclick="sortTableColumn(\'quality\')">Quality<span class="mt-sort-indicator">' + _getTableSortIndicator('quality') + '</span></span></div>' +
            '</div>' +
            _tableItems.map(function(m, i) {
                var _midx = window.allMovies.indexOf(m);
                var r = m.nfoData && m.nfoData.rating;
                var genres = (m.nfoData && m.nfoData.genres) ? m.nfoData.genres.slice(0, 3).join(', ') : '';
                var isFav = window.isFavorite ? window.isFavorite(m.title) : false;
                var isWatchedItem = window.isWatched ? window.isWatched(m.title) : false;
                var _isSelected = window._selectedItems && window._selectedItems.indexOf(m.title) !== -1;
                var _selectedClass = _isSelected ? ' selected' : '';
                return '<div class="movie-table-row' + _selectedClass + '" onclick="showItemFromTab(' + _midx + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx + ')" data-title="' + window.Utils.escHtml(m.title) + '">' +
                    '<div class="mt-col mt-col-poster"><img class="poster-img" data-movie-idx="' + _midx + '"></div>' +
                    '<div class="mt-col mt-col-title">' +
                        (window._selectMode ? '<div class="card-checkbox" data-title="' + window.Utils.escHtml(m.title) + '" onclick="event.stopPropagation();toggleItemSelection(\'' + m.title.replace(/'/g, "\\'") + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : '') +
                        '<span class="mt-title-text">' + window.Utils.escHtml(m.title) + '</span>' +
                        (isFav ? '<svg class="mt-fav-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' : '') +
                        (isWatchedItem ? '<svg class="mt-watched-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : '') +
                    '</div>' +
                    '<div class="mt-col mt-col-year">' + m.year + '</div>' +
                    '<div class="mt-col mt-col-rating">' + (r ? '<span class="mt-rating">\u2605 ' + r.toFixed(1) + '</span>' : '\u2014') + '</div>' +
                    '<div class="mt-col mt-col-genres">' + (genres ? window.Utils.escHtml(genres) : '\u2014') + '</div>' +
                    '<div class="mt-col mt-col-size">' + window.Utils.formatBytes(m.fileSize) + '</div>' +
                    '<div class="mt-col mt-col-quality">' + (m.quality ? window.Utils.escHtml(m.quality) : '\u2014') + '</div>' +
                '</div>';
            }).join('') + '</div>';
    }
    return '';
}

// ============================================================================
// TV SHOW CARD ITEMS BUILDER - Returns TV card HTML without wrapping grid div
// ============================================================================
function buildTVShowCardItems(items) {
    return items.map(function(m) {
        var realIdx = window.allMovies.indexOf(m);
        var r = m.nfoData && m.nfoData.rating;
        var hasPoster = !!m.posterHandle;
        var seasonInfo = m.totalSeasons + ' Season' + (m.totalSeasons > 1 ? 's' : '') + ' \u2022 ' + m.totalEpisodes + ' Episode' + (m.totalEpisodes > 1 ? 's' : '');
        var badgeHtml = '<span class="movie-quality tv-badge">TV Series</span>';
        if (isAnime(m)) badgeHtml += ' <span class="movie-quality anime-badge">Anime</span>';
        else if (isAnimation(m)) badgeHtml += ' <span class="movie-quality animation-badge">Animation</span>';
        var isFav = window.isFavorite ? window.isFavorite(m.title) : false;
        var favBtn = '<button class="card-fav-btn' + (isFav ? ' favorited' : '') + '" onclick="event.stopPropagation();toggleFavoriteCard(\'' + m.title.replace(/'/g, "\\'") + '\')" title="Toggle favorite">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
        '</button>';
        var isWatchedItem = window.isWatched ? window.isWatched(m.title) : false;
        var watchedBadge = isWatchedItem ? '<span class="watched-badge" title="Watched"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>' : '';

        return '<div class="movie-card tvshow-card card-new" draggable="true" data-title="' + window.Utils.escHtml(m.title) + '" ondragstart="event.dataTransfer.setData(\'text/plain\',this.dataset.title||\'\')" onclick="showTVShowFromTab(' + realIdx + ')" ondblclick="playItemDirectly(' + realIdx + ')" title="Double-click to play">' +
            '<div class="poster-container">' +
                (window._selectMode ? '<div class="card-checkbox" data-title="' + window.Utils.escHtml(m.title) + '" onclick="event.stopPropagation();toggleItemSelection(\'' + m.title.replace(/'/g, "\\'") + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : '') +
                (m.logoHandle ? '<img class="logo-img" data-movie-idx="' + realIdx + '">' : '') +
                '<img class="poster-img" data-movie-idx="' + realIdx + '">' +
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
                badgeHtml +
                favBtn +
                watchedBadge +
                getWatchProgressHtml(m.title) +
            '</div>' +
            '<div class="card-info">' +
                '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                '<div class="movie-year">' + m.year + ' \u2022 ' + seasonInfo + '</div>' +
                (m.nfoData && m.nfoData.genres && m.nfoData.genres.length ?
                    '<div class="movie-genre">' + m.nfoData.genres.map(window.Utils.escHtml).join(', ') + '</div>' : '') +
                '<div class="movie-filesize">' + window.Utils.formatBytes(m.fileSize) + (m.quality ? ' \u2022 ' + window.Utils.escHtml(m.quality) : '') + '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

// ============================================================================
// APPEND MORE CARDS - For infinite scroll, appends new cards without re-render
// ============================================================================
function appendMoreCards(tabId, fromIndex, toIndex) {
    var containerId, container;
    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';
    var filterCount = document.getElementById('sharedFilterCount');

    // Get filtered items for the specific tab
    var items;
    if (tabId === 'all') {
        items = window.allMovies.filter(function(m) {
            return matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
        });
    } else if (tabId === 'movies') {
        items = window.filteredMovies || window.allMovies.filter(function(m) {
            return !m.isTVShow && matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
        });
    } else if (tabId === 'tvshows') {
        items = window.allMovies.filter(function(m) {
            return m.isTVShow && matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
        });
    } else if (tabId === 'animation') {
        items = window.allMovies.filter(function(m) {
            return isAnimation(m) && matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
        });
    } else if (tabId === 'anime') {
        items = window.allMovies.filter(function(m) {
            return isAnime(m) && matchesSearch(m, q) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true) && matchesAdvancedFilters(m);
        });
    } else {
        return;
    }

    sortItems(items, s);

    // Slice the new items
    var newItems = items.slice(fromIndex, toIndex);
    if (newItems.length === 0) return;

    // Find the container for this tab
    var containerMap = {
        'all': 'allContainer',
        'movies': 'movieContainer',
        'tvshows': 'tvshowContainer',
        'animation': 'animationContainer',
        'anime': 'animeContainer'
    };
    container = document.getElementById(containerMap[tabId]);
    if (!container) return;

    // Find the existing grid inside the container
    var gridContainer = container.querySelector('.movie-grid, .movie-detail-grid, .movie-compact-grid, .movie-poster-wall');

    // Remove the old infinite scroll sentinel
    var oldSentinel = container.querySelector('.infinite-scroll-sentinel');
    if (oldSentinel) {
        _getInfiniteScrollObserver().unobserve(oldSentinel);
        oldSentinel.remove();
    }

    // Build card HTML for just the new items
    var newCardsHtml;
    if (tabId === 'tvshows') {
        newCardsHtml = buildTVShowCardItems(newItems);
    } else {
        newCardsHtml = buildCardItems(newItems, tabId);
    }

    // Append new cards to the existing grid
    if (gridContainer) {
        gridContainer.insertAdjacentHTML('beforeend', newCardsHtml);
    } else {
        // No grid found, create one
        var gridClass = currentView === 'detail' ? 'movie-detail-grid' : (currentView === 'compact' ? 'movie-compact-grid' : (currentView === 'posters' ? 'movie-poster-wall' : 'movie-grid'));
        if (tabId === 'tvshows') gridClass = 'movie-grid tvshow-grid';
        container.insertAdjacentHTML('beforeend', '<div class="' + gridClass + '">' + newCardsHtml + '</div>');
    }

    // Observe new images for lazy loading
    observeImages(container);

    // Add a new sentinel if there are still more items
    if (toIndex < items.length) {
        container.insertAdjacentHTML('beforeend', '<div class="infinite-scroll-sentinel" data-tab="' + tabId + '"></div>');
        observeInfiniteScrollSentinel(container);
    }

    // Update filter count text
    if (filterCount) {
        var label;
        if (tabId === 'all') label = 'title';
        else if (tabId === 'movies') label = 'movie';
        else if (tabId === 'tvshows') label = 'TV show';
        else if (tabId === 'animation') label = 'animation title';
        else if (tabId === 'anime') label = 'anime title';
        else label = 'title';
        var displayCount = Math.min(toIndex, items.length);
        filterCount.textContent = displayCount + ' of ' + items.length + ' ' + label + (items.length !== 1 ? 's' : '');
    }
}

window.appendMoreCards = appendMoreCards;

// ============================================================================
// TAB SWITCHING (defined here for guaranteed availability)
// ============================================================================
window.switchTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(function(tab) {
        tab.classList.remove('active');
    });

    // Deactivate all nav tabs
    document.querySelectorAll('.nav-tab').forEach(function(tab) {
        tab.classList.remove('active');
    });

    // Show selected tab - handle collectionDetailView specially
    var targetTab;
    if (tabName === 'collectionDetail') {
        targetTab = document.getElementById('collectionDetailView');
    } else {
        targetTab = document.getElementById(tabName + 'Tab') || document.getElementById(tabName);
    }

    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Activate nav tab (for all tabs that have nav buttons)
    if (tabName !== 'collectionDetail') {
        var navTab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
        if (navTab) {
            navTab.classList.add('active');
        }
    }

    // Handle search box and view toggle visibility
    // Search is visible on ALL tabs except collections and collectionDetail
    var searchBox = document.getElementById('searchBox');
    var viewToggle = document.getElementById('viewToggle');
    var sharedFilterBar = document.getElementById('sharedFilterBar');

    var showSearchAndView = (tabName === 'all' || tabName === 'movies' || tabName === 'tvshows' ||
                              tabName === 'animation' || tabName === 'anime' || tabName === 'favorites' ||
                              tabName === 'history' || tabName === 'playlist');

    // Shared filter bar visible on media tabs (not on collections, stats, etc.)
    var showSharedFilter = (tabName === 'all' || tabName === 'movies' || tabName === 'tvshows' ||
                            tabName === 'animation' || tabName === 'anime' || tabName === 'favorites' ||
                            tabName === 'history' || tabName === 'playlist');

    if (searchBox) {
        if (showSearchAndView) {
            searchBox.classList.remove('hidden');
        } else {
            searchBox.classList.add('hidden');
        }
    }
    if (viewToggle) {
        if (showSearchAndView) {
            viewToggle.classList.remove('hidden');
        } else {
            viewToggle.classList.add('hidden');
        }
    }
    if (sharedFilterBar) {
        if (showSharedFilter) {
            sharedFilterBar.classList.add('active');
        } else {
            sharedFilterBar.classList.remove('active');
            // Also close any open sub-panels
            var advPanel = document.getElementById('advancedFilterPanel');
            var skipPanel = document.getElementById('skippedPanel');
            if (advPanel) advPanel.classList.remove('active');
            if (skipPanel) skipPanel.classList.remove('active');
        }
    }

    // Refresh content for specific tabs
    if (tabName === 'collections') {
        if (typeof window.Collections !== 'undefined' && window.Collections.renderCollections) {
            window.Collections.renderCollections();
        }
    }

    if (tabName === 'tvshows') {
        renderTVShows();
    }

    if (tabName === 'all') {
        renderAllTab();
    }

    if (tabName === 'animation') {
        renderAnimationTab();
    }

    if (tabName === 'anime') {
        renderAnimeTab();
    }

    if (tabName === 'movies') {
        filterMovies();
    }

    if (tabName === 'favorites' && typeof window.renderFavoritesTab === 'function') {
        window.renderFavoritesTab();
    }

    if (tabName === 'history' && typeof window.renderHistoryTab === 'function') {
        window.renderHistoryTab();
    }

    if (tabName === 'playlist' && typeof window.renderPlaylistTab === 'function') {
        window.renderPlaylistTab();
    }

    if (tabName === 'stats' && typeof window.renderLibraryStats === 'function') {
        window.renderLibraryStats();
    }

    if (tabName === 'duplicates' && typeof window.renderDuplicateFinder === 'function') {
        window.renderDuplicateFinder();
    }
};
