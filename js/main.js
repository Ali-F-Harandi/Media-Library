// Movie Library - Main Application Entry Point
// Initializes the app and sets up global state and event listeners

// Global State
window.allMovies = [];
window.filteredMovies = [];
window.skippedFolders = [];

// ============================================================================
// PAGE SIZE - Items per page with localStorage persistence
// ============================================================================
var PAGE_SIZE_KEY = 'movieLibPageSize';
var _pageSize = 50; // default
var _visibleCounts = {}; // track visible counts per tab

(function initPageSize() {
    var saved = localStorage.getItem(PAGE_SIZE_KEY);
    if (saved === 'all') {
        _pageSize = 'all';
    } else if (saved) {
        var n = parseInt(saved);
        if (n > 0) _pageSize = n;
    }
})();

/**
 * Change the page size and re-render the current tab
 */
window.changePageSize = function(val) {
    if (val === 'all') {
        _pageSize = 'all';
    } else {
        var n = parseInt(val);
        if (n > 0) _pageSize = n;
    }
    localStorage.setItem(PAGE_SIZE_KEY, val);
    _visibleCounts = {}; // reset visible counts
    // Re-render active tab
    var activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        window.switchTab(activeTab.dataset.tab);
    }
};

/**
 * Get the current page size setting
 */
window.getPageSize = function() {
    return _pageSize;
};

/**
 * Get the number of items to show for a tab (respects page size)
 */
window.getVisibleCount = function(tabId, totalItems) {
    if (_pageSize === 'all') return totalItems;
    var shown = _visibleCounts[tabId] || _pageSize;
    return Math.min(shown, totalItems);
};

/**
 * Load more items for a specific tab - APPENDS new cards instead of re-rendering
 * This preserves already-loaded images and provides smooth infinite scroll
 */
window.loadMoreItems = function(tabId) {
    var current = _visibleCounts[tabId] || _pageSize;
    if (_pageSize === 'all') return;
    var newCount = current + _pageSize;
    _visibleCounts[tabId] = newCount;
    // Use the append-based infinite scroll from ui-renderer
    if (typeof window.appendMoreCards === 'function') {
        window.appendMoreCards(tabId, current, newCount);
    } else {
        // Fallback to full re-render
        var activeTab = document.querySelector('.nav-tab.active');
        if (activeTab) {
            window.switchTab(activeTab.dataset.tab);
        }
    }
};

/**
 * Reset visible count for a tab (called when filters change)
 */
window.resetVisibleCount = function(tabId) {
    _visibleCounts[tabId] = _pageSize === 'all' ? 99999 : _pageSize;
};

// ============================================================================
// WELCOME STATS - Library stats stored in localStorage for welcome screen
// ============================================================================
var WELCOME_STATS_KEY = 'movieLibWelcomeStats';

/**
 * Save current library stats to localStorage for display on welcome screen
 */
window.saveWelcomeStats = function() {
    var movieCount = window.allMovies.filter(function(m) { return !m.isTVShow; }).length;
    var tvShowCount = window.allMovies.filter(function(m) { return m.isTVShow; }).length;
    var totalSize = window.allMovies.reduce(function(s, m) { return s + m.fileSize; }, 0);
    var stats = {
        movieCount: movieCount,
        tvShowCount: tvShowCount,
        totalSize: totalSize,
        lastScanned: new Date().toISOString()
    };
    try {
        localStorage.setItem(WELCOME_STATS_KEY, JSON.stringify(stats));
    } catch(e) {}
};

/**
 * Render welcome stats widget on the welcome screen
 */
function renderWelcomeStats() {
    var container = document.getElementById('welcomeStats');
    if (!container) return;

    try {
        var stats = JSON.parse(localStorage.getItem(WELCOME_STATS_KEY));
        if (!stats) { container.innerHTML = ''; return; }

        var movieText = stats.movieCount + ' movie' + (stats.movieCount !== 1 ? 's' : '');
        var tvText = stats.tvShowCount > 0 ? stats.tvShowCount + ' TV show' + (stats.tvShowCount !== 1 ? 's' : '') : '';
        var sizeText = window.Utils.formatBytes(stats.totalSize);

        var lastScanned = '';
        if (stats.lastScanned) {
            var d = new Date(stats.lastScanned);
            lastScanned = 'Last scanned: ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        }

        var html = '<div class="welcome-stat-item">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>' +
            '<span class="welcome-stat-value">' + movieText + '</span>' +
        '</div>';

        if (tvText) {
            html += '<div class="welcome-stat-item">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>' +
                '<span class="welcome-stat-value">' + tvText + '</span>' +
            '</div>';
        }

        html += '<div class="welcome-stat-item">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            '<span class="welcome-stat-value">' + sizeText + '</span>' +
        '</div>';

        if (lastScanned) {
            html += '<div class="welcome-stat-item">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                '<span>' + lastScanned + '</span>' +
            '</div>';
        }

        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '';
    }
}

// ============================================================================
// RECENT FOLDERS - Track recently opened folder paths
// ============================================================================
var RECENT_FOLDERS_KEY = 'movieLibRecentFolders';
var MAX_RECENT_FOLDERS = 5;

/**
 * Get recent folders from localStorage
 */
window.getRecentFolders = function() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_FOLDERS_KEY)) || [];
    } catch(e) {
        return [];
    }
};

/**
 * Add a folder to recent folders list
 */
window.addRecentFolder = function(folderName, folderPath) {
    var recent = window.getRecentFolders();
    // Remove existing entry with same name
    recent = recent.filter(function(f) { return f.name !== folderName; });
    // Add to front
    recent.unshift({ name: folderName, path: folderPath, addedAt: new Date().toISOString() });
    // Limit to max
    if (recent.length > MAX_RECENT_FOLDERS) {
        recent = recent.slice(0, MAX_RECENT_FOLDERS);
    }
    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(recent));
    // Update welcome screen
    renderRecentFolders();
};

/**
 * Render recent folders section on welcome screen
 */
function renderRecentFolders() {
    var section = document.getElementById('recentFoldersSection');
    var list = document.getElementById('recentFoldersList');
    if (!section || !list) return;

    var recent = window.getRecentFolders();
    if (recent.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    var html = '';
    recent.forEach(function(f) {
        html += '<div class="recent-folder-item" onclick="resumeRecentFolder(\'' + f.name.replace(/'/g, "\\'") + '\')" title="' + window.Utils.escHtml(f.path || f.name) + '">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
            '<span class="recent-folder-name">' + window.Utils.escHtml(f.name) + '</span>' +
            '<svg class="recent-folder-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</div>';
    });
    list.innerHTML = html;
}

/**
 * Resume a recently opened folder
 */
window.resumeRecentFolder = function(folderName) {
    // Trigger the resume session flow
    if (typeof window.resumeSession === 'function') {
        window.resumeSession();
    }
};

// ============================================================================
// MULTI-GENRE FILTER - Toggle buttons for multi-genre selection
// ============================================================================
var _selectedGenres = new Set(); // stores selected genre names
var _genreTagsInitialized = false;

/**
 * Toggle a genre tag on/off
 * If 'all' is clicked, clear all selections
 * Otherwise, add/remove the genre from the selection set
 */
window.toggleGenreTag = function(genre, btn) {
    var container = document.getElementById('genreFilterTags');
    if (!container) return;

    if (genre === 'all') {
        // Clear all genre selections
        _selectedGenres.clear();
        // Update UI: remove active from all genre tags, add to "All Genres"
        container.querySelectorAll('.genre-tag').forEach(function(tag) {
            tag.classList.remove('active');
            if (tag.dataset.genre === 'all') {
                tag.classList.add('active');
            }
        });
    } else {
        // Toggle the clicked genre
        if (_selectedGenres.has(genre)) {
            _selectedGenres.delete(genre);
            btn.classList.remove('active');
        } else {
            _selectedGenres.add(genre);
            btn.classList.add('active');
        }
        // Update "All Genres" button state
        var allBtn = container.querySelector('.genre-tag[data-genre="all"]');
        if (allBtn) {
            if (_selectedGenres.size === 0) {
                allBtn.classList.add('active');
            } else {
                allBtn.classList.remove('active');
            }
        }
    }

    // Update the genre select dropdown to match (for backwards compat)
    var genreSelect = document.getElementById('allGenreSelect');
    if (genreSelect) {
        if (_selectedGenres.size === 0) {
            genreSelect.value = '';
        }
    }

    // Trigger re-filter
    window.resetVisibleCount('all');
    if (typeof window.filterAllTab === 'function') {
        window.filterAllTab();
    }
};

/**
 * Check if a movie matches the multi-genre filter
 * Returns true if the movie matches ANY of the selected genres,
 * or if no genres are selected (show all)
 */
window.matchesMultiGenre = function(m) {
    if (_selectedGenres.size === 0) return true;
    if (!m.nfoData || !m.nfoData.genres) return false;
    return m.nfoData.genres.some(function(g) {
        return _selectedGenres.has(g);
    });
};

/**
 * Populate genre tag buttons from the available genres
 * Called after library is loaded/scanned
 */
window.populateGenreTags = function() {
    var select = document.getElementById('genreFilterSelect');
    if (!select) return;
    
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
    
    var currentValue = select.value;
    select.innerHTML = '<option value="">All Genres</option>';
    genres.forEach(function(g) {
        var opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
    });
    if (currentValue && genres.indexOf(currentValue) !== -1) {
        select.value = currentValue;
    }
    _genreTagsInitialized = true;
};

window.handleGenreFilterChange = function() {
    var select = document.getElementById('genreFilterSelect');
    if (!select) return;
    _selectedGenres.clear();
    if (select.value) {
        _selectedGenres.add(select.value);
    }
    // Re-render the currently active tab
    var activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        window.resetVisibleCount(activeTab.dataset.tab);
        window.switchTab(activeTab.dataset.tab);
    }
};

window.handleCountryFilterChange = function() {
    var select = document.getElementById('countryFilterSelect');
    if (!select) return;
    _selectedCountries.clear();
    if (select.value) {
        _selectedCountries.add(select.value);
    }
    // Re-render the currently active tab
    var activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        window.resetVisibleCount(activeTab.dataset.tab);
        window.switchTab(activeTab.dataset.tab);
    }
};

/**
 * Clear multi-genre selection (used by resetAdvancedFilters)
 */
