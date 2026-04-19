/**
 * Movie Library - Detail Page Module
 * Handles the detail page display for both Movies and TV Shows
 * TV Shows get a completely different layout with season/episode navigation
 */

// SVG placeholder for actor images (encoded to avoid syntax issues)
var ACTOR_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>'
);

// Currently selected season in TV show detail view
var currentSeasonIndex = 0;

// Currently viewing TV show index
var currentTVShowIdx = -1;

// Define function using var to ensure it's available before assignment
var showDetailPage = async function(idx) {
    var m = window.filteredMovies[idx];
    if (!m) return;

    // Route to different detail views based on type
    if (m.isTVShow) {
        await showTVShowDetailPage(idx);
    } else {
        await showMovieDetailPage(idx);
    }
};

// ============================================================================
// MOVIE DETAIL PAGE (original functionality, preserved)
// ============================================================================

async function showMovieDetailPage(idx) {
    var m = window.filteredMovies[idx];
    if (!m) return;

    // Load poster - revoke old URL before creating new one to prevent memory leaks
    if (!m.posterUrl && m.posterHandle) {
        try {
            var f = await m.posterHandle.getFile();
            if (m.posterUrl) URL.revokeObjectURL(m.posterUrl);
            m.posterUrl = URL.createObjectURL(f);
        } catch(e) {}
    }

    // Load fanart - revoke old URL before creating new one to prevent memory leaks
    var fanartSrc = '';
    if (m.fanartHandle) {
        if (!m.fanartUrl) {
            try {
                var ff = await m.fanartHandle.getFile();
                if (m.fanartUrl) URL.revokeObjectURL(m.fanartUrl);
                m.fanartUrl = URL.createObjectURL(ff);
            } catch(e) {}
        }
        if (m.fanartUrl) fanartSrc = m.fanartUrl;
    }
    if (!fanartSrc && m.nfoData && m.nfoData.onlineFanart) {
        fanartSrc = m.nfoData.onlineFanart;
    }

    document.getElementById('detailPageBg').style.backgroundImage =
        fanartSrc ? 'url(' + fanartSrc + ')' : 'none';

    var nfo = m.nfoData || {};
    var body = document.getElementById('detailPageBody');

    var html = '<div class="detail-hero">' +
        '<div class="detail-hero-poster">' +
            (m.posterUrl ? '<img src="' + m.posterUrl + '">' : 
             '<div class="no-poster-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg></div>') +
        '</div>' +
        '<div class="detail-hero-info">' +
            '<h1 class="detail-hero-title">' + window.Utils.escHtml(m.title) + '</h1>' +
            '<div class="detail-hero-subtitle">' +
                '<span>' + m.year + '</span>' +
                (nfo.runtime ? '<span>' + nfo.runtime + ' min</span>' : '') +
                (nfo.certification && nfo.certification !== 'NR' ? '<span>' + window.Utils.escHtml(nfo.certification) + '</span>' : '') +
                (nfo.premiered ? '<span>' + window.Utils.escHtml(nfo.premiered) + '</span>' : '') +
            '</div>';

    if (nfo.rating) {
        html += '<div class="detail-hero-rating">' +
            '<span class="detail-hero-rating-val">\u2605 ' + nfo.rating.toFixed(1) + '</span>' +
            '<div class="detail-hero-rating-bar">' +
                '<div class="detail-hero-rating-fill" style="width:' + (nfo.rating * 10) + '%"></div>' +
            '</div>' +
            (nfo.ratingVotes ? '<span class="detail-hero-rating-votes">' + nfo.ratingVotes.toLocaleString() + ' votes</span>' : '') +
        '</div>';
    }

    html += '<div class="detail-hero-actions">' +
        '<button class="detail-play-btn" onclick="playMovie(' + idx + ')">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>' +
            'Play Movie' +
        '</button>' +
        '<button class="detail-secondary-btn" onclick="copyMoviePath(' + idx + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
                '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
            '</svg>' +
            'Copy Path' +
        '</button>' +
    '</div></div></div>';

    if (nfo.tagline) {
        html += '<div class="detail-tagline">"' + window.Utils.escHtml(nfo.tagline) + '"</div>';
    }

    if (nfo.genres && nfo.genres.length) {
        html += '<div class="detail-genres">' +
            nfo.genres.map(function(g) {
                return '<span class="detail-genre-pill">' + window.Utils.escHtml(g) + '</span>';
            }).join('') +
        '</div>';
    }

    if (nfo.plot) {
        html += '<div class="detail-section">' +
            '<div class="detail-section-title">Synopsis</div>' +
            '<p class="detail-plot">' + window.Utils.escHtml(nfo.plot) + '</p>' +
        '</div>';
    }
    
    // Movie set/collection section
    if (nfo.setName) {
        html += '<div class="detail-section">' +
            '<div class="detail-section-title">Collection</div>' +
            '<div style="background:var(--bg-card);border-radius:12px;padding:1.25rem;border:1px solid var(--border);margin-bottom:1rem">' +
                '<h3 style="font-size:1.3rem;font-weight:700;margin-bottom:.5rem;color:var(--accent)">' + window.Utils.escHtml(nfo.setName) + '</h3>';
        if (nfo.setOverview) {
            html += '<p style="color:var(--text-secondary);line-height:1.6;margin-bottom:1rem">' + window.Utils.escHtml(nfo.setOverview) + '</p>';
        }
        html += '<button class="detail-secondary-btn" onclick="goToCollection(\'' + window.Utils.escHtml(nfo.setName).replace(/'/g, "\\'") + '\')" style="padding:.6rem 1.2rem;font-size:.9rem">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">' +
                '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                '<path d="M9 3v18M3 9h18M3 15h18M15 3v18"/>' +
            '</svg>' +
            'View All Movies in Collection' +
        '</button>' +
            '</div>' +
        '</div>';
    }

    html += buildInfoSection(m, nfo);
    html += buildTechSpecs(nfo);
    html += buildTagsSection(nfo);
    html += await buildCastSection(m, nfo);

    body.innerHTML = html;

    var page = document.getElementById('detailPage');
    var scroll = page.querySelector('.detail-page-scroll');
    if (scroll) scroll.scrollTop = 0;
    requestAnimationFrame(function() {
        page.classList.add('active');
    });
}

// ============================================================================
// TV SHOW DETAIL PAGE (completely different layout)
// ============================================================================

async function showTVShowDetailPage(idx) {
    var m = window.filteredMovies[idx];
    if (!m || !m.isTVShow) return;
    
    currentTVShowIdx = idx;
    currentSeasonIndex = 0; // Reset to first season

    // Load poster - revoke old URL before creating new one to prevent memory leaks
    if (!m.posterUrl && m.posterHandle) {
        try {
            var f = await m.posterHandle.getFile();
            if (m.posterUrl) URL.revokeObjectURL(m.posterUrl);
            m.posterUrl = URL.createObjectURL(f);
        } catch(e) {}
    }

    // Load fanart - revoke old URL before creating new one to prevent memory leaks
    var fanartSrc = '';
    if (m.fanartHandle) {
        if (!m.fanartUrl) {
            try {
                var ff = await m.fanartHandle.getFile();
                if (m.fanartUrl) URL.revokeObjectURL(m.fanartUrl);
                m.fanartUrl = URL.createObjectURL(ff);
            } catch(e) {}
        }
        if (m.fanartUrl) fanartSrc = m.fanartUrl;
    }
    if (!fanartSrc && m.nfoData && m.nfoData.onlineFanart) {
        fanartSrc = m.nfoData.onlineFanart;
    }

    document.getElementById('detailPageBg').style.backgroundImage =
        fanartSrc ? 'url(' + fanartSrc + ')' : 'none';

    var nfo = m.nfoData || {};
    var body = document.getElementById('detailPageBody');

    // Build TV Show hero section
    var html = '<div class="detail-hero tvshow-hero">' +
        '<div class="detail-hero-poster tvshow-poster">' +
            (m.posterUrl ? '<img src="' + m.posterUrl + '">' : 
             '<div class="no-poster-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg></div>') +
        '</div>' +
        '<div class="detail-hero-info tvshow-hero-info">' +
            '<div class="tvshow-type-badge">TV Series</div>' +
            '<h1 class="detail-hero-title">' + window.Utils.escHtml(m.title) + '</h1>' +
            '<div class="detail-hero-subtitle">' +
                '<span>' + m.year + '</span>' +
                (m.totalSeasons ? '<span>' + m.totalSeasons + ' Season' + (m.totalSeasons > 1 ? 's' : '') + '</span>' : '') +
                '<span>' + m.totalEpisodes + ' Episode' + (m.totalEpisodes > 1 ? 's' : '') + '</span>' +
                (nfo.certification && nfo.certification !== 'NR' ? '<span>' + window.Utils.escHtml(nfo.certification) + '</span>' : '') +
                (nfo.status ? '<span class="tvshow-status">' + window.Utils.escHtml(nfo.status) + '</span>' : '') +
            '</div>';

    if (nfo.rating) {
        html += '<div class="detail-hero-rating">' +
            '<span class="detail-hero-rating-val">\u2605 ' + nfo.rating.toFixed(1) + '</span>' +
            '<div class="detail-hero-rating-bar">' +
                '<div class="detail-hero-rating-fill" style="width:' + (nfo.rating * 10) + '%"></div>' +
            '</div>' +
            (nfo.ratingVotes ? '<span class="detail-hero-rating-votes">' + nfo.ratingVotes.toLocaleString() + ' votes</span>' : '') +
        '</div>';
    }

    html += '<div class="detail-hero-actions">' +
        '<button class="detail-play-btn" onclick="playTVShowFirstEpisode(' + idx + ')">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>' +
            'Play First Episode' +
        '</button>' +
        '<button class="detail-secondary-btn" onclick="copyMoviePath(' + idx + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
                '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
            '</svg>' +
            'Copy Path' +
        '</button>' +
    '</div></div></div>';

    if (nfo.tagline) {
        html += '<div class="detail-tagline">"' + window.Utils.escHtml(nfo.tagline) + '"</div>';
    }

    if (nfo.genres && nfo.genres.length) {
        html += '<div class="detail-genres">' +
            nfo.genres.map(function(g) {
                return '<span class="detail-genre-pill">' + window.Utils.escHtml(g) + '</span>';
            }).join('') +
        '</div>';
    }

    if (nfo.plot) {
        html += '<div class="detail-section">' +
            '<div class="detail-section-title">Synopsis</div>' +
            '<p class="detail-plot">' + window.Utils.escHtml(nfo.plot) + '</p>' +
        '</div>';
    }

    // ===== SEASON & EPISODE BROWSER =====
    html += '<div class="detail-section tvshow-seasons-section">' +
        '<div class="detail-section-title">Seasons & Episodes</div>';

    // Season tabs
    html += '<div class="tvshow-season-tabs" id="seasonTabs">';
    for (var si = 0; si < m.seasonFolders.length; si++) {
        var season = m.seasonFolders[si];
        var isActive = si === 0 ? ' active' : '';
        var epCount = season.episodes ? season.episodes.length : 0;
        html += '<button class="tvshow-season-tab' + isActive + '" data-season="' + si + '" onclick="selectSeason(' + idx + ', ' + si + ')">' +
            '<span class="season-tab-number">Season ' + season.seasonNumber + '</span>' +
            '<span class="season-tab-count">' + epCount + ' episode' + (epCount !== 1 ? 's' : '') + '</span>' +
        '</button>';
    }
    html += '</div>';

    // Season content area (episodes list)
    html += '<div class="tvshow-season-content" id="seasonContent">';
    html += buildSeasonEpisodes(m, 0); // Build first season by default
    html += '</div>';

    html += '</div>'; // End seasons section

    // TV Show Information section
    html += buildTVShowInfoSection(m, nfo);
    html += buildTagsSection(nfo);
    html += await buildCastSection(m, nfo);

    body.innerHTML = html;

    var page = document.getElementById('detailPage');
    var scroll = page.querySelector('.detail-page-scroll');
    if (scroll) scroll.scrollTop = 0;
    requestAnimationFrame(function() {
        page.classList.add('active');
    });
}

// ============================================================================
// SEASON & EPISODE BUILDING
// ============================================================================

/**
 * Build HTML for episodes in a specific season
 * @param {Object} m - TV show data object
 * @param {number} seasonIdx - Index into m.seasonFolders array
 * @returns {string} HTML string for the season content
 */
function buildSeasonEpisodes(m, seasonIdx) {
    var season = m.seasonFolders[seasonIdx];
    if (!season) return '<p class="tvshow-no-episodes">No season data available</p>';
    
    var nfo = m.nfoData || {};
    var seasonPlot = nfo.seasonPlots ? nfo.seasonPlots[String(season.seasonNumber)] : '';
    
    var html = '';
    
    // Season poster and plot header
    html += '<div class="tvshow-season-header">';
    
    // Load season poster if available
    var seasonPosterHandle = m.seasonPosters ? m.seasonPosters[season.seasonNumber] : null;
    if (seasonPosterHandle || m.posterHandle) {
        html += '<div class="tvshow-season-poster" id="seasonPoster_' + seasonIdx + '">';
        html += '<img class="season-poster-img" data-season-idx="' + seasonIdx + '">';
        html += '</div>';
    }
    
    html += '<div class="tvshow-season-info">';
    html += '<h3 class="tvshow-season-title">Season ' + season.seasonNumber + '</h3>';
    if (seasonPlot) {
        html += '<p class="tvshow-season-plot">' + window.Utils.escHtml(seasonPlot) + '</p>';
    }
    if (season.episodes && season.episodes.length > 0) {
        html += '<p class="tvshow-season-meta">' + season.episodes.length + ' episode' + (season.episodes.length !== 1 ? 's' : '') + '</p>';
    }
    html += '</div>';
    html += '</div>'; // End season header
    
    // Episode list
    if (!season.episodes || season.episodes.length === 0) {
        html += '<p class="tvshow-no-episodes">No episodes found in this season</p>';
        return html;
    }
    
    html += '<div class="tvshow-episode-list">';
    for (var ei = 0; ei < season.episodes.length; ei++) {
        var ep = season.episodes[ei];
        html += '<div class="tvshow-episode-card" onclick="playTVEpisode(' + currentTVShowIdx + ', ' + seasonIdx + ', ' + ei + ')">' +
            '<div class="tvshow-episode-number">' +
                '<span class="ep-num">' + ep.episodeNumber + '</span>' +
            '</div>' +
            '<div class="tvshow-episode-info">' +
                '<div class="tvshow-episode-title">' + window.Utils.escHtml(ep.title) + '</div>' +
                '<div class="tvshow-episode-meta">' +
                    '<span class="ep-filename">' + window.Utils.escHtml(ep.fileName) + '</span>' +
                    (ep.quality ? '<span class="ep-quality">' + window.Utils.escHtml(ep.quality) + '</span>' : '') +
                    '<span class="ep-size">' + window.Utils.formatBytes(ep.fileSize) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="tvshow-episode-play">' +
                '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">' +
                    '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>' +
                    '<polygon points="10,8 16,12 10,16" fill="currentColor"/>' +
                '</svg>' +
            '</div>' +
        '</div>';
    }
    html += '</div>'; // End episode list
    
    return html;
}

/**
 * Select a different season and update the episode list
 * Called when user clicks a season tab
 */
window.selectSeason = async function(movieIdx, seasonIdx) {
    var m = window.filteredMovies[movieIdx];
    if (!m || !m.isTVShow) return;
    
    currentSeasonIndex = seasonIdx;
    
    // Update tab active state
    var tabs = document.querySelectorAll('.tvshow-season-tab');
    tabs.forEach(function(tab, i) {
        tab.classList.toggle('active', parseInt(tab.dataset.season) === seasonIdx);
    });
    
    // Rebuild season content
    var content = document.getElementById('seasonContent');
    if (content) {
        content.innerHTML = buildSeasonEpisodes(m, seasonIdx);
        // Load season poster image
        loadSeasonPoster(m, seasonIdx);
    }
};

/**
 * Load season poster image asynchronously
 */
async function loadSeasonPoster(m, seasonIdx) {
    var season = m.seasonFolders[seasonIdx];
    if (!season) return;
    
    var posterImg = document.querySelector('.season-poster-img[data-season-idx="' + seasonIdx + '"]');
    if (!posterImg) return;
    
    var seasonPosterHandle = m.seasonPosters ? m.seasonPosters[season.seasonNumber] : null;
    var handleToUse = seasonPosterHandle || m.posterHandle;
    
    if (handleToUse) {
        try {
            var file = await handleToUse.getFile();
            // Revoke previous season poster URL if exists to prevent memory leaks
            if (m.seasonPosterUrl) {
                URL.revokeObjectURL(m.seasonPosterUrl);
            }
            m.seasonPosterUrl = URL.createObjectURL(file);
            posterImg.src = m.seasonPosterUrl;
            posterImg.classList.add('loaded');
        } catch(e) {
            console.warn('Could not load season poster:', e);
        }
    }
}

// ============================================================================
// SHARED BUILDING BLOCKS (used by both movie and TV show detail pages)
// ============================================================================

function buildInfoSection(m, nfo) {
    var html = '<div class="detail-section">' +
        '<div class="detail-section-title">Information</div>' +
        '<div class="detail-meta-grid">';

    if (nfo.directors && nfo.directors.length) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Director</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.directors.join(', ')) + '</span>' +
        '</div>';
    }
    if (nfo.writers && nfo.writers.length) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Writer</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.writers.join(', ')) + '</span>' +
        '</div>';
    }
    if (nfo.studio) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Studio</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.studio) + '</span>' +
        '</div>';
    }
    if (nfo.country) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Country</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.country) + '</span>' +
        '</div>';
    }
    if (nfo.source) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Source</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.source) + '</span>' +
        '</div>';
    }
    if (m.quality) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Quality</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(m.quality) + '</span>' +
        '</div>';
    }

    html += '<div class="detail-meta-item">' +
        '<span class="detail-meta-label">File Size</span>' +
        '<span class="detail-meta-value">' + window.Utils.formatBytes(m.fileSize) + '</span>' +
    '</div>' +
    '<div class="detail-meta-item">' +
        '<span class="detail-meta-label">Filename</span>' +
        '<span class="detail-meta-value">' + window.Utils.escHtml(m.fileName) + '</span>' +
    '</div>';

    if (nfo.imdbId) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">IMDb</span>' +
            '<span class="detail-meta-value">' +
                '<a href="https://www.imdb.com/title/' + window.Utils.escHtml(nfo.imdbId) + '" target="_blank">' +
                    window.Utils.escHtml(nfo.imdbId) +
                '</a>' +
            '</span>' +
        '</div>';
    }
    if (nfo.tmdbId) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">TMDb</span>' +
            '<span class="detail-meta-value">' +
                '<a href="https://www.themoviedb.org/movie/' + window.Utils.escHtml(nfo.tmdbId) + '" target="_blank">' +
                    window.Utils.escHtml(nfo.tmdbId) +
                '</a>' +
            '</span>' +
        '</div>';
    }

    html += '</div></div>';
    return html;
}

