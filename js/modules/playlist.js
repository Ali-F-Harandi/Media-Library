/**
 * Movie Library - Playlist/Queue Module
 * Manages a playback queue so users can line up movies to watch next
 * Supports drag-and-drop reordering
 */

var PLAYLIST_KEY = 'movieLibPlaylist';
var _draggedPlaylistIndex = null;

function getPlaylist() {
    try {
        return JSON.parse(localStorage.getItem(PLAYLIST_KEY)) || [];
    } catch(e) {
        return [];
    }
}

function savePlaylist(list) {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(list));
}

window.addToPlaylist = function(title) {
    var list = getPlaylist();
    if (list.indexOf(title) === -1) {
        list.push(title);
        savePlaylist(list);
        window.Utils.showToast('Added to playlist: ' + title, 'success');
    } else {
        window.Utils.showToast('Already in playlist', 'warning');
    }
    if (typeof window.renderPlaylistTab === 'function') window.renderPlaylistTab();
};

window.removeFromPlaylist = function(title) {
    var list = getPlaylist();
    var idx = list.indexOf(title);
    if (idx !== -1) {
        list.splice(idx, 1);
        savePlaylist(list);
        window.Utils.showToast('Removed from playlist', 'warning');
    }
    if (typeof window.renderPlaylistTab === 'function') window.renderPlaylistTab();
};

var _lastClearedPlaylist = null;
var _clearPlaylistTimeout = null;

window.clearPlaylist = function() {
    // Save current playlist for undo
    _lastClearedPlaylist = getPlaylist().slice();
    localStorage.removeItem(PLAYLIST_KEY);
    window.Utils.showToast('Playlist cleared', 'warning', {
        action: 'Undo',
        onAction: function() {
            if (_lastClearedPlaylist) {
                savePlaylist(_lastClearedPlaylist);
                _lastClearedPlaylist = null;
                window.Utils.showToast('Playlist restored!', 'success');
                if (typeof window.renderPlaylistTab === 'function') window.renderPlaylistTab();
            }
        }
    });
    if (typeof window.renderPlaylistTab === 'function') window.renderPlaylistTab();
};

window.isInPlaylist = function(title) {
    return getPlaylist().indexOf(title) !== -1;
};

window.getPlaylist = getPlaylist;

/**
 * Play the next item in the playlist
 */
window.playNextInPlaylist = function() {
    var list = getPlaylist();
    if (list.length === 0) {
        window.Utils.showToast('Playlist is empty', 'warning');
        return;
    }
    var title = list[0];
    // Find the movie in allMovies
    var m = window.allMovies.find(function(item) { return item.title === title; });
    if (m) {
        var idx = window.allMovies.indexOf(m);
        window.filteredMovies = window.allMovies;
        if (m.isTVShow) {
            window.playTVShowFirstEpisode(idx);
        } else {
            window.VideoPlayer.playMovie(idx);
        }
        // Remove from playlist after playing
        list.shift();
        savePlaylist(list);
        if (typeof window.renderPlaylistTab === 'function') window.renderPlaylistTab();
    } else {
        // Movie not found, remove it
        list.shift();
        savePlaylist(list);
        window.playNextInPlaylist();
    }
};

/**
 * Set up drag-and-drop event listeners on playlist items
 */
function setupPlaylistDragDrop() {
    var container = document.getElementById('playlistContainer');
    if (!container) return;

    var playlistItems = container.querySelectorAll('.playlist-item');
    playlistItems.forEach(function(item) {
        // dragstart - record which item is being dragged
        item.addEventListener('dragstart', function(e) {
            _draggedPlaylistIndex = parseInt(item.dataset.playlistIndex);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', _draggedPlaylistIndex);
        });

        // dragend - clean up
        item.addEventListener('dragend', function() {
            item.classList.remove('dragging');
            // Remove dragover from all items
            container.querySelectorAll('.playlist-item.dragover').forEach(function(el) {
                el.classList.remove('dragover');
            });
            _draggedPlaylistIndex = null;
        });

        // dragover - allow dropping and show indicator
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // Remove dragover from all items
            container.querySelectorAll('.playlist-item.dragover').forEach(function(el) {
                el.classList.remove('dragover');
            });
            item.classList.add('dragover');
        });

        // dragleave - remove indicator
        item.addEventListener('dragleave', function() {
            item.classList.remove('dragover');
        });

        // drop - reorder the playlist
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            item.classList.remove('dragover');

            var fromIndex = _draggedPlaylistIndex;
            var toIndex = parseInt(item.dataset.playlistIndex);

            if (fromIndex === null || fromIndex === toIndex) return;

            // Get the current playlist titles and reorder
            var list = getPlaylist();
            var movedItem = list.splice(fromIndex, 1)[0];
            list.splice(toIndex, 0, movedItem);
            savePlaylist(list);

            // Re-render
            window.renderPlaylistTab();
            window.Utils.showToast('Playlist reordered', 'success');
        });
    });
}