window.clearMultiGenreFilter = function() {
    _selectedGenres.clear();
    var select = document.getElementById('genreFilterSelect');
    if (select) select.value = '';
};

// ============================================================================
// COUNTRY FILTER - Toggle buttons for country selection
// ============================================================================
var _selectedCountries = new Set();

window.toggleCountryTag = function(country, btn) {
    var container = document.getElementById('countryFilterTags');
    if (!container) return;

    if (country === 'all') {
        _selectedCountries.clear();
        container.querySelectorAll('.genre-tag').forEach(function(tag) {
            tag.classList.remove('active');
            if (tag.dataset.country === 'all') {
                tag.classList.add('active');
            }
        });
    } else {
        if (_selectedCountries.has(country)) {
            _selectedCountries.delete(country);
            btn.classList.remove('active');
        } else {
            _selectedCountries.add(country);
            btn.classList.add('active');
        }
        var allBtn = container.querySelector('.genre-tag[data-country="all"]');
        if (allBtn) {
            if (_selectedCountries.size === 0) {
                allBtn.classList.add('active');
            } else {
                allBtn.classList.remove('active');
            }
        }
    }

    window.resetVisibleCount('all');
    if (typeof window.filterAllTab === 'function') {
        window.filterAllTab();
    }
};

window.matchesCountry = function(m) {
    if (_selectedCountries.size === 0) return true;
    if (!m.nfoData || !m.nfoData.country) return false;
    return _selectedCountries.has(m.nfoData.country);
};

window.populateCountryTags = function() {
    var select = document.getElementById('countryFilterSelect');
    if (!select) return;
    
    var countrySet = {};
    window.allMovies.forEach(function(m) {
        if (m.nfoData && m.nfoData.country) {
            m.nfoData.country.split('/').forEach(function(c) {
                var trimmed = c.trim();
                if (trimmed) countrySet[trimmed] = true;
            });
        }
    });
    var countries = Object.keys(countrySet).sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    
    var currentValue = select.value;
    select.innerHTML = '<option value="">All Countries</option>';
    countries.forEach(function(c) {
        var opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
    if (currentValue && countries.indexOf(currentValue) !== -1) {
        select.value = currentValue;
    }
};

window.clearCountryFilter = function() {
    _selectedCountries.clear();
    var select = document.getElementById('countryFilterSelect');
    if (select) select.value = '';
};

// Expose _selectedCountries for the filter indicator check
window._selectedCountries = _selectedCountries;

// ============================================================================
// CONTEXT MENU - Right-click context menu on movie cards
// ============================================================================
var _contextMenuTarget = null; // stores the movie index for context menu actions

/**
 * Show the context menu at the mouse position
 */
function showContextMenu(e, realIdx) {
    e.preventDefault();
    e.stopPropagation();

    var ctxMenu = document.getElementById('contextMenu');
    if (!ctxMenu) return;

    _contextMenuTarget = realIdx;

    // Update favorite label based on current state
    var m = window.allMovies[realIdx];
    if (m) {
        var favLabel = document.getElementById('ctxFavLabel');
        if (favLabel) {
            favLabel.textContent = (window.isFavorite && window.isFavorite(m.title)) ? 'Remove from Favorites' : 'Add to Favorites';
        }
        // Update note label based on current state
        var noteLabel = document.getElementById('ctxNoteLabel');
        if (noteLabel && typeof window.getMovieNote === 'function') {
            noteLabel.textContent = window.getMovieNote(m.title) ? 'Edit Note' : 'Add Note';
        }
    }

    ctxMenu.classList.add('active');

    // Position the menu
    var x = e.clientX;
    var y = e.clientY;
    var menuWidth = 220;
    var menuHeight = 380;

    // Adjust if near edges
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) {
        // Flip upward when near bottom of screen
        y = e.clientY - menuHeight;
        ctxMenu.classList.add('flip-up');
        if (y < 10) y = 10;
    } else {
        ctxMenu.classList.remove('flip-up');
    }

    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
}

/**
 * Hide the context menu
 */
function hideContextMenu() {
    var ctxMenu = document.getElementById('contextMenu');
    if (ctxMenu) ctxMenu.classList.remove('active');
    _contextMenuTarget = null;
}

// Context menu action handlers
document.addEventListener('DOMContentLoaded', function() {
    var ctxMenu = document.getElementById('contextMenu');
    if (!ctxMenu) return;

    ctxMenu.addEventListener('click', function(e) {
        var item = e.target.closest('.context-menu-item');
        if (!item || _contextMenuTarget === null) return;

        var action = item.dataset.action;
        var m = window.allMovies[_contextMenuTarget];
        if (!m) { hideContextMenu(); return; }

        if (action === 'play') {
            window.filteredMovies = window.allMovies;
            var filteredIdx = window.allMovies.indexOf(m);
            if (m.isTVShow) {
                if (typeof window.playTVShowFirstEpisode === 'function') window.playTVShowFirstEpisode(filteredIdx);
            } else {
                window.VideoPlayer.playMovie(filteredIdx);
            }
        } else if (action === 'favorite') {
            if (typeof window.toggleFavoriteCard === 'function') {
                window.toggleFavoriteCard(m.title);
            }
        } else if (action === 'playlist') {
            if (typeof window.addToPlaylist === 'function') {
                window.addToPlaylist(m.title);
            }
        } else if (action === 'copypath') {
            var folderNameCtx = m.folderHandle ? m.folderHandle.name : (m.fullPath ? m.fullPath.split('/').pop() : '');
            var path = folderNameCtx + '\\';
            // Prepend absolute path if set for this folder
            if (m.libraryRoot && typeof window.getAbsolutePathsByName === 'function') {
                var absPathsByName = window.getAbsolutePathsByName();
                if (absPathsByName[m.libraryRoot]) {
                    var absPfxCtx = absPathsByName[m.libraryRoot].replace(/[/\\]+$/, '') + '\\';
                    path = absPfxCtx + folderNameCtx + '\\';
                }
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(path).then(function() {
                    window.Utils.showToast('Path copied: ' + path, 'success');
                }).catch(function() {
                    fallbackCopy(path);
                });
            } else {
                fallbackCopy(path);
            }
        } else if (action === 'detail') {
            window.filteredMovies = window.allMovies;
            window.DetailPage.showDetailPage(_contextMenuTarget);
        } else if (action === 'technicalinfo') {
            showTechnicalInfoModal(m);
        } else if (action === 'copytitle') {
            var titleToCopy = m.title;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(titleToCopy).then(function() {
                    window.Utils.showToast('Title copied: ' + titleToCopy, 'success');
                }).catch(function() {
                    fallbackCopy(titleToCopy);
                });
            } else {
                fallbackCopy(titleToCopy);
            }
        } else if (action === 'opendetail') {
            window.filteredMovies = window.allMovies;
            window.DetailPage.showDetailPage(_contextMenuTarget);
        } else if (action === 'share') {
            window.shareMovieInfo(_contextMenuTarget);
        } else if (action === 'note') {
            if (typeof window.showMovieNoteDialog === 'function') {
                window.showMovieNoteDialog(m.title);
            }
        }

        hideContextMenu();
    });

    // Close context menu on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.context-menu')) {
            hideContextMenu();
        }
    });

    // Close context menu on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideContextMenu();
        }
    });
});

/**
 * Show technical info modal for a movie
 * Displays codec, resolution, file size, and other NFO-derived details
 */
function showTechnicalInfoModal(m) {
    var existing = document.getElementById('techInfoModal');
    if (existing) existing.remove();

    var nfo = m.nfoData || {};
    var fileSize = m.fileSize ? window.Utils.formatBytes(m.fileSize) : 'Unknown';
    var videoCodec = nfo.videoCodec || 'Unknown';
    var resolution = nfo.videoResolution || (m.quality || 'Unknown');
    var aspect = nfo.videoAspect || 'Unknown';
    var audioCodec = nfo.audioCodec || 'Unknown';
    var audioChannels = nfo.audioChannels || 'Unknown';
    var runtime = nfo.runtime || 'Unknown';
    var fileName = m.fileName || 'Unknown';

    var modal = document.createElement('div');
    modal.id = 'techInfoModal';
    modal.className = 'tech-info-modal';
    modal.innerHTML = 
        '<div class="tech-info-overlay" onclick="window.closeTechInfoModal()"></div>' +
        '<div class="tech-info-content">' +
            '<div class="tech-info-header">' +
                '<h3 class="tech-info-title">' + window.Utils.escHtml(m.title) + '</h3>' +
                '<button class="tech-info-close" onclick="window.closeTechInfoModal()">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="tech-info-grid">' +
                '<div class="tech-info-row">' +
                    '<span class="tech-info-label">File Name</span>' +
                    '<span class="tech-info-value">' + window.Utils.escHtml(fileName) + '</span>' +
                '</div>' +
                '<div class="tech-info-row">' +
                    '<span class="tech-info-label">File Size</span>' +
                    '<span class="tech-info-value">' + fileSize + '</span>' +
                '</div>' +
                '<div class="tech-info-row">' +
                    '<span class="tech-info-label">Video Codec</span>' +
                    '<span class="tech-info-value">' + videoCodec + '</span>' +
                '</div>' +
                '<div class="tech-info-row">' +
                    '<span class="tech-info-label">Resolution</span>' +
                    '<span class="tech-info-value">' + resolution + '</span>' +
                '</div>' +
                '<div class="tech-info-row">' +
                    '<span class="tech-info-label">Aspect Ratio</span>' +
                    '<span class="tech-info-value">' + aspect + '</span>' +
                '</div>' +
                '<div class="tech-info-row">' +
                    '<span class="tech-info-label">Audio Codec</span>' +
                    '<span class="tech-info-value">' + audioCodec + '</span>' +
                '</div>' +
                '<div class="tech-info-row">' +
                    '<span class="tech-info-label">Audio Channels</span>' +
                    '<span class="tech-info-value">' + audioChannels + '</span>' +
                '</div>' +
                '<div class="tech-info-row">' +
                    '<span class="tech-info-label">Runtime</span>' +
                    '<span class="tech-info-value">' + runtime + '</span>' +
                '</div>' +
                (nfo.rating ? '<div class="tech-info-row"><span class="tech-info-label">Rating</span><span class="tech-info-value">' + nfo.rating.toFixed(1) + '/10</span></div>' : '') +
                (m.quality ? '<div class="tech-info-row"><span class="tech-info-label">Quality Tag</span><span class="tech-info-value">' + window.Utils.escHtml(m.quality) + '</span></div>' : '') +
            '</div>' +
        '</div>';

    document.body.appendChild(modal);
    requestAnimationFrame(function() {
        modal.classList.add('active');
    });
}

