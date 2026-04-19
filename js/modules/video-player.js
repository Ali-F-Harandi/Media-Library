/**
 * Movie Library - Professional Video Player Module (v3.0)
 * 
 * Advanced HTML5 video player with professional features:
 * - Multi-audio track support (switch between different languages/commentary tracks)
 * - Multi-subtitle support (embedded + external SRT/VTT/ASS files)
 * - Subtitle delay adjustment (sync subtitles that are early/late)
 * - Subtitle font size control (Small/Medium/Large) with localStorage persistence
 * - Audio track fallback for Chrome (shows info message when API unavailable)
 * - Playback speed control (0.5x to 2x)
 * - Picture-in-Picture (PiP) mode
 * - Fullscreen support
 * - Resume playback from last position
 * - Real-time display with auto-hide controls
 * - SRT to VTT conversion for browser compatibility
 * - Language auto-detection from filenames
 * - Keyboard shortcuts for quick access (C/A/F/M/Shift+arrows)
 * - Subtitle file drag-and-drop support
 * 
 * Requirements: Chrome/Edge for File System Access API & audioTracks support
 * 
 * @module VideoPlayer
 * @version 3.0
 * @author Movie Library Team
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/** Current movie index being played (-1 when nothing is playing) */
var currentMovieIndex = -1;

/** Object URL for the currently loaded video file (for memory cleanup) */
var currentVideoUrl = null;

/** Array of external subtitle file handles found in movie folder */
var externalSubtitleFiles = [];

/** Auto-hide timer for control bar (prevents UI clutter during playback) */
var controlBarInterval = null;

/** Cache for converted subtitle data to avoid re-processing */
var loadedSubtitleFiles = new Map();

// ============================================================================
// SUBTITLE DELAY & SIZE STATE
// ============================================================================

/** Current subtitle delay offset in seconds (positive = subtitles appear later) */
var subtitleDelayOffset = 0;

/** Original VTT content before delay adjustment (for re-applying delay) */
var originalSubtitleVtt = null;

/** Current subtitle track label for re-applying delay */
var currentSubtitleLabel = '';

/** Current subtitle srclang for re-applying delay */
var currentSubtitleSrclang = '';

/** LocalStorage key for persisting preferred subtitle size */
var SUBTITLE_SIZE_KEY = 'movieLibSubtitleSize';

/** Available subtitle size options */
var subtitleSizeOptions = ['small', 'medium', 'large'];

/** Current subtitle size index (default 1 = medium) */
var currentSubtitleSizeIndex = 1;

/** Dynamically injected style element for ::cue font size */
var subtitleCueStyleEl = null;

// Load saved subtitle size on module load
(function initSubtitleSize() {
    var saved = localStorage.getItem(SUBTITLE_SIZE_KEY);
    if (saved) {
        var idx = subtitleSizeOptions.indexOf(saved);
        if (idx !== -1) {
            currentSubtitleSizeIndex = idx;
        }
    }
    // Apply saved size
    applySubtitleSize(subtitleSizeOptions[currentSubtitleSizeIndex]);
})();

/** Whether audio tracks are available in this browser */
var audioTracksAvailable = false;

// ============================================================================
// PLAYBACK SPEED CONTROL
// ============================================================================

/** LocalStorage key for persisting preferred playback speed */
var SPEED_KEY = 'movieLibPlaybackSpeed';

/** Available playback speed options */
var playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Current playback speed index in the speeds array */
var currentSpeedIndex = 2; // Default 1x

// Load saved speed on module load
(function initPlaybackSpeed() {
    var saved = localStorage.getItem(SPEED_KEY);
    if (saved) {
        var speed = parseFloat(saved);
        var idx = playbackSpeeds.indexOf(speed);
        if (idx !== -1) {
            currentSpeedIndex = idx;
        }
    }
})();

/**
 * Cycle to the next playback speed
 * Saves preference to localStorage and applies to video element
 */
window.cyclePlaybackSpeed = function() {
    currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
    var speed = playbackSpeeds[currentSpeedIndex];
    localStorage.setItem(SPEED_KEY, speed.toString());

    // Apply to video element
    var video = document.getElementById('videoPlayer');
    if (video) {
        video.playbackRate = speed;
    }

    // Update button text
    var btn = document.getElementById('speedControlBtn');
    if (btn) {
        btn.textContent = speed + 'x';
        btn.classList.toggle('active', speed !== 1);
    }

    window.Utils.showToast('Speed: ' + speed + 'x', 'info');
};

/**
 * Apply the saved playback speed to a video element
 * Called when a new video starts playing
 */
function applySavedSpeed(video) {
    if (!video) return;
    var speed = playbackSpeeds[currentSpeedIndex];
    video.playbackRate = speed;

    // Update button text
    var btn = document.getElementById('speedControlBtn');
    if (btn) {
        btn.textContent = speed + 'x';
        btn.classList.toggle('active', speed !== 1);
    }
}

// ============================================================================
// TV SHOW PLAYBACK STATE
// ============================================================================

/** Whether we're currently playing a TV episode (vs a movie) */
var isPlayingTVShow = false;

/** Current TV show movie index in filteredMovies */
var currentTVShowMovieIdx = -1;

/** Current season index within the TV show's seasonFolders array */
var currentTVSeasonIdx = -1;

/** Current episode index within the season's episodes array */
var currentTVEpisodeIdx = -1;

// ============================================================================
// SUBTITLE UTILITIES
// ============================================================================

/**
 * Convert SRT subtitle format to WebVTT format
 * Browsers natively support VTT but not SRT, so conversion is needed
 * Handles timestamp format conversion (comma to period) and adds WEBVTT header
 * 
 * @param {string} srtText - Raw SRT subtitle content
 * @returns {string} Converted VTT subtitle content
 * @example
 * // Input: "1\n00:00:01,000 --> 00:00:04,000\nHello World"
 * // Output: "WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHello World"
 */
function convertSrtToVtt(srtText) {
    return 'WEBVTT\n\n' + srtText
        .replace(/\r\n/g, '\n')      // Normalize line endings (Windows -> Unix)
        .replace(/\r/g, '\n')         // Normalize line endings (Mac -> Unix)
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')  // Convert timestamps: comma -> period
        .replace(/\n\n+/g, '\n\n')    // Normalize multiple blank lines to single
        .trim();                      // Remove leading/trailing whitespace
}

/**
 * Extract language name from subtitle filename
 * Detects language codes (en, eng, es, spa, etc.) and returns human-readable name
 * Supports ISO 639-1 (2-letter) and ISO 639-2 (3-letter) language codes
 * 
 * @param {string} filename - Subtitle filename (e.g., "movie.eng.srt")
 * @returns {string} Human-readable language name (e.g., "English")
 */
