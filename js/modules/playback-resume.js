/**
 * Movie Library - Playback Resume Module
 * 
 * Saves and restores video playback positions using localStorage.
 * When a video is closed mid-playback, the position is saved.
 * When the same video is played again, a toast offers to resume.
 * 
 * localStorage key: movieLibPlaybackPositions
 * Format: { title: { position, duration, timestamp } }
 * Max 50 entries
 * 
 * @module PlaybackResume
 */

var PLAYBACK_POSITIONS_KEY = 'movieLibPlaybackPositions';
var MAX_SAVED_POSITIONS = 50;
var RESUME_THRESHOLD = 5; // Only offer resume if position > 5 seconds
var TIMEUPDATE_THROTTLE = 5000; // Save position every 5 seconds

/** Throttle timer for timeupdate saves */
var _lastSaveTime = 0;

/**
 * Get all saved playback positions from localStorage
 * @returns {Object} Map of title -> { position, duration, timestamp }
 */
window.getPlaybackPositions = function() {
    try {
        return JSON.parse(localStorage.getItem(PLAYBACK_POSITIONS_KEY)) || {};
    } catch(e) {
        return {};
    }
};

/**
 * Save playback positions to localStorage (with max limit)
 * @param {Object} positions - The positions object to save
 */
function savePlaybackPositions(positions) {
    // Enforce max limit: remove oldest entries first
    var keys = Object.keys(positions);
    if (keys.length > MAX_SAVED_POSITIONS) {
        // Sort by timestamp ascending (oldest first)
        keys.sort(function(a, b) {
            return (positions[a].timestamp || 0) - (positions[b].timestamp || 0);
        });
        // Remove oldest entries until we're at the limit
        while (keys.length > MAX_SAVED_POSITIONS) {
            var oldest = keys.shift();
            delete positions[oldest];
        }
    }
    try {
        localStorage.setItem(PLAYBACK_POSITIONS_KEY, JSON.stringify(positions));
    } catch(e) {
        console.error('[PlaybackResume] Error saving positions:', e);
    }
}

/**
 * Save the current playback position for a video
 * @param {string} title - Video title (used as key)
 * @param {number} position - Current playback position in seconds
 * @param {number} duration - Total video duration in seconds
 */
window.savePlaybackPosition = function(title, position, duration) {
    if (!title || position == null || !duration) return;
    var positions = window.getPlaybackPositions();
    positions[title] = {
        position: position,
        duration: duration,
        timestamp: Date.now()
    };
    savePlaybackPositions(positions);
};

/**
 * Get the saved playback position for a video
 * @param {string} title - Video title
 * @returns {Object|null} { position, duration, timestamp } or null if not found
 */
window.getPlaybackPosition = function(title) {
    if (!title) return null;
    var positions = window.getPlaybackPositions();
    return positions[title] || null;
};

/**
 * Remove saved playback position for a video (e.g., when it ends naturally)
 * @param {string} title - Video title
 */
window.clearPlaybackPosition = function(title) {
    if (!title) return;
    var positions = window.getPlaybackPositions();
    delete positions[title];
    savePlaybackPositions(positions);
};

/**
 * Format seconds to MM:SS or H:MM:SS display
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTimeDisplay(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    if (h > 0) {
        return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    return m + ':' + String(s).padStart(2, '0');
}

/**
 * Offer to resume playback for a video
 * Shows a toast with "Resume from XX:XX?" and a clickable Resume action
 * Also adds a small Resume button near the player controls
 * 
 * @param {string} title - Video title
 * @param {HTMLVideoElement} videoEl - The video element
 */
window.offerResumePlayback = function(title, videoEl) {
    var saved = window.getPlaybackPosition(title);
    if (!saved || !saved.position || saved.position <= RESUME_THRESHOLD) return;
    
    // Check if saved position is near the end (within last 5%) - don't offer resume
    if (saved.duration && saved.position > saved.duration * 0.95) {
        window.clearPlaybackPosition(title);
        return;
    }
    
    var timeStr = formatTimeDisplay(saved.position);
    var pctStr = saved.duration ? Math.round((saved.position / saved.duration) * 100) + '%' : '';
    
    // Show resume toast with clickable action
    if (typeof window.Utils !== 'undefined' && window.Utils.showToast) {
        window.Utils.showToast('Resume from ' + timeStr + '?', 'info', {
            action: 'Resume',
            onAction: function() {
                if (videoEl && videoEl.duration) {
                    videoEl.currentTime = saved.position;
                    videoEl.play().catch(function() {});
                    window.Utils.showToast('Resumed from ' + timeStr, 'success');
                }
            }
        });
    }
    
    // Also add a small Resume button in the player header
    addResumeButton(saved.position, timeStr, pctStr, videoEl);
};

/**
 * Add a small Resume button to the player header
 * @param {number} position - Saved position in seconds
 * @param {string} timeStr - Formatted time string
 * @param {string} pctStr - Percentage string
 * @param {HTMLVideoElement} videoEl - The video element
 */