function buildTVShowInfoSection(m, nfo) {
    var html = '<div class="detail-section">' +
        '<div class="detail-section-title">Show Information</div>' +
        '<div class="detail-meta-grid">';

    if (nfo.studio) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Network</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.studio) + '</span>' +
        '</div>';
    }
    if (nfo.country) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Country</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.country) + '</span>' +
        '</div>';
    }
    if (nfo.premiered) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Premiered</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.premiered) + '</span>' +
        '</div>';
    }
    if (nfo.status) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">Status</span>' +
            '<span class="detail-meta-value">' + window.Utils.escHtml(nfo.status) + '</span>' +
        '</div>';
    }

    html += '<div class="detail-meta-item">' +
        '<span class="detail-meta-label">Total Size</span>' +
        '<span class="detail-meta-value">' + window.Utils.formatBytes(m.fileSize) + '</span>' +
    '</div>';

    if (nfo.imdbId) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">IMDb</span>' +
            '<span class="detail-meta-value">' +
                '<a href="https://www.imdb.com/title/' + window.Utils.escHtml(nfo.imdbId) + '" target="_blank">' +
                    window.Utils.escHtml(nfo.imdbId) +
                '</a>' +
            '</span>' +
        '</div>';
    }
    if (nfo.tmdbId) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">TMDb</span>' +
            '<span class="detail-meta-value">' +
                '<a href="https://www.themoviedb.org/tv/' + window.Utils.escHtml(nfo.tmdbId) + '" target="_blank">' +
                    window.Utils.escHtml(nfo.tmdbId) +
                '</a>' +
            '</span>' +
        '</div>';
    }
    if (nfo.tvdbId) {
        html += '<div class="detail-meta-item">' +
            '<span class="detail-meta-label">TheTVDB</span>' +
            '<span class="detail-meta-value">' +
                '<a href="https://thetvdb.com/?tab=series&id=' + window.Utils.escHtml(nfo.tvdbId) + '" target="_blank">' +
                    window.Utils.escHtml(nfo.tvdbId) +
                '</a>' +
            '</span>' +
        '</div>';
    }

    html += '</div></div>';
    return html;
}