function extractLanguageFromFilename(filename) {
    const langPatterns = [
        /\.([a-z]{2,3})\.(?:srt|vtt|ass|ssa|sub)$/i,  // Match: .en.srt, .eng.vtt
        /\.([a-z]{2,3})$/i                              // Match: .en, .eng (at end)
    ];
    
    for (const pattern of langPatterns) {
        const match = filename.match(pattern);
        if (match) {
            const langCode = match[1].toLowerCase();
            const langNames = {
                'en': 'English', 'eng': 'English',
                'es': 'Spanish', 'spa': 'Spanish',
                'fr': 'French', 'fra': 'French',
                'de': 'German', 'deu': 'German',
                'it': 'Italian', 'ita': 'Italian',
                'pt': 'Portuguese', 'por': 'Portuguese',
                'ru': 'Russian', 'rus': 'Russian',
                'ja': 'Japanese', 'jpn': 'Japanese',
                'ko': 'Korean', 'kor': 'Korean',
                'zh': 'Chinese', 'chi': 'Chinese',
                'ar': 'Arabic', 'ara': 'Arabic',
                'hi': 'Hindi', 'hin': 'Hindi',
                'th': 'Thai', 'tha': 'Thai',
                'vi': 'Vietnamese', 'vie': 'Vietnamese',
                'pl': 'Polish', 'pol': 'Polish',
                'nl': 'Dutch', 'dut': 'Dutch',
                'sv': 'Swedish', 'swe': 'Swedish',
                'no': 'Norwegian', 'nor': 'Norwegian',
                'da': 'Danish', 'dan': 'Danish',
                'fi': 'Finnish', 'fin': 'Finnish',
                'tr': 'Turkish', 'tur': 'Turkish'
            };
            return langNames[langCode] || langCode.toUpperCase();
        }
    }
    
    // Fallback: use filename without extension
    return filename.replace(/\.[^.]+$/, '');
}

// ============================================================================
// SUBTITLE DELAY ADJUSTMENT
// ============================================================================

/**
 * Apply a time delay offset to VTT subtitle timestamps
 * Adjusts all timestamp pairs by the specified number of seconds
 * 
 * @param {string} vttContent - VTT subtitle content with WEBVTT header
 * @param {number} delaySeconds - Delay in seconds (positive = later, negative = earlier)
 * @returns {string} VTT content with adjusted timestamps
 */
function applySubtitleDelay(vttContent, delaySeconds) {
    return vttContent.replace(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/g, function(match, h, m, s, ms) {
        var totalMs = (parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10)) * 1000 + parseInt(ms, 10);
        totalMs += delaySeconds * 1000;
        if (totalMs < 0) totalMs = 0;
        var newH = Math.floor(totalMs / 3600000);
        var newM = Math.floor((totalMs % 3600000) / 60000);
        var newS = Math.floor((totalMs % 60000) / 1000);
        var newMs = Math.round(totalMs % 1000);
        return String(newH).padStart(2, '0') + ':' + 
               String(newM).padStart(2, '0') + ':' + 
               String(newS).padStart(2, '0') + '.' + 
               String(newMs).padStart(3, '0');
    });
}

/**
 * Adjust subtitle delay and re-apply to the current subtitle track
 * Called from the UI buttons (+/- 0.5s) and keyboard shortcuts
 * 
 * @param {number} seconds - Number of seconds to adjust (typically ±0.5)
 */
window.adjustSubtitleDelay = function(seconds) {
    subtitleDelayOffset += seconds;
    subtitleDelayOffset = Math.round(subtitleDelayOffset * 10) / 10; // Avoid floating point drift
    
    // Update delay display in menu
    var delayDisplay = document.getElementById('subtitleDelayValue');
    if (delayDisplay) {
        var sign = subtitleDelayOffset >= 0 ? '+' : '';
        delayDisplay.textContent = sign + subtitleDelayOffset.toFixed(1) + 's';
    }
    
    // Re-apply subtitle with new delay if we have original content
    if (originalSubtitleVtt) {
        var delayedVtt = applySubtitleDelay(originalSubtitleVtt, subtitleDelayOffset);
        var video = document.getElementById('videoPlayer');
        if (video) {
            // Remove existing track elements
            while (video.firstChild && video.firstChild.tagName === 'TRACK') {
                video.removeChild(video.firstChild);
            }
            
            var blob = new Blob([delayedVtt], { type: 'text/vtt' });
            var url = URL.createObjectURL(blob);
            var track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = currentSubtitleLabel;
            track.srclang = currentSubtitleSrclang;
            track.src = url;
            track.default = true;
            video.appendChild(track);
            
            track.addEventListener('load', function() {
                var tracks = video.textTracks;
                for (var i = 0; i < tracks.length; i++) {
                    tracks[i].mode = tracks[i] === track ? 'showing' : 'disabled';
                }
            });
        }
    }
    
    var sign = subtitleDelayOffset >= 0 ? '+' : '';
    showPlayerToast('Subtitle Delay: ' + sign + subtitleDelayOffset.toFixed(1) + 's');
};

// ============================================================================
// SUBTITLE FONT SIZE CONTROL
// ============================================================================

/**
 * Apply subtitle font size via a dynamically injected style element
 * Uses the ::cue CSS selector to control text track rendering
 * 
 * @param {string} size - Size option: 'small', 'medium', or 'large'
 */
function applySubtitleSize(size) {
    if (!subtitleCueStyleEl) {
        subtitleCueStyleEl = document.createElement('style');
        subtitleCueStyleEl.id = 'subtitleCueStyle';
        document.head.appendChild(subtitleCueStyleEl);
    }
    
    var fontSizes = {
        'small': '0.8em',
        'medium': '1.2em',
        'large': '1.8em'
    };
    
    var fontSize = fontSizes[size] || fontSizes['medium'];
    subtitleCueStyleEl.textContent = 'video::cue { font-size: ' + fontSize + '; }';
    
    // Update indicator in player header
    var indicator = document.getElementById('subtitleSizeIndicator');
    if (indicator) {
        indicator.textContent = size.charAt(0).toUpperCase() + size.slice(1);
    }
    
    // Update active state in dropdown
    var items = document.querySelectorAll('.subtitle-size-btn');
    items.forEach(function(item) {
        item.classList.toggle('active', item.dataset.size === size);
    });
}

/**
 * Set subtitle size, persist to localStorage, and apply
 * 
 * @param {string} size - Size option: 'small', 'medium', or 'large'
 */
window.setSubtitleSize = function(size) {
    var idx = subtitleSizeOptions.indexOf(size);
    if (idx !== -1) {
        currentSubtitleSizeIndex = idx;
        localStorage.setItem(SUBTITLE_SIZE_KEY, size);
        applySubtitleSize(size);
        showPlayerToast('Subtitle Size: ' + size.charAt(0).toUpperCase() + size.slice(1));
    }
};

// ============================================================================
// PLAYER TOAST (for keyboard shortcut hints)
// ============================================================================

/**
 * Show a brief toast notification specific to the player
 * Uses the global Utils.showToast if available, otherwise creates a fallback
 * 
 * @param {string} message - Message to display
 */
function showPlayerToast(message) {
    if (window.Utils && typeof window.Utils.showToast === 'function') {
        window.Utils.showToast(message, 'info');
    }
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Setup keyboard shortcuts for the video player
 * Only active when the player modal is visible
 * Shortcuts: C=subtitle cycle, A=audio cycle, F=fullscreen, M=mute
 *            Shift+Left/Right=seek ±30s, Shift+Up/Down=subtitle delay ±0.5s
 */
function setupPlayerKeyboardShortcuts() {
    // Remove existing listener to avoid duplicates
    document.removeEventListener('keydown', playerKeydownHandler);
    document.addEventListener('keydown', playerKeydownHandler);
}

/**
 * Global keydown handler for player keyboard shortcuts
 * Checks if player modal is active before processing shortcuts
 */
function playerKeydownHandler(e) {
    var modal = document.getElementById('playerModal');
    if (!modal || !modal.classList.contains('active')) return;
    
    // Don't intercept when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    var video = document.getElementById('videoPlayer');
    if (!video) return;
    
    var key = e.key;
    
    if (key === 'c' || key === 'C') {
        e.preventDefault();
        cycleSubtitles();
    } else if (key === 'a' || key === 'A') {
        e.preventDefault();
        cycleAudioTracks();
    } else if (key === 'f' || key === 'F') {
        e.preventDefault();
        togglePlayerFullscreen();
    } else if (key === 'm' || key === 'M') {
        e.preventDefault();
        togglePlayerMute();
    } else if (key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 30);
        showPlayerToast('-30s');
    } else if (key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 30);
        showPlayerToast('+30s');
    } else if (key === 'ArrowUp' && e.shiftKey) {
        e.preventDefault();
        window.adjustSubtitleDelay(-0.5);
    } else if (key === 'ArrowDown' && e.shiftKey) {
        e.preventDefault();
        window.adjustSubtitleDelay(0.5);
    }
}

