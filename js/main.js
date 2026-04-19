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
    var container = document.getElementById('genreFilterTags');
    if (!container) return;

    // Collect all genres
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

    // Build HTML with "All Genres" button + individual genre buttons
    var html = '<button class="genre-tag' + (_selectedGenres.size === 0 ? ' active' : '') + '" data-genre="all" onclick="toggleGenreTag(\'all\', this)">All Genres</button>';
    genres.forEach(function(g) {
        var isActive = _selectedGenres.has(g) ? ' active' : '';
        html += '<button class="genre-tag' + isActive + '" data-genre="' + window.Utils.escHtml(g) + '" onclick="toggleGenreTag(\'' + g.replace(/'/g, "\\'") + '\', this)">' + window.Utils.escHtml(g) + '</button>';
    });
    container.innerHTML = html;
    _genreTagsInitialized = true;
};

/**
 * Clear multi-genre selection (used by resetAdvancedFilters)
 */
window.clearMultiGenreFilter = function() {
    _selectedGenres.clear();
    var container = document.getElementById('genreFilterTags');
    if (container) {
        container.querySelectorAll('.genre-tag').forEach(function(tag) {
            tag.classList.remove('active');
            if (tag.dataset.genre === 'all') {
                tag.classList.add('active');
            }
        });
    }
};

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
    }

    ctxMenu.classList.add('active');

    // Position the menu
    var x = e.clientX;
    var y = e.clientY;
    var menuWidth = 220;
    var menuHeight = 260;

    // Adjust if near edges
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

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
            var path = m.videoFilePath || m.fullPath || '';
            // Prepend absolute path if set for this folder
            if (m.libraryRoot && typeof window.getAbsolutePathsByName === 'function') {
                var absPathsByName = window.getAbsolutePathsByName();
                if (absPathsByName[m.libraryRoot]) {
                    path = absPathsByName[m.libraryRoot] + path;
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
    if (document.getElementById('playerModal').classList.contains('active')) {
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
    } else if (document.getElementById('detailPage').classList.contains('active')) {
        if (e.key === 'Escape') window.DetailPage.closeDetailPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || (e.key === 'Enter' && document.querySelector('.keyboard-focus'))) {
        // Grid keyboard navigation (not in player, detail, or input)
        handleGridArrowKey(e);
    } else if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
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
        var card = e.target.closest('.movie-card, .shelf-card');
        if (!card) return;

        // Extract the movie index from the onclick attribute
        var onclickAttr = card.getAttribute('onclick') || '';
        var match = onclickAttr.match(/showItemFromTab\((\d+)/) || onclickAttr.match(/showDetailPage\((\d+)/);
        if (match) {
            var realIdx = parseInt(match[1]);
            showContextMenu(e, realIdx);
        }
    });

    // ========================================================================
    // Keyboard grid navigation: click-to-focus on cards
    // ========================================================================
    document.addEventListener('click', function(e) {
        var card = e.target.closest('.movie-card, .shelf-card');
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
});
