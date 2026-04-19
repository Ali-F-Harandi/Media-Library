/**
 * Movie Library - Scanner Module
 * 
 * Handles folder scanning and movie/TV show detection using the File System Access API.
 * Scans directories for movie folders matching "Movie Name (Year)" or TV show folders,
 * detects video files, poster images, fanart, and NFO metadata files.
 * 
 * @module Scanner
 */

/**
 * Build a relative path from root folder to the given folder handle
 * Since the File System Access API does not expose absolute paths for security,
 * we construct the best available path using the root name and folder name.
 * The root handle reference is also stored for later path resolution.
 * 
 * @param {FileSystemDirectoryHandle} fh - Folder handle to build path from
 * @param {string} rootName - Name of the root library folder
 * @returns {string} Relative path from root (e.g., "Movies/Movie Name (2012)")
 */
function buildFullPath(fh, rootName) {
    // The File System Access API does not expose .parent or absolute paths.
    // We build the best path we can: RootName/FolderName
    // The folderHandle is stored on the movie object for later resolution.
    if (rootName && fh && fh.name) {
        return rootName + '/' + fh.name;
    }
    return fh ? fh.name : '';
}

/**
 * Build a full video file path including the video filename
 * Used for the "Copy Path" feature to give the most useful path
 * 
 * @param {Object} m - Movie or TV show object
 * @returns {string} Full path including video filename
 */
function buildVideoPath(m) {
    var basePath = m.fullPath || m.relativePath || '';
    if (m.isTVShow) {
        // For TV shows, we don't have a single video file, return the show folder path
        return basePath;
    }
    // For movies, include the video filename
    if (m.fileName) {
        return basePath + '/' + m.fileName;
    }
    return basePath;
}

// Global map of folder handle names for path resolution
// Maps handle identity to root folder name for building paths
window._folderRootMap = window._folderRootMap || new Map();

// Supported video file extensions
var VIDEO_EXTS = ['.mp4','.mkv','.webm','.avi','.mov','.wmv','.flv','.m4v','.ts','.mpg','.mpeg'];

// Supported image file extensions for posters and fanart
var IMG_EXTS = ['.jpg','.jpeg','.png','.webp','.gif','.bmp'];

// Regex pattern to match movie folder names: "Movie Name (Year)"
var MOVIE_REGEX = /^(.+?)\s*\((\d{4})\)$/;

// Regex pattern to match season folder names: "Season 1", "Season 01", "S01", etc.
var SEASON_REGEX = /^(?:Season|S)\s*(\d+)$/i;

/**
 * Process a single movie folder and extract metadata
 * Scans folder for video files, images (poster, fanart, logo), and NFO metadata
 * Builds full path by traversing directory tree
 * 
 * @param {FileSystemDirectoryHandle} fh - Folder handle for the movie directory
 * @param {string} rootName - Name of the root library folder
 * @returns {Promise<Object>} Object containing movie data or rejection reason
 */
