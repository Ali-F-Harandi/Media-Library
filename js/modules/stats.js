/**
 * Movie Library - Statistics Module
 * Computes and renders library statistics with visual breakdowns
 * Enhanced with animated progress bars, percentages, and section icons
 */

// Color palette for stat bars
var STATS_COLORS = [
    '#e50914', '#ff6b35', '#ffc107', '#4caf50', '#2196f3',
    '#9c27b0', '#e91e63', '#00bcd4', '#8bc34a', '#ff5722'
];

/**
 * Render an interactive Genre Cloud - a visual tag cloud where each genre
 * is displayed as a pill/badge sized proportionally to how many movies have that genre.
 * Clicking a genre filters the library to show only that genre.
 */
function renderGenreCloud() {
    if (!window.allMovies || window.allMovies.length === 0) return '';

    var genreMap = {};
    window.allMovies.forEach(function(m) {
        if (m.nfoData && m.nfoData.genres) {
            m.nfoData.genres.forEach(function(g) {
                genreMap[g] = (genreMap[g] || 0) + 1;
            });
        }
    });

    var genres = Object.keys(genreMap).sort(function(a, b) { return genreMap[b] - genreMap[a]; });
    if (genres.length === 0) return '';

    var maxCount = genreMap[genres[0]];
    var minSize = 0.75;
    var maxSize = 1.6;

    var html = '<div class="stats-section">' +
        '<h3 class="stats-section-title">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>' +
            'Genre Cloud' +
        '</h3>' +
        '<div class="genre-cloud">';

    genres.forEach(function(genre, idx) {
        var count = genreMap[genre];
        var ratio = maxCount > 1 ? (count - 1) / (maxCount - 1) : 1;
        var size = minSize + ratio * (maxSize - minSize);
        var color = STATS_COLORS[idx % STATS_COLORS.length];
        var opacity = 0.6 + ratio * 0.4;

        html += '<span class="genre-cloud-item" ' +
            'style="font-size:' + size.toFixed(2) + 'rem;background:' + color + ';opacity:' + opacity.toFixed(2) + '" ' +
            'onclick="filterByGenreFromStats(\'' + window.Utils.escHtml(genre).replace(/'/g, "\\'") + '\')" ' +
            'title="' + count + ' title' + (count !== 1 ? 's' : '') + '">' +
            window.Utils.escHtml(genre) +
            '<span class="genre-cloud-count">' + count + '</span>' +
        '</span>';
    });

    html += '</div></div>';
    return html;
}

/**
 * Filter library by genre from the Stats tab Genre Cloud
 * Sets the genre filter and switches to the All tab
 */
window.filterByGenreFromStats = function(genre) {
    // Set the genre filter select
    var genreSelect = document.getElementById('genreFilterSelect');
    if (genreSelect) {
        genreSelect.value = genre;
    }
    // Use the multi-genre tag system
    if (typeof window.toggleGenreTag === 'function') {
        // Clear existing selections first
        var container = document.getElementById('genreFilterTags');
        if (container) {
            container.querySelectorAll('.genre-tag').forEach(function(tag) {
                tag.classList.remove('active');
                if (tag.dataset.genre === 'all') {
                    tag.classList.add('active');
                }
            });
        }
        // Reset internal set and add just this genre
        if (typeof window._selectedGenres !== 'undefined') {
            window._selectedGenres.clear();
            window._selectedGenres.add(genre);
        }
    }
    // Trigger the genre filter change handler
    if (typeof window.handleGenreFilterChange === 'function') {
        window.handleGenreFilterChange();
    }
    // Switch to the All tab
    if (typeof window.switchTab === 'function') {
        window.switchTab('all');
    }
};

window.renderLibraryStats = function() {
    var statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;
    if (!window.allMovies || window.allMovies.length === 0) {
        statsContainer.innerHTML = '';
        return;
    }

    var movies = window.allMovies.filter(function(m) { return !m.isTVShow; });
    var tvShows = window.allMovies.filter(function(m) { return m.isTVShow; });
    var totalSize = window.allMovies.reduce(function(s, m) { return s + m.fileSize; }, 0);
    var totalEpisodes = tvShows.reduce(function(s, m) { return s + (m.totalEpisodes || 0); }, 0);
    var totalCount = window.allMovies.length;

    // Genre breakdown
    var genreMap = {};
    window.allMovies.forEach(function(m) {
        if (m.nfoData && m.nfoData.genres) {
            m.nfoData.genres.forEach(function(g) {
                genreMap[g] = (genreMap[g] || 0) + 1;
            });
        }
    });
    var topGenres = Object.keys(genreMap).sort(function(a, b) { return genreMap[b] - genreMap[a]; }).slice(0, 10);
    var maxGenreCount = topGenres.length > 0 ? genreMap[topGenres[0]] : 1;

    // Decade breakdown
    var decadeMap = {};
    window.allMovies.forEach(function(m) {
        var year = parseInt(m.year);
        if (year >= 1970) {
            var decade = Math.floor(year / 10) * 10 + 's';
            decadeMap[decade] = (decadeMap[decade] || 0) + 1;
        } else if (year > 0) {
            decadeMap['Pre-1970'] = (decadeMap['Pre-1970'] || 0) + 1;
        }
    });
    var decades = Object.keys(decadeMap).sort();
    var maxDecadeCount = decades.length > 0 ? Math.max.apply(null, decades.map(function(d) { return decadeMap[d]; })) : 1;

    // Quality breakdown
    var qualityMap = {};
    window.allMovies.forEach(function(m) {
        var q = m.quality || 'Unknown';
        qualityMap[q] = (qualityMap[q] || 0) + 1;
    });
    var qualityKeys = Object.keys(qualityMap).sort(function(a, b) { return qualityMap[b] - qualityMap[a]; });
    var maxQualityCount = qualityKeys.length > 0 ? qualityMap[qualityKeys[0]] : 1;

    // File size distribution
    var sizeMap = { 'Small (<1GB)': 0, 'Medium (1-5GB)': 0, 'Large (5-15GB)': 0, 'Huge (>15GB)': 0 };
    window.allMovies.forEach(function(m) {
        var size = m.fileSize || 0;
        var oneGB = 1073741824;
        if (size < oneGB) { // < 1GB
            sizeMap['Small (<1GB)']++;
        } else if (size < 5 * oneGB) { // 1-5GB
            sizeMap['Medium (1-5GB)']++;
        } else if (size < 15 * oneGB) { // 5-15GB
            sizeMap['Large (5-15GB)']++;
        } else { // > 15GB
            sizeMap['Huge (>15GB)']++;
        }
    });
    var sizeKeys = Object.keys(sizeMap);
    var maxSizeCount = Math.max.apply(null, sizeKeys.map(function(k) { return sizeMap[k]; }));
    if (maxSizeCount === 0) maxSizeCount = 1;

    // Average rating
    var ratedMovies = window.allMovies.filter(function(m) { return m.nfoData && m.nfoData.rating; });
    var avgRating = ratedMovies.length > 0 ? (ratedMovies.reduce(function(s, m) { return s + m.nfoData.rating; }, 0) / ratedMovies.length) : 0;

    // Top rated movies
    var topRated = ratedMovies.slice().sort(function(a, b) { return b.nfoData.rating - a.nfoData.rating; }).slice(0, 5);

    // Largest files
    var largest = window.allMovies.slice().sort(function(a, b) { return b.fileSize - a.fileSize; }).slice(0, 5);

    // Build HTML
    var html = '<div class="stats-overview">';

    // Overview cards
    html += '<div class="stat-card">' +
        '<div class="stat-value">' + totalCount + '</div>' +
        '<div class="stat-label">Total Titles</div>' +
    '</div>';
    html += '<div class="stat-card">' +
        '<div class="stat-value">' + movies.length + '</div>' +
        '<div class="stat-label">Movies</div>' +
    '</div>';
    html += '<div class="stat-card">' +
        '<div class="stat-value">' + tvShows.length + '</div>' +
        '<div class="stat-label">TV Shows</div>' +
    '</div>';
    if (totalEpisodes > 0) {
        html += '<div class="stat-card">' +
            '<div class="stat-value">' + totalEpisodes + '</div>' +
            '<div class="stat-label">Episodes</div>' +
        '</div>';
    }
    html += '<div class="stat-card">' +
        '<div class="stat-value">' + window.Utils.formatBytes(totalSize) + '</div>' +
        '<div class="stat-label">Total Size</div>' +
    '</div>';
    if (avgRating > 0) {
        html += '<div class="stat-card">' +
            '<div class="stat-value">' + avgRating.toFixed(1) + '</div>' +
            '<div class="stat-label">Avg Rating</div>' +
        '</div>';
    }
    var favCount = window.getFavorites ? window.getFavorites().length : 0;
    if (favCount > 0) {
        html += '<div class="stat-card">' +
            '<div class="stat-value">' + favCount + '</div>' +
            '<div class="stat-label">Favorites</div>' +
        '</div>';
    }

    html += '</div>'; // end stats-overview

    // ========================================================================
    // Genre Cloud - interactive tag cloud sized by count
    // ========================================================================
    html += renderGenreCloud();

    // ========================================================================
    // Genre Distribution - horizontal bars with percentages and colors
    // ========================================================================
    if (topGenres.length > 0) {
        html += '<div class="stats-section">' +
            '<h3 class="stats-section-title">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18M3 15h18M15 3v18"/></svg>' +
                'Genre Distribution' +
            '</h3>' +
            '<div class="stats-bars">';

        topGenres.forEach(function(genre, idx) {
            var count = genreMap[genre];
            var pctOfTotal = Math.round((count / totalCount) * 100);
            var barWidth = Math.round((count / maxGenreCount) * 100);
            var color = STATS_COLORS[idx % STATS_COLORS.length];

            html += '<div class="stats-bar-row">' +
                '<span class="stats-bar-label">' + window.Utils.escHtml(genre) + '</span>' +
                '<div class="stats-bar-track">' +
                    '<div class="stats-bar-fill" style="width:' + barWidth + '%;background:' + color + ';animation:barGrow 0.6s ease-out ' + (idx * 0.05) + 's both"></div>' +
                '</div>' +
                '<span class="stats-bar-pct">' + pctOfTotal + '%</span>' +
                '<span class="stats-bar-count">' + count + '</span>' +
            '</div>';
        });

        html += '</div></div>';
    }

    // ========================================================================
    // Quality Distribution - horizontal bars with percentages
    // ========================================================================
    if (qualityKeys.length > 0) {
        html += '<div class="stats-section">' +
            '<h3 class="stats-section-title">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>' +
                'Quality Distribution' +
            '</h3>' +
            '<div class="stats-bars">';

        qualityKeys.forEach(function(q, idx) {
            var count = qualityMap[q];
            var pctOfTotal = Math.round((count / totalCount) * 100);
            var barWidth = Math.round((count / maxQualityCount) * 100);
            var color = STATS_COLORS[(idx + 3) % STATS_COLORS.length];

            html += '<div class="stats-bar-row">' +
                '<span class="stats-bar-label">' + window.Utils.escHtml(q) + '</span>' +
                '<div class="stats-bar-track">' +
                    '<div class="stats-bar-fill quality-bar-fill" style="width:' + barWidth + '%;background:' + color + ';animation:barGrow 0.6s ease-out ' + (idx * 0.05) + 's both"></div>' +
                '</div>' +
                '<span class="stats-bar-pct">' + pctOfTotal + '%</span>' +
                '<span class="stats-bar-count">' + count + '</span>' +
            '</div>';
        });

        html += '</div></div>';
    }

    // ========================================================================
    // File Size Distribution - horizontal bars with percentages
    // ========================================================================
    if (totalCount > 0) {
        html += '<div class="stats-section">' +
            '<h3 class="stats-section-title">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                'File Size Distribution' +
            '</h3>' +
            '<div class="stats-bars">';

        var sizeColors = ['#4caf50', '#ffc107', '#ff6b35', '#e50914'];
        sizeKeys.forEach(function(k, idx) {
            var count = sizeMap[k];
            var pctOfTotal = Math.round((count / totalCount) * 100);
            var barWidth = Math.round((count / maxSizeCount) * 100);
            var color = sizeColors[idx] || STATS_COLORS[idx];

            html += '<div class="stats-bar-row">' +
                '<span class="stats-bar-label">' + k + '</span>' +
                '<div class="stats-bar-track">' +
                    '<div class="stats-bar-fill size-bar-fill" style="width:' + barWidth + '%;background:' + color + ';animation:barGrow 0.6s ease-out ' + (idx * 0.08) + 's both"></div>' +
                '</div>' +
                '<span class="stats-bar-pct">' + pctOfTotal + '%</span>' +
                '<span class="stats-bar-count">' + count + '</span>' +
            '</div>';
        });

        html += '</div></div>';
    }

    // ========================================================================
    // Year Distribution (By Decade) - horizontal bars with percentages
    // ========================================================================
    if (decades.length > 0) {
        html += '<div class="stats-section">' +
            '<h3 class="stats-section-title">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                'Year Distribution' +
            '</h3>' +
            '<div class="stats-bars">';

        decades.forEach(function(decade, idx) {
            var count = decadeMap[decade];
            var pctOfTotal = Math.round((count / totalCount) * 100);
            var barWidth = Math.round((count / maxDecadeCount) * 100);
            var color = STATS_COLORS[(idx + 5) % STATS_COLORS.length];

            html += '<div class="stats-bar-row">' +
                '<span class="stats-bar-label">' + decade + '</span>' +
                '<div class="stats-bar-track">' +
                    '<div class="stats-bar-fill decade-fill" style="width:' + barWidth + '%;background:' + color + ';animation:barGrow 0.6s ease-out ' + (idx * 0.05) + 's both"></div>' +
                '</div>' +
                '<span class="stats-bar-pct">' + pctOfTotal + '%</span>' +
                '<span class="stats-bar-count">' + count + '</span>' +
            '</div>';
        });

        html += '</div></div>';
    }

    // ========================================================================
    // Year Distribution (Last 50 Years) - individual year bars by decade
    // ========================================================================
    var currentYear = new Date().getFullYear();
    var yearStart = currentYear - 49;
    var yearMapRecent = {};
    window.allMovies.forEach(function(m) {
        var year = parseInt(m.year);
        if (year >= yearStart && year <= currentYear) {
            yearMapRecent[year] = (yearMapRecent[year] || 0) + 1;
        }
    });
    var yearKeysRecent = Object.keys(yearMapRecent).sort();
    var maxYearRecentCount = yearKeysRecent.length > 0 ? Math.max.apply(null, yearKeysRecent.map(function(y) { return yearMapRecent[y]; })) : 1;

    if (yearKeysRecent.length > 0) {
        html += '<div class="stats-section">' +
            '<h3 class="stats-section-title">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
                'Year Distribution (Last 50 Years)' +
            '</h3>' +
            '<div class="stats-chart">';

        yearKeysRecent.forEach(function(year, idx) {
            var count = yearMapRecent[year];
            var barHeight = Math.round((count / maxYearRecentCount) * 100);
            var color = STATS_COLORS[(idx + 7) % STATS_COLORS.length];

            html += '<div class="stats-bar stats-bar-vertical">' +
                '<div class="stats-bar-fill-vertical" style="height:' + barHeight + '%;background:' + color + ';animation:barGrow 0.6s ease-out ' + (idx * 0.03) + 's both"></div>' +
                '<span class="stats-bar-label-vertical">' + (year % 100 < 10 ? '0' : '') + (year % 100) + '</span>' +
                '<span class="stats-bar-count-vertical">' + count + '</span>' +
            '</div>';
        });

        html += '</div></div>';
    }

    // ========================================================================
    // Top Rated
    // ========================================================================
    if (topRated.length > 0) {
        html += '<div class="stats-section">' +
            '<h3 class="stats-section-title">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--star-color)" stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>' +
                'Top Rated' +
            '</h3>' +
            '<div class="stats-top-list">';

        topRated.forEach(function(m, i) {
            var realIdx = window.allMovies.indexOf(m);
            html += '<div class="stats-top-item" onclick="showItemFromTab(' + realIdx + ',\'stats\')">' +
                '<span class="stats-top-rank">' + (i + 1) + '</span>' +
                '<span class="stats-top-title">' + window.Utils.escHtml(m.title) + '</span>' +
                '<span class="stats-top-year">' + m.year + '</span>' +
                '<span class="stats-top-rating">' + m.nfoData.rating.toFixed(1) + '</span>' +
            '</div>';
        });

        html += '</div></div>';
    }

    // ========================================================================
    // Largest Files
    // ========================================================================
    if (largest.length > 0) {
        html += '<div class="stats-section">' +
            '<h3 class="stats-section-title">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                'Largest Files' +
            '</h3>' +
            '<div class="stats-top-list">';

        largest.forEach(function(m, i) {
            var realIdx = window.allMovies.indexOf(m);
            html += '<div class="stats-top-item" onclick="showItemFromTab(' + realIdx + ',\'stats\')">' +
                '<span class="stats-top-rank">' + (i + 1) + '</span>' +
                '<span class="stats-top-title">' + window.Utils.escHtml(m.title) + '</span>' +
                '<span class="stats-top-year">' + m.year + '</span>' +
                '<span class="stats-top-rating">' + window.Utils.formatBytes(m.fileSize) + '</span>' +
            '</div>';
        });

        html += '</div></div>';
    }

    statsContainer.innerHTML = html;

    // Update subtitle
    var subtitle = document.getElementById('statsSubtitle');
    if (subtitle) {
        subtitle.textContent = window.allMovies.length + ' titles \u2022 ' + window.Utils.formatBytes(totalSize) + ' total \u2022 ' + movies.length + ' movies, ' + tvShows.length + ' TV shows';
    }
};

window.Stats = { renderLibraryStats: window.renderLibraryStats };
