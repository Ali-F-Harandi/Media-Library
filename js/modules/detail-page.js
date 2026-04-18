// Movie Library - Detail Page Module
// Handles the movie detail page display and interactions

async function showDetailPage(idx) {
    var m = window.filteredMovies[idx];
    if (!m) return;

    // Load poster
    if (!m.posterUrl && m.posterHandle) {
        try {
            var f = await m.posterHandle.getFile();
            m.posterUrl = URL.createObjectURL(f);
        } catch(e) {}
    }

    // Load fanart
    var fanartSrc = '';
    if (m.fanartHandle) {
        if (!m.fanartUrl) {
            try {
                var ff = await m.fanartHandle.getFile();
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
            (m.posterUrl ? '<img src="' + m.posterUrl + '">' : '') +
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

    html += '<div class="detail-section">' +
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

    // Technical specs
    if (nfo.videoCodec || nfo.audioCodec) {
        html += '<div class="detail-section">' +
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
    }

    // Tags
    if (nfo.tags && nfo.tags.length) {
        html += '<div class="detail-section">' +
            '<div class="detail-section-title">Tags</div>' +
            '<div class="detail-tags">' +
                nfo.tags.map(function(t) {
                    return '<span class="detail-tag-sm">' + window.Utils.escHtml(t) + '</span>';
                }).join('') +
            '</div>' +
        '</div>';
    }

    // Cast
    if (nfo.actors && nfo.actors.length) {
        html += '<div class="detail-section">' +
            '<div class="detail-section-title">Cast</div>' +
            '<div class="detail-cast-scroll">' +
                nfo.actors.map(function(a) {
                    return '<div class="detail-cast-card">' +
                        '<div class="detail-cast-avatar">' +
                            (a.thumb ?
                                '<img src="' + window.Utils.escHtml(a.thumb) + '" onerror="this.parentElement.innerHTML=\'&#127917;\'">' :
                                '&#127917;') +
                        '</div>' +
                        '<div class="detail-cast-name">' + window.Utils.escHtml(a.name) + '</div>' +
                        '<div class="detail-cast-role">' + window.Utils.escHtml(a.role) + '</div>' +
                    '</div>';
                }).join('') +
            '</div>' +
        '</div>';
    }

    body.innerHTML = html;

    var page = document.getElementById('detailPage');
    page.scrollTop = 0;
    requestAnimationFrame(function() {
        page.classList.add('active');
    });
}

function closeDetailPage() {
    document.getElementById('detailPage').classList.remove('active');
}

async function copyMoviePath(idx) {
    var m = window.filteredMovies[idx];
    if (!m) return;
    try {
        await navigator.clipboard.writeText(m.relativePath);
        window.Utils.showToast('Path copied to clipboard', 'success');
    } catch(e) {
        window.Utils.showToast('Failed to copy path', 'warning');
    }
}

// Go to collection tab and show specific collection
window.goToCollection = function(setName) {
    console.log('[Collections Debug] goToCollection called with setName:', setName);
    
    // Close detail page first
    closeDetailPage();
    
    // Find the collection in collectionsData
    if (!window.collectionsData || window.collectionsData.length === 0) {
        // Extract collections if not already done
        if (typeof window.Collections !== 'undefined' && window.Collections.renderCollections) {
            console.log('[Collections Debug] Extracting collections...');
            window.Collections.renderCollections();
        }
    }
    
    console.log('[Collections Debug] collectionsData length:', window.collectionsData ? window.collectionsData.length : 0);
    
    // Find collection index by name
    var collectionIdx = -1;
    if (window.collectionsData) {
        for (var i = 0; i < window.collectionsData.length; i++) {
            console.log('[Collections Debug] Checking collection', i, ':', window.collectionsData[i].name);
            if (window.collectionsData[i].name === setName) {
                collectionIdx = i;
                console.log('[Collections Debug] Found collection at index:', collectionIdx);
                break;
            }
        }
    }
    
    if (collectionIdx === -1) {
        console.error('[Collections Debug] Collection not found:', setName);
        window.Utils.showToast('Collection not found', 'warning');
        return;
    }
    
    // Switch to collections tab and show the collection
    setTimeout(function() {
        console.log('[Collections Debug] Calling switchTab and showCollectionDetail');
        if (typeof window.Collections !== 'undefined' && window.Collections.showCollectionDetail) {
            window.switchTab('collections');
            window.Collections.showCollectionDetail(collectionIdx);
        } else {
            console.error('[Collections Debug] Collections module not loaded or showCollectionDetail not available');
            window.Utils.showToast('Collections module not loaded', 'warning');
        }
    }, 300);
};

// Export for use in other modules
window.DetailPage = { showDetailPage, closeDetailPage, copyMoviePath, goToCollection };