async function processMovieFolder(fh, rootName) {
    // Check if folder name matches "Movie Name (Year)" pattern
    var match = fh.name.match(MOVIE_REGEX);
    if (!match) {
        return { reason: 'Name does not match "Movie (Year)"' };
    }
    
    // Initialize handles for different media types
    var posterHandle = null, videoHandle = null, logoHandle = null, nfoHandle = null, fanartHandle = null;
    
    try {
        // Scan all files in the movie folder
        for await (var f of fh.values()) {
            if (f.kind !== 'file') continue;
            var lo = f.name.toLowerCase();
            
            // Identify video files (use first found)
            if (VIDEO_EXTS.some(function(ext) { return lo.endsWith(ext); })) {
                if (!videoHandle) videoHandle = f;
            } 
            // Identify image files based on naming conventions
            else if (IMG_EXTS.some(function(ext) { return lo.endsWith(ext); })) {
                if (lo.includes('fanart') || lo.includes('-fanart.')) {
                    if (!fanartHandle) fanartHandle = f;
                } else if (lo.includes('clearlogo') || lo.includes('logo')) {
                    if (!logoHandle) logoHandle = f;
                } else if (lo.includes('poster') || lo.includes('folder') || lo.includes('cover')) {
                    if (!posterHandle) posterHandle = f;
                }
            }
            // Identify NFO metadata file
            if (lo.endsWith('.nfo')) nfoHandle = f;
        }
    } catch(e) {
        return { reason: 'Access denied' };
    }
    
    // Validate: must have at least one video file
    if (!videoHandle) {
        return { reason: 'No video file' };
    }
    
    // Fallback: scan again for any image to use as poster/fanart if not found
    if (!posterHandle || !fanartHandle) {
        try {
            for await (var f2 of fh.values()) {
                if (f2.kind !== 'file' || !IMG_EXTS.some(function(ext) { 
                    return f2.name.toLowerCase().endsWith(ext); 
                })) continue;
                
                var lo2 = f2.name.toLowerCase();
                if (!posterHandle && !lo2.includes('fanart') && !lo2.includes('logo')) {
                    posterHandle = f2;
                }
                if (!fanartHandle && (lo2.includes('fanart') || lo2.includes('background') || lo2.includes('backdrop'))) {
                    fanartHandle = f2;
                }
            }
        } catch(e) {}
    }
    
    // Note: poster is optional - movie will still be added with placeholder icon
    
    // Parse NFO file if present
    var nfoData = null;
    if (nfoHandle) {
        try {
            var nf = await nfoHandle.getFile();
            var txt = await nf.text();
            nfoData = window.NFOParser.parseNFO(txt);
        } catch(e) {
            console.error('NFO read error:', e);
        }
    }
    
    // Get video file object to determine file size
    var vf = await videoHandle.getFile();
    
    // Extract quality information from filename (e.g., 1080p, 4K, BluRay)
    var qm = videoHandle.name.match(/(\d{3,4}p|720p|1080p|2160p|4[kK]|HDR|Blu-?ray|WEB-?DL|WEBRip|HDTV)/i);
    
    // Build relative path from root folder
    var fullPath = buildFullPath(fh, rootName);
    
    // Build full video file path for "Copy Path" feature
    var videoFilePath = fullPath + '/' + videoHandle.name;
    
    // Scan for .actors subfolder and collect actor image handles
    var actorsFolderHandle = null;
    var actorImages = {};
    try {
        for await (var entry of fh.values()) {
            if (entry.kind === 'directory' && entry.name.toLowerCase() === '.actors') {
                actorsFolderHandle = entry;
                // Scan all jpg/png files in .actors folder
                for await (var actorFile of entry.values()) {
                    if (actorFile.kind === 'file') {
                        var actorName = actorFile.name.toLowerCase();
                        if (actorName.endsWith('.jpg') || actorName.endsWith('.jpeg') || 
                            actorName.endsWith('.png') || actorName.endsWith('.webp')) {
                            // Extract actor name from filename (e.g., "Paul_Walker.jpg" -> "Paul_Walker")
                            var nameKey = actorFile.name.replace(/\.(jpg|jpeg|png|webp)$/i, '');
                            actorImages[nameKey.toLowerCase()] = actorFile;
                        }
                    }
                }
                break;
            }
        }
    } catch(e) {
        console.log('[Scanner Debug] Could not scan .actors folder:', e);
    }
    
    // Return complete movie object with all metadata
    return {
        movie: {
            title: match[1].trim(),
            year: match[2],
            posterHandle: posterHandle,
            videoHandle: videoHandle,
            logoHandle: logoHandle,
            fanartHandle: fanartHandle,
            hasNfo: !!nfoHandle,
            quality: qm ? qm[1] : '',
            fileSize: vf.size,
            fileName: videoHandle.name,
            relativePath: rootName + '/' + fh.name,
            fullPath: fullPath,
            videoFilePath: videoFilePath,  // Full path including video filename for Copy Path
            folderHandle: fh,  // Store folder handle for subtitle scanning & path resolution
            libraryRoot: rootName,  // Store root name for path building
            posterUrl: null,
            logoUrl: null,
            fanartUrl: null,
            nfoData: nfoData,
            actorsFolderHandle: actorsFolderHandle,
            actorImages: actorImages
        }
    };
}