function buildTechSpecs(nfo) {
    if (!nfo.videoCodec && !nfo.audioCodec) return '';

    var html = '<div class="detail-section">' +
        '<div class="detail-section-title">Technical Specs</div>' +
        '<div class="detail-tech">';

    if (nfo.videoCodec) {
        html += '<div class="detail-tech-item">' +
            '<div class="detail-tech-label">Video Codec</div>' +
            '<div class="detail-tech-value">' + window.Utils.escHtml(nfo.videoCodec) + '</div>' +
        '</div>';
    }
    if (nfo.videoResolution) {
        html += '<div class="detail-tech-item">' +
            '<div class="detail-tech-label">Resolution</div>' +
            '<div class="detail-tech-value">' + window.Utils.escHtml(nfo.videoResolution) + '</div>' +
        '</div>';
    }
    if (nfo.videoAspect) {
        html += '<div class="detail-tech-item">' +
            '<div class="detail-tech-label">Aspect Ratio</div>' +
            '<div class="detail-tech-value">' + window.Utils.escHtml(nfo.videoAspect) + '</div>' +
        '</div>';
    }
    if (nfo.audioCodec) {
        html += '<div class="detail-tech-item">' +
            '<div class="detail-tech-label">Audio Codec</div>' +
            '<div class="detail-tech-value">' + window.Utils.escHtml(nfo.audioCodec) + '</div>' +
        '</div>';
    }
    if (nfo.audioChannels) {
        html += '<div class="detail-tech-item">' +
            '<div class="detail-tech-label">Audio Channels</div>' +
            '<div class="detail-tech-value">' + window.Utils.escHtml(nfo.audioChannels) + ' ch</div>' +
        '</div>';
    }

    html += '</div></div>';
    return html;
}

