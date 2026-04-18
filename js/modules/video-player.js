/**
 * Movie Library - Professional Video Player Module (v2.0)
 * 
 * Advanced HTML5 video player with professional features:
 * - Multi-audio track support (switch between different languages/commentary tracks)
 * - Multi-subtitle support (embedded + external SRT/VTT/ASS files)
 * - Playback speed control (0.5x to 2x)
 * - Picture-in-Picture (PiP) mode
 * - Fullscreen support
 * - Resume playback from last position
 * - Real-time display with auto-hide controls
 * - SRT to VTT conversion for browser compatibility
 * - Language auto-detection from filenames
 * - Keyboard shortcuts for quick access
 * 
 * Requirements: Chrome/Edge for File System Access API & audioTracks support
 * 
 * @module VideoPlayer
 * @version 2.0
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
    
    // Scan folder and load available subtitle files
    await loadSubtitlesForMovie(movie, video);
    
    // Setup event listeners for video lifecycle events
    video.onloadedmetadata = function() {
        console.log('[VideoPlayer Debug] Video loaded, duration:', video.duration);
        
        // Check if video has multiple audio tracks (e.g., different languages)
        checkAudioTracks(video);
        
        // Auto-play the video (may be prevented by browser autoplay policies)
        video.play().catch(e => console.log('[VideoPlayer Debug] Auto-play prevented:', e));
    };
    
    // Handle video loading errors
    video.onerror = function(e) {
        console.error('[VideoPlayer Debug] Video error:', e);
        window.Utils.showToast('Error loading video', 'warning');
    };
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
        const audioTracks = video.audioTracks;
        // Only show audio selector if multiple tracks exist (e.g., different languages)
        if (audioTracks && audioTracks.length > 1) {
            console.log('[VideoPlayer Debug] Found', audioTracks.length, 'audio tracks');
            updateAudioMenu(audioTracks, video);
        } else {
            console.log('[VideoPlayer Debug] Single or no audio tracks found');
        }
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
    // Check if audio menu container already exists
    let menuContainer = document.getElementById('audioMenuContainer');
    
    if (!menuContainer) {
        // Create audio menu container and append to player header
        const playerHeader = document.querySelector('.player-header');
        menuContainer = document.createElement('div');
        menuContainer.id = 'audioMenuContainer';
        menuContainer.className = 'player-subtitle-menu';
        menuContainer.innerHTML = `
            <div class="player-control-group">
                <button class="player-control-btn" id="audioBtn" onclick="toggleAudioMenu()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                    <span>Audio</span>
                </button>
                <div class="player-dropdown" id="audioDropdown">
                    <div id="audioList"></div>
                </div>
            </div>
        `;
        playerHeader.appendChild(menuContainer);
    }
    
    // Get references to dropdown elements
    const list = document.getElementById('audioList');
    const btn = document.getElementById('audioBtn');
    
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
        // Get parent directory handle to scan for subtitle files
        const parentDir = movie.videoHandle.parent;
        if (!parentDir) {
            console.log('[VideoPlayer Debug] No parent directory access');
            updateSubtitleMenu([]);
            return;
        }
        
        // Supported subtitle file extensions
        const subtitleExts = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
        const subtitleFiles = [];
        
        // Scan all files in the parent directory
        for await (const entry of parentDir.values()) {
            if (entry.kind !== 'file') continue;
            const lowerName = entry.name.toLowerCase();
            
            // Check if file is a subtitle format and belongs to this movie
            const isSubtitle = subtitleExts.some(ext => lowerName.endsWith(ext));
            const isRelated = lowerName.includes(movie.title.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
                             lowerName.includes(movie.fileName.toLowerCase().replace(/\.[^.]+$/, ''));
            
            if (isSubtitle && isRelated) {
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
 * Shows "No Subtitles" option plus all detected subtitle files with language names
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
        menuContainer.innerHTML = `
            <div class="player-control-group">
                <button class="player-control-btn" id="subtitleBtn" onclick="toggleSubtitleMenu()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <line x1="4" y1="8" x2="20" y2="8"/>
                        <line x1="4" y1="12" x2="14" y2="12"/>
                    </svg>
                    <span>CC</span>
                </button>
                <div class="player-dropdown" id="subtitleDropdown">
                    <button class="player-dropdown-item" onclick="disableSubtitles()">No Subtitles</button>
                    <div id="subtitleList"></div>
                </div>
            </div>
        `;
        playerHeader.appendChild(menuContainer);
    }
    
    const list = document.getElementById('subtitleList');
    const dropdown = document.getElementById('subtitleDropdown');
    const btn = document.getElementById('subtitleBtn');
    
    // Hide if no subtitles
    if (subtitleFiles.length === 0) {
        if (btn) btn.style.display = 'none';
        return;
    }
    
    if (btn) btn.style.display = 'flex';
    
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

function extractLanguageFromFilename(filename) {
    const langPatterns = [
        /\.([a-z]{2,3})\.(?:srt|vtt|ass|ssa|sub)$/i,
        /\.([a-z]{2,3})$/i
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
                'vi': 'Vietnamese', 'vie': 'Vietnamese'
            };
            return langNames[langCode] || langCode.toUpperCase();
        }
    }
    
    // Fallback to filename
    return filename.replace(/\.[^.]+$/, '');
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
    window.Utils.showToast('Subtitles disabled', 'info');
    toggleSubtitleMenu();
};

window.loadSubtitle = async function(index, filename) {
    const files = window.currentSubtitleFiles;
    if (!files || !files[index]) return;
    
    try {
        const file = await files[index].getFile();
        const content = await file.text();
        
        const video = document.getElementById('videoPlayer');
        const lang = extractLanguageFromFilename(filename);
        
        // Remove existing tracks
        while (video.firstChild && video.firstChild.tagName === 'TRACK') {
            video.removeChild(video.firstChild);
        }
        
        // Create blob URL for subtitle (convert to VTT format for browser compatibility)
        const blob = new Blob([content], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        // Create and configure track element
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = lang;
        track.srclang = lang.toLowerCase().split(' ')[0].toLowerCase();
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
    if (v) {
        v.pause();
        v.removeAttribute('src');
        v.load();
    }
    
    // Clean up subtitle menu container
    const subtitleMenuContainer = document.getElementById('subtitleMenuContainer');
    if (subtitleMenuContainer) {
        subtitleMenuContainer.remove();
    }
    
    // Clean up audio menu container
    const audioMenuContainer = document.getElementById('audioMenuContainer');
    if (audioMenuContainer) {
        audioMenuContainer.remove();
    }
    
    // Clean up TV show episode navigator if present
    const tvNavContainer = document.getElementById('tvEpisodeNavContainer');
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
    
    // Load subtitles for this episode
    await loadSubtitlesForTVEpisode(season, episode, video);
    
    // Add TV episode navigator to player
    addTVEpisodeNavigator(show, season, episode);
    
    // Setup event listeners
    video.onloadedmetadata = function() {
        console.log('[VideoPlayer Debug] Episode loaded, duration:', video.duration);
        checkAudioTracks(video);
        video.play().catch(e => console.log('[VideoPlayer Debug] Auto-play prevented:', e));
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
    
    // Check previous: same season previous episode, or last episode of previous season
    if (currentTVEpisodeIdx > 0) {
        hasPrev = true;
    } else if (currentTVSeasonIdx > 0) {
        var prevSeason = show.seasonFolders[currentTVSeasonIdx - 1];
        if (prevSeason && prevSeason.episodes && prevSeason.episodes.length > 0) {
            hasPrev = true;
        }
    }
    
    // Check next: same season next episode, or first episode of next season
    if (currentTVEpisodeIdx < season.episodes.length - 1) {
        hasNext = true;
    } else if (currentTVSeasonIdx < show.seasonFolders.length - 1) {
        var nextSeason = show.seasonFolders[currentTVSeasonIdx + 1];
        if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
            hasNext = true;
        }
    }
    
    navContainer.innerHTML = 
        '<div class="player-control-group tv-episode-nav">' +
            '<button class="player-control-btn tv-ep-nav-btn' + (!hasPrev ? ' disabled' : '') + '" id="tvPrevEpBtn" onclick="playPrevEpisode()">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<polyline points="15 18 9 12 15 6"/>' +
                '</svg>' +
                '<span>Prev Ep</span>' +
            '</button>' +
            '<span class="tv-ep-indicator">' + seasonLabel + episodeLabel + '</span>' +
            '<button class="player-control-btn tv-ep-nav-btn' + (!hasNext ? ' disabled' : '') + '" id="tvNextEpBtn" onclick="playNextEpisode()">' +
                '<span>Next Ep</span>' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<polyline points="9 18 15 12 9 6"/>' +
                '</svg>' +
            '</button>' +
        '</div>';
    
    playerHeader.appendChild(navContainer);
}

/**
 * Play the previous episode in the TV show
 * Navigates across season boundaries if needed
 */
