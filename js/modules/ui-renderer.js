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
    return items;
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

    var dropdowns = ['allGenreSelect', 'moviesGenreSelect'];
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
// MOVIES TAB FILTER
// ============================================================================
function filterMovies() {
    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var s = document.getElementById('sortSelect').value;
    var genreSelect = document.getElementById('moviesGenreSelect');
    var genre = genreSelect ? genreSelect.value : '';

    window.filteredMovies = window.allMovies.filter(function(m) {
        return !m.isTVShow && matchesSearch(m, q) && matchesGenre(m, genre);
    });

    sortItems(window.filteredMovies, s);

    renderMovies();
    // Also refresh other tabs
    renderTVShows();
    renderAllTab();
    renderAnimationTab();
    renderAnimeTab();
    populateGenreDropdowns();
}

// ============================================================================
// ALL TAB
// ============================================================================
window.filterAllTab = function() {
    renderAllTab();
};

function renderAllTab() {
    var container = document.getElementById('allContainer');
    var emptyState = document.getElementById('allEmptyState');
    var filterCount = document.getElementById('allFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('allSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';
    var genreSelect = document.getElementById('allGenreSelect');
    var genre = genreSelect ? genreSelect.value : '';

    var items = window.allMovies.filter(function(m) {
        return matchesSearch(m, q) && matchesGenre(m, genre);
    });

    sortItems(items, s);

    if (filterCount) {
        filterCount.textContent = items.length + ' title' + (items.length !== 1 ? 's' : '');
    }

    // Render Top Rated section (only when no genre filter and no search)
    var topRatedContainer = document.getElementById('allTopRated');
    if (topRatedContainer && !genre && !q) {
        renderTopRatedRow(topRatedContainer);
    } else if (topRatedContainer) {
        topRatedContainer.innerHTML = '';
    }

    if (items.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = buildCardGrid(items, 'all');
    loadTabAssets('all');
    populateGenreDropdowns();
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
    var filterCount = document.getElementById('animationFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('animationSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';

    var items = window.allMovies.filter(function(m) {
        return isAnimation(m) && matchesSearch(m, q);
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
    container.innerHTML = buildCardGrid(items, 'animation');
    loadTabAssets('animation');
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
    var filterCount = document.getElementById('animeFilterCount');

    if (!container) return;

    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('animeSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';

    var items = window.allMovies.filter(function(m) {
        return isAnime(m) && matchesSearch(m, q);
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
    container.innerHTML = buildCardGrid(items, 'anime');
    loadTabAssets('anime');
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
                '<img class="poster-img" data-tab="toprated" data-tab-idx="' + idx + '">' +
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

    // Load posters for top rated cards
    var posters = container.querySelectorAll('.poster-img[data-tab="toprated"]');
    for (var i = 0; i < posters.length; i++) {
        (function(img, idx) {
            (async function() {
                var m = rated[idx];
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
        })(posters[i], i);
    }
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

            return '<div class="movie-card" onclick="showItemFromTab(' + window.allMovies.indexOf(m) + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + window.allMovies.indexOf(m) + ')" title="Double-click to play">' +
                '<div class="poster-container">' +
                    (m.logoHandle ? '<img class="logo-img" data-tab="' + tabId + '" data-tab-idx="' + i + '">' : '') +
                    '<img class="poster-img" data-tab="' + tabId + '" data-tab-idx="' + i + '">' +
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
            return '<div class="movie-detail-card" onclick="showItemFromTab(' + window.allMovies.indexOf(m) + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + window.allMovies.indexOf(m) + ')">' +
                '<div class="detail-poster">' +
                    '<img class="poster-img" data-tab="' + tabId + '" data-tab-idx="' + i + '">' +
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
            return '<div class="movie-list-item" onclick="showItemFromTab(' + window.allMovies.indexOf(m) + ',\'' + tabId + '\')" ondblclick="playItemDirectly(' + window.allMovies.indexOf(m) + ')">' +
                '<div class="list-poster">' +
                    '<img class="poster-img" data-tab="' + tabId + '" data-tab-idx="' + i + '">' +
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

    var html = '<div class="movie-grid tvshow-grid">';

    tvShows.forEach(function(m) {
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
                badgeHtml +
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
            var episodesInfo = isTV ? (m.totalEpisodes + ' eps' + (m.totalSeasons ? ' \u2022 ' + m.totalSeasons + ' seasons' : '')) : '';
            return '<div class="movie-card" onclick="showDetailPage(' + i + ')" ondblclick="window.VideoPlayer.playMovie(' + i + ')" title="Double-click to play">' +
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
        html = '<div class="movie-detail-grid">' + window.filteredMovies.map(function(m, i) {
            return '<div class="movie-detail-card" onclick="showDetailPage(' + i + ')" ondblclick="window.VideoPlayer.playMovie(' + i + ')">' +
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
            return '<div class="movie-list-item" onclick="showDetailPage(' + i + ')" ondblclick="window.VideoPlayer.playMovie(' + i + ')">' +
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
window.UIRenderer = {
    updateStats: updateStats,
    toggleSkippedPanel: toggleSkippedPanel,
    filterMovies: filterMovies,
    loadAssets: loadAssets,
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
// TAB SWITCHING FUNCTION
// ============================================================================
window.switchTab = function(tabName) {
    // Remove active class from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(function(tab) {
        tab.classList.remove('active');
    });
    
    // Add active class to the clicked tab
    var activeTabBtn = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
    if (activeTabBtn) {
        activeTabBtn.classList.add('active');
    }
    
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(function(content) {
        content.classList.remove('active');
    });
    
    // Show the selected tab content
    var tabContentId = tabName + 'Tab';
    if (tabName === 'collections') {
        tabContentId = 'collectionsTab';
    }
    var tabContent = document.getElementById(tabContentId);
    if (tabContent) {
        tabContent.classList.add('active');
    }
};
