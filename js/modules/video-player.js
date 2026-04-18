/**
 * Movie Library - Video Player Module
 * 
 * Handles video playback using HTML5 video player with advanced features including:
 * - Subtitle support (auto-detection from folder, multiple language support)
 * - Audio track switching for videos with multiple audio streams
 * - Full keyboard navigation and controls
 * - Toast notifications for user feedback
 * 
 * @module VideoPlayer
 */

// Current movie index being played (-1 when nothing is playing)
var currentMovieIndex = -1;

// Object URL for the currently loaded video file (for cleanup)
var currentVideoUrl = null;

// Cache for loaded subtitle files to improve performance
var loadedSubtitleFiles = new Map();

/**
 * Play a movie from the filtered movies list
 * Opens the video file using File System Access API and initializes the web player
 * 
 * @param {number} idx - Index of the movie in window.filteredMovies array
 * @returns {Promise<void>}
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
    
    // Revoke video object URL to free memory
    if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
        currentVideoUrl = null;
    }
    
    // Clear global references
    window.currentSubtitleFiles = null;
    window.currentVideoElement = null;
    
    document.getElementById('playerModal').classList.remove('active');
}

// Export VideoPlayer module for use in other parts of the application
window.VideoPlayer = { 
    playMovie, 
    closePlayer, 
    getCurrentIndex: function() { return currentMovieIndex; }, 
    setCurrentIndex: function(i) { currentMovieIndex = i; } 
};