/**
 * Close the technical info modal
 */
window.closeTechInfoModal = function() {
    var modal = document.getElementById('techInfoModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() {
            if (modal.parentElement) modal.remove();
        }, 200);
    }
};

/**
 * Fallback copy to clipboard
 */
function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        window.Utils.showToast('Path copied: ' + text, 'success');
    } catch(e) {
        window.Utils.showToast('Failed to copy path', 'warning');
    }
    document.body.removeChild(textarea);
}

// Make showContextMenu available globally for inline handlers
window.showContextMenu = showContextMenu;
window.hideContextMenu = hideContextMenu;

// ============================================================================
// SEARCH DEBOUNCING - Prevents excessive re-renders during typing
// ============================================================================
var searchDebounceTimer = null;
var SEARCH_DEBOUNCE_MS = 250; // Milliseconds to wait before triggering search

/**
 * Debounced search handler - waits for user to stop typing before filtering
 * This significantly improves performance when typing in the search box
 */
function debouncedSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function() {
        var activeTab = document.querySelector('.nav-tab.active');
        var tabName = activeTab ? activeTab.dataset.tab : 'all';
        
        if (tabName === 'movies') {
            if (typeof window.UIRenderer !== 'undefined' && window.UIRenderer.filterMovies) {
                window.UIRenderer.filterMovies();
            }
        } else if (tabName === 'all') {
            if (typeof window.filterAllTab === 'function') window.filterAllTab();
        } else if (tabName === 'tvshows') {
            if (typeof window.filterTVShows === 'function') window.filterTVShows();
        } else if (tabName === 'animation') {
            if (typeof window.filterAnimationTab === 'function') window.filterAnimationTab();
        } else if (tabName === 'anime') {
            if (typeof window.filterAnimeTab === 'function') window.filterAnimeTab();
        } else if (tabName === 'favorites') {
            if (typeof window.renderFavoritesTab === 'function') window.renderFavoritesTab();
        } else if (tabName === 'history') {
            if (typeof window.renderHistoryTab === 'function') window.renderHistoryTab();
        } else if (tabName === 'playlist') {
            if (typeof window.renderPlaylistTab === 'function') window.renderPlaylistTab();
        } else {
            if (typeof window.UIRenderer !== 'undefined' && window.UIRenderer.filterMovies) {
                window.UIRenderer.filterMovies();
            }
        }
    }, SEARCH_DEBOUNCE_MS);
}

// ============================================================================
// LAZY LOADING - IntersectionObserver for poster images
// ============================================================================
var lazyLoadObserver = null;

/**
 * Initialize the IntersectionObserver for lazy loading poster images
 * Only loads images when they are about to enter the viewport
 */
function initLazyLoading() {
    if (!('IntersectionObserver' in window)) return; // Fallback: all images load immediately
    
    lazyLoadObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var img = entry.target;
                if (img.dataset.lazySrc) {
                    img.src = img.dataset.lazySrc;
                    img.removeAttribute('data-lazy-src');
                    img.classList.add('loaded');
                    var placeholder = img.parentElement.querySelector('.no-poster-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
                lazyLoadObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '200px 0px', // Start loading 200px before entering viewport
        threshold: 0.01
    });
}

// ============================================================================
// KEYBOARD SHORTCUT HINT TOAST
// ============================================================================

/**
 * Show a brief toast notification at the bottom-center of the screen
 * indicating what keyboard shortcut was triggered.
 * Replaces any existing hint toast (no stacking).
 * 
 * @param {string} message - The message to display
 */
function showShortcutHint(message) {
    // Remove any existing hint
    var existing = document.querySelector('.keyboard-hint-overlay');
    if (existing) existing.remove();

    var hint = document.createElement('div');
    hint.className = 'keyboard-hint-overlay';
    hint.textContent = message;
    document.body.appendChild(hint);

    // Show with animation
    requestAnimationFrame(function() {
        hint.classList.add('visible');
    });

    // Remove after 1.5 seconds
    setTimeout(function() {
        hint.classList.remove('visible');
        setTimeout(function() {
            if (hint.parentElement) hint.remove();
        }, 300);
    }, 1500);
}

// ============================================================================
// KEYBOARD GRID NAVIGATION - Arrow key navigation between movie cards
// ============================================================================
var _keyboardFocusIndex = -1;
var _keyboardFocusContainer = null;

/**
 * Set keyboard focus on a specific card by index
 */
function setKeyboardFocus(cards, index) {
    // Remove focus from all cards
    document.querySelectorAll('.keyboard-focus').forEach(function(c) {
        c.classList.remove('keyboard-focus');
    });

    if (index < 0 || index >= cards.length) {
        _keyboardFocusIndex = -1;
        _keyboardFocusContainer = null;
        return;
    }

    _keyboardFocusIndex = index;
    _keyboardFocusContainer = cards[0] ? cards[0].parentElement : null;
    cards[index].classList.add('keyboard-focus');
    cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

/**
 * Get the number of columns in the current grid layout
 */
function getGridColumnCount(container) {
    if (!container) return 1;
    var style = window.getComputedStyle(container);
    var gridCols = style.gridTemplateColumns;
    if (gridCols) {
        return gridCols.split(' ').length;
    }
    return 1;
}

/**
 * Handle arrow key navigation in the movie grid
 */
function handleGridArrowKey(e) {
    // Only handle arrow keys and Enter when not in a text input
    var activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
    }

    var focusedCard = document.querySelector('.movie-card.keyboard-focus, .shelf-card.keyboard-focus');
    
    // Arrow key navigation
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();

        // Find the grid container
        var gridContainer = null;
        var cards = [];

        // Check movie-grid first
        var movieGrid = document.querySelector('.movie-grid');
        if (movieGrid) {
            gridContainer = movieGrid;
            cards = Array.from(movieGrid.querySelectorAll('.movie-card'));
        }

        // Check shelf-row if no movie-grid or no cards found
        if (cards.length === 0) {
            var shelfRow = document.querySelector('.shelf-row');
            if (shelfRow) {
                gridContainer = shelfRow;
                cards = Array.from(shelfRow.querySelectorAll('.shelf-card'));
            }
        }

        if (cards.length === 0) return;

        // If no card is currently focused, focus the first one
        if (!focusedCard) {
            setKeyboardFocus(cards, 0);
            return;
        }

        var currentIndex = cards.indexOf(focusedCard);
        if (currentIndex === -1) {
            setKeyboardFocus(cards, 0);
            return;
        }

        var newIndex = currentIndex;

        if (e.key === 'ArrowLeft') {
            newIndex = Math.max(0, currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            newIndex = Math.min(cards.length - 1, currentIndex + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            // Calculate number of columns
            var cols = getGridColumnCount(gridContainer);
            if (cols <= 1) cols = 1;

            if (e.key === 'ArrowUp') {
                newIndex = Math.max(0, currentIndex - cols);
            } else {
                newIndex = Math.min(cards.length - 1, currentIndex + cols);
            }
        }

        if (newIndex !== currentIndex) {
            setKeyboardFocus(cards, newIndex);
        }
    }

    // Enter key opens the focused card
    if (e.key === 'Enter' && focusedCard) {
        e.preventDefault();
        focusedCard.click();
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    var playerModal = document.getElementById('playerModal');
    var detailPage = document.getElementById('detailPage');
    if (playerModal != null && playerModal.classList.contains('active')) {
        if (window.VideoPlayer.isPlayingTVShow()) {
            // TV Show player shortcuts
            if (e.key === 'ArrowLeft') window.playPrevEpisode();
            if (e.key === 'ArrowRight') window.playNextEpisode();
            if (e.key === 'Escape') window.VideoPlayer.closePlayer();
        } else {
            // Movie player shortcuts
            if (e.key === 'ArrowLeft') window.VideoPlayer.playMovie(window.VideoPlayer.getCurrentIndex() - 1);
            if (e.key === 'ArrowRight') window.VideoPlayer.playMovie(window.VideoPlayer.getCurrentIndex() + 1);
            if (e.key === 'Escape') window.VideoPlayer.closePlayer();
        }
    } else if (detailPage != null && detailPage.classList.contains('active')) {
        if (e.key === 'Escape') window.DetailPage.closeDetailPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || (e.key === 'Enter' && document.querySelector('.keyboard-focus'))) {
        // Grid keyboard navigation (not in player, detail, or input)
        handleGridArrowKey(e);
    } else if ((e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        // Toggle keyboard shortcuts panel with ? or Ctrl+/ or Cmd+/
        e.preventDefault();
        var helpModal = document.getElementById('keyboardHelpModal');
        if (helpModal && helpModal.classList.contains('hidden')) {
            window.showKeyboardHelp();
        } else {
            window.closeKeyboardHelp();
        }
        showShortcutHint('Keyboard Shortcuts');
    } else if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
        showShortcutHint('Search');
    } else if (e.ctrlKey && e.key === 'f') {
        // Ctrl+F also focuses search
        e.preventDefault();
        document.getElementById('searchInput').focus();
        showShortcutHint('Search');
    } else if (e.key === 'r' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // R key for random movie pick
        if (typeof window.pickRandomMovie === 'function') {
            window.pickRandomMovie();
            showShortcutHint('Random Pick');
        }
    } else if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
        // Ctrl+Shift keyboard shortcuts
        if (e.key === 'F' || e.key === 'f') {
            // Ctrl+Shift+F: Toggle advanced filters panel
            e.preventDefault();
            var filterToggle = document.querySelector('.filter-panel-toggle');
            if (filterToggle) {
                filterToggle.click();
                showShortcutHint('Toggle Filters');
            }
        } else if (e.key === 'S' || e.key === 's') {
            // Ctrl+Shift+S: Toggle select mode
            e.preventDefault();
            var selectToggle = document.querySelector('.select-mode-toggle');
            if (selectToggle) {
                selectToggle.click();
                showShortcutHint('Select Mode');
            }
        }
    } else if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        // Tab keyboard shortcuts: Ctrl+1 through Ctrl+9, Ctrl+0 for stats
        var tabMap = { '1': 'all', '2': 'movies', '3': 'tvshows', '4': 'animation', '5': 'anime', '6': 'collections', '7': 'favorites', '8': 'history', '9': 'playlist', '0': 'stats' };
        // Also handle duplicates tab via Ctrl+Shift+D
        var tab = tabMap[e.key];
        if (tab) {
            // Only switch if the tab is visible (animation/anime may be hidden)
            var tabBtn = document.querySelector('.nav-tab[data-tab="' + tab + '"]');
            if (tabBtn && !tabBtn.classList.contains('hidden-tab')) {
                e.preventDefault();
                window.switchTab(tab);
                // Show shortcut hint with tab name
                var tabNames = { 'all': 'All', 'movies': 'Movies', 'tvshows': 'TV Shows', 'animation': 'Animation', 'anime': 'Anime', 'collections': 'Collections', 'favorites': 'Favorites', 'history': 'History', 'playlist': 'Playlist', 'stats': 'Stats' };
                showShortcutHint('Switched to ' + (tabNames[tab] || tab));
            }
        }
    }
});