function buildTagsSection(nfo) {
    if (!nfo.tags || !nfo.tags.length) return '';
    
    var html = '<div class="detail-section">' +
        '<div class="detail-section-title">Tags</div>' +
        '<div class="detail-tags">' +
            nfo.tags.map(function(t) {
                return '<span class="detail-tag-sm">' + window.Utils.escHtml(t) + '</span>';
            }).join('') +
        '</div>' +
    '</div>';
    return html;
}

async function buildCastSection(m, nfo) {
    if (!nfo.actors || !nfo.actors.length) return '';

    var html = '<div class="detail-section">' +
        '<div class="detail-section-title">Cast</div>' +
        '<div class="detail-cast-scroll">';
    
    for (var ai = 0; ai < nfo.actors.length; ai++) {
        var a = nfo.actors[ai];
        var actorImgHtml = '&#127917;';
        var hasLocalImage = false;
        
        if (m.actorImages) {
            var nameVariants = [
                a.name.replace(/\s+/g, '_'),
                a.name.replace(/\s+/g, ''),
                a.name.split(' ').pop(),
                a.name.toLowerCase()
            ];
            
            for (var vi = 0; vi < nameVariants.length; vi++) {
                var variant = nameVariants[vi].toLowerCase();
                if (m.actorImages[variant]) {
                    try {
                        if (!a.localActorUrl) {
                            var localFile = await m.actorImages[variant].getFile();
                            a.localActorUrl = URL.createObjectURL(localFile);
                        }
                        actorImgHtml = '<img src="' + a.localActorUrl + '" onerror="this.onerror=null;this.src=\'' + ACTOR_PLACEHOLDER + '\';">';
                        hasLocalImage = true;
                        break;
                    } catch(e) {}
                }
            }
        }
        
        if (!hasLocalImage && a.thumb) {
            actorImgHtml = '<img src="' + window.Utils.escHtml(a.thumb) + '" onerror="this.onerror=null;this.src=\'' + ACTOR_PLACEHOLDER + '\';">';
        }
        
        html += '<div class="detail-cast-card">' +
            '<div class="detail-cast-avatar">' +
                actorImgHtml +
            '</div>' +
            '<div class="detail-cast-name">' + window.Utils.escHtml(a.name) + '</div>' +
            '<div class="detail-cast-role">' + window.Utils.escHtml(a.role) + '</div>' +
        '</div>';
    }
    
    html += '</div></div>';
    return html;
}