function addResumeButton(position, timeStr, pctStr, videoEl) {
    // Remove existing resume button if present
    var existingBtn = document.getElementById('resumePlaybackBtn');
    if (existingBtn) existingBtn.remove();
    
    var playerHeader = document.querySelector('.player-header');
    if (!playerHeader) return;
    
    var resumeBtn = document.createElement('button');
    resumeBtn.id = 'resumePlaybackBtn';
    resumeBtn.className = 'player-control-btn resume-playback-btn';
    resumeBtn.title = 'Resume from ' + timeStr + ' (' + pctStr + ')';
    resumeBtn.innerHTML = 
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M1 4v6h6"/>' +
            '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>' +
        '</svg>' +
        '<span>Resume ' + timeStr + '</span>';
    
    resumeBtn.addEventListener('click', function() {
        if (videoEl && videoEl.duration) {
            videoEl.currentTime = position;
            videoEl.play().catch(function() {});
            if (typeof window.Utils !== 'undefined' && window.Utils.showToast) {
                window.Utils.showToast('Resumed from ' + timeStr, 'success');
            }
        }
        resumeBtn.remove();
    });
    
    // Insert after the title but before controls
    var playerControls = playerHeader.querySelector('.player-controls');
    if (playerControls) {
        playerHeader.insertBefore(resumeBtn, playerControls);
    } else {
        playerHeader.appendChild(resumeBtn);
    }
    
    // Auto-remove the button after 10 seconds if not clicked
    setTimeout(function() {
        if (resumeBtn && resumeBtn.parentElement) {
            resumeBtn.remove();
        }
    }, 10000);
}

/**
 * Remove the resume button from the player
 */
function removeResumeButton() {
    var btn = document.getElementById('resumePlaybackBtn');
    if (btn) btn.remove();
}

/**
 * Set up the timeupdate and ended listeners on a video element for playback resume
 * Should be called after the video source is set
 * 
 * @param {HTMLVideoElement} videoEl - The video element
 * @param {string} title - Video title for storage key
 */
window.setupPlaybackResumeListeners = function(videoEl, title) {
    if (!videoEl || !title) return;
    
    // Remove existing listeners from a previous call to prevent accumulation
    if (videoEl._playbackResumeListeners) {
        var old = videoEl._playbackResumeListeners;
        videoEl.removeEventListener('timeupdate', old.onTimeUpdate);
        videoEl.removeEventListener('ended', old.onEnded);
        videoEl.removeEventListener('pause', old.onPause);
    }
    
    // Throttled timeupdate handler - saves position every 5 seconds
    var onTimeUpdate = function() {
        var now = Date.now();
        if (now - _lastSaveTime < TIMEUPDATE_THROTTLE) return;
        _lastSaveTime = now;
        
        if (videoEl.currentTime != null && videoEl.duration && !isNaN(videoEl.duration)) {
            window.savePlaybackPosition(title, videoEl.currentTime, videoEl.duration);
        }
    };
    
    // When video ends naturally, clear the saved position
    var onEnded = function() {
        window.clearPlaybackPosition(title);
        removeResumeButton();
    };
    
    // When video is paused, also save position immediately
    var onPause = function() {
        if (videoEl.currentTime != null && videoEl.duration) {
            window.savePlaybackPosition(title, videoEl.currentTime, videoEl.duration);
        }
    };
    
    // Store listener references for future cleanup
    videoEl._playbackResumeListeners = {
        onTimeUpdate: onTimeUpdate,
        onEnded: onEnded,
        onPause: onPause
    };
    
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('ended', onEnded);
    videoEl.addEventListener('pause', onPause);
};

// Expose PlaybackResume namespace
window.PlaybackResume = {
    getPositions: window.getPlaybackPositions,
    savePosition: window.savePlaybackPosition,
    getPosition: window.getPlaybackPosition,
    clearPosition: window.clearPlaybackPosition,
    offerResume: window.offerResumePlayback,
    setupListeners: window.setupPlaybackResumeListeners
};

/**
 * Resume playback for a movie by title
 * Finds the movie in allMovies, sets filteredMovies, and calls VideoPlayer.playMovie
 * The video player already resumes from the saved position via offerResumePlayback
 * @param {string} title - Movie title to resume
 */
window.resumePlayback = function(title) {
    if (!title || !window.allMovies) return;
    var m = window.allMovies.find(function(item) { return item.title === title; });
    if (!m) return;
    window.filteredMovies = window.allMovies;
    var filteredIdx = window.filteredMovies.indexOf(m);
    if (filteredIdx === -1) return;
    if (m.isTVShow && typeof window.playTVShowFirstEpisode === 'function') {
        window.playTVShowFirstEpisode(filteredIdx);
    } else if (window.VideoPlayer && typeof window.VideoPlayer.playMovie === 'function') {
        window.VideoPlayer.playMovie(filteredIdx);
    }
};