// ============================================================================
// SCROLL-TO-TOP BUTTON LOGIC
// ============================================================================
window.scrollToTop = function() {
    var mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

(function() {
    var scrollBtn = null;
    var scrollThreshold = 400;

    function updateScrollButton() {
        if (!scrollBtn) scrollBtn = document.getElementById('scrollToTopBtn');
        if (!scrollBtn) return;
        var scrollY = window.scrollY || document.documentElement.scrollTop;
        if (scrollY > scrollThreshold) {
            scrollBtn.classList.add('visible');
            scrollBtn.classList.remove('hidden');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }

    window.addEventListener('scroll', updateScrollButton, { passive: true });
    // Also check after DOM mutations (e.g. after library loads) - reduced from 2000ms to 5000ms
    setInterval(updateScrollButton, 5000);
})();

// ============================================================================
// HEADER SCROLL SHADOW — Adds box-shadow to header when user scrolls down
// ============================================================================
(function initHeaderScrollShadow() {
    var header = document.querySelector('.header');
    if (!header) return;
    var scrollShadowThreshold = 10;
    function updateHeaderShadow() {
        var scrollY = window.scrollY || document.documentElement.scrollTop;
        if (scrollY > scrollShadowThreshold) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
    window.addEventListener('scroll', updateHeaderShadow, { passive: true });
    // Initial check
    updateHeaderShadow();
})();

// ============================================================================
// KEYBOARD HELP MODAL FUNCTIONS
// ============================================================================
window.showKeyboardHelp = function() {
    var modal = document.getElementById('keyboardHelpModal');
    if (modal) {
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.add('active');
    }
};

window.closeKeyboardHelp = function() {
    var modal = document.getElementById('keyboardHelpModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() {
            modal.classList.add('hidden');
        }, 300);
    }
};

// ============================================================================
// MULTI-SELECT / BATCH OPERATIONS
// ============================================================================
window._selectMode = false;
window._selectedItems = [];

/**
 * Toggle select mode on/off
 */
window.toggleSelectMode = function() {
    window._selectMode = !window._selectMode;
    var toggle = document.getElementById('selectModeToggle');

    if (window._selectMode) {
        if (toggle) toggle.classList.add('active');
        document.body.classList.add('select-mode');
        window._selectedItems = [];
        _createBatchActionBar();
        _updateBatchActionBar();
    } else {
        if (toggle) toggle.classList.remove('active');
        document.body.classList.remove('select-mode');
        window._selectedItems = [];
        _removeBatchActionBar();
        _updateCardSelectionStates();
    }
};

/**
 * Create the floating batch action bar at the bottom of the body
 */
function _createBatchActionBar() {
    var existing = document.getElementById('batchActionBar');
    if (existing) return;

    var bar = document.createElement('div');
    bar.id = 'batchActionBar';
    bar.className = 'batch-action-bar';
    bar.innerHTML =
        '<span class="batch-count" id="batchActionCount">0 selected</span>' +
        '<button class="batch-btn primary" onclick="batchAddToFavorites()">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            'Add to Favorites' +
        '</button>' +
        '<button class="batch-btn primary" onclick="batchAddToPlaylist()">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' +
            'Add to Playlist' +
        '</button>' +
        '<button class="batch-btn" onclick="deselectAll()">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
            'Deselect All' +
        '</button>' +
        '<button class="batch-btn" onclick="toggleSelectMode()">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            'Exit Select Mode' +
        '</button>';

    document.body.appendChild(bar);
}

/**
 * Remove the floating batch action bar
 */
function _removeBatchActionBar() {
    var bar = document.getElementById('batchActionBar');
    if (bar && bar.parentElement) {
        bar.parentElement.removeChild(bar);
    }
}

/**
 * Toggle selection of a single item by title
 */
window.toggleItemSelection = function(title) {
    if (!window._selectMode) return;
    var idx = window._selectedItems.indexOf(title);
    if (idx === -1) {
        window._selectedItems.push(title);
    } else {
        window._selectedItems.splice(idx, 1);
    }
    _updateCardSelectionStates();
    _updateBatchActionBar();
};

/**
 * Deselect all items
 */
window.deselectAll = function() {
    window._selectedItems = [];
    // Remove selected class from all card types
    document.querySelectorAll('.movie-card.selected, .movie-detail-card.selected, .compact-card.selected, .poster-wall-item.selected, .movie-table-row.selected').forEach(function(card) {
        card.classList.remove('selected');
    });
    _updateCardSelectionStates();
    _updateBatchActionBar();
};

/**
 * Batch add selected items to favorites
 */
window.batchAddToFavorites = function() {
    if (window._selectedItems.length === 0) {
        window.Utils.showToast('No items selected', 'warning');
        return;
    }
    var added = 0;
    window._selectedItems.forEach(function(title) {
        if (typeof window.toggleFavorite === 'function') {
            window.toggleFavorite(title);
            added++;
        }
    });
    window.Utils.showToast(added + ' item' + (added !== 1 ? 's' : '') + ' added to favorites', 'success');
    window._selectedItems = [];
    _updateCardSelectionStates();
    _updateBatchActionBar();
};

/**
 * Batch add selected items to playlist
 */
window.batchAddToPlaylist = function() {
    if (window._selectedItems.length === 0) {
        window.Utils.showToast('No items selected', 'warning');
        return;
    }
    var added = 0;
    window._selectedItems.forEach(function(title) {
        if (typeof window.addToPlaylist === 'function') {
            window.addToPlaylist(title);
            added++;
        }
    });
    window.Utils.showToast(added + ' item' + (added !== 1 ? 's' : '') + ' added to playlist', 'success');
    window._selectedItems = [];
    _updateCardSelectionStates();
    _updateBatchActionBar();
};

/**
 * Update visual selection states on all cards (selected class + checkbox)
 */
function _updateCardSelectionStates() {
    // Update selected state for ALL card types (grid, detail, compact, poster, table)
    var allCards = document.querySelectorAll('.movie-card[data-title], .movie-detail-card[data-title], .compact-card[data-title], .poster-wall-item[data-title], .movie-table-row[data-title]');
    allCards.forEach(function(card) {
        var title = card.dataset.title;
        if (window._selectedItems.indexOf(title) !== -1) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    document.querySelectorAll('.card-checkbox').forEach(function(cb) {
        var title = cb.dataset.title;
        if (window._selectedItems.indexOf(title) !== -1) {
            cb.classList.add('checked');
        } else {
            cb.classList.remove('checked');
        }
    });
}

/**
 * Update the batch action bar count and visibility
 */
function _updateBatchActionBar() {
    var countEl = document.getElementById('batchActionCount');
    if (countEl) {
        countEl.textContent = window._selectedItems.length + ' selected';
    }
}

// ============================================================================
// DRAG TO PLAYLIST
// ============================================================================

/**
 * Set up dragstart handlers on movie cards after render
 */
window.setupDragToPlaylist = function() {
    document.querySelectorAll('.movie-card[data-title], .compact-card[data-title], .poster-wall-item[data-title]').forEach(function(card) {
        // Skip cards that already have inline ondragstart handlers
        if (card.hasAttribute('ondragstart')) return;
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', function(e) {
            var title = card.dataset.title;
            e.dataTransfer.setData('text/plain', title);
            e.dataTransfer.effectAllowed = 'copy';
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', function() {
            card.classList.remove('dragging');
        });
    });
};

/**
 * Set up the playlist tab as a drop zone for dragged cards
 */
window.setupPlaylistDropZone = function() {
    var playlistTab = document.getElementById('playlistTab');
    if (!playlistTab) return;

    playlistTab.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        playlistTab.classList.add('drag-over');
    });

    playlistTab.addEventListener('dragleave', function(e) {
        // Only remove if truly leaving the tab
        if (!playlistTab.contains(e.relatedTarget)) {
            playlistTab.classList.remove('drag-over');
        }
    });

    playlistTab.addEventListener('drop', function(e) {
        e.preventDefault();
        playlistTab.classList.remove('drag-over');
        var title = e.dataTransfer.getData('text/plain');
        if (title && window.addToPlaylist) {
            window.addToPlaylist(title);
        }
    });
};

// Initialize playlist drop zone on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    window.setupPlaylistDropZone();
    _setupPlaylistNavDropZone();
});

// Also set up nav-tab drop zone immediately if DOM already loaded
(function() {
    var playlistNavTab = document.querySelector('[data-tab="playlist"]');
    if (playlistNavTab) {
        _setupPlaylistNavDropZoneOn(playlistNavTab);
    }
})();

/**
 * Set up the playlist nav tab button as a drop zone for drag-to-playlist
 */
function _setupPlaylistNavDropZone() {
    var playlistTab = document.querySelector('[data-tab="playlist"]');
    if (playlistTab) {
        _setupPlaylistNavDropZoneOn(playlistTab);
    }
}