/**
 * Process a TV show folder and extract metadata for all seasons
 * Scans the TV show folder for season subfolders, video files, images, and NFO metadata
 * 
 * @param {FileSystemDirectoryHandle} fh - Folder handle for the TV show directory
 * @param {string} rootName - Name of the root library folder
 * @returns {Promise<Object>} Object containing TV show data or rejection reason
 */
async function processTVShowFolder(fh, rootName) {
    // Check if folder name matches "Series Name (Year)" pattern
    var match = fh.name.match(MOVIE_REGEX);
    if (!match) {
        return { reason: 'Name does not match "Series (Year)"' };
    }
    
    // Initialize handles for TV show level assets
    var posterHandle = null, fanartHandle = null, logoHandle = null, nfoHandle = null, themeHandle = null;
    var seasonFolders = [];
    var seasonPosters = {};
    
    try {
        // Scan all entries in the TV show folder
        for await (var entry of fh.values()) {
            if (entry.kind === 'directory') {
                // Check if it's a season folder
                var seasonMatch = entry.name.match(SEASON_REGEX);
                if (seasonMatch) {
                    seasonFolders.push({
                        handle: entry,
                        seasonNumber: parseInt(seasonMatch[1])
                    });
                }
            } else if (entry.kind === 'file') {
                var lo = entry.name.toLowerCase();
                
                // Identify image files based on naming conventions
                if (IMG_EXTS.some(function(ext) { return lo.endsWith(ext); })) {
                    if (lo.includes('fanart') || lo.includes('-fanart.') || lo === 'fanart.jpg' || lo === 'fanart.png') {
                        if (!fanartHandle) fanartHandle = entry;
                    } else if (lo.includes('clearlogo') || lo.includes('logo')) {
                        if (!logoHandle) logoHandle = entry;
                    } else if (lo === 'poster.jpg' || lo === 'poster.png' || lo.includes('folder.') || lo.includes('cover.')) {
                        if (!posterHandle) posterHandle = entry;
                    } else if (lo.startsWith('season') && lo.includes('poster')) {
                        // Season-specific poster like season01-poster.jpg
                        var seasonNumMatch = lo.match(/season(?:\s*|_)(\d+).*?\.(?:jpg|jpeg|png|webp)/i);
                        if (seasonNumMatch) {
                            var sNum = parseInt(seasonNumMatch[1]);
                            if (!seasonPosters[sNum]) {
                                seasonPosters[sNum] = entry;
                            }
                        }
                    }
                }
                // Identify NFO metadata file
                if (lo.endsWith('.nfo')) {
                    nfoHandle = entry;
                }
                // Identify theme music
                if (lo === 'theme.mp3' || lo === 'theme.m4a') {
                    themeHandle = entry;
                }
            }
        }
    } catch(e) {
        return { reason: 'Access denied' };
    }
    
    // Validate: must have at least one season folder with video files
    if (seasonFolders.length === 0) {
        return { reason: 'No season folders found' };
    }
    
    // Parse NFO file if present
    var nfoData = null;
    if (nfoHandle) {
        try {
            var nf = await nfoHandle.getFile();
            var txt = await nf.text();
            nfoData = window.NFOParser.parseNFO(txt);
        } catch(e) {
            console.error('NFO read error:', e);
        }
    }
    
    // Build relative path from root folder
    var fullPath = buildFullPath(fh, rootName);
    
    // Sort season folders by season number
    seasonFolders.sort(function(a, b) {
        return a.seasonNumber - b.seasonNumber;
    });
    
    // Collect all video files from all seasons with detailed episode data
    var totalEpisodes = 0;
    var firstVideoHandle = null;
    var totalSize = 0;
    
    for (var si = 0; si < seasonFolders.length; si++) {
        var season = seasonFolders[si];
        season.episodes = [];
        season.subtitleFiles = [];
        var epIndex = 0;
        
        try {
            var seasonEntries = [];
            for await (var epEntry of season.handle.values()) {
                seasonEntries.push(epEntry);
            }
            
            // Sort entries alphabetically for consistent episode ordering
            seasonEntries.sort(function(a, b) {
                return a.name.localeCompare(b.name);
            });
            
            for (var ei = 0; ei < seasonEntries.length; ei++) {
                var entry = seasonEntries[ei];
                if (entry.kind === 'file') {
                    var epLo = entry.name.toLowerCase();
                    
                    // Detect video files
                    if (VIDEO_EXTS.some(function(ext) { return epLo.endsWith(ext); })) {
                        totalEpisodes++;
                        epIndex++;
                        if (!firstVideoHandle) firstVideoHandle = entry;
                        
                        var epSize = 0;
                        try {
                            var vf = await entry.getFile();
                            epSize = vf.size;
                            totalSize += vf.size;
                        } catch(e) {}
                        
                        // Try to extract episode number from filename
                        // Patterns: S01E01, s01e01, 1x01, E01, Episode 1, etc.
                        var epNumMatch = entry.name.match(/[Ss]\d+[Ee](\d+)/) ||
                                        entry.name.match(/\d+x(\d+)/) ||
                                        entry.name.match(/[Ee]p?(\d+)/) ||
                                        entry.name.match(/[Ee]pisode[._\s]?(\d+)/);
                        
                        var detectedEpNum = epNumMatch ? parseInt(epNumMatch[1]) : epIndex;
                        
                        // Extract quality info from filename
                        var epQuality = entry.name.match(/(\d{3,4}p|720p|1080p|2160p|4[kK]|HDR|Blu-?ray|WEB-?DL|WEBRip|HDTV)/i);
                        
                        // Generate clean episode title from filename
                        var epTitle = entry.name.replace(/\.[^.]+$/, ''); // Remove extension
                        // Try to extract episode title after S01E01 pattern
                        var titleMatch = epTitle.match(/[Ss]\d+[Ee]\d+[^a-zA-Z0-9]*(.*)/i);
                        if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 0) {
                            epTitle = titleMatch[1].replace(/[._-]/g, ' ').trim();
                        } else {
                            epTitle = 'Episode ' + detectedEpNum;
                        }
                        
                        season.episodes.push({
                            handle: entry,
                            fileName: entry.name,
                            episodeNumber: detectedEpNum,
                            title: epTitle,
                            fileSize: epSize,
                            quality: epQuality ? epQuality[1] : '',
                            seasonHandle: season.handle
                        });
                    }
                    
                    // Detect subtitle files for episodes
                    if (epLo.endsWith('.srt') || epLo.endsWith('.vtt') || epLo.endsWith('.ass') || 
                        epLo.endsWith('.ssa') || epLo.endsWith('.sub')) {
                        season.subtitleFiles.push(entry);
                    }
                }
            }
            
            // Sort episodes by detected episode number
            season.episodes.sort(function(a, b) {
                return a.episodeNumber - b.episodeNumber;
            });
            
        } catch(e) {
            console.warn('Could not scan season ' + season.seasonNumber + ':', e);
        }
    }
    
    if (totalEpisodes === 0) {
        return { reason: 'No video files found in seasons' };
    }
    
    // Return complete TV show object
    return {
        tvshow: {
            title: match[1].trim(),
            year: match[2],
            posterHandle: posterHandle,
            fanartHandle: fanartHandle,
            logoHandle: logoHandle,
            hasNfo: !!nfoHandle,
            fileSize: totalSize,
            relativePath: rootName + '/' + fh.name,
            fullPath: fullPath,
            videoFilePath: fullPath,  // For TV shows, this is the show folder path
            folderHandle: fh,  // Store folder handle for subtitle scanning & path resolution
            libraryRoot: rootName,  // Store root name for path building
            posterUrl: null,
            logoUrl: null,
            fanartUrl: null,
            nfoData: nfoData,
            isTVShow: true,
            seasonFolders: seasonFolders,
            seasonPosters: seasonPosters,
            totalSeasons: seasonFolders.length,
            totalEpisodes: totalEpisodes,
            themeHandle: themeHandle
        }
    };
}

