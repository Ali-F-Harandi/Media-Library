/**
 * Movie Library - Watch History Module
 * Tracks watched movies and TV episodes with timestamps using localStorage
 */

var HISTORY_KEY = 'movieLibWatchHistory';
var MAX_HISTORY = 100;

function getWatchHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch(e) {
        return [];
    }
}

function saveWatchHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/**
 * Record that a movie or episode was watched
 * @param {string} title - Movie or show title
 * @param {string} type - 'movie' or 'episode'
 * @param {object} details - Additional info {year, season, episode, episodeTitle, quality}
 */
window.recordWatch = function(title, type, details) {
    var history = getWatchHistory();
    // Remove existing entry for this title (avoid duplicates)
    history = history.filter(function(h) {
        return !(h.title === title && h.type === type && 
            (type === 'movie' || (h.season === details.season && h.episode === details.episode)));
    });
    // Add to front
    history.unshift({
        title: title,
        type: type,
        year: details.year || '',
        season: details.season || null,
        episode: details.episode || null,
        episodeTitle: details.episodeTitle || '',
        quality: details.quality || '',
        watchedAt: new Date().toISOString()
    });
    // Limit history size
    if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
    }
    saveWatchHistory(history);
};

window.getWatchHistory = getWatchHistory;

/**
 * Check if a movie/show has been watched
 */
window.isWatched = function(title) {
    var history = getWatchHistory();
    return history.some(function(h) { return h.title === title; });
};

/**
 * Get last watched timestamp for a title
 */
window.getLastWatched = function(title) {
    var history = getWatchHistory();
    for (var i = 0; i < history.length; i++) {
        if (history[i].title === title) return history[i].watchedAt;
    }
    return null;
};

var _lastClearedHistory = null;

/**
 * Clear all watch history (with undo support)
 */
window.clearWatchHistory = function() {
    // Save for undo
    _lastClearedHistory = getWatchHistory().slice();
    localStorage.removeItem(HISTORY_KEY);
    window.Utils.showToast('Watch history cleared', 'warning', {
        action: 'Undo',
        onAction: function() {
            if (_lastClearedHistory) {
                saveWatchHistory(_lastClearedHistory);
                _lastClearedHistory = null;
                window.Utils.showToast('Watch history restored!', 'success');
                if (typeof renderHistoryTab === 'function') window.renderHistoryTab();
            }
        }
    });
    if (typeof renderHistoryTab === 'function') window.renderHistoryTab();
};

/**
 * Format relative time from ISO date string
 */
function formatRelativeTime(isoDate) {
    var now = new Date();
    var date = new Date(isoDate);
    var diffMs = now - date;
    var diffMins = Math.floor(diffMs / 60000);
    var diffHours = Math.floor(diffMs / 3600000);
    var diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    if (diffDays < 30) return Math.floor(diffDays / 7) + 'w ago';
    return date.toLocaleDateString();
}

/**
 * Render the History tab content
 */
window.renderHistoryTab = function() {
    var container = document.getElementById('historyContainer');
    var emptyState = document.getElementById('historyEmptyState');
    var filterCount = document.getElementById('historyFilterCount');
    if (!container) return;

    var history = getWatchHistory();
    var q = document.getElementById('searchInput').value.toLowerCase().trim();

    if (q) {
        history = history.filter(function(h) {
            // First check title match (fast path)
            if (h.title.toLowerCase().includes(q)) return true;
            // Then check actor/director/writer via the global matchesSearch
            var movie = window.allMovies.find(function(m) { return m.title === h.title; });
            if (movie && typeof window.matchesSearch === 'function') {
                return window.matchesSearch(movie, q);
            }
            return false;
        });
    }

    if (filterCount) {
        filterCount.textContent = history.length + ' watched item' + (history.length !== 1 ? 's' : '');
    }

    if (history.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    var html = '<div class="history-timeline">';
    var currentDate = '';
    
    history.forEach(function(h) {
        var watchDate = new Date(h.watchedAt);
        var dateLabel = watchDate.toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
        
        if (dateLabel !== currentDate) {
            currentDate = dateLabel;
            html += '<div class="history-date-header">' + dateLabel + '</div>';
        }
        
        var subtitle = '';
        if (h.type === 'episode' && h.season !== null) {
            subtitle = 'S' + String(h.season).padStart(2, '0') + 'E' + String(h.episode).padStart(2, '0');
            if (h.episodeTitle) subtitle += ' - ' + window.Utils.escHtml(h.episodeTitle);
        }
        
        html += '<div class="history-item" data-title="' + window.Utils.escHtml(h.title) + '">' +
            '<div class="history-item-icon">' +
                (h.type === 'episode' ? 
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>' :
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>'
                ) +
            '</div>' +
            '<div class="history-item-info">' +
                '<div class="history-item-title">' + window.Utils.escHtml(h.title) + '</div>' +
                (subtitle ? '<div class="history-item-subtitle">' + subtitle + '</div>' : '') +
            '</div>' +
            '<div class="history-item-meta">' +
                (h.year ? '<span class="history-year">' + h.year + '</span>' : '') +
                (h.quality ? '<span class="history-quality">' + window.Utils.escHtml(h.quality) + '</span>' : '') +
            '</div>' +
            '<div class="history-item-time">' + formatRelativeTime(h.watchedAt) + '</div>' +
        '</div>';
    });
    
    html += '</div>';
    
    // Add clear history button
    html += '<div class="history-actions">' +
        '<button class="btn-clear-history" onclick="clearWatchHistory()">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
            'Clear History' +
        '</button>' +
    '</div>';

    container.innerHTML = html;
};

window.WatchHistory = { recordWatch: window.recordWatch, getWatchHistory: getWatchHistory, isWatched: window.isWatched, clearWatchHistory: window.clearWatchHistory, renderHistoryTab: window.renderHistoryTab };