function _setupPlaylistNavDropZoneOn(playlistTab) {
    playlistTab.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        playlistTab.classList.add('drag-over');
    });
    playlistTab.addEventListener('dragleave', function() {
        playlistTab.classList.remove('drag-over');
    });
    playlistTab.addEventListener('drop', function(e) {
        e.preventDefault();
        playlistTab.classList.remove('drag-over');
        var title = e.dataTransfer.getData('text/plain');
        if (title && typeof window.addToPlaylist === 'function') {
            window.addToPlaylist(title);
        }
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================
window.addEventListener('DOMContentLoaded', function() {
    // Restore theme
    var savedTheme = localStorage.getItem('movieLibTheme') || 'dark';
    window.ThemeManager.setTheme(savedTheme);

    // Set up debounced search
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Remove the inline oninput handler and replace with debounced version
        searchInput.removeAttribute('oninput');
        searchInput.addEventListener('input', function() {
            // Show/hide the clear button based on input value
            var searchBox = document.getElementById('searchBox');
            if (searchInput.value.trim()) {
                searchBox.classList.add('has-filter');
            } else {
                searchBox.classList.remove('has-filter');
            }
            debouncedSearch();
        });
    }

    /**
     * Clear the search filter and re-render the active tab
     */
    window.clearSearchFilter = function() {
        var searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            var searchBox = document.getElementById('searchBox');
            if (searchBox) searchBox.classList.remove('has-filter');
            debouncedSearch();
            searchInput.focus();
        }
    };

    // ============================================================================
    // Search now filters items inline (see debouncedSearch function above)
    // ============================================================================

    // Initialize lazy loading observer
    initLazyLoading();

    // ========================================================================
    // Welcome screen particles
    // ========================================================================
    var particlesEl = document.getElementById('welcomeParticles');
    if (particlesEl) {
        for (var p = 0; p < 30; p++) {
            var dot = document.createElement('div');
            dot.className = 'particle';
            dot.style.left = Math.random() * 100 + '%';
            dot.style.top = Math.random() * 100 + '%';
            dot.style.animationDelay = (Math.random() * 5) + 's';
            dot.style.animationDuration = (3 + Math.random() * 4) + 's';
            dot.style.width = dot.style.height = (2 + Math.random() * 3) + 'px';
            particlesEl.appendChild(dot);
        }
    }

    // ========================================================================
    // Welcome screen drag-and-drop
    // ========================================================================
    var dropZone = document.getElementById('welcomeDropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            // File System Access API doesn't support drop yet, show a message
            window.Utils.showToast('Please use the "Select Media Folder" button to choose a folder', 'warning');
        });
    }

    // Check for saved session
    window.DBUtils.getSetting('folderHandles').then(function(handles) {
        if (handles && handles.length > 0) {
            document.getElementById('btnResume').classList.remove('hidden');
        }
    }).catch(function() {});

    // ========================================================================
    // Check if running from file:// protocol - warn user
    // ========================================================================
    if (window.location.protocol === 'file:') {
        console.warn('Media Library: Running from file:// protocol. Some features (IndexedDB, File System Access API) may not work correctly. For best experience, serve via a local web server.');
        setTimeout(function() {
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('⚠️ Running from file:// — some features may not work. Use a local web server for best experience.', 'warning');
            }
        }, 1500);
    }

    // ========================================================================
    // Initialize page size selector
    // ========================================================================
    var pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
        var savedPageSize = localStorage.getItem(PAGE_SIZE_KEY) || '50';
        pageSizeSelect.value = savedPageSize;
    }

    // ========================================================================
    // Render recent folders on welcome screen
    // ========================================================================
    renderRecentFolders();

    // ========================================================================
    // Render welcome stats widget
    // ========================================================================
    renderWelcomeStats();

    // ========================================================================
    // Set up context menu on movie cards (delegated event)
    // ========================================================================
    document.addEventListener('contextmenu', function(e) {
        var card = e.target.closest('.movie-card, .movie-detail-card, .compact-card, .poster-wall-item, .movie-table-row, .shelf-card');
        if (!card) return;

        // Extract the movie index from the onclick attribute
        var onclickAttr = card.getAttribute('onclick') || '';
        var match = onclickAttr.match(/showItemFromTab\((\d+)/) || onclickAttr.match(/showDetailPage\((\d+)/) || onclickAttr.match(/showTVShowFromTab\((\d+)/);
        if (match) {
            var realIdx = parseInt(match[1]);
            showContextMenu(e, realIdx);
        }
    });

    // ========================================================================
    // Keyboard grid navigation: click-to-focus on cards
    // ========================================================================
    document.addEventListener('click', function(e) {
        var card = e.target.closest('.movie-card, .movie-detail-card, .compact-card, .poster-wall-item, .movie-table-row, .shelf-card');
        if (card) {
            // Find the grid container and set keyboard focus
            var gridContainer = card.closest('.movie-grid, .shelf-row');
            if (gridContainer) {
                var cards = Array.from(gridContainer.querySelectorAll('.movie-card, .shelf-card'));
                var idx = cards.indexOf(card);
                if (idx !== -1) {
                    setKeyboardFocus(cards, idx);
                }
            }
        } else {
            // Click outside any card removes keyboard focus
            document.querySelectorAll('.keyboard-focus').forEach(function(c) {
                c.classList.remove('keyboard-focus');
            });
            _keyboardFocusIndex = -1;
            _keyboardFocusContainer = null;
        }
    });

    // ========================================================================
    // PWA Install Prompt - Capture beforeinstallprompt and handle install
    // ========================================================================
    window._deferredInstallPrompt = null;

    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      window._deferredInstallPrompt = e;
      var installBtn = document.getElementById('pwaInstallBtn');
      if (installBtn) {
        installBtn.style.display = 'inline-flex';
        installBtn.classList.add('pwa-pulse');
      }
    });

    window.installPWA = function() {
      if (!window._deferredInstallPrompt) {
        window.Utils.showToast('App installation not available', 'warning');
        return;
      }
      window._deferredInstallPrompt.prompt();
      window._deferredInstallPrompt.userChoice.then(function(choiceResult) {
        if (choiceResult.outcome === 'accepted') {
          window.Utils.showToast('App installed successfully!', 'success');
        }
        window._deferredInstallPrompt = null;
        var installBtn = document.getElementById('pwaInstallBtn');
        if (installBtn) {
          installBtn.style.display = 'none';
          installBtn.classList.remove('pwa-pulse');
        }
      });
    };

    window.addEventListener('appinstalled', function() {
      window._deferredInstallPrompt = null;
      var installBtn = document.getElementById('pwaInstallBtn');
      if (installBtn) {
        installBtn.style.display = 'none';
        installBtn.classList.remove('pwa-pulse');
      }
      window.Utils.showToast('Media Library has been installed!', 'success');
    });

    // ========================================================================
    // Scroll Progress Bar - shows how far user has scrolled down the page
    // ========================================================================
    var scrollProgressFill = document.getElementById('scrollProgressFill');
    if (scrollProgressFill) {
        window.addEventListener('scroll', function() {
            var scrollTop = window.scrollY || document.documentElement.scrollTop;
            var scrollHeight = document.documentElement.scrollHeight;
            var clientHeight = document.documentElement.clientHeight;
            var scrollable = scrollHeight - clientHeight;
            if (scrollable <= 0) {
                scrollProgressFill.style.width = '0%';
            } else {
                var pct = (scrollTop / scrollable) * 100;
                scrollProgressFill.style.width = pct + '%';
            }
        }, { passive: true });
    }

    // ========================================================================
    // Search Suggestions / Autocomplete
    // ========================================================================
    var searchSuggestionsEl = document.getElementById('searchSuggestions');
    var _suggestionIndex = -1;
    var _currentSuggestions = [];

    if (searchInput && searchSuggestionsEl) {
        searchInput.addEventListener('input', function() {
            var query = searchInput.value.toLowerCase().trim();
            if (query.length < 2 || !window.allMovies || window.allMovies.length === 0) {
                searchSuggestionsEl.classList.remove('active');
                searchSuggestionsEl.innerHTML = '';
                _currentSuggestions = [];
                _suggestionIndex = -1;
                return;
            }

            // Find matching titles, actors, directors, writers
            var matches = [];
            var matchReasons = [];
            for (var i = 0; i < window.allMovies.length && matches.length < 8; i++) {
                var m = window.allMovies[i];
                var reason = '';
                if (m.title.toLowerCase().includes(query)) {
                    reason = '';
                } else if (m.nfoData && m.nfoData.actors && m.nfoData.actors.some(function(a) {
                    return (a.name && a.name.toLowerCase().includes(query)) || (a.role && a.role.toLowerCase().includes(query));
                })) {
                    var actorMatch = m.nfoData.actors.find(function(a) { return a.name && a.name.toLowerCase().includes(query); });
                    reason = actorMatch ? 'Actor: ' + actorMatch.name : 'Actor';
                } else if (m.nfoData && m.nfoData.cast && m.nfoData.cast.some(function(c) {
                    var name = (typeof c === 'string') ? c : (c && c.name);
                    return name && name.toLowerCase().includes(query);
                })) {
                    var castMatch = m.nfoData.cast.find(function(c) {
                        var name = (typeof c === 'string') ? c : (c && c.name);
                        return name && name.toLowerCase().includes(query);
                    });
                    reason = 'Cast: ' + ((typeof castMatch === 'string') ? castMatch : (castMatch && castMatch.name));
                } else if (m.nfoData && m.nfoData.directors && m.nfoData.directors.some(function(d) {
                    return d.toLowerCase().includes(query);
                })) {
                    var dirMatch = m.nfoData.directors.find(function(d) { return d.toLowerCase().includes(query); });
                    reason = 'Director: ' + dirMatch;
                } else if (m.nfoData && m.nfoData.director && typeof m.nfoData.director === 'string' && m.nfoData.director.toLowerCase().includes(query)) {
                    reason = 'Director: ' + m.nfoData.director;
                } else if (m.nfoData && m.nfoData.writers && m.nfoData.writers.some(function(w) {
                    return w.toLowerCase().includes(query);
                })) {
                    var wriMatch = m.nfoData.writers.find(function(w) { return w.toLowerCase().includes(query); });
                    reason = 'Writer: ' + wriMatch;
                } else if (m.nfoData && m.nfoData.writer) {
                    if (typeof m.nfoData.writer === 'string' && m.nfoData.writer.toLowerCase().includes(query)) {
                        reason = 'Writer: ' + m.nfoData.writer;
                    } else if (Array.isArray(m.nfoData.writer) && m.nfoData.writer.some(function(w) {
                        return typeof w === 'string' && w.toLowerCase().includes(query);
                    })) {
                        var wMatch = m.nfoData.writer.find(function(w) { return typeof w === 'string' && w.toLowerCase().includes(query); });
                        reason = 'Writer: ' + wMatch;
                    } else {
                        continue;
                    }
                } else {
                    continue;
                }
                matches.push(m);
                matchReasons.push(reason);
            }

            if (matches.length === 0) {
                searchSuggestionsEl.classList.remove('active');
                searchSuggestionsEl.innerHTML = '';
                _currentSuggestions = [];
                _suggestionIndex = -1;
                return;
            }

            _currentSuggestions = matches;
            _suggestionIndex = -1;

            var html = '';
            matches.forEach(function(m, idx) {
                var year = m.year || '';
                var genre = (m.nfoData && m.nfoData.genres && m.nfoData.genres.length) ? m.nfoData.genres[0] : '';
                var reasonText = matchReasons[idx] ? '<span class="search-suggestion-reason">' + window.Utils.escHtml(matchReasons[idx]) + '</span>' : '';
                html += '<div class="search-suggestion-item" data-idx="' + idx + '">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
                    '<span class="search-suggestion-title">' + window.Utils.escHtml(m.title) + '</span>' +
                    '<span class="search-suggestion-meta">' + year + (genre ? ' \u2022 ' + window.Utils.escHtml(genre) : '') + '</span>' +
                    reasonText +
                '</div>';
            });

            searchSuggestionsEl.innerHTML = html;
            searchSuggestionsEl.classList.add('active');

            // Attach click handlers
            searchSuggestionsEl.querySelectorAll('.search-suggestion-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    var idx = parseInt(item.dataset.idx);
                    var movie = _currentSuggestions[idx];
                    if (movie) {
                        searchInput.value = movie.title;
                        searchSuggestionsEl.classList.remove('active');
                        debouncedSearch();
                    }
                });
            });
        });

        // Keyboard navigation in suggestions
        searchInput.addEventListener('keydown', function(e) {
            if (!searchSuggestionsEl.classList.contains('active')) return;
            var items = searchSuggestionsEl.querySelectorAll('.search-suggestion-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                _suggestionIndex = Math.min(_suggestionIndex + 1, items.length - 1);
                items.forEach(function(it, i) { it.classList.toggle('focused', i === _suggestionIndex); });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                _suggestionIndex = Math.max(_suggestionIndex - 1, -1);
                items.forEach(function(it, i) { it.classList.toggle('focused', i === _suggestionIndex); });
            } else if (e.key === 'Enter' && _suggestionIndex >= 0) {
                e.preventDefault();
                var movie = _currentSuggestions[_suggestionIndex];
                if (movie) {
                    searchInput.value = movie.title;
                    searchSuggestionsEl.classList.remove('active');
                    debouncedSearch();
                }
            } else if (e.key === 'Escape') {
                searchSuggestionsEl.classList.remove('active');
                _suggestionIndex = -1;
            }
        });

        // Close suggestions on outside click
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-box')) {
                searchSuggestionsEl.classList.remove('active');
                _suggestionIndex = -1;
            }
        });
    }

    // ========================================================================
    // Restore Accent Color on page load
    // ========================================================================
    if (typeof window.ThemeManager !== 'undefined' && window.ThemeManager.restoreAccentColor) {
        window.ThemeManager.restoreAccentColor();
    }

    // ========================================================================
    // View Mode Persistence Per Tab
    // ========================================================================
    var VIEW_TAB_KEY = 'movieLibViewTab_';
    var originalSetView = window.setView;

    if (originalSetView) {
        window.setView = function(view) {
            originalSetView(view);
            // Save per-tab view preference
            var activeTab = document.querySelector('.nav-tab.active');
            if (activeTab) {
                var tabId = activeTab.dataset.tab;
                localStorage.setItem(VIEW_TAB_KEY + tabId, view);
            }
        };
    }

    // Enhanced switchTab to restore per-tab view mode
    var originalSwitchTab = window.switchTab;
    if (originalSwitchTab) {
        window.switchTab = function(tab) {
            // Restore per-tab view mode
            var savedView = localStorage.getItem(VIEW_TAB_KEY + tab);
            // Skip removed view mode (list only)
            if (savedView === 'list') {
                savedView = 'grid';
                localStorage.setItem(VIEW_TAB_KEY + tab, 'grid');
            }
            var activeView = (typeof window.getViewMode === 'function') ? window.getViewMode() : 'grid';
            if (savedView && savedView !== activeView) {
                if (originalSetView) originalSetView(savedView);
            }
            originalSwitchTab(tab);
        };
    }

    // ── Tab Scroll Indicators ──
    // Add scroll state classes to nav-tabs-wrapper for CSS fade indicators
    var tabsWrapper = document.querySelector('.nav-tabs-wrapper');
    if (tabsWrapper) {
        function updateTabScrollIndicators() {
            var el = tabsWrapper;
            var scrollLeft = el.scrollLeft;
            var scrollWidth = el.scrollWidth;
            var clientWidth = el.clientWidth;
            var atStart = scrollLeft <= 2;
            var atEnd = scrollLeft + clientWidth >= scrollWidth - 2;

            el.classList.remove('scroll-left', 'scroll-right', 'scroll-both');
            if (!atStart && !atEnd) {
                el.classList.add('scroll-both');
            } else if (!atStart) {
                el.classList.add('scroll-left');
            } else if (!atEnd) {
                el.classList.add('scroll-right');
            }
        }

        tabsWrapper.addEventListener('scroll', updateTabScrollIndicators);
        // Check on resize
        window.addEventListener('resize', updateTabScrollIndicators);
        // Check after tab switches (delay for DOM changes)
        var _origSwitch = window.switchTab;
        if (_origSwitch) {
            window.switchTab = function(t) {
                _origSwitch(t);
                setTimeout(updateTabScrollIndicators, 100);
            };
        }
        // Initial check
        setTimeout(updateTabScrollIndicators, 200);
    }
});