async function scanFolders(dirs) {
    window.allMovies = [];
    window.skippedFolders = [];
    
    // Store root folder handles and names for path resolution
    window._folderRootMap = new Map();
    for (var d = 0; d < dirs.length; d++) {
        window._folderRootMap.set(dirs[d].name, dirs[d]);
    }
    
    // Also persist folder names to IndexedDB for session resume
    try {
        if (window.DBUtils && window.DBUtils.saveSetting) {
            var folderNames = dirs.map(function(d) { return d.name; });
            await window.DBUtils.saveSetting('folderNames', folderNames);
        }
    } catch(e) {}
    
    // Calculate total entries first for accurate progress
    var allDirEntries = [];
    for (var d = 0; d < dirs.length; d++) {
        var dir = dirs[d];
        var entries = [];
        try {
            for await (var entry of dir.values()) {
                if (entry.kind === 'directory') {
                    entries.push(entry);
                }
            }
        } catch(e) {
            window.skippedFolders.push({ name: dir.name || 'Unknown', reason: 'Access denied' });
            continue;
        }
        allDirEntries.push({ dir: dir, entries: entries });
    }
    
    // Calculate total items across all directories
    var totalItems = allDirEntries.reduce(function(sum, de) { return sum + de.entries.length; }, 0);
    var processedItems = 0;
    var scanStartTime = Date.now();
    
    // Update progress bar
    var loadingBarFill = document.getElementById('loadingBarFill');
    
    for (var d = 0; d < allDirEntries.length; d++) {
        var dirEntry = allDirEntries[d];
        var dir = dirEntry.dir;
        var entries = dirEntry.entries;
        
        document.getElementById('loadingText').textContent = 
            'Scanning: ' + dir.name + ' (' + entries.length + ' folders)';
        
        for (var i = 0; i < entries.length; i++) {
            processedItems++;
            var pct = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0;
            
            // Calculate ETA
            var elapsed = Date.now() - scanStartTime;
            var avgTimePerItem = processedItems > 0 ? elapsed / processedItems : 0;
            var remaining = avgTimePerItem * (totalItems - processedItems);
            var etaStr = '';
            if (remaining > 1000) {
                var etaSec = Math.ceil(remaining / 1000);
                if (etaSec > 60) {
                    etaStr = ' | ETA: ' + Math.floor(etaSec / 60) + 'm ' + (etaSec % 60) + 's';
                } else {
                    etaStr = ' | ETA: ' + etaSec + 's';
                }
            }
            
            document.getElementById('loadingProgress').textContent = 
                processedItems + ' / ' + totalItems + ' (' + pct + '%)' + etaStr + ' | Found: ' + window.allMovies.length;
            
            // Update progress bar
            if (loadingBarFill) {
                loadingBarFill.style.width = pct + '%';
            }
            
            // First try to process as TV show folder
            var r = await processTVShowFolder(entries[i], dir.name);
            if (r.tvshow) {
                window.allMovies.push(r.tvshow);
            } else {
                // If not a TV show, try processing as movie
                r = await processMovieFolder(entries[i], dir.name);
                if (r.movie) {
                    window.allMovies.push(r.movie);
                } else if (r.reason) {
                    window.skippedFolders.push({ name: entries[i].name, reason: r.reason });
                }
            }
        }
    }
    
    window.allMovies.sort(function(a, b) {
        return a.title.localeCompare(b.title);
    });
}

