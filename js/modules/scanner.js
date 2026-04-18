/**
 * Movie Library - Scanner Module
 * 
 * Handles folder scanning and movie detection using the File System Access API.
 * Scans directories for movie folders matching "Movie Name (Year)" pattern,
 * detects video files, poster images, fanart, and NFO metadata files.
 * 
 * @module Scanner
 */

// Supported video file extensions
var VIDEO_EXTS = ['.mp4','.mkv','.webm','.avi','.mov','.wmv','.flv','.m4v','.ts','.mpg','.mpeg'];

// Supported image file extensions for posters and fanart
var IMG_EXTS = ['.jpg','.jpeg','.png','.webp','.gif','.bmp'];

// Regex pattern to match movie folder names: "Movie Name (Year)"
var MOVIE_REGEX = /^(.+?)\s*\((\d{4})\)$/;

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
    
    // Build full absolute path by traversing up the directory tree
    // This creates a complete path like "D:/Movies/American Reunion (2012)"
    var fullPath = '';
    try {
        var currentDir = fh;
        var pathParts = [fh.name];
        
        // Traverse parent directories until reaching root
        while (currentDir && currentDir.parent) {
            try {
                var parentDir = currentDir.parent;
                if (parentDir && parentDir.name) {
                    pathParts.unshift(parentDir.name);
                    currentDir = parentDir;
                } else {
                    break;
                }
            } catch(e) {
                break;
            }
        }
        
        // Join path parts with forward slashes for cross-platform compatibility
        fullPath = pathParts.join('/');
    } catch(e) {
        console.log('[Scanner Debug] Could not build full path:', e);
        fullPath = rootName + '/' + fh.name;
    }
    
    // Store root name for reference (used as fallback for fullPath)
    var libraryRoot = rootName;
    
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
            fullPath: fullPath,  // Full absolute path (e.g., D:/Movies/Movie Name (2012))
            posterUrl: null,
            logoUrl: null,
            fanartUrl: null,
            nfoData: nfoData,
            actorsFolderHandle: actorsFolderHandle,
            actorImages: actorImages  // Map of actor name -> file handle
        }
    };
}

async function scanFolders(dirs) {
    window.allMovies = [];
    window.skippedFolders = [];
    
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
        
        var total = entries.length;
        for (var i = 0; i < entries.length; i++) {
            document.getElementById('loadingProgress').textContent = 
                'Path ' + (d+1) + '/' + dirs.length + ' | ' + (i + 1) + ' / ' + total;
            
            var r = await processMovieFolder(entries[i], dir.name);
            if (r.movie) {
                window.allMovies.push(r.movie);
            } else if (r.reason) {
                window.skippedFolders.push({ name: entries[i].name, reason: r.reason });
            }
        }
    }
    
    window.allMovies.sort(function(a, b) {
        return a.title.localeCompare(b.title);
    });
}

// Export for use in other modules
window.Scanner = { processMovieFolder, scanFolders, VIDEO_EXTS, IMG_EXTS, MOVIE_REGEX };