window.playPrevEpisode = function() {
    if (!isPlayingTVShow || currentTVShowMovieIdx < 0) return;
    
    var m = window.filteredMovies[currentTVShowMovieIdx];
    if (!m) return;
    
    var newSeasonIdx = currentTVSeasonIdx;
    var newEpisodeIdx = currentTVEpisodeIdx - 1;
    
    // If at beginning of season, go to last episode of previous season
    if (newEpisodeIdx < 0) {
        newSeasonIdx = currentTVSeasonIdx - 1;
        if (newSeasonIdx < 0) return; // Already at first episode
        
        var prevSeason = m.seasonFolders[newSeasonIdx];
        if (prevSeason && prevSeason.episodes && prevSeason.episodes.length > 0) {
            newEpisodeIdx = prevSeason.episodes.length - 1;
        } else {
            return;
        }
    }
    
    playTVEpisode(currentTVShowMovieIdx, newSeasonIdx, newEpisodeIdx);
};

/**
 * Play the next episode in the TV show
 * Navigates across season boundaries if needed
 */
window.playNextEpisode = function() {
    if (!isPlayingTVShow || currentTVShowMovieIdx < 0) return;
    
    var m = window.filteredMovies[currentTVShowMovieIdx];
    if (!m) return;
    
    var currentSeason = m.seasonFolders[currentTVSeasonIdx];
    var newSeasonIdx = currentTVSeasonIdx;
    var newEpisodeIdx = currentTVEpisodeIdx + 1;
    
    // If at end of season, go to first episode of next season
    if (newEpisodeIdx >= currentSeason.episodes.length) {
        newSeasonIdx = currentTVSeasonIdx + 1;
        if (newSeasonIdx >= m.seasonFolders.length) return; // Already at last episode
        
        var nextSeason = m.seasonFolders[newSeasonIdx];
        if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
            newEpisodeIdx = 0;
        } else {
            return;
        }
    }
    
    playTVEpisode(currentTVShowMovieIdx, newSeasonIdx, newEpisodeIdx);
};

/**
 * Load subtitles for a specific TV episode
 * Scans the season folder for subtitle files matching the episode
 * 
 * @param {Object} season - Season data object
 * @param {Object} episode - Episode data object
 * @param {HTMLVideoElement} videoElement - Video element to attach subtitles to
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