// ============================================================================
// POSTER LOADING WITH CACHE - Centralized poster loading with IndexedDB cache
// ============================================================================

var POSTER_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
var THUMBNAIL_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Convert a Blob/File to a data URL string
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} Data URL string
 */
function blobToDataUrl(blob) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onloadend = function() { resolve(reader.result); };
        reader.onerror = function() { reject(new Error('FileReader failed')); };
        reader.readAsDataURL(blob);
    });
}

/**
 * Build a unique cache path for a movie/TV show poster
 * Uses the movie's fullPath combined with the poster filename
 * @param {Object} m - Movie or TV show object
 * @returns {string} Unique path string for the thumbnail cache key
 */
function buildPosterCachePath(m) {
    var basePath = m.fullPath || m.relativePath || m.title || '';
    var posterName = (m.posterHandle && m.posterHandle.name) ? m.posterHandle.name : 'poster.jpg';
    return basePath + '/' + posterName;
}

/**
 * Load a poster for a movie/TV show with IndexedDB caching
 * Checks thumbnail cache (data URLs, 7-day TTL) first, then poster cache (blobs, 24h TTL), then file system
 * 
 * @param {Object} m - Movie or TV show object with posterHandle
 * @returns {Promise<string|null>} Poster URL (data URL or object URL) or null
 */