// ============================================================================
// RANDOM MOVIE PICKER ("Surprise Me" button)
// ============================================================================
window.pickRandomMovie = function() {
    var pool = (window.filteredMovies && window.filteredMovies.length > 0)
        ? window.filteredMovies
        : window.allMovies;
    if (!pool || pool.length === 0) {
        window.Utils.showToast('No movies to pick from!', 'warning');
        return;
    }
    var randomIdx = Math.floor(Math.random() * pool.length);
    var m = pool[randomIdx];
    var realIdx = window.allMovies.indexOf(m);
    if (realIdx === -1) realIdx = randomIdx;
    window.Utils.showToast('\uD83C\uDFB2 Random pick: ' + m.title, 'info');
    window.filteredMovies = window.allMovies;
    if (typeof window.DetailPage !== 'undefined' && window.DetailPage.showDetailPage) {
        window.DetailPage.showDetailPage(realIdx);
    }
};

// ============================================================================
// TAB COUNT BADGES - Show movie counts on each nav tab
// ============================================================================
window.updateTabBadges = function() {
    if (!window.allMovies || window.allMovies.length === 0) return;

    var tabCounts = {
        all: window.allMovies.length,
        movies: 0,
        tvshows: 0,
        animation: 0,
        anime: 0,
        collections: 0,
        favorites: 0,
        history: 0,
        playlist: 0
    };

    window.allMovies.forEach(function(m) {
        if (m.isTVShow) {
            tabCounts.tvshows++;
        } else {
            tabCounts.movies++;
        }
        if (m.nfoData && m.nfoData.genres) {
            var hasAnimation = m.nfoData.genres.some(function(g) {
                return g.toLowerCase() === 'animation';
            });
            if (hasAnimation) tabCounts.animation++;
            var hasAnime = m.nfoData.genres.some(function(g) {
                return g.toLowerCase() === 'anime';
            });
            if (hasAnime) tabCounts.anime++;
        }
    });

    // Count favorites
    if (typeof window.getFavorites === 'function') {
        var favs = window.getFavorites();
        tabCounts.favorites = favs ? favs.length : 0;
    }

    // Count history
    if (typeof window.getWatchHistory === 'function') {
        var hist = window.getWatchHistory();
        tabCounts.history = hist ? hist.length : 0;
    }

    // Count playlist
    if (typeof window.getPlaylist === 'function') {
        var pl = window.getPlaylist();
        tabCounts.playlist = pl ? pl.length : 0;
    }

    // Count collections
    if (typeof window.getCollections === 'function') {
        var cols = window.getCollections();
        tabCounts.collections = cols ? cols.length : 0;
    }

    // Update badge on each tab
    document.querySelectorAll('.nav-tab').forEach(function(tab) {
        var tabName = tab.dataset.tab;
        if (!tabName) return;
        var count = tabCounts[tabName];
        if (count === undefined) return;

        // Remove existing badge
        var existingBadge = tab.querySelector('.tab-badge');
        if (existingBadge) existingBadge.remove();

        // Only show badge when count > 0
        if (count > 0) {
            var badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = count;
            tab.appendChild(badge);
        }
    });
};

// ============================================================================
// DECADE QUICK FILTER BUTTONS
// ============================================================================
var _selectedDecade = null;

