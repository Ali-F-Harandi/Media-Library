/**
 * Movie Library - Export Module
 * Handles exporting library data as JSON, CSV, or TXT
 */

/**
 * Toggle the export dropdown visibility
 */
window.toggleExportDropdown = function() {
    var dropdown = document.getElementById('exportDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('active');
};

/**
 * Export the full library in the specified format
 * @param {string} format - 'json', 'csv', or 'txt'
 */
window.exportLibrary = function(format) {
    // Close dropdown
    var dropdown = document.getElementById('exportDropdown');
    if (dropdown) dropdown.classList.remove('active');

    if (!window.allMovies || window.allMovies.length === 0) {
        window.Utils.showToast('No library data to export', 'warning');
        return;
    }

    var content = '';
    var filename = '';
    var mimeType = '';

    if (format === 'json') {
        content = exportAsJSON();
        filename = 'media-library-' + getDateStamp() + '.json';
        mimeType = 'application/json';
    } else if (format === 'csv') {
        content = exportAsCSV();
        filename = 'media-library-' + getDateStamp() + '.csv';
        mimeType = 'text/csv';
    } else if (format === 'txt') {
        content = exportAsTXT();
        filename = 'media-library-' + getDateStamp() + '.txt';
        mimeType = 'text/plain';
    }

    downloadFile(content, filename, mimeType);
    window.Utils.showToast('Exported as ' + format.toUpperCase(), 'success');
};

/**
 * Export library data as JSON (includes metadata: favorites, history, playlist)
 */
function exportAsJSON() {
    var movies = window.allMovies.map(function(m) {
        return {
            title: m.title,
            year: m.year || '',
            type: m.isTVShow ? 'TV Show' : 'Movie',
            rating: (m.nfoData && m.nfoData.rating) || null,
            ratingVotes: (m.nfoData && m.nfoData.ratingVotes) || null,
            genres: (m.nfoData && m.nfoData.genres) || [],
            runtime: (m.nfoData && m.nfoData.runtime) || null,
            plot: (m.nfoData && m.nfoData.plot) || '',
            fileSize: m.fileSize || 0,
            fileSizeFormatted: window.Utils.formatBytes(m.fileSize || 0),
            quality: m.quality || '',
            path: m.videoFilePath || m.fullPath || '',
            fileName: m.fileName || ''
        };
    });
    var data = {
        _meta: {
            exportedAt: new Date().toISOString(),
            version: '2.1',
            type: 'bilkos-media-library-export'
        },
        movies: movies,
        favorites: (typeof window.getFavorites === 'function') ? window.getFavorites() : [],
        watchHistory: (typeof window.getWatchHistory === 'function') ? window.getWatchHistory() : [],
        playlist: (typeof window.getPlaylist === 'function') ? window.getPlaylist() : []
    };
    return JSON.stringify(data, null, 2);
}

/**
 * Export library data as CSV
 */
function exportAsCSV() {
    var headers = ['Title', 'Year', 'Type', 'Rating', 'Size', 'Quality', 'Genres', 'Path'];
    var rows = [headers.join(',')];

    window.allMovies.forEach(function(m) {
        var genres = (m.nfoData && m.nfoData.genres) ? m.nfoData.genres.join('; ') : '';
        var rating = (m.nfoData && m.nfoData.rating) ? m.nfoData.rating.toFixed(1) : '';
        var path = m.videoFilePath || m.fullPath || '';
        var row = [
            csvEscape(m.title),
            m.year || '',
            m.isTVShow ? 'TV Show' : 'Movie',
            rating,
            window.Utils.formatBytes(m.fileSize || 0),
            csvEscape(m.quality || ''),
            csvEscape(genres),
            csvEscape(path)
        ];
        rows.push(row.join(','));
    });

    return rows.join('\n');
}

/**
 * Export library data as simple text list
 */
function exportAsTXT() {
    var lines = ['Media Library Export', '===================', 'Exported: ' + new Date().toLocaleString(), ''];

    var movieCount = window.allMovies.filter(function(m) { return !m.isTVShow; }).length;
    var tvCount = window.allMovies.filter(function(m) { return m.isTVShow; }).length;
    var totalSize = window.allMovies.reduce(function(s, m) { return s + (m.fileSize || 0); }, 0);

    lines.push('Total: ' + window.allMovies.length + ' titles (' + movieCount + ' movies, ' + tvCount + ' TV shows)');
    lines.push('Total size: ' + window.Utils.formatBytes(totalSize));
    lines.push('');
    lines.push('--- Movies ---');

    window.allMovies.forEach(function(m, i) {
        var prefix = (i + 1) + '. ';
        var rating = (m.nfoData && m.nfoData.rating) ? ' [★' + m.nfoData.rating.toFixed(1) + ']' : '';
        var quality = m.quality ? ' (' + m.quality + ')' : '';
        var type = m.isTVShow ? ' [TV]' : '';
        lines.push(prefix + m.title + ' (' + m.year + ')' + type + rating + quality + ' - ' + window.Utils.formatBytes(m.fileSize || 0));
    });

    return lines.join('\n');
}

/**
 * Escape a string for CSV format
 */
function csvEscape(str) {
    if (!str) return '';
    if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Generate a date stamp for filename
 */
function getDateStamp() {
    var d = new Date();
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

/**
 * Download a file using Blob + URL.createObjectURL
 */
function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Close export dropdown when clicking outside
document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('exportWrapper');
    var dropdown = document.getElementById('exportDropdown');
    if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

/**
 * Import library metadata from a previously exported JSON file.
 * Restores favorites, watch history, and playlist data.
 */
window.importLibrary = function() {
    // Create a hidden file input element if not already created
    var fileInput = document.getElementById('importFileInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'importFileInput';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;

            // Reset input so the same file can be re-imported
            fileInput.value = '';

            // Validate file type
            if (!file.name.endsWith('.json')) {
                window.Utils.showToast('Please select a .json file', 'error');
                return;
            }

            var reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    var data = JSON.parse(evt.target.result);
                    var imported = importLibraryData(data);
                    if (imported) {
                        window.Utils.showToast('Library imported successfully! (' + imported + ' items restored)', 'success');
                        // Refresh the current view
                        if (typeof window.switchTab === 'function') {
                            var activeTab = document.querySelector('.nav-tab.active');
                            if (activeTab) {
                                window.switchTab(activeTab.dataset.tab);
                            }
                        }
                    }
                } catch (err) {
                    window.Utils.showToast('Invalid JSON file: ' + err.message, 'error');
                }
            };
            reader.onerror = function() {
                window.Utils.showToast('Failed to read file', 'error');
            };
            reader.readAsText(file);
        });
    }

    fileInput.click();
};