window.loadPosterForMovie = async function(m) {
    if (!m || !m.posterHandle) return null;

    // If already loaded in memory, return it
    if (m.posterUrl) return m.posterUrl;

    var cachePath = buildPosterCachePath(m);

    // Step 1: Check thumbnail cache (data URLs, 7-day TTL)
    if (window.getThumbnail) {
        try {
            var thumbCached = await window.getThumbnail(cachePath);
            if (thumbCached && thumbCached.dataUrl && thumbCached.timestamp) {
                var thumbAge = Date.now() - thumbCached.timestamp;
                if (thumbAge < THUMBNAIL_CACHE_TTL) {
                    // Cache hit - use data URL directly (no need for object URLs)
                    m.posterUrl = thumbCached.dataUrl;
                    m._posterFromCache = true;
                    return m.posterUrl;
                }
            }
        } catch(e) {
            // Thumbnail cache lookup failed, continue to next cache layer
        }
    }

    // Step 2: Check poster blob cache (24h TTL with file modification check)
    if (window.DBUtils && window.DBUtils.getCachedPoster) {
        try {
            var cached = await window.DBUtils.getCachedPoster(m.title);
            if (cached && cached.blob && cached.timestamp) {
                var age = Date.now() - cached.timestamp;
                // Check if cache is less than 24 hours old
                if (age < POSTER_CACHE_TTL) {
                    // Check if poster file was modified since caching
                    try {
                        var currentFile = await m.posterHandle.getFile();
                        // If the file wasn't modified since we cached it, use the cache
                        if (currentFile.lastModified <= cached.timestamp) {
                            if (m.posterUrl && m.posterUrl.startsWith('blob:')) URL.revokeObjectURL(m.posterUrl);
                            m.posterUrl = URL.createObjectURL(cached.blob);
                            m._posterFromCache = true;

                            // Also save to thumbnail cache for faster next load
                            try {
                                var dataUrl = await blobToDataUrl(cached.blob);
                                await window.saveThumbnail(cachePath, dataUrl);
                            } catch(e2) {}

                            return m.posterUrl;
                        }
                        // File was modified - invalidate cache and reload
                    } catch(e) {
                        // Can't check file modification, use cache anyway if fresh
                        if (m.posterUrl && m.posterUrl.startsWith('blob:')) URL.revokeObjectURL(m.posterUrl);
                        m.posterUrl = URL.createObjectURL(cached.blob);
                        m._posterFromCache = true;
                        return m.posterUrl;
                    }
                }
            }
        } catch(e) {
            // Cache lookup failed, continue to load from file
        }
    }

    // Step 3: Load from file system
    try {
        var f = await m.posterHandle.getFile();
        if (m.posterUrl && m.posterUrl.startsWith('blob:')) URL.revokeObjectURL(m.posterUrl);
        m.posterUrl = URL.createObjectURL(f);
        m._posterFromCache = false;

        // Cache the poster blob in posterCache (IndexedDB)
        if (window.DBUtils && window.DBUtils.cachePoster) {
            try {
                await window.DBUtils.cachePoster(m.title, f);
            } catch(e) {
                // Caching failed, non-critical
            }
        }

        // Also save to thumbnail cache as data URL for faster subsequent loads
        if (window.saveThumbnail) {
            try {
                var thumbDataUrl = await blobToDataUrl(f);
                await window.saveThumbnail(cachePath, thumbDataUrl);
            } catch(e) {
                // Thumbnail caching failed, non-critical
            }
        }

        return m.posterUrl;
    } catch(e) {
        return null;
    }
};

// Export for use in other modules
window.Scanner = { processMovieFolder, processTVShowFolder, scanFolders, buildFullPath, buildVideoPath, VIDEO_EXTS, IMG_EXTS, MOVIE_REGEX, SEASON_REGEX };
