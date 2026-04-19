/**
 * Movie Library - UI Renderer Module
 * Handles rendering movies in different view modes (grid, detail, list)
 * Manages poster/logo loading and display state
 * Includes All, Animation, and Anime tab rendering
 */

var currentView = localStorage.getItem('movieLibView') || 'grid';

// Display mode constants: grid, detail (extended info), list
var VIEW_MODES = {
    GRID: 'grid',
    DETAIL: 'detail',
    LIST: 'list'
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
                m.logoUrl = URL.createObjectURL(lf);
                // Cache logo to thumbnail cache
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
                    } catch(e2) {}
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
    return false;
}

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

// ============================================================================
// MOVIES TAB FILTER
// ============================================================================
function filterMovies() {
    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortEl = document.getElementById('sharedSortSelect');
    var s = sortEl ? sortEl.value : 'name-asc';
    var genreSelect = document.getElementById('sharedGenreSelect');
    var genre = genreSelect ? genreSelect.value : '';

    window.filteredMovies = window.allMovies.filter(function(m) {
        return !m.isTVShow && matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m);
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
    populateGenreDropdowns();
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
        
        html += '<div class="shelf-card" onclick="showItemFromTab(' + realIdx + ',\'all\')" ondblclick="playItemDirectly(' + realIdx + ')" title="' + window.Utils.escHtml(m.title) + '">' +
            '<div class="shelf-poster">' +
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

function renderAllTab() {
    var container = document.getElementById('allContainer');
    var emptyState = document.getElementById('allEmptyState');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';
    var genreSelect = document.getElementById('sharedGenreSelect');
    var genre = genreSelect ? genreSelect.value : '';

    var items = window.allMovies.filter(function(m) {
        return matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true);
    });

    sortItems(items, s);

    var filterCount = document.getElementById('sharedFilterCount');
    if (filterCount) {
        filterCount.textContent = items.length + ' title' + (items.length !== 1 ? 's' : '');
    }

    // Render Continue Watching, Recently Added, and Top Rated sections
    // Only show shelves when no advanced filters, genre filter, or search are active
    var topRatedContainer = document.getElementById('allTopRated');
    if (topRatedContainer && !genre && !q && !hasActiveAdvancedFilters()) {
        var shelvesHtml = '';
        
        // Continue Watching shelf (from watch history)
        if (typeof window.getWatchHistory === 'function') {
            var history = window.getWatchHistory().slice(0, 10);
            if (history.length > 0) {
                var watchedMovies = [];
                history.forEach(function(h) {
                    var m = window.allMovies.find(function(item) { return item.title === h.title; });
                    if (m && watchedMovies.indexOf(m) === -1) watchedMovies.push(m);
                });
                if (watchedMovies.length > 0) {
                    shelvesHtml += renderShelfRow('Continue Watching', watchedMovies.slice(0, 10), 'continue-watching');
                }
            }
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
    populateGenreDropdowns();
    // Also populate multi-genre tags
    if (typeof window.populateGenreTags === 'function') {
        window.populateGenreTags();
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
    var container = document.getElementById('animationContainer');
    var emptyState = document.getElementById('animationEmptyState');
    var filterCount = document.getElementById('sharedFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';
    var genreSelect = document.getElementById('sharedGenreSelect');
    var genre = genreSelect ? genreSelect.value : '';

    var items = window.allMovies.filter(function(m) {
        return isAnimation(m) && matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m);
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
    var container = document.getElementById('animeContainer');
    var emptyState = document.getElementById('animeEmptyState');
    var filterCount = document.getElementById('sharedFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';
    var genreSelect = document.getElementById('sharedGenreSelect');
    var genre = genreSelect ? genreSelect.value : '';

    var items = window.allMovies.filter(function(m) {
        return isAnime(m) && matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m);
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
            var _midx = window.allMovies.indexOf(m);
            var isFav = window.isFavorite ? window.isFavorite(m.title) : false;
            var favBtn = '<button class="card-fav-btn' + (isFav ? ' favorited' : '') + '" onclick="event.stopPropagation();toggleFavoriteCard(\'' + m.title.replace(/'/g, "\\'") + '\')" title="Toggle favorite">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '</button>';
            var isWatchedItem = window.isWatched ? window.isWatched(m.title) : false;
            var watchedBadge = isWatchedItem ? '<span class="watched-badge" title="Watched"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>' : '';

            return '<div class="movie-card" onclick="showItemFromTab(' + _midx + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx + ')" title="Double-click to play">' +
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
                    (m.quality ? '<span class="movie-quality">' + window.Utils.escHtml(m.quality) + '</span>' : '') +
                    badgeHtml +
                    favBtn +
                    watchedBadge +
                '</div>' +
                '<div class="card-info">' +
                    '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="movie-year">' + m.year +
                        (episodesInfo ? ' \u2022 ' + episodesInfo :
                         (m.nfoData && m.nfoData.runtime ? ' \u2022 ' + m.nfoData.runtime + 'm' : '')) +
                    '</div>' +
                    (m.nfoData && m.nfoData.genres && m.nfoData.genres.length ?
                        '<div class="movie-genre">' + m.nfoData.genres.map(window.Utils.escHtml).join(', ') + '</div>' : '') +
                    '<div class="movie-filesize">' + window.Utils.formatBytes(m.fileSize) + '</div>' +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    } else if (currentView === 'detail') {
        return '<div class="movie-detail-grid">' + items.map(function(m, i) {
            var _midx2 = window.allMovies.indexOf(m);
            return '<div class="movie-detail-card" onclick="showItemFromTab(' + _midx2 + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx2 + ')">' +
                '<div class="detail-poster">' +
                    '<img class="poster-img" data-movie-idx="' + _midx2 + '">' +
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
        return '<div class="movie-list">' + items.map(function(m, i) {
            var _midx3 = window.allMovies.indexOf(m);
            return '<div class="movie-list-item" onclick="showItemFromTab(' + _midx3 + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx3 + ')">' +
                '<div class="list-poster">' +
                    '<img class="poster-img" data-movie-idx="' + _midx3 + '">' +
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
                var card = img.closest('.movie-card, .movie-detail-card, .movie-list-item');
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
                var card = img.closest('.movie-card, .movie-detail-card, .movie-list-item');
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
    var container = document.getElementById('tvshowContainer');
    var emptyState = document.getElementById('tvshowEmptyState');
    var filterCount = document.getElementById('sharedFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var genreSelect = document.getElementById('sharedGenreSelect');
    var genre = genreSelect ? genreSelect.value : '';
    var tvShows = window.allMovies.filter(function(m) { return m.isTVShow && matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m); });

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

    // Apply page size limit for TV shows
    var tvVisibleCount = window.getVisibleCount('tvshows', tvShows.length);
    var visibleTVShows = tvShows.slice(0, tvVisibleCount);

    var html = '<div class="movie-grid tvshow-grid">';

    visibleTVShows.forEach(function(m) {
        // Find the real index in allMovies for detail page navigation
        var realIdx = window.allMovies.indexOf(m);
        var r = m.nfoData && m.nfoData.rating;
        var hasPoster = !!m.posterHandle;

        // Build season info text
        var seasonInfo = m.totalSeasons + ' Season' + (m.totalSeasons > 1 ? 's' : '') + ' \u2022 ' + m.totalEpisodes + ' Episode' + (m.totalEpisodes > 1 ? 's' : '');

        // Badge logic
        var badgeHtml = '<span class="movie-quality tv-badge">TV Series</span>';
        if (isAnime(m)) badgeHtml += ' <span class="movie-quality anime-badge">Anime</span>';
        else if (isAnimation(m)) badgeHtml += ' <span class="movie-quality animation-badge">Animation</span>';

        // Favorite button
        var isFav = window.isFavorite ? window.isFavorite(m.title) : false;
        var favBtn = '<button class="card-fav-btn' + (isFav ? ' favorited' : '') + '" onclick="event.stopPropagation();toggleFavoriteCard(\'' + m.title.replace(/'/g, "\\'") + '\')" title="Toggle favorite">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
        '</button>';

        // Watched badge
        var isWatchedItem = window.isWatched ? window.isWatched(m.title) : false;
        var watchedBadge = isWatchedItem ? '<span class="watched-badge" title="Watched"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>' : '';

        html += '<div class="movie-card tvshow-card" onclick="showTVShowFromTab(' + realIdx + ')" ondblclick="playItemDirectly(' + realIdx + ')" title="Double-click to play">' +
            '<div class="poster-container">' +
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

    // Lazy-load TV show posters via IntersectionObserver
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

    // Re-render the currently visible tab
    renderMovies();
    renderTVShows();
    renderAllTab();
    renderAnimationTab();
    renderAnimeTab();
}

/**
 * Render movies based on current view mode (grid, detail, list)
 * This is specifically for the MOVIES tab (movies only, no TV shows)
 */
function renderMovies() {
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
    yearMax: 2030,
    ratingMin: 0,
    typeFilter: 'all',    // 'all', 'movies', 'tvshows'
    sizeFilter: 'all'     // 'all', 'small', 'medium', 'large'
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
    var minEl = document.getElementById('yearMinRange');
    var maxEl = document.getElementById('yearMaxRange');
    var valueEl = document.getElementById('yearRangeValue');
    if (!minEl || !maxEl || !valueEl) return;

    var minVal = parseInt(minEl.value);
    var maxVal = parseInt(maxEl.value);

    // Ensure min <= max
    if (minVal > maxVal) {
        // Swap values
        var temp = minVal;
        minVal = maxVal;
        maxVal = temp;
        minEl.value = minVal;
        maxEl.value = maxVal;
    }

    _advancedFilterState.yearMin = minVal;
    _advancedFilterState.yearMax = maxVal;
    valueEl.textContent = minVal + ' - ' + maxVal;
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
 * Set the type filter (All / Movies / TV Shows)
 */
window.setTypeFilter = function(type, btn) {
    _advancedFilterState.typeFilter = type;
    var group = document.getElementById('typeFilterGroup');
    if (group) {
        group.querySelectorAll('.filter-tag').forEach(function(t) {
            t.classList.remove('active');
        });
    }
    if (btn) btn.classList.add('active');
    applyAdvancedFilters();
};

/**
 * Set the file size filter (All / Small / Medium / Large)
 */
window.setSizeFilter = function(size, btn) {
    _advancedFilterState.sizeFilter = size;
    var group = document.getElementById('sizeFilterGroup');
    if (group) {
        group.querySelectorAll('.filter-tag').forEach(function(t) {
            t.classList.remove('active');
        });
    }
    if (btn) btn.classList.add('active');
    applyAdvancedFilters();
};

/**
 * Reset all advanced filters to defaults
 */
window.resetAdvancedFilters = function() {
    _advancedFilterState = {
        yearMin: 1900,
        yearMax: 2030,
        ratingMin: 0,
        typeFilter: 'all',
        sizeFilter: 'all'
    };

    // Reset UI elements
    var yearMin = document.getElementById('yearMinRange');
    var yearMax = document.getElementById('yearMaxRange');
    var yearVal = document.getElementById('yearRangeValue');
    var ratingMin = document.getElementById('ratingMinRange');
    var ratingVal = document.getElementById('ratingRangeValue');

    if (yearMin) yearMin.value = 1900;
    if (yearMax) yearMax.value = 2030;
    if (yearVal) yearVal.textContent = '1900 - 2030';
    if (ratingMin) ratingMin.value = 0;
    if (ratingVal) ratingVal.textContent = '0+';

    // Reset type filter tags
    var typeGroup = document.getElementById('typeFilterGroup');
    if (typeGroup) {
        typeGroup.querySelectorAll('.filter-tag').forEach(function(t) {
            t.classList.remove('active');
        });
        var allTypeBtn = typeGroup.querySelector('[data-type="all"]');
        if (allTypeBtn) allTypeBtn.classList.add('active');
    }

    // Reset size filter tags
    var sizeGroup = document.getElementById('sizeFilterGroup');
    if (sizeGroup) {
        sizeGroup.querySelectorAll('.filter-tag').forEach(function(t) {
            t.classList.remove('active');
        });
        var allSizeBtn = sizeGroup.querySelector('[data-size="all"]');
        if (allSizeBtn) allSizeBtn.classList.add('active');
    }

    // Reset multi-genre filter
    if (typeof window.clearMultiGenreFilter === 'function') {
        window.clearMultiGenreFilter();
    }

    updateFilterIndicator();
    renderAllTab();
};

/**
 * Apply advanced filters and re-render the All tab
 */
function applyAdvancedFilters() {
    updateFilterIndicator();
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
                    _advancedFilterState.yearMax < 2030 ||
                    _advancedFilterState.ratingMin > 0 ||
                    _advancedFilterState.typeFilter !== 'all' ||
                    _advancedFilterState.sizeFilter !== 'all';

    if (hasActive) {
        indicator.classList.add('visible');
    } else {
        indicator.classList.remove('visible');
    }
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

    // Type filter
    if (_advancedFilterState.typeFilter === 'movies' && m.isTVShow) return false;
    if (_advancedFilterState.typeFilter === 'tvshows' && !m.isTVShow) return false;

    // File size filter
    if (_advancedFilterState.sizeFilter !== 'all') {
        var size = m.fileSize || 0;
        var sizeBytes = size;
        var sizeGB = sizeBytes / (1024 * 1024 * 1024);
        if (_advancedFilterState.sizeFilter === 'small' && sizeGB >= 1) return false;
        if (_advancedFilterState.sizeFilter === 'medium' && (sizeGB < 1 || sizeGB > 10)) return false;
        if (_advancedFilterState.sizeFilter === 'large' && sizeGB <= 10) return false;
    }

    return true;
}

/**
 * Check if any advanced filter is active
 */
function hasActiveAdvancedFilters() {
    return _advancedFilterState.yearMin > 1900 ||
           _advancedFilterState.yearMax < 2030 ||
           _advancedFilterState.ratingMin > 0 ||
           _advancedFilterState.typeFilter !== 'all' ||
           _advancedFilterState.sizeFilter !== 'all';
}

// Export for use in other modules
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
    populateGenreDropdowns: populateGenreDropdowns,
    isAnimation: isAnimation,
    isAnime: isAnime
};

// Also expose as global functions for inline HTML handlers
window.filterMovies = filterMovies;
window.setView = setView;
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
            var _midx = window.allMovies.indexOf(m);
            var isFav = window.isFavorite ? window.isFavorite(m.title) : false;
            var favBtn = '<button class="card-fav-btn' + (isFav ? ' favorited' : '') + '" onclick="event.stopPropagation();toggleFavoriteCard(\'' + m.title.replace(/'/g, "\\'") + '\')" title="Toggle favorite">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '</button>';
            var isWatchedItem = window.isWatched ? window.isWatched(m.title) : false;
            var watchedBadge = isWatchedItem ? '<span class="watched-badge" title="Watched"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>' : '';

            return '<div class="movie-card card-new" onclick="showItemFromTab(' + _midx + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx + ')" title="Double-click to play">' +
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
                    (m.quality ? '<span class="movie-quality">' + window.Utils.escHtml(m.quality) + '</span>' : '') +
                    badgeHtml +
                    favBtn +
                    watchedBadge +
                '</div>' +
                '<div class="card-info">' +
                    '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="movie-year">' + m.year +
                        (episodesInfo ? ' \u2022 ' + episodesInfo :
                         (m.nfoData && m.nfoData.runtime ? ' \u2022 ' + m.nfoData.runtime + 'm' : '')) +
                    '</div>' +
                    (m.nfoData && m.nfoData.genres && m.nfoData.genres.length ?
                        '<div class="movie-genre">' + m.nfoData.genres.map(window.Utils.escHtml).join(', ') + '</div>' : '') +
                    '<div class="movie-filesize">' + window.Utils.formatBytes(m.fileSize) + '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    } else if (currentView === 'detail') {
        return items.map(function(m, i) {
            var _midx2 = window.allMovies.indexOf(m);
            return '<div class="movie-detail-card card-new" onclick="showItemFromTab(' + _midx2 + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx2 + ')">' +
                '<div class="detail-poster">' +
                    '<img class="poster-img" data-movie-idx="' + _midx2 + '">' +
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
    } else if (currentView === 'list') {
        return items.map(function(m, i) {
            var _midx3 = window.allMovies.indexOf(m);
            var r = m.nfoData && m.nfoData.rating;
            return '<div class="movie-list-item card-new" onclick="showItemFromTab(' + _midx3 + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + _midx3 + ')">' +
                '<div class="list-poster">' +
                    '<img class="poster-img" data-movie-idx="' + _midx3 + '">' +
                '</div>' +
                '<div class="list-info">' +
                    '<div class="list-title">' + window.Utils.escHtml(m.title) + '</div>' +
                    '<div class="list-meta">' +
                        '<span>' + m.year + '</span>' +
                        (r ? '<span>\u2605 ' + r.toFixed(1) + '</span>' : '') +
                        (m.quality ? '<span>' + window.Utils.escHtml(m.quality) + '</span>' : '') +
                        '<span>' + window.Utils.formatBytes(m.fileSize) + '</span>' +
                    '</div>' +
                '</div>' +
                '<svg class="list-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
            '</div>';
        }).join('');
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

        return '<div class="movie-card tvshow-card card-new" onclick="showTVShowFromTab(' + realIdx + ')" ondblclick="playItemDirectly(' + realIdx + ')" title="Double-click to play">' +
            '<div class="poster-container">' +
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
            '</div>' +
            '<div class="card-info">' +
                '<div class="movie-title">' + window.Utils.escHtml(m.title) + '</div>' +
                '<div class="movie-year">' + m.year + ' \u2022 ' + seasonInfo + '</div>' +
                (m.nfoData && m.nfoData.genres && m.nfoData.genres.length ?
                    '<div class="movie-genre">' + m.nfoData.genres.map(window.Utils.escHtml).join(', ') + '</div>' : '') +
                '<div class="movie-filesize">' + window.Utils.formatBytes(m.fileSize) + '</div>' +
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
    var genreSelect = document.getElementById('sharedGenreSelect');
    var genre = genreSelect ? genreSelect.value : '';
    var filterCount = document.getElementById('sharedFilterCount');

    // Get filtered items for the specific tab
    var items;
    if (tabId === 'all') {
        items = window.allMovies.filter(function(m) {
            return matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m) && (typeof window.matchesMultiGenre === 'function' ? window.matchesMultiGenre(m) : true);
        });
    } else if (tabId === 'movies') {
        items = window.filteredMovies || window.allMovies.filter(function(m) {
            return !m.isTVShow && matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m);
        });
    } else if (tabId === 'tvshows') {
        items = window.allMovies.filter(function(m) {
            return m.isTVShow && matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m);
        });
    } else if (tabId === 'animation') {
        items = window.allMovies.filter(function(m) {
            return isAnimation(m) && matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m);
        });
    } else if (tabId === 'anime') {
        items = window.allMovies.filter(function(m) {
            return isAnime(m) && matchesSearch(m, q) && matchesGenre(m, genre) && matchesAdvancedFilters(m);
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
    var gridContainer = container.querySelector('.movie-grid, .movie-detail-grid, .movie-list');

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
        var gridClass = currentView === 'detail' ? 'movie-detail-grid' : (currentView === 'list' ? 'movie-list' : 'movie-grid');
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