/**
 * Render the Playlist tab content
 */
window.renderPlaylistTab = function() {
    var container = document.getElementById('playlistContainer');
    var emptyState = document.getElementById('playlistEmptyState');
    var filterCount = document.getElementById('playlistFilterCount');
    if (!container) return;

    var titles = getPlaylist();
    var q = document.getElementById('searchInput').value.toLowerCase().trim();

    var items = window.allMovies.filter(function(m) {
        return titles.indexOf(m.title) !== -1;
    });

    // Sort items to match playlist order
    items.sort(function(a, b) {
        return titles.indexOf(a.title) - titles.indexOf(b.title);
    });

    if (q) {
        items = items.filter(function(m) {
            if (typeof window.matchesSearch === 'function') return window.matchesSearch(m, q);
            return m.title.toLowerCase().includes(q);
        });
    }

    if (filterCount) {
        filterCount.textContent = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' in queue';
    }

    if (items.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    var html = '<div class="playlist-queue">';
    items.forEach(function(m, i) {
        var realIdx = window.allMovies.indexOf(m);
        var isTV = m.isTVShow;
        var safeTitle = m.title.replace(/'/g, "\\'");
        html += '<div class="playlist-item" draggable="true" data-playlist-index="' + i + '" data-title="' + window.Utils.escHtml(m.title) + '">' +
            '<div class="playlist-drag-handle" title="Drag to reorder">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg>' +
            '</div>' +
            '<div class="playlist-item-rank">' + (i + 1) + '</div>' +
            '<div class="playlist-item-icon">' +
                (isTV ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>' :
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>') +
            '</div>' +
            '<div class="playlist-item-info" onclick="showItemFromTab(' + realIdx + ',\'playlist\')">' +
                '<div class="playlist-item-title">' + window.Utils.escHtml(m.title) + '</div>' +
                '<div class="playlist-item-meta">' +
                    '<span>' + m.year + '</span>' +
                    (m.quality ? '<span class="playlist-quality">' + window.Utils.escHtml(m.quality) + '</span>' : '') +
                    '<span>' + window.Utils.formatBytes(m.fileSize) + '</span>' +
                '</div>' +
            '</div>' +
            '<button class="playlist-item-play" onclick="window.filteredMovies=window.allMovies;window.VideoPlayer.playMovie(' + realIdx + ')" title="Play now">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>' +
            '</button>' +
            '<button class="playlist-item-remove" onclick="removeFromPlaylist(\'' + safeTitle + '\')" title="Remove">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
        '</div>';
    });
    html += '</div>';

    // Add play all and clear buttons
    html += '<div class="playlist-actions">' +
        '<button class="btn-play-all" onclick="playNextInPlaylist()">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>' +
            'Play Next' +
        '</button>' +
        '<button class="btn-clear-playlist" onclick="clearPlaylist()">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
            'Clear All' +
        '</button>' +
    '</div>';

    container.innerHTML = html;

    // Set up drag-and-drop on the rendered items
    setupPlaylistDragDrop();
};

// ============================================================================
// PLAYLIST AUTO-ADVANCE - Automatically play next item when current ends
// ============================================================================
var AUTO_ADVANCE_KEY = 'movieLibAutoAdvance';

window.getAutoAdvance = function() {
    try {
        return localStorage.getItem(AUTO_ADVANCE_KEY) !== 'false';
    } catch(e) {
        return true;
    }
};

window.setAutoAdvance = function(enabled) {
    localStorage.setItem(AUTO_ADVANCE_KEY, enabled ? 'true' : 'false');
    window.Utils.showToast('Auto-advance ' + (enabled ? 'enabled' : 'disabled'), 'info');
};

/**
 * Play the next item in the playlist after current video ends
 * Called from video player 'ended' event
 */
window.playNextPlaylistItem = function() {
    if (!window.getAutoAdvance()) return false;
    var list = getPlaylist();
    if (list.length === 0) return false;
    window.playNextInPlaylist();
    return true;
};

window.Playlist = { addToPlaylist: window.addToPlaylist, removeFromPlaylist: window.removeFromPlaylist, getPlaylist: getPlaylist, clearPlaylist: window.clearPlaylist, isInPlaylist: window.isInPlaylist, renderPlaylistTab: window.renderPlaylistTab, getAutoAdvance: window.getAutoAdvance, setAutoAdvance: window.setAutoAdvance, playNextPlaylistItem: window.playNextPlaylistItem };