/**
 * Cycle through available subtitles then off
 * Pressing C repeatedly cycles: subtitle1 -> subtitle2 -> ... -> off -> subtitle1
 */
function cycleSubtitles() {
    var video = document.getElementById('videoPlayer');
    if (!video) return;
    
    var tracks = video.textTracks;
    var subtitleTracks = [];
    
    for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].kind === 'subtitles') {
            subtitleTracks.push(i);
        }
    }
    
    if (subtitleTracks.length === 0) {
        showPlayerToast('No subtitles available');
        return;
    }
    
    // Find current active subtitle track
    var activeIdx = -1;
    for (var j = 0; j < subtitleTracks.length; j++) {
        if (tracks[subtitleTracks[j]].mode === 'showing') {
            activeIdx = j;
            break;
        }
    }
    
    // Cycle to next subtitle, or turn off if at the end
    var nextIdx = activeIdx + 1;
    if (nextIdx >= subtitleTracks.length) {
        // Turn off all subtitles
        for (var k = 0; k < tracks.length; k++) {
            tracks[k].mode = 'disabled';
        }
        showPlayerToast('Subtitles: Off');
    } else {
        // Disable all, then enable the next one
        for (var k = 0; k < tracks.length; k++) {
            tracks[k].mode = 'disabled';
        }
        tracks[subtitleTracks[nextIdx]].mode = 'showing';
        var label = tracks[subtitleTracks[nextIdx]].label || ('Track ' + (nextIdx + 1));
        showPlayerToast('Subtitles: ' + label);
    }
}

/**
 * Cycle through available audio tracks
 */
function cycleAudioTracks() {
    var video = window.currentVideoElement || document.getElementById('videoPlayer');
    if (!video || !video.audioTracks) {
        showPlayerToast('Audio tracks not available in this browser');
        return;
    }
    
    var audioTracks = video.audioTracks;
    if (audioTracks.length <= 1) {
        showPlayerToast('Only one audio track available');
        return;
    }
    
    // Find current enabled track
    var currentIdx = 0;
    for (var i = 0; i < audioTracks.length; i++) {
        if (audioTracks[i].enabled) {
            currentIdx = i;
            break;
        }
    }
    
    // Cycle to next track
    var nextIdx = (currentIdx + 1) % audioTracks.length;
    for (var j = 0; j < audioTracks.length; j++) {
        audioTracks[j].enabled = (j === nextIdx);
    }
    
    // Update UI
    var items = document.querySelectorAll('#audioList .player-dropdown-item');
    items.forEach(function(item, idx) {
        item.classList.toggle('active', idx === nextIdx);
    });
    
    var trackName = audioTracks[nextIdx].label || audioTracks[nextIdx].language || 'Track ' + (nextIdx + 1);
    showPlayerToast('Audio: ' + trackName);
}

/**
 * Toggle fullscreen mode for the player
 */
function togglePlayerFullscreen() {
    var container = document.querySelector('.player-container');
    if (!container) return;
    
    if (document.fullscreenElement) {
        document.exitFullscreen();
        showPlayerToast('Exit Fullscreen');
    } else {
        container.requestFullscreen().catch(function() {});
        showPlayerToast('Fullscreen');
    }
}

/**
 * Toggle mute on the video player
 */
function togglePlayerMute() {
    var video = document.getElementById('videoPlayer');
    if (!video) return;
    
    video.muted = !video.muted;
    showPlayerToast(video.muted ? 'Muted' : 'Unmuted');
}

// ============================================================================
// SUBTITLE DRAG-AND-DROP
// ============================================================================

/**
 * Setup drag-and-drop event listeners on the player modal
 * Allows dropping .srt and .vtt files to load as subtitles
 */
function setupSubtitleDragDrop() {
    var modal = document.getElementById('playerModal');
    if (!modal) return;
    
    // Remove existing listeners to avoid duplicates
    modal.removeEventListener('dragover', handleDragOver);
    modal.removeEventListener('dragleave', handleDragLeave);
    modal.removeEventListener('drop', handleSubtitleDrop);
    
    modal.addEventListener('dragover', handleDragOver);
    modal.addEventListener('dragleave', handleDragLeave);
    modal.addEventListener('drop', handleSubtitleDrop);
}

/**
 * Handle dragover event - prevent default and show visual indicator
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    var modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.add('subtitle-drag-over');
    }
}

/**
 * Handle dragleave event - remove visual indicator
 */
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    var modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.remove('subtitle-drag-over');
    }
}

/**
 * Handle drop event - read dropped subtitle file and load it
 */
function handleSubtitleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    var modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.remove('subtitle-drag-over');
    }
    
    var files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    var file = files[0];
    var lowerName = file.name.toLowerCase();
    
    // Check if it's a subtitle file
    var validExts = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
    var isSubtitle = validExts.some(function(ext) { return lowerName.endsWith(ext); });
    
    if (!isSubtitle) {
        showPlayerToast('Please drop a subtitle file (.srt, .vtt, .ass, .ssa, .sub)');
        return;
    }
    
    handleSubtitleFileLoad(file);
}

/**
 * Load a subtitle file (from drag-drop or file picker) into the video player
 * 
 * @param {File} file - The subtitle file to load
 */
async function handleSubtitleFileLoad(file) {
    try {
        var content = await file.text();
        var lang = extractLanguageFromFilename(file.name);
        
        // Convert if needed
        var lowerName = file.name.toLowerCase();
        var blobContent = content;
        if (lowerName.endsWith('.srt')) {
            blobContent = convertSrtToVtt(content);
        } else if (lowerName.endsWith('.ass') || lowerName.endsWith('.ssa')) {
            showPlayerToast('ASS/SSA subtitles may not display correctly');
            blobContent = convertSrtToVtt(content);
        }
        
        // Store original VTT for delay adjustment
        originalSubtitleVtt = blobContent;
        currentSubtitleLabel = lang;
        currentSubtitleSrclang = lang.toLowerCase().split(' ')[0].toLowerCase();
        
        // Apply delay if set
        if (subtitleDelayOffset !== 0) {
            blobContent = applySubtitleDelay(blobContent, subtitleDelayOffset);
        }
        
        // Apply to video
        var video = document.getElementById('videoPlayer');
        while (video.firstChild && video.firstChild.tagName === 'TRACK') {
            video.removeChild(video.firstChild);
        }
        
        var blob = new Blob([blobContent], { type: 'text/vtt' });
        var url = URL.createObjectURL(blob);
        var track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = currentSubtitleLabel;
        track.srclang = currentSubtitleSrclang;
        track.src = url;
        track.default = true;
        video.appendChild(track);
        
        track.addEventListener('load', function() {
            var tracks = video.textTracks;
            for (var i = 0; i < tracks.length; i++) {
                tracks[i].mode = (tracks[i] === track.track) ? 'showing' : 'disabled';
            }
        });
        
        showPlayerToast('Loaded subtitle: ' + lang);
    } catch(e) {
        console.error('[VideoPlayer Debug] Error loading dropped subtitle:', e);
        showPlayerToast('Failed to load subtitle: ' + e.message);
    }
}

// ============================================================================
// CORE PLAYER FUNCTIONS
// ============================================================================