window.toggleDecadeFilter = function(decade) {
    if (_selectedDecade === decade) {
        _selectedDecade = null;
    } else {
        _selectedDecade = decade;
    }
    // Update pill active states
    var pills = document.querySelectorAll('.decade-pill');
    pills.forEach(function(pill) {
        if (pill.dataset.decade === _selectedDecade) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
    // Re-render current tab
    var activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        window.resetVisibleCount(activeTab.dataset.tab);
        window.switchTab(activeTab.dataset.tab);
    }
};

window.matchesDecade = function(m) {
    if (!_selectedDecade) return true;
    var year = parseInt(m.year) || 0;
    if (_selectedDecade === 'older') return year < 1980;
    var decadeStart = parseInt(_selectedDecade);
    var decadeEnd = decadeStart + 9;
    return year >= decadeStart && year <= decadeEnd;
};

window.populateDecadePills = function() {
    var container = document.getElementById('decadeFilterPills');
    if (!container) return;

    var decades = ['2020s', '2010s', '2000s', '1990s', '1980s', 'Older'];
    var decadeValues = [2020, 2010, 2000, 1990, 1980, 'older'];

    var html = '';
    for (var i = 0; i < decades.length; i++) {
        html += '<button class="decade-pill' + (_selectedDecade === String(decadeValues[i]) ? ' active' : '') +
            '" data-decade="' + decadeValues[i] + '" onclick="toggleDecadeFilter(\'' + decadeValues[i] + '\')">' +
            decades[i] + '</button>';
    }
    container.innerHTML = html;
};

window.clearDecadeFilter = function() {
    _selectedDecade = null;
    var pills = document.querySelectorAll('.decade-pill');
    pills.forEach(function(pill) { pill.classList.remove('active'); });
};

// Expose for filter indicator check
window._selectedDecade = _selectedDecade;

// ============================================================================
// WATCHED/UNWATCHED TOGGLE FILTER
// ============================================================================
var _watchedFilter = 'all'; // 'all', 'watched', or 'unwatched'

window.toggleWatchedFilter = function() {
    if (_watchedFilter === 'all') {
        _watchedFilter = 'watched';
    } else if (_watchedFilter === 'watched') {
        _watchedFilter = 'unwatched';
    } else {
        _watchedFilter = 'all';
    }
    var btn = document.getElementById('watchedFilterBtn');
    if (btn) {
        if (_watchedFilter === 'all') {
            btn.textContent = 'All';
            btn.classList.remove('active');
        } else if (_watchedFilter === 'watched') {
            btn.textContent = 'Watched';
            btn.classList.add('active');
        } else {
            btn.textContent = 'Unwatched';
            btn.classList.add('active');
        }
    }
    // Re-render current tab
    var activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        window.resetVisibleCount(activeTab.dataset.tab);
        window.switchTab(activeTab.dataset.tab);
    }
};

window.matchesWatchedFilter = function(m) {
    if (_watchedFilter === 'all') return true;
    var isWatchedItem = false;
    // Check watch history
    if (typeof window.isWatched === 'function') {
        isWatchedItem = window.isWatched(m.title);
    }
    // Also check playback-resume data as additional indicator
    if (!isWatchedItem && typeof window.getPlaybackPosition === 'function') {
        var resumeData = window.getPlaybackPosition(m.title);
        if (resumeData && resumeData.position && resumeData.duration) {
            // If watched more than 80%, consider it watched
            isWatchedItem = (resumeData.position / resumeData.duration) > 0.8;
        }
    }
    if (_watchedFilter === 'watched') return isWatchedItem;
    if (_watchedFilter === 'unwatched') return !isWatchedItem;
    return true;
};

window.clearWatchedFilter = function() {
    _watchedFilter = 'all';
    var btn = document.getElementById('watchedFilterBtn');
    if (btn) {
        btn.textContent = 'All';
        btn.classList.remove('active');
    }
};

// Expose for filter indicator check
window._watchedFilter = _watchedFilter;

// ============================================================================
// IMAGE LIGHTBOX - Full-screen overlay for poster/fanart images
// ============================================================================
window.openLightbox = function(src, title) {
    // Remove existing lightbox if any
    var existing = document.querySelector('.lightbox-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Image lightbox');

    var img = document.createElement('img');
    img.src = src;
    img.alt = title || '';
    img.onclick = function(e) { e.stopPropagation(); };

    var titleDiv = null;
    if (title) {
        titleDiv = document.createElement('div');
        titleDiv.className = 'lightbox-title';
        titleDiv.textContent = title;
    }

    var closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '\u2715';
    closeBtn.setAttribute('aria-label', 'Close lightbox');
    closeBtn.onclick = function() { window.closeLightbox(); };

    overlay.appendChild(img);
    if (titleDiv) overlay.appendChild(titleDiv);
    overlay.appendChild(closeBtn);

    // Close on click on overlay background
    overlay.onclick = function() { window.closeLightbox(); };

    // Close on Escape key
    function onKeydown(e) {
        if (e.key === 'Escape') {
            window.closeLightbox();
            document.removeEventListener('keydown', onKeydown);
        }
    }
    document.addEventListener('keydown', onKeydown);

    document.body.appendChild(overlay);
    // Trigger animation
    requestAnimationFrame(function() {
        overlay.classList.add('active');
    });
};

window.closeLightbox = function() {
    var overlay = document.querySelector('.lightbox-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(function() {
            if (overlay.parentElement) overlay.remove();
        }, 200);
    }
};

// ============================================================================
// SHARE MOVIE INFO - Copy formatted movie info to clipboard
// ============================================================================
window.shareMovieInfo = function(realIdx) {
    var m = window.allMovies[realIdx];
    if (!m) {
        window.Utils.showToast('No movie info to share', 'warning');
        return;
    }
    var nfo = m.nfoData || {};
    var lines = [];
    lines.push(m.title);
    if (m.year) lines.push('Year: ' + m.year);
    if (nfo.rating) lines.push('Rating: ' + nfo.rating.toFixed(1) + '/10');
    if (nfo.genres && nfo.genres.length > 0) lines.push('Genres: ' + nfo.genres.join(', '));
    if (nfo.director) lines.push('Director: ' + nfo.director);

    var text = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            window.Utils.showToast('Movie info copied to clipboard!', 'success');
        }).catch(function() {
            fallbackCopy(text);
            window.Utils.showToast('Movie info copied!', 'success');
        });
    } else {
        fallbackCopy(text);
        window.Utils.showToast('Movie info copied!', 'success');
    }
};

// ============================================================================
// FLOATING ACTION BUTTON (FAB) - Mobile quick actions
// ============================================================================
var _fabOpen = false;

window.toggleFabMenu = function() {
    _fabOpen = !_fabOpen;
    var menu = document.getElementById('fabMenu');
    var main = document.getElementById('fabMain');
    if (!menu || !main) return;
    if (_fabOpen) {
        menu.classList.add('open');
        main.classList.add('open');
    } else {
        menu.classList.remove('open');
        main.classList.remove('open');
    }
};

// Close FAB when clicking outside
document.addEventListener('click', function(e) {
    if (_fabOpen && !e.target.closest('.fab-container')) {
        _fabOpen = false;
        var menu = document.getElementById('fabMenu');
        var main = document.getElementById('fabMain');
        if (menu) menu.classList.remove('open');
        if (main) main.classList.remove('open');
    }
});

// ============================================================================
// CARD SIZE SLIDER - Grid density control for poster cards
// ============================================================================
var CARD_SIZE_KEY = 'movieLibCardSize';
var _cardSize = 200; // default medium

/**
 * Initialize the card size slider from localStorage
 */
window.initCardSizeSlider = function() {
    var saved = localStorage.getItem(CARD_SIZE_KEY);
    if (saved) {
        var n = parseInt(saved);
        if (n >= 150 && n <= 280) {
            _cardSize = n;
        }
    }
    var slider = document.getElementById('cardSizeRange');
    var valueLabel = document.getElementById('cardSizeValue');
    if (slider) {
        slider.value = _cardSize;
    }
    if (valueLabel) {
        valueLabel.textContent = _cardSize + 'px';
    }
    // Apply the card size
    window.updateCardSize(_cardSize);
};

/**
 * Update the card size and re-render
 * @param {number} size - Card width in pixels (150-280)
 */
window.updateCardSize = function(size) {
    _cardSize = parseInt(size);
    if (isNaN(_cardSize) || _cardSize < 150) _cardSize = 150;
    if (_cardSize > 280) _cardSize = 280;

    // Update the CSS custom property on the main container
    var container = document.getElementById('appContainer');
    if (container) {
        container.style.setProperty('--card-width', _cardSize + 'px');
    }

    // Update the label
    var valueLabel = document.getElementById('cardSizeValue');
    if (valueLabel) {
        valueLabel.textContent = _cardSize + 'px';
    }

    // Save preference
    try {
        localStorage.setItem(CARD_SIZE_KEY, _cardSize.toString());
    } catch(e) {}
};

// ============================================================================
// CONTINUE WATCHING SHELF - Expose on window from ui-renderer.js
// ============================================================================
// Capture the original function from ui-renderer.js's UIRenderer before wrapping
var _originalRenderContinueWatchingShelf = (typeof window.UIRenderer !== 'undefined' && window.UIRenderer.renderContinueWatchingShelf)
    ? window.UIRenderer.renderContinueWatchingShelf
    : null;

window.renderContinueWatchingShelf = function() {
    // Delegate to the existing renderContinueWatchingShelf in ui-renderer.js if available
    if (_originalRenderContinueWatchingShelf) {
        return _originalRenderContinueWatchingShelf();
    }
    return '';
};

// ============================================================================
// QUICK STATS WIDGET - Shows stats on welcome screen when no folders added
// ============================================================================
window.renderQuickStatsWidget = function() {
    var container = document.getElementById('quickStatsWidget');
    if (!container) return;

    // Only show if we have any previous data
    var hasData = false;
    var totalMovies = 0;
    var favoritesCount = 0;
    var historyCount = 0;

    // Check welcome stats for total movies scanned
    try {
        var welcomeStats = JSON.parse(localStorage.getItem(WELCOME_STATS_KEY));
        if (welcomeStats) {
            totalMovies = (welcomeStats.movieCount || 0) + (welcomeStats.tvShowCount || 0);
            if (totalMovies > 0) hasData = true;
        }
    } catch(e) {}

    // Check favorites count
    try {
        var favList = JSON.parse(localStorage.getItem('movieLibFavorites'));
        if (favList && favList.length > 0) {
            favoritesCount = favList.length;
            hasData = true;
        }
    } catch(e) {}

    // Check watch history count
    try {
        var historyList = JSON.parse(localStorage.getItem('movieLibWatchHistory'));
        if (historyList && historyList.length > 0) {
            historyCount = historyList.length;
            hasData = true;
        }
    } catch(e) {}

    if (!hasData) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    var html = '<h3 class="quick-stats-title">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>' +
        '</svg>' +
        'Quick Stats' +
    '</h3>' +
    '<div class="quick-stats-grid">';

    if (totalMovies > 0) {
        html += '<div class="quick-stat-item">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>' +
            '<span class="quick-stat-value">' + totalMovies + '</span>' +
            '<span class="quick-stat-label">Titles Scanned</span>' +
        '</div>';
    }

    if (favoritesCount > 0) {
        html += '<div class="quick-stat-item">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '<span class="quick-stat-value">' + favoritesCount + '</span>' +
            '<span class="quick-stat-label">Favorites</span>' +
        '</div>';
    }

    if (historyCount > 0) {
        html += '<div class="quick-stat-item">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            '<span class="quick-stat-value">' + historyCount + '</span>' +
            '<span class="quick-stat-label">Watch History</span>' +
        '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
};

// ============================================================================
// INITIALIZE NEW FEATURES ON DOM READY
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize card size slider
    window.initCardSizeSlider();
    // Render quick stats widget on welcome screen
    window.renderQuickStatsWidget();
    // Initialize fullscreen toggle
    window.initFullscreenToggle();
    // Render recently played widget
    window.renderRecentlyPlayedWidget();
});