/**
 * Validate and import library data from parsed JSON
 * @param {object} data - Parsed JSON data
 * @returns {number|false} - Number of items imported, or false on validation failure
 */
function importLibraryData(data) {
    if (!data || typeof data !== 'object') {
        window.Utils.showToast('Invalid file structure: not a valid JSON object', 'error');
        return false;
    }

    var totalImported = 0;

    // Detect format: v2.1 export with _meta wrapper or legacy array format
    var favorites = null;
    var watchHistory = null;
    var playlist = null;

    if (data._meta && data._meta.type === 'bilkos-media-library-export') {
        // New format with metadata wrapper
        favorites = data.favorites;
        watchHistory = data.watchHistory;
        playlist = data.playlist;
    } else if (Array.isArray(data)) {
        // Legacy format — array of movies, no metadata to import
        window.Utils.showToast('This file contains only movie data (legacy format). No metadata to import.', 'warning');
        return false;
    } else {
        // Try to extract from any object with these keys
        favorites = data.favorites;
        watchHistory = data.watchHistory || data.watch_history;
        playlist = data.playlist;
    }

    // Import favorites
    if (Array.isArray(favorites)) {
        var currentFavs = (typeof window.getFavorites === 'function') ? window.getFavorites() : [];
        var newFavCount = 0;
        favorites.forEach(function(title) {
            if (typeof title === 'string' && currentFavs.indexOf(title) === -1) {
                currentFavs.push(title);
                newFavCount++;
            }
        });
        try {
            localStorage.setItem('movieLibFavorites', JSON.stringify(currentFavs));
        } catch(e) { /* ignore quota error */ }
        totalImported += newFavCount;
    }

    // Import watch history
    if (Array.isArray(watchHistory)) {
        var currentHistory = (typeof window.getWatchHistory === 'function') ? window.getWatchHistory() : [];
        var newHistoryCount = 0;
        watchHistory.forEach(function(entry) {
            if (entry && typeof entry === 'object' && typeof entry.title === 'string') {
                // Avoid duplicates by title (and season/episode for TV)
                var isDuplicate = currentHistory.some(function(h) {
                    if (h.title !== entry.title) return false;
                    if (entry.type === 'episode' && h.type === 'episode') {
                        return h.season === entry.season && h.episode === entry.episode;
                    }
                    return h.type === entry.type;
                });
                if (!isDuplicate) {
                    currentHistory.push(entry);
                    newHistoryCount++;
                }
            }
        });
        // Limit to MAX_HISTORY (100)
        if (currentHistory.length > 100) {
            currentHistory = currentHistory.slice(0, 100);
        }
        try {
            localStorage.setItem('movieLibWatchHistory', JSON.stringify(currentHistory));
        } catch(e) { /* ignore quota error */ }
        totalImported += newHistoryCount;
    }

    // Import playlist
    if (Array.isArray(playlist)) {
        var currentPlaylist = (typeof window.getPlaylist === 'function') ? window.getPlaylist() : [];
        var newPlaylistCount = 0;
        playlist.forEach(function(title) {
            if (typeof title === 'string' && currentPlaylist.indexOf(title) === -1) {
                currentPlaylist.push(title);
                newPlaylistCount++;
            }
        });
        try {
            localStorage.setItem('movieLibPlaylist', JSON.stringify(currentPlaylist));
        } catch(e) { /* ignore quota error */ }
        totalImported += newPlaylistCount;
    }

    if (totalImported === 0) {
        window.Utils.showToast('No new data to import (all items already exist)', 'warning');
        return false;
    }

    return totalImported;
}

window.Export = { exportLibrary: window.exportLibrary, toggleExportDropdown: window.toggleExportDropdown, importLibrary: window.importLibrary };