/**
 * Play a movie from the filtered movies list
 * Opens the video file using File System Access API and initializes the web player
 * with all professional features (subtitles, audio tracks, resume position)
 * 
 * @param {number} idx - Index of the movie in window.filteredMovies array
 * @returns {Promise<void>}
 * @throws {Error} If file handle is unavailable or video fails to load
 */
async function playMovie(idx) {
    console.log('[VideoPlayer Debug] playMovie called with index:', idx);
    
    // Validate index bounds
    if (idx < 0 || idx >= window.filteredMovies.length) {
        console.error('[VideoPlayer Debug] Invalid index:', idx);
        return;
    }

    currentMovieIndex = idx;
    var m = window.filteredMovies[idx];
    
    console.log('[VideoPlayer Debug] Playing movie:', m.title, 'handle:', m.videoHandle);

    try {
        // Check if video handle is available (File System Access API)
        if (m.videoHandle && typeof m.videoHandle.getFile === 'function') {
            console.log('[VideoPlayer Debug] Opening file in web player...');
            
            // Get the actual file object from the handle
            const file = await m.videoHandle.getFile();
            
            // Clean up previous video URL to free memory
            if (currentVideoUrl) {
                URL.revokeObjectURL(currentVideoUrl);
            }
            
            // Create object URL for the video file (allows browser to play local file)
            currentVideoUrl = URL.createObjectURL(file);
            
            // Initialize and display the web player modal
            setupWebPlayer(m, currentVideoUrl);
            
            console.log('[VideoPlayer Debug] Web player initialized');
            window.Utils.showToast('Playing ' + m.title, 'success');
            
            // Record watch history
            if (typeof window.recordWatch === 'function') {
                window.recordWatch(m.title, 'movie', { year: m.year, quality: m.quality });
            }
            
            // Offer to resume from saved position
            if (typeof window.offerResumePlayback === 'function') {
                var resumeVideo = document.getElementById('videoPlayer');
                if (resumeVideo) {
                    window.offerResumePlayback(m.title, resumeVideo);
                }
            }
        } else {
            // Handle case where file handle is not available (permission issue)
            console.error('[VideoPlayer Debug] videoHandle or getFile method not available');
            window.Utils.showToast('Cannot open file: File handle not available', 'warning');
        }
    } catch(e) {
        // Catch any errors during file access or player initialization
        console.error('[VideoPlayer Debug] Error opening movie:', e);
        window.Utils.showToast('Error opening video: ' + e.message, 'warning');
    }
}

/**
 * Setup and display the web player modal with video
 * Initializes video source, loads subtitles, and checks for multiple audio tracks
 * 
 * @param {Object} movie - Movie object containing metadata
 * @param {string} videoUrl - Object URL for the video file
 */
async function setupWebPlayer(movie, videoUrl) {
    // Get DOM elements for player modal, video element, and title display
    const modal = document.getElementById('playerModal');
    const video = document.getElementById('videoPlayer');
    const title = document.getElementById('playerTitle');
    
    // Set the movie title with year in the player header
    title.textContent = movie.title + ' (' + movie.year + ')';
    
    // Load video source into the HTML5 video element
    video.src = videoUrl;
    video.load();
    
    // Show the player modal by adding active class
    modal.classList.add('active');
    
    // Reset subtitle delay for new video
    subtitleDelayOffset = 0;
    originalSubtitleVtt = null;
    
    // Ensure audio button is always visible
    ensureAudioButtonExists();
    
    // Scan folder and load available subtitle files
    await loadSubtitlesForMovie(movie, video);
    
    // Setup playback resume listeners (timeupdate, ended, pause)
    if (typeof window.setupPlaybackResumeListeners === 'function') {
        window.setupPlaybackResumeListeners(video, movie.title);
    }
    
    // Setup drag-and-drop for subtitles
    setupSubtitleDragDrop();
    
    // Setup keyboard shortcuts
    setupPlayerKeyboardShortcuts();
    
    // Setup event listeners for video lifecycle events
    video.onloadedmetadata = function() {
        console.log('[VideoPlayer Debug] Video loaded, duration:', video.duration);
        
        // Check if video has multiple audio tracks (e.g., different languages)
        checkAudioTracks(video);
        
        // Auto-play the video (may be prevented by browser autoplay policies)
        video.play().catch(e => console.log('[VideoPlayer Debug] Auto-play prevented:', e));
        
        // Apply saved playback speed
        applySavedSpeed(video);
    };
    
    // Handle video loading errors
    video.onerror = function(e) {
        console.error('[VideoPlayer Debug] Video error:', e);
        window.Utils.showToast('Error loading video', 'warning');
    };
}

/**
 * Ensure the audio track button always exists in the player header
 * Creates it with a dimmed state if audio tracks API is not available
 */
function ensureAudioButtonExists() {
    var menuContainer = document.getElementById('audioMenuContainer');
    if (menuContainer) return; // Already exists
    
    var playerHeader = document.querySelector('.player-header');
    if (!playerHeader) return;
    
    menuContainer = document.createElement('div');
    menuContainer.id = 'audioMenuContainer';
    menuContainer.className = 'player-subtitle-menu';
    menuContainer.innerHTML = 
        '<div class="player-control-group">' +
            '<button class="player-control-btn" id="audioBtn" onclick="toggleAudioMenu()">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
                    '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
                '</svg>' +
                '<span>Audio</span>' +
            '</button>' +
            '<div class="player-dropdown" id="audioDropdown">' +
                '<div id="audioList"></div>' +
            '</div>' +
        '</div>';
    playerHeader.appendChild(menuContainer);
    
    // Check audioTracks API availability and set initial state
    var video = document.getElementById('videoPlayer');
    if (!video || !video.audioTracks) {
        // Audio tracks not available - show dimmed button with info message
        audioTracksAvailable = false;
        var btn = document.getElementById('audioBtn');
        if (btn) btn.classList.add('disabled');
        var list = document.getElementById('audioList');
        if (list) {
            list.innerHTML = '<div class="player-dropdown-info">Audio track switching not supported in this browser. Try Safari or Edge.</div>';
        }
    } else {
        audioTracksAvailable = true;
    }
    
    // Update audio track indicator
    updateAudioTrackIndicator();
}

/**
 * Update the audio track indicator in the player header
 */
function updateAudioTrackIndicator() {
    var indicator = document.getElementById('audioTrackIndicator');
    if (!indicator) return;
    
    var video = window.currentVideoElement || document.getElementById('videoPlayer');
    if (video && video.audioTracks && video.audioTracks.length > 1) {
        indicator.textContent = video.audioTracks.length + ' tracks';
    } else if (video && video.audioTracks) {
        indicator.textContent = '1 track';
    } else {
        indicator.textContent = 'N/A';
    }
}

/**
 * Check if video has multiple audio tracks and update UI accordingly
 * Waits 500ms for audio tracks to be fully loaded by the browser
 * 
 * @param {HTMLVideoElement} video - The video element to check
 */
function checkAudioTracks(video) {
    // Wait a bit for tracks to be available (browser needs time to parse audio streams)
    setTimeout(function() {
        if (video.audioTracks && video.audioTracks.length > 1) {
            console.log('[VideoPlayer Debug] Found', video.audioTracks.length, 'audio tracks');
            audioTracksAvailable = true;
            updateAudioMenu(video.audioTracks, video);
        } else if (!video.audioTracks) {
            // audioTracks API not supported (Chrome) - show fallback message
            console.log('[VideoPlayer Debug] audioTracks API not available in this browser');
            audioTracksAvailable = false;
            var btn = document.getElementById('audioBtn');
            if (btn) btn.classList.add('disabled');
            var list = document.getElementById('audioList');
            if (list) {
                list.innerHTML = '<div class="player-dropdown-info">Audio track switching not supported in this browser. Try Safari or Edge.</div>';
            }
        } else {
            console.log('[VideoPlayer Debug] Single or no audio tracks found');
            audioTracksAvailable = true;
            var list = document.getElementById('audioList');
            if (list) {
                list.innerHTML = '<div class="player-dropdown-info">Only one audio track available.</div>';
            }
        }
        updateAudioTrackIndicator();
    }, 500);
}