// ============================================================================
// FULLSCREEN MODE TOGGLE
// ============================================================================
window.initFullscreenToggle = function() {
    var fsBtn = document.getElementById('fullscreenToggleBtn');
    if (!fsBtn) return;

    fsBtn.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(function() {});
        } else {
            document.exitFullscreen().catch(function() {});
        }
    });

    document.addEventListener('fullscreenchange', function() {
        var icon = fsBtn.querySelector('.fs-icon');
        if (document.fullscreenElement) {
            fsBtn.title = 'Exit Fullscreen (F11)';
            if (icon) icon.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>';
        } else {
            fsBtn.title = 'Fullscreen (F11)';
            if (icon) icon.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
        }
    });

    // F11 key handler
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F11') {
            e.preventDefault();
            fsBtn.click();
        }
    });
};

// ============================================================================
// RECENTLY PLAYED WIDGET
// ============================================================================
window.renderRecentlyPlayedWidget = function() {
    var container = document.getElementById('recentlyPlayedWidget');
    if (!container) return;

    var history = [];
    try { history = JSON.parse(localStorage.getItem('movieLibWatchHistory')) || []; } catch(e) {}

    if (history.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    var recentItems = history.slice(-5).reverse();
    var html = '<div class="recently-played-header">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
        '<span>Recently Played</span>' +
    '</div>' +
    '<div class="recently-played-list">';

    recentItems.forEach(function(title) {
        var movie = null;
        if (window.allMovies) {
            movie = window.allMovies.find(function(m) { return m.title === title; });
        }
        if (movie) {
            var idx = window.allMovies.indexOf(movie);
            html += '<div class="recently-played-item" onclick="playItemDirectly(' + idx + ')" title="' + window.Utils.escHtml(title) + '">' +
                '<div class="recently-played-poster">' +
                    '<img class="poster-img" data-movie-idx="' + idx + '">' +
                '</div>' +
                '<div class="recently-played-info">' +
                    '<div class="recently-played-title">' + window.Utils.escHtml(title) + '</div>' +
                    '<div class="recently-played-year">' + (movie.year || '') + '</div>' +
                '</div>' +
            '</div>';
        } else {
            html += '<div class="recently-played-item">' +
                '<div class="recently-played-info">' +
                    '<div class="recently-played-title">' + window.Utils.escHtml(title) + '</div>' +
                '</div>' +
            '</div>';
        }
    });

    html += '</div>';
    container.innerHTML = html;
};

// ============================================================================
// DUPLICATE FINDER INTEGRATION
// ============================================================================
window.findDuplicates = function() {
    if (!window.allMovies || window.allMovies.length === 0) {
        window.Utils.showToast('No movies to scan', 'info');
        return;
    }

    var groups = [];
    var seen = {};

    for (var i = 0; i < window.allMovies.length; i++) {
        var a = window.allMovies[i];
        var keyA = a.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen[i]) continue;

        var group = [a];
        for (var j = i + 1; j < window.allMovies.length; j++) {
            if (seen[j]) continue;
            var b = window.allMovies[j];
            var keyB = b.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            // Same year + similar title
            if (a.year === b.year && (keyA === keyB || _levenshtein(keyA, keyB) <= 3)) {
                group.push(b);
                seen[j] = true;
            }
        }

        if (group.length > 1) {
            groups.push(group);
            seen[i] = true;
        }
    }

    if (groups.length === 0) {
        window.Utils.showToast('No duplicates found!', 'success');
        return;
    }

    // Show results in a modal
    var modal = document.getElementById('duplicateModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'duplicateModal';
        modal.className = 'duplicate-modal';
        document.body.appendChild(modal);
    }

    var html = '<div class="duplicate-modal-content">' +
        '<div class="duplicate-modal-header">' +
            '<h2>Duplicate Finder</h2>' +
            '<span class="duplicate-count">' + groups.length + ' group' + (groups.length > 1 ? 's' : '') + ' found</span>' +
            '<button class="duplicate-modal-close" onclick="closeDuplicateModal()">&times;</button>' +
        '</div>' +
        '<div class="duplicate-groups">';

    groups.forEach(function(group, gi) {
        html += '<div class="duplicate-group">' +
            '<div class="duplicate-group-header" onclick="this.parentElement.classList.toggle(\'expanded\')">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
                '<span>Group ' + (gi + 1) + ' — ' + group.length + ' items</span>' +
            '</div>' +
            '<div class="duplicate-group-items">';
        group.forEach(function(m) {
            var idx = window.allMovies.indexOf(m);
            html += '<div class="duplicate-item" onclick="showItemFromTab(' + idx + ',\'all\')">' +
                '<span class="duplicate-item-title">' + window.Utils.escHtml(m.title) + '</span>' +
                '<span class="duplicate-item-year">' + m.year + '</span>' +
                '<span class="duplicate-item-size">' + window.Utils.formatBytes(m.fileSize) + '</span>' +
            '</div>';
        });
        html += '</div></div>';
    });

    html += '</div></div>';
    modal.innerHTML = html;
    modal.classList.add('active');

    window.Utils.showToast(groups.length + ' duplicate group' + (groups.length > 1 ? 's' : '') + ' found', 'info');
};

window.closeDuplicateModal = function() {
    var modal = document.getElementById('duplicateModal');
    if (modal) modal.classList.remove('active');
};

// Simple Levenshtein distance
function _levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    var matrix = [];
    for (var i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (var j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (var i = 1; i <= b.length; i++) {
        for (var j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// ============================================================================
// JUMP TO LETTER — Alphabetical quick navigation sidebar
// ============================================================================
window.jumpToLetter = function(letter) {
    letter = letter.toUpperCase();
    // Find the first movie card that starts with this letter
    var allCards = document.querySelectorAll('.movie-card[data-title], .movie-detail-card[data-title], .compact-card[data-title], .movie-table-row[data-title]');
    for (var i = 0; i < allCards.length; i++) {
        var title = (allCards[i].dataset.title || '').toUpperCase();
        if (title.charAt(0) === letter || (letter === '#' && !/^[A-Z]/.test(title.charAt(0)))) {
            allCards[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash highlight
            allCards[i].classList.add('jump-highlight');
            setTimeout(function(card) {
                card.classList.remove('jump-highlight');
            }, 1500, allCards[i]);
            break;
        }
    }
    // Close the letter nav
    var letterNav = document.getElementById('jumpToLetterNav');
    if (letterNav) letterNav.classList.remove('active');
};

window.toggleJumpToLetter = function() {
    var letterNav = document.getElementById('jumpToLetterNav');
    if (!letterNav) {
        // Create the letter nav
        letterNav = document.createElement('div');
        letterNav.id = 'jumpToLetterNav';
        letterNav.className = 'jump-to-letter-nav';
        var letters = ['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
        var html = '<div class="jtl-header"><span>Jump to Letter</span><button class="jtl-close" onclick="toggleJumpToLetter()">&times;</button></div>';
        html += '<div class="jtl-letters">';
        letters.forEach(function(l) {
            html += '<button class="jtl-letter" onclick="jumpToLetter(\'' + l + '\')">' + l + '</button>';
        });
        html += '</div>';
        letterNav.innerHTML = html;
        document.body.appendChild(letterNav);
        // Activate with animation
        requestAnimationFrame(function() {
            letterNav.classList.add('active');
        });
    } else {
        letterNav.classList.toggle('active');
    }
};

// ============================================================================
// LIBRARY SUMMARY TOAST - Shows a summary when library first loads
// ============================================================================
window.showLibrarySummary = function() {
    if (!window.allMovies || window.allMovies.length === 0) return;
    var movies = window.allMovies.filter(function(m) { return !m.isTVShow; }).length;
    var tvShows = window.allMovies.filter(function(m) { return m.isTVShow; }).length;
    var totalSize = window.allMovies.reduce(function(s, m) { return s + (m.fileSize || 0); }, 0);
    var sizeStr = window.Utils.formatBytes(totalSize);
    var msg = '📚 ' + movies + ' movies, 📺 ' + tvShows + ' TV shows — ' + sizeStr;
    window.Utils.showToast(msg, 'info');
};

// ============================================================================
// KEYBOARD SHORTCUT - Ctrl+Shift+V to cycle view modes
// ============================================================================
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        var viewModes = ['grid', 'detail', 'compact', 'posters', 'table'];
        var currentView = (typeof window.getViewMode === 'function') ? window.getViewMode() : 'grid';
        var currentIdx = viewModes.indexOf(currentView);
        if (currentIdx === -1) currentIdx = 0;
        var nextIdx = (currentIdx + 1) % viewModes.length;
        var nextView = viewModes[nextIdx];
        if (typeof window.setView === 'function') {
            window.setView(nextView);
        }
        var viewNames = { grid: 'Grid', detail: 'Detail', compact: 'Compact', posters: 'Posters', table: 'Table' };
        window.Utils.showToast('View: ' + (viewNames[nextView] || nextView), 'info');
    }
});

// ============================================================================
// KEYBOARD SHORTCUT - Ctrl+Shift+R to cycle rating filter
// ============================================================================
var _quickRatingLevels = [0, 5, 6, 7, 8];
var _quickRatingIdx = 0;
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        _quickRatingIdx = (_quickRatingIdx + 1) % _quickRatingLevels.length;
        var minRating = _quickRatingLevels[_quickRatingIdx];
        var ratingRange = document.getElementById('ratingMinRange');
        if (ratingRange) {
            ratingRange.value = minRating;
            if (typeof window.updateRatingRange === 'function') {
                window.updateRatingRange();
            }
        }
        window.Utils.showToast('Min Rating: ' + (minRating > 0 ? minRating + '+' : 'All'), 'info');
    }
});