// ============================================================================
// GLOBAL FUNCTIONS
// ============================================================================

var closeDetailPage = function() {
    document.getElementById('detailPage').classList.remove('active');
    currentTVShowIdx = -1;
    currentSeasonIndex = 0;
};

async function copyMoviePath(idx) {
    var m = window.filteredMovies[idx];
    if (!m) return;
    try {
        var pathToCopy = m.fullPath || m.relativePath;
        await navigator.clipboard.writeText(pathToCopy);
        window.Utils.showToast('Path copied: ' + pathToCopy, 'success');
    } catch(e) {
        window.Utils.showToast('Failed to copy path', 'warning');
    }
}

// Play first episode of a TV show
window.playTVShowFirstEpisode = function(movieIdx) {
    var m = window.filteredMovies[movieIdx];
    if (!m || !m.isTVShow) return;
    
    // Find first season with episodes
    for (var si = 0; si < m.seasonFolders.length; si++) {
        var season = m.seasonFolders[si];
        if (season.episodes && season.episodes.length > 0) {
            window.VideoPlayer.playTVEpisode(movieIdx, si, 0);
            return;
        }
    }
    window.Utils.showToast('No episodes found to play', 'warning');
};

// Play specific TV episode
window.playTVEpisode = function(movieIdx, seasonIdx, episodeIdx) {
    window.VideoPlayer.playTVEpisode(movieIdx, seasonIdx, episodeIdx);
};

// Go to collection tab and show specific collection
window.goToCollection = function(setName) {
    closeDetailPage();
    
    if (!window.collectionsData || window.collectionsData.length === 0) {
        if (typeof window.Collections !== 'undefined' && window.Collections.renderCollections) {
            window.Collections.renderCollections();
        }
    }
    
    var collectionIdx = -1;
    if (window.collectionsData) {
        for (var i = 0; i < window.collectionsData.length; i++) {
            if (window.collectionsData[i].name === setName) {
                collectionIdx = i;
                break;
            }
        }
    }
