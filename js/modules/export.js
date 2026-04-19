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
 * Export library data as JSON
 */
function exportAsJSON() {
    var data = window.allMovies.map(function(m) {
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

window.Export = { exportLibrary: window.exportLibrary, toggleExportDropdown: window.toggleExportDropdown };