/**
 * Create or update the audio track selection dropdown menu
 * Shows available audio tracks with language/label information
 * 
 * @param {AudioTrackList} audioTracks - List of audio tracks from video element
 * @param {HTMLVideoElement} videoElement - Reference to the video element
 */
function updateAudioMenu(audioTracks, videoElement) {
    // Ensure audio button exists
    ensureAudioButtonExists();
    
    // Get references to dropdown elements
    const list = document.getElementById('audioList');
    const btn = document.getElementById('audioBtn');
    
    // Remove disabled state
    if (btn) btn.classList.remove('disabled');
    
    // Build HTML for audio track list
    let html = '';
    for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i];
        // Use track label, language, or fallback to generic track number
        const label = track.label || track.language || 'Track ' + (i + 1);
        const isActive = track.enabled ? ' active' : '';
        html += '<button class="player-dropdown-item' + isActive + '" data-track="' + i + '" onclick="selectAudioTrack(' + i + ')">' + 
                label + '</button>';
    }
    list.innerHTML = html;
    
    // Store reference to video element globally for later access
    window.currentVideoElement = videoElement;
}

/**
 * Toggle the audio track dropdown menu visibility
 * Exposed globally for onclick handler
 */
window.toggleAudioMenu = function() {
    const dropdown = document.getElementById('audioDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

/**
 * Select and enable a specific audio track
 * Disables all other tracks and updates UI to show selection
 * 
 * @param {number} trackIndex - Index of the audio track to select
 */
window.selectAudioTrack = function(trackIndex) {
    // Get video element from global reference or fallback to DOM
    const video = window.currentVideoElement || document.getElementById('videoPlayer');
    if (!video || !video.audioTracks) return;
    
    const audioTracks = video.audioTracks;
    if (trackIndex >= 0 && trackIndex < audioTracks.length) {
        // Disable all tracks first (only one can be active at a time)
        for (let i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = false;
        }
        // Enable the selected track
        audioTracks[trackIndex].enabled = true;
        
        // Update UI: mark selected track as active
        const items = document.querySelectorAll('#audioList .player-dropdown-item');
        items.forEach((item, idx) => {
            if (idx === trackIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Show toast notification with selected track name
        const trackName = audioTracks[trackIndex].label || audioTracks[trackIndex].language || 'Track ' + (trackIndex + 1);
        window.Utils.showToast('Audio: ' + trackName, 'info');
        toggleAudioMenu();
    }
};

/**
 * Scan the movie folder for subtitle files and load them
 * Supports multiple subtitle formats: .srt, .vtt, .ass, .ssa, .sub
 * Automatically detects language from filename patterns
 * 
 * @param {Object} movie - Movie object with videoHandle
 * @param {HTMLVideoElement} videoElement - Video element to attach subtitles to
 */
async function loadSubtitlesForMovie(movie, videoElement) {
    console.log('[VideoPlayer Debug] Loading subtitles for:', movie.title);
    
    try {
        // Use the folderHandle stored on the movie object for subtitle scanning
        // (videoHandle.parent doesn't exist in the File System Access API)
        const folderDir = movie.folderHandle;
        if (!folderDir) {
            console.log('[VideoPlayer Debug] No folder handle available for subtitle scan');
            updateSubtitleMenu([]);
            return;
        }
        
        // Supported subtitle file extensions
        const subtitleExts = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
        const subtitleFiles = [];
        
        // Scan all files in the movie folder for subtitles
        for await (const entry of folderDir.values()) {
            if (entry.kind !== 'file') continue;
            const lowerName = entry.name.toLowerCase();
            
            // Check if file is a subtitle format and belongs to this movie
            const isSubtitle = subtitleExts.some(ext => lowerName.endsWith(ext));
            // Match subtitles that share the movie title or video filename
            const movieTitleClean = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const videoBaseName = movie.fileName.toLowerCase().replace(/\.[^.]+$/, '');
            const isRelated = lowerName.includes(movieTitleClean) ||
                             lowerName.includes(videoBaseName) ||
                             // Also match generic subtitle names (e.g., movie.srt, eng.srt)
                             lowerName.replace(/\.[^.]+$/, '').endsWith('.srt') === false;
            
            if (isSubtitle) {
                // Include all subtitle files in the folder (user can select the right one)
                subtitleFiles.push(entry);
            }
        }
        
        console.log('[VideoPlayer Debug] Found', subtitleFiles.length, 'subtitle files');
        updateSubtitleMenu(subtitleFiles);
        
    } catch(e) {
        console.error('[VideoPlayer Debug] Error loading subtitles:', e);
        updateSubtitleMenu([]);
    }
}

/**
 * Create or update the subtitle selection dropdown menu
 * Shows "No Subtitles" option, detected subtitle files, delay adjustment,
 * font size control, and external subtitle loading option.
 * CC button is ALWAYS visible even with 0 subtitles.
 * 
 * @param {FileSystemFileHandle[]} subtitleFiles - Array of subtitle file handles
 */
function updateSubtitleMenu(subtitleFiles) {
    // Check if subtitle menu container already exists
    let menuContainer = document.getElementById('subtitleMenuContainer');
    
    if (!menuContainer) {
        // Create subtitle menu container and append to player header
        const playerHeader = document.querySelector('.player-header');
        menuContainer = document.createElement('div');
        menuContainer.id = 'subtitleMenuContainer';
        menuContainer.className = 'player-subtitle-menu';
        
        var currentSize = subtitleSizeOptions[currentSubtitleSizeIndex];
        var delaySign = subtitleDelayOffset >= 0 ? '+' : '';
        var delayDisplay = delaySign + subtitleDelayOffset.toFixed(1) + 's';
        
        menuContainer.innerHTML = 
            '<div class="player-control-group">' +
                '<button class="player-control-btn" id="subtitleBtn" onclick="toggleSubtitleMenu()">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
                        '<line x1="4" y1="8" x2="20" y2="8"/>' +
                        '<line x1="4" y1="12" x2="14" y2="12"/>' +
                    '</svg>' +
                    '<span>CC</span>' +
                '</button>' +
                '<div class="player-dropdown" id="subtitleDropdown">' +
                    '<button class="player-dropdown-item" onclick="disableSubtitles()">No Subtitles</button>' +
                    '<div id="subtitleList"></div>' +
                    '<div class="subtitle-menu-divider"></div>' +
                    // Subtitle Delay section
                    '<div class="subtitle-section-label">Subtitle Delay</div>' +
                    '<div class="subtitle-delay-controls">' +
                        '<button class="subtitle-delay-btn" onclick="adjustSubtitleDelay(-0.5)" title="Subtitles earlier">-0.5s</button>' +
                        '<span class="subtitle-delay-value" id="subtitleDelayValue">' + delayDisplay + '</span>' +
                        '<button class="subtitle-delay-btn" onclick="adjustSubtitleDelay(0.5)" title="Subtitles later">+0.5s</button>' +
                    '</div>' +
                    '<div class="subtitle-menu-divider"></div>' +
                    // Font Size section
                    '<div class="subtitle-section-label">Subtitle Size</div>' +
                    '<div class="subtitle-size-controls">' +
                        '<button class="subtitle-size-btn' + (currentSize === 'small' ? ' active' : '') + '" data-size="small" onclick="setSubtitleSize(\'small\')">S</button>' +
                        '<button class="subtitle-size-btn' + (currentSize === 'medium' ? ' active' : '') + '" data-size="medium" onclick="setSubtitleSize(\'medium\')">M</button>' +
                        '<button class="subtitle-size-btn' + (currentSize === 'large' ? ' active' : '') + '" data-size="large" onclick="setSubtitleSize(\'large\')">L</button>' +
                    '</div>' +
                    '<div class="subtitle-menu-divider"></div>' +
                    '<button class="player-dropdown-item subtitle-load-external" onclick="loadExternalSubtitle()">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
                        'Load External Subtitle' +
                    '</button>' +
                '</div>' +
            '</div>';
        playerHeader.appendChild(menuContainer);
    }
    
    const list = document.getElementById('subtitleList');
    const btn = document.getElementById('subtitleBtn');
    
    // ALWAYS show the CC button (even with 0 subtitles, user can load external)
    if (btn) {
        btn.style.display = 'flex';
        btn.style.visibility = 'visible';
    }
    
    if (subtitleFiles.length === 0) {
        // Still show the menu with just "No Subtitles", delay, size, and "Load External" options
        list.innerHTML = '<div class="player-dropdown-info">No subtitle files found in folder.</div>';
        return;
    }
    
    // Build subtitle list
    let html = '';
    subtitleFiles.forEach((file, index) => {
        const lang = extractLanguageFromFilename(file.name);
        html += '<button class="player-dropdown-item" onclick="loadSubtitle(' + index + ', \'' + file.name.replace(/'/g, "\\'") + '\')">' + 
                lang + '</button>';
    });
    list.innerHTML = html;
    
    // Store subtitle files globally for access
    window.currentSubtitleFiles = subtitleFiles;
}

window.toggleSubtitleMenu = function() {
    const dropdown = document.getElementById('subtitleDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

window.disableSubtitles = function() {
    const video = document.getElementById('videoPlayer');
    // Remove all subtitle tracks
    const tracks = video.textTracks;
    for (let i = tracks.length - 1; i >= 0; i--) {
        tracks[i].mode = 'disabled';
    }
    // Clear any manually added tracks
    while (video.firstChild && video.firstChild.tagName === 'TRACK') {
        video.removeChild(video.firstChild);
    }
    // Clear delay-related state
    originalSubtitleVtt = null;
    subtitleDelayOffset = 0;
    var delayDisplay = document.getElementById('subtitleDelayValue');
    if (delayDisplay) delayDisplay.textContent = '+0.0s';
    
    showPlayerToast('Subtitles disabled');
    toggleSubtitleMenu();
};

window.loadExternalSubtitle = async function() {
    try {
        // Try File System Access API first
        if (window.showOpenFilePicker) {
            var handles = await window.showOpenFilePicker({
                types: [{
                    description: 'Subtitle files',
                    accept: { 'text/*': ['.srt', '.vtt', '.ass', '.ssa', '.sub'] }
                }],
                multiple: false
            });
            var file = await handles[0].getFile();
            await handleSubtitleFileLoad(file);
            toggleSubtitleMenu();
        } else {
            // Fallback: use file input
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.srt,.vtt,.ass,.ssa,.sub';
            input.onchange = async function(e) {
                var file = e.target.files[0];
                if (!file) return;
                await handleSubtitleFileLoad(file);
                toggleSubtitleMenu();
            };
            input.click();
        }
    } catch(e) {
        if (e.name !== 'AbortError') {
            window.Utils.showToast('Failed to load subtitle: ' + e.message, 'warning');
        }
    }
};

window.loadSubtitle = async function(index, filename) {
    const files = window.currentSubtitleFiles;
    if (!files || !files[index]) return;
    
    try {
        const file = await files[index].getFile();
        const content = await file.text();
        
        const video = document.getElementById('videoPlayer');
        const lang = extractLanguageFromFilename(filename);
        
        // Convert subtitle content based on format
        var lowerName = filename.toLowerCase();
        var blobContent = content;
        if (lowerName.endsWith('.srt')) {
            // Convert SRT to VTT format for browser compatibility
            blobContent = convertSrtToVtt(content);
        } else if (lowerName.endsWith('.ass') || lowerName.endsWith('.ssa')) {
            // ASS/SSA not fully supported by browsers - try as VTT
            window.Utils.showToast('ASS/SSA subtitles may not display correctly', 'warning');
            blobContent = convertSrtToVtt(content); // best effort
        }

        // Store original VTT for delay adjustment
        originalSubtitleVtt = blobContent;
        currentSubtitleLabel = lang;
        currentSubtitleSrclang = lang.toLowerCase().split(' ')[0].toLowerCase();
        
        // Apply delay if set
        if (subtitleDelayOffset !== 0) {
            blobContent = applySubtitleDelay(blobContent, subtitleDelayOffset);
        }

        // Remove existing tracks
        while (video.firstChild && video.firstChild.tagName === 'TRACK') {
            video.removeChild(video.firstChild);
        }

        // Create blob URL for subtitle
        const blob = new Blob([blobContent], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        // Create and configure track element
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = currentSubtitleLabel;
        track.srclang = currentSubtitleSrclang;
        track.src = url;
        track.default = true;
        
        video.appendChild(track);
        
        // Enable the track when loaded
        track.addEventListener('load', function() {
            const tracks = video.textTracks;
            for (let i = 0; i < tracks.length; i++) {
                tracks[i].mode = tracks[i] === track ? 'showing' : 'disabled';
            }
        });
        
        window.Utils.showToast('Loaded: ' + lang, 'success');
        toggleSubtitleMenu();
        
    } catch(e) {
        console.error('[VideoPlayer Debug] Error loading subtitle:', e);
        window.Utils.showToast('Failed to load subtitle', 'warning');
    }
};

/**
 * Close the video player and clean up resources
 * Removes menus, revokes object URLs, and clears global references
 */
function closePlayer() {
    var v = document.getElementById('videoPlayer');
    
    // If mini-player is active, move video back first
    if (isMiniPlayerActive && v) {
        var modal = document.getElementById('playerModal');
        if (modal) {
            var playerContainer = modal.querySelector('.player-container');
            if (playerContainer) {
                playerContainer.appendChild(v);
            }
        }
        if (miniPlayerEl) {
            miniPlayerEl.classList.add('hidden');
        }
        isMiniPlayerActive = false;
    }
    
    if (v) {
        v.pause();
        v.removeAttribute('src');
        v.load();
    }
    
    // Clean up subtitle menu container
    var subtitleMenuContainer = document.getElementById('subtitleMenuContainer');
    if (subtitleMenuContainer) {
        subtitleMenuContainer.remove();
    }
    
    // Clean up audio menu container
    var audioMenuContainer = document.getElementById('audioMenuContainer');
    if (audioMenuContainer) {
        audioMenuContainer.remove();
    }
    
    // Clean up TV show episode navigator if present
    var tvNavContainer = document.getElementById('tvEpisodeNavContainer');
    if (tvNavContainer) {
        tvNavContainer.remove();
    }
    
    // Revoke video object URL to free memory
    if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
        currentVideoUrl = null;
    }
    
    // Clear global references
    window.currentSubtitleFiles = null;
    window.currentVideoElement = null;
    isPlayingTVShow = false;
    currentTVShowMovieIdx = -1;
    currentTVSeasonIdx = -1;
    currentTVEpisodeIdx = -1;
    
    // Reset subtitle delay state
    subtitleDelayOffset = 0;
    originalSubtitleVtt = null;
    currentSubtitleLabel = '';
    currentSubtitleSrclang = '';
    audioTracksAvailable = false;
    
    // Remove drag-over class
    var playerModal = document.getElementById('playerModal');
    if (playerModal) {
        playerModal.classList.remove('subtitle-drag-over');
    }
    
    // Remove keyboard shortcut handler
    document.removeEventListener('keydown', playerKeydownHandler);
    
    document.getElementById('playerModal').classList.remove('active');
}

// ============================================================================
// TV SHOW EPISODE PLAYER
// ============================================================================

/**
 * Play a specific TV episode from a TV show
 * Opens the episode video file and sets up the player with episode navigation
 * 
 * @param {number} movieIdx - Index of the TV show in window.filteredMovies
 * @param {number} seasonIdx - Index of the season in the TV show's seasonFolders array
 * @param {number} episodeIdx - Index of the episode in the season's episodes array
 */
async function playTVEpisode(movieIdx, seasonIdx, episodeIdx) {
    console.log('[VideoPlayer Debug] playTVEpisode called:', movieIdx, seasonIdx, episodeIdx);
    
    if (movieIdx < 0 || movieIdx >= window.filteredMovies.length) {
        console.error('[VideoPlayer Debug] Invalid movie index:', movieIdx);
        return;
    }
    
    var m = window.filteredMovies[movieIdx];
    if (!m || !m.isTVShow) {
        console.error('[VideoPlayer Debug] Not a TV show');
        return;
    }
    
    var season = m.seasonFolders[seasonIdx];
    if (!season || !season.episodes || !season.episodes[episodeIdx]) {
        console.error('[VideoPlayer Debug] Invalid season/episode index');
        return;
    }
    
    var episode = season.episodes[episodeIdx];
    
    // Set TV playback state
    isPlayingTVShow = true;
    currentTVShowMovieIdx = movieIdx;
    currentTVSeasonIdx = seasonIdx;
    currentTVEpisodeIdx = episodeIdx;
    currentMovieIndex = movieIdx;
    
    try {
        if (episode.handle && typeof episode.handle.getFile === 'function') {
            const file = await episode.handle.getFile();
            
            if (currentVideoUrl) {
                URL.revokeObjectURL(currentVideoUrl);
            }
            
            currentVideoUrl = URL.createObjectURL(file);
            
            // Setup player with TV show info
            setupTVShowPlayer(m, season, episode, currentVideoUrl);
            
            window.Utils.showToast('Playing S' + String(season.seasonNumber).padStart(2, '0') + 'E' + String(episode.episodeNumber).padStart(2, '0') + ' - ' + episode.title, 'success');
            
            // Record watch history for TV episode
            if (typeof window.recordWatch === 'function') {
                window.recordWatch(m.title, 'episode', { 
                    year: m.year, 
                    season: season.seasonNumber, 
                    episode: episode.episodeNumber, 
                    episodeTitle: episode.title, 
                    quality: episode.quality 
                });
            }
            
            // Offer to resume from saved position
            var resumeKey = m.title + ' S' + String(season.seasonNumber).padStart(2, '0') + 'E' + String(episode.episodeNumber).padStart(2, '0');
            if (typeof window.offerResumePlayback === 'function') {
                var resumeVideo = document.getElementById('videoPlayer');
                if (resumeVideo) {
                    window.offerResumePlayback(resumeKey, resumeVideo);
                }
            }
        } else {
            window.Utils.showToast('Cannot open episode: File handle not available', 'warning');
        }
    } catch(e) {
        console.error('[VideoPlayer Debug] Error opening episode:', e);
        window.Utils.showToast('Error opening episode: ' + e.message, 'warning');
    }
}

/**
 * Setup the web player for a TV show episode
 * Includes season/episode info in title and episode navigation buttons
 * 
 * @param {Object} show - TV show data object
 * @param {Object} season - Season data object
 * @param {Object} episode - Episode data object
 * @param {string} videoUrl - Object URL for the video file
 */
async function setupTVShowPlayer(show, season, episode, videoUrl) {
    const modal = document.getElementById('playerModal');
    const video = document.getElementById('videoPlayer');
    const title = document.getElementById('playerTitle');
    
    // Set title with show name, season, and episode info
    var seasonLabel = 'S' + String(season.seasonNumber).padStart(2, '0');
    var episodeLabel = 'E' + String(episode.episodeNumber).padStart(2, '0');
    title.textContent = show.title + ' - ' + seasonLabel + episodeLabel + ' - ' + episode.title;
    
    // Load video source
    video.src = videoUrl;
    video.load();
    
    // Show the player modal
    modal.classList.add('active');
    
    // Reset subtitle delay for new video
    subtitleDelayOffset = 0;
    originalSubtitleVtt = null;
    
    // Ensure audio button is always visible
    ensureAudioButtonExists();
    
    // Load subtitles for this episode
    await loadSubtitlesForTVEpisode(season, episode, video);
    
    // Add TV episode navigator to player
    addTVEpisodeNavigator(show, season, episode);
    
    // Setup playback resume listeners for TV episode
    var tvResumeKey = show.title + ' S' + String(season.seasonNumber).padStart(2, '0') + 'E' + String(episode.episodeNumber).padStart(2, '0');
    if (typeof window.setupPlaybackResumeListeners === 'function') {
        window.setupPlaybackResumeListeners(video, tvResumeKey);
    }
    
    // Setup drag-and-drop for subtitles
    setupSubtitleDragDrop();
    
    // Setup keyboard shortcuts
    setupPlayerKeyboardShortcuts();
    
    // Setup event listeners
    video.onloadedmetadata = function() {
        console.log('[VideoPlayer Debug] Episode loaded, duration:', video.duration);
        checkAudioTracks(video);
        video.play().catch(e => console.log('[VideoPlayer Debug] Auto-play prevented:', e));
        
        // Apply saved playback speed
        applySavedSpeed(video);
    };
    
    video.onerror = function(e) {
        console.error('[VideoPlayer Debug] Episode video error:', e);
        window.Utils.showToast('Error loading episode', 'warning');
    };
}

/**
 * Add episode navigation controls to the player
 * Shows previous/next episode buttons and current episode indicator
 */
function addTVEpisodeNavigator(show, season, episode) {
    // Remove existing navigator if present
    var existing = document.getElementById('tvEpisodeNavContainer');
    if (existing) existing.remove();
    
    var playerHeader = document.querySelector('.player-header');
    var navContainer = document.createElement('div');
    navContainer.id = 'tvEpisodeNavContainer';
    navContainer.className = 'player-subtitle-menu';
    
    var seasonLabel = 'S' + String(season.seasonNumber).padStart(2, '0');
    var episodeLabel = 'E' + String(episode.episodeNumber).padStart(2, '0');
    
    // Find previous and next episodes
    var hasPrev = false;
    var hasNext = false;
    
    // Check previous: same season previous episode
    if (episode.episodeNumber > 1 && season.episodes.length > 0) {
        hasPrev = true;
    }
    
    // Check next: same season next episode
    var nextEpIdx = -1;
    for (var i = 0; i < season.episodes.length; i++) {
        if (season.episodes[i].episodeNumber === episode.episodeNumber + 1) {
            nextEpIdx = i;
            hasNext = true;
            break;
        }
    }
    
    navContainer.innerHTML = 
        '<button class="player-control-btn" ' + (!hasPrev ? 'disabled' : '') + ' onclick="playPrevEpisode()" title="Previous Episode">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
            'Prev' +
        '</button>' +
        '<span class="player-nav-label">' + seasonLabel + episodeLabel + '</span>' +
        '<button class="player-control-btn" ' + (!hasNext ? 'disabled' : '') + ' onclick="playNextEpisode()" title="Next Episode">' +
            'Next' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</button>';
    
    playerHeader.appendChild(navContainer);
}

/**
 * Play the previous TV episode
 */
window.playPrevEpisode = function() {
    if (!isPlayingTVShow) return;
    var m = window.filteredMovies[currentTVShowMovieIdx];
    if (!m || !m.seasonFolders[currentTVSeasonIdx]) return;
    var season = m.seasonFolders[currentTVSeasonIdx];
    var currentEp = currentTVEpisodeIdx;
    if (currentEp > 0) {
        playTVEpisode(currentTVShowMovieIdx, currentTVSeasonIdx, currentEp - 1);
    }
};

/**
 * Play the next TV episode
 */
window.playNextEpisode = function() {
    if (!isPlayingTVShow) return;
    var m = window.filteredMovies[currentTVShowMovieIdx];
    if (!m || !m.seasonFolders[currentTVSeasonIdx]) return;
    var season = m.seasonFolders[currentTVSeasonIdx];
    var currentEp = currentTVEpisodeIdx;
    if (currentEp < season.episodes.length - 1) {
        playTVEpisode(currentTVShowMovieIdx, currentTVSeasonIdx, currentEp + 1);
    }
};

/**
 * Scan for subtitle files for a TV episode
 * Checks season subtitle files and season directory
 */
async function loadSubtitlesForTVEpisode(season, episode, videoElement) {
    console.log('[VideoPlayer Debug] Loading subtitles for episode:', episode.title);
    
    try {
        const subtitleExts = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
        const subtitleFiles = [];
        
        // Use season's collected subtitle files if available
        if (season.subtitleFiles && season.subtitleFiles.length > 0) {
            // Filter subtitle files that match this episode's name
            var epBaseName = episode.fileName.replace(/\.[^.]+$/, '').toLowerCase();
            
            for (var i = 0; i < season.subtitleFiles.length; i++) {
                var subFile = season.subtitleFiles[i];
                var subName = subFile.name.toLowerCase();
                
                // Check if subtitle filename relates to this episode
                if (subName.includes(epBaseName) || 
                    subName.includes('s' + String(season.seasonNumber).padStart(2, '0') + 'e' + String(episode.episodeNumber).padStart(2, '0'))) {
                    subtitleFiles.push(subFile);
                }
            }
        }
        
        // Also try scanning the season directory directly
        if (subtitleFiles.length === 0 && season.handle) {
            try {
                for await (var entry of season.handle.values()) {
                    if (entry.kind !== 'file') continue;
                    var lo = entry.name.toLowerCase();
                    var isSubtitle = subtitleExts.some(function(ext) { return lo.endsWith(ext); });
                    var epBase = episode.fileName.replace(/\.[^.]+$/, '').toLowerCase();
                    var isRelated = lo.includes(epBase) || 
                        lo.includes('s' + String(season.seasonNumber).padStart(2, '0') + 'e' + String(episode.episodeNumber).padStart(2, '0'));
                    
                    if (isSubtitle && isRelated) {
                        subtitleFiles.push(entry);
                    }
                }
            } catch(e) {}
        }
        
        console.log('[VideoPlayer Debug] Found', subtitleFiles.length, 'subtitle files for episode');
        updateSubtitleMenu(subtitleFiles);
        
    } catch(e) {
        console.error('[VideoPlayer Debug] Error loading episode subtitles:', e);
        updateSubtitleMenu([]);
    }
}

// ============================================================================
// MINI PLAYER MODE
// ============================================================================

/** Whether the mini-player is currently active */
var isMiniPlayerActive = false;

/** Reference to the mini-player DOM element */
var miniPlayerEl = null;

/**
 * Toggle the mini-player mode
 * Creates a small floating player window with basic controls
 */
window.toggleMiniPlayer = function() {
    if (isMiniPlayerActive) {
        closeMiniPlayer();
        return;
    }
    
    var video = document.getElementById('videoPlayer');
    if (!video || video.paused) {
        // Don't create mini player if no video is playing
        return;
    }
    
    if (!miniPlayerEl) {
        miniPlayerEl = document.createElement('div');
        miniPlayerEl.className = 'mini-player entering';
        miniPlayerEl.innerHTML = '<div class="mini-player-header">' +
            '<span class="mini-player-title" id="miniPlayerTitle">Now Playing</span>' +
            '<div class="mini-player-controls">' +
                '<button class="mini-player-btn" id="miniPlayPauseBtn" onclick="miniPlayerTogglePlay()">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' +
                '</button>' +
                '<button class="mini-player-btn" onclick="closeMiniPlayer()">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
            '</div>' +
        '</div>';
        document.body.appendChild(miniPlayerEl);
        
        setTimeout(function() {
            if (miniPlayerEl) miniPlayerEl.classList.remove('entering');
        }, 300);
    }
    
    // Update mini player title
    var miniTitle = document.getElementById('miniPlayerTitle');
    var playerTitle = document.getElementById('playerTitle');
    if (miniTitle && playerTitle) {
        miniTitle.textContent = playerTitle.textContent;
    }
    
    miniPlayerEl.classList.remove('hidden', 'exiting');
    isMiniPlayerActive = true;
    
    // Close the full player modal but keep video playing
    var modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

/**
 * Close the mini-player and return to full player or stop playback
 */
window.closeMiniPlayer = function() {
    if (!isMiniPlayerActive) return;
    
    var video = document.getElementById('videoPlayer');
    
    // Move video element back to modal container if needed
    var modal = document.getElementById('playerModal');
    if (modal && video) {
        var playerContainer = modal.querySelector('.player-container');
        if (playerContainer) {
            playerContainer.appendChild(video);
        }
    }
    
    // Hide mini player
    if (miniPlayerEl) {
        miniPlayerEl.classList.add('exiting');
        setTimeout(function() {
            if (miniPlayerEl) {
                miniPlayerEl.classList.add('hidden');
                miniPlayerEl.classList.remove('exiting');
            }
        }, 300);
    }
    isMiniPlayerActive = false;

    // Close the player normally
    closePlayer();
};

/**
 * Toggle play/pause from the mini-player
 */
window.miniPlayerTogglePlay = function() {
    var video = document.getElementById('videoPlayer');
    if (!video) return;

    if (video.paused) {
        video.play().catch(function() {});
    } else {
        video.pause();
    }
    updateMiniPlayPauseBtn(video);
};

/**
 * Update the mini-player play/pause button icon
 */
function updateMiniPlayPauseBtn(video) {
    var btn = document.getElementById('miniPlayPauseBtn');
    if (!btn || !video) return;

    if (video.paused) {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    } else {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    }
}

// Listen for play/pause events on the video to keep mini-player button in sync
document.addEventListener('DOMContentLoaded', function() {
    var video = document.getElementById('videoPlayer');
    if (video) {
        video.addEventListener('play', function() {
            if (isMiniPlayerActive) updateMiniPlayPauseBtn(video);
        });
        video.addEventListener('pause', function() {
            if (isMiniPlayerActive) updateMiniPlayPauseBtn(video);
        });
    }
});

// Export VideoPlayer module for use in other parts of the application
window.VideoPlayer = { 
    playMovie, 
    playTVEpisode,
    closePlayer, 
    getCurrentIndex: function() { return currentMovieIndex; }, 
    setCurrentIndex: function(i) { currentMovieIndex = i; },
    isPlayingTVShow: function() { return isPlayingTVShow; },
    getTVShowState: function() { return { movieIdx: currentTVShowMovieIdx, seasonIdx: currentTVSeasonIdx, episodeIdx: currentTVEpisodeIdx }; }
};
