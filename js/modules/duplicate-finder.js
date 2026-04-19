/**
 * Movie Library - Duplicate Finder Module
 * Scans the library for potential duplicate entries based on title and year
 */

/**
 * Find potential duplicates in the library
 * Compares movies by normalized title + year
 * @returns {Array} Array of duplicate groups
 */
window.findDuplicates = function() {
    var groups = {};
    var duplicates = [];
    
    // Group by normalized title + year
    window.allMovies.forEach(function(m, idx) {
        var key = normalizeTitle(m.title) + '|' + m.year;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push({ movie: m, index: idx });
    });
    
    // Find groups with more than one entry
    Object.keys(groups).forEach(function(key) {
        if (groups[key].length > 1) {
            duplicates.push({
                key: key,
                title: groups[key][0].movie.title,
                year: groups[key][0].movie.year,
                items: groups[key]
            });
        }
    });
    
    // Sort by number of duplicates (most duplicates first)
    duplicates.sort(function(a, b) { return b.items.length - a.items.length; });
    
    return duplicates;
};

/**
 * Normalize a movie title for comparison
 * Removes common suffixes, articles, and extra whitespace
 */
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/[\s\-_.:]+/g, '')
        .replace(/(4k|uhd|bluray|remux|webdl|webrip|hdtv|1080p|720p|2160p|hdr|dvdrip|x264|x265|hevc|h264|h265|aac|dts|atmos|5\.1|7\.1|10bit|6ch)/gi, '')
        .trim();
}

/**
 * Render the duplicate finder tab/panel
 */
window.renderDuplicateFinder = function() {
    var container = document.getElementById('duplicateContainer');
    var emptyState = document.getElementById('duplicateEmptyState');
    var filterCount = document.getElementById('duplicateFilterCount');
    
    if (!container) return;
    
    var duplicates = window.findDuplicates();
    
    if (filterCount) {
        filterCount.textContent = duplicates.length + ' group' + (duplicates.length !== 1 ? 's' : '') + ' found';
    }
    
    if (duplicates.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    var html = '<div class="duplicate-groups">';
    
    duplicates.forEach(function(group, gIdx) {
        html += '<div class="duplicate-group">' +
            '<div class="duplicate-group-header">' +
                '<div class="duplicate-group-info">' +
                    '<h3 class="duplicate-group-title">' + window.Utils.escHtml(group.title) + '</h3>' +
                    '<span class="duplicate-group-year">' + group.year + '</span>' +
                    '<span class="duplicate-group-badge">' + group.items.length + ' copies</span>' +
                '</div>' +
            '</div>' +
            '<div class="duplicate-items">';
        
        group.items.forEach(function(item) {
            var m = item.movie;
            var size = window.Utils.formatBytes(m.fileSize);
            var quality = m.quality ? window.Utils.escHtml(m.quality) : 'Unknown';
            var type = m.isTVShow ? 'TV Show' : 'Movie';
            var path = m.fullPath || m.relativePath || 'Unknown path';
            
            html += '<div class="duplicate-item" onclick="showItemFromTab(' + item.index + ',\'all\')">' +
                '<div class="duplicate-item-poster">' +
                    (m.posterUrl ? '<img src="' + m.posterUrl + '" alt="' + window.Utils.escHtml(m.title) + '">' :
                     '<div class="no-poster-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>') +
                '</div>' +
                '<div class="duplicate-item-info">' +
                    '<div class="duplicate-item-type">' + type + '</div>' +
                    '<div class="duplicate-item-path" title="' + window.Utils.escHtml(path) + '">' + window.Utils.escHtml(path) + '</div>' +
                    '<div class="duplicate-item-meta">' +
                        '<span class="duplicate-item-quality">' + quality + '</span>' +
                        '<span class="duplicate-item-size">' + size + '</span>' +
                    '</div>' +
                '</div>' +
                '<button class="duplicate-item-detail-btn" onclick="event.stopPropagation(); showItemFromTab(' + item.index + ',\'all\')" title="View details">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
                '</button>' +
            '</div>';
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
};
