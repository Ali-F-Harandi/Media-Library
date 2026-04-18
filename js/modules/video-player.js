// Movie Library - Video Player Module
// Handles video playback using system's default media player

var currentMovieIndex = -1;

async function playMovie(idx) {
    console.log('[VideoPlayer Debug] playMovie called with index:', idx);
    
    if (idx < 0 || idx >= window.filteredMovies.length) {
        console.error('[VideoPlayer Debug] Invalid index:', idx);
        return;
    }

    currentMovieIndex = idx;
    var m = window.filteredMovies[idx];
    
    console.log('[VideoPlayer Debug] Playing movie:', m.title, 'handle:', m.videoHandle);

    try {
        // Open file using File System Access API - this will use system's default app
        if (m.videoHandle && typeof m.videoHandle.open === 'function') {
            console.log('[VideoPlayer Debug] Opening file with system default player...');
            const file = await m.videoHandle.getFile();
            
            // Create a temporary anchor element to trigger file open
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = m.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up the object URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            console.log('[VideoPlayer Debug] File opened, should launch default player');
            window.Utils.showToast('Opening ' + m.title + ' in default player...', 'success');
        } else {
            console.error('[VideoPlayer Debug] videoHandle or open method not available');
            window.Utils.showToast('Cannot open file: File handle not available', 'warning');
        }
    } catch(e) {
        console.error('[VideoPlayer Debug] Error opening movie:', e);
        window.Utils.showToast('Error opening video: ' + e.message, 'warning');
    }
}

function closePlayer() {
    var v = document.getElementById('videoPlayer');
    if (v) {
        v.pause();
        v.removeAttribute('src');
        v.load();
    }
    document.getElementById('playerModal').classList.remove('active');
}

// Export for use in other modules
window.VideoPlayer = { 
    playMovie, 
    closePlayer, 
    getCurrentIndex: function() { return currentMovieIndex; }, 
    setCurrentIndex: function(i) { currentMovieIndex = i; } 
};
