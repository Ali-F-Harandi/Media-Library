// Movie Library - Folder Operations Module
// Handles folder selection and session management

var ABSOLUTE_PATH_BY_NAME_KEY = 'movieLibAbsolutePathsByName';

/**
 * Get absolute paths for folders from localStorage (keyed by folder name)
 * Returns an object mapping folder name to absolute path string
 */
window.getAbsolutePathsByName = function() {
    try {
        return JSON.parse(localStorage.getItem(ABSOLUTE_PATH_BY_NAME_KEY)) || {};
    } catch(e) {
        return {};
    }
};

/**
 * Save absolute path for a specific folder by name
 * @param {string} folderName - Name of the folder (matches libraryRoot on movie objects)
 * @param {string} path - Absolute path prefix (e.g. "D:\\Movies\\")
 */
window.saveAbsolutePathByName = function(folderName, path) {
    var paths = window.getAbsolutePathsByName();
    if (path && path.trim()) {
        path = path.trim();
        if (!path.endsWith('/') && !path.endsWith('\\')) {
            path += '/';
        }
        paths[folderName] = path;
    } else {
        delete paths[folderName];
    }
    localStorage.setItem(ABSOLUTE_PATH_BY_NAME_KEY, JSON.stringify(paths));
    window.Utils.showToast(path ? 'Absolute path saved for ' + folderName : 'Absolute path cleared for ' + folderName, 'success');
};

async function selectFolder() {
    if (!window.showDirectoryPicker) {
        window.Utils.showToast('Use Chrome or Edge browser', 'warning');
        return;
    }
    try {
        var dir = await window.showDirectoryPicker({ mode: 'read' });
        await window.DBUtils.saveSetting('folderHandles', [dir]);
        await startScanning([dir]);
    } catch(e) {
        document.getElementById('loadingOverlay').classList.add('hidden');
        if (e.name !== 'AbortError') {
            window.Utils.showToast('Error: ' + e.message, 'warning');
        }
    }
}

async function addFolder() {
    if (!window.showDirectoryPicker) {
        window.Utils.showToast('Use Chrome or Edge browser', 'warning');
        return;
    }
    try {
        var dir = await window.showDirectoryPicker({ mode: 'read' });
        var handles = await window.DBUtils.getSetting('folderHandles') || [];
        
        // Check for duplicates
        var isDuplicate = false;
        for (var i = 0; i < handles.length; i++) {
            if (await handles[i].isSameEntry(dir)) {
                isDuplicate = true;
                break;
            }
        }
        
        if (isDuplicate) {
            window.Utils.showToast('Folder already in library', 'warning');
            return;
        }
        
        handles.push(dir);
        await window.DBUtils.saveSetting('folderHandles', handles);
        await startScanning(handles);
    } catch(e) {
        if (e.name !== 'AbortError') {
            window.Utils.showToast('Error: ' + e.message, 'warning');
        }
    }
}

async function openManageFolders() {
    var modal = document.getElementById('manageFoldersModal');
    var folderList = document.getElementById('folderList');
    
    try {
        var handles = await window.DBUtils.getSetting('folderHandles') || [];
        var folderNames = await window.DBUtils.getSetting('folderNames') || [];
        var absPaths = window.getAbsolutePathsByName();
        
        if (handles.length === 0) {
            folderList.innerHTML = '<div class="empty-folders-message">No folders added yet. Click "Add New Folder" to get started.</div>';
        } else {
            var html = '<ul class="folder-list-inner" style="list-style:none;margin:0;padding:0">';
            for (var i = 0; i < handles.length; i++) {
                var handle = handles[i];
                var name = handle.name || 'Folder ' + (i + 1);
                // Use stored folder name if available for more context
                var displayName = folderNames[i] || name;
                var absPath = absPaths[name] || '';
                html += '<li class="folder-item">' +
                    '<svg class="folder-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
                    '<div class="folder-item-info">' +
                        '<span class="folder-item-name">' + window.Utils.escHtml(displayName) + '</span>' +
                        '<span class="folder-item-path">' + window.Utils.escHtml(name) + '</span>' +
                        '<div class="folder-item-abspath">' +
                            '<input type="text" class="folder-abspath-input" ' +
                                'placeholder="e.g. D:\\Movies\\" ' +
                                'value="' + window.Utils.escHtml(absPath) + '" ' +
                                'data-folder-name="' + window.Utils.escHtml(name) + '" ' +
                                'onchange="saveAbsolutePathByName(\'' + name.replace(/'/g, "\\'") + '\', this.value)" ' +
                                'onkeydown="if(event.key===\'Enter\'){this.blur()}"' +
                            '/>' +
                        '</div>' +
                    '</div>' +
                    '<button class="folder-item-remove" onclick="removeFolder(' + i + ')" title="Remove folder">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                    '</button>' +
                '</li>';
            }
            html += '</ul>';
            folderList.innerHTML = html;
        }
        
        modal.classList.remove('hidden');
        // Trigger reflow for animation
        void modal.offsetWidth;
        modal.classList.add('active');
    } catch(e) {
        console.error('Error loading folders:', e);
        window.Utils.showToast('Failed to load folders', 'warning');
    }
}

function closeManageFolders() {
    var modal = document.getElementById('manageFoldersModal');
    modal.classList.remove('active');
    setTimeout(function() {
        modal.classList.add('hidden');
    }, 300);
}

/**
 * Remove a folder from the library by index
 * @param {number} index - Index of folder in folderHandles array
 */
async function removeFolder(index) {
    // Validate input parameter
    if (typeof index !== 'number' || index < 0) {
        console.error('Invalid folder index:', index);
        window.Utils.showToast('Invalid folder index', 'warning');
        return;
    }
    
    try {
        var handles = await window.DBUtils.getSetting('folderHandles') || [];
        if (index >= 0 && index < handles.length) {
            handles.splice(index, 1);
            await window.DBUtils.saveSetting('folderHandles', handles);
            
            // Refresh the list
            openManageFolders();
            
            // If there are still folders, rescan; otherwise show welcome screen
            if (handles.length > 0) {
                await startScanning(handles);
            } else {
                // No folders left, reset to welcome screen
                document.getElementById('appContainer').classList.remove('active');
                document.getElementById('welcomeScreen').classList.remove('hidden');
                closeManageFolders();
                window.Utils.showToast('All folders removed', 'warning');
            }
        }
    } catch(e) {
        console.error('Error removing folder:', e);
        window.Utils.showToast('Failed to remove folder', 'warning');
    }
}

async function addFolderFromModal() {
    if (!window.showDirectoryPicker) {
        window.Utils.showToast('Use Chrome or Edge browser', 'warning');
        return;
    }
    try {
        var dir = await window.showDirectoryPicker({ mode: 'read' });
        var handles = await window.DBUtils.getSetting('folderHandles') || [];
        
        // Check for duplicates
        var isDuplicate = false;
        for (var i = 0; i < handles.length; i++) {
            if (await handles[i].isSameEntry(dir)) {
                isDuplicate = true;
                break;
            }
        }
        
        if (isDuplicate) {
            window.Utils.showToast('Folder already in library', 'warning');
            return;
        }
        
        handles.push(dir);
        await window.DBUtils.saveSetting('folderHandles', handles);
        
        // Refresh the modal list
        openManageFolders();
        
        // Start scanning with updated folders
        await startScanning(handles);
    } catch(e) {
        if (e.name !== 'AbortError') {
            window.Utils.showToast('Error: ' + e.message, 'warning');
        }
    }
}

async function resumeSession() {
    try {
        var handles = await window.DBUtils.getSetting('folderHandles');
        if (!handles || handles.length === 0) {
            window.Utils.showToast('No saved session found', 'warning');
            return;
        }
        
        var grantedHandles = [];
        for (var i = 0; i < handles.length; i++) {
            try {
                var perm = await handles[i].requestPermission({ mode: 'read' });
                if (perm === 'granted') {
                    grantedHandles.push(handles[i]);
                }
            } catch(e) {}
        }
        
        if (grantedHandles.length > 0) {
            await window.DBUtils.saveSetting('folderHandles', grantedHandles);
            await startScanning(grantedHandles);
        } else {
            window.Utils.showToast('Permission denied. Please re-add folders.', 'warning');
        }
    } catch(e) {
        window.Utils.showToast('Error: ' + e.message, 'warning');
    }
}

async function startScanning(dirs) {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').textContent = 'Scanning folders...';
    document.getElementById('loadingProgress').textContent = '';
    
    // Track recently opened folders
    if (typeof window.addRecentFolder === 'function') {
        dirs.forEach(function(dir) {
            if (dir && dir.name) {
                window.addRecentFolder(dir.name, dir.name);
            }
        });
    }
    
    await window.Scanner.scanFolders(dirs);
    
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('appContainer').classList.add('active');
    window.UIRenderer.updateStats();
    if (typeof window.saveWelcomeStats === 'function') window.saveWelcomeStats();
    window.UIRenderer.filterMovies();
    // Render additional tabs
    if (typeof window.UIRenderer.renderAllTab === 'function') window.UIRenderer.renderAllTab();
    if (typeof window.UIRenderer.renderAnimationTab === 'function') window.UIRenderer.renderAnimationTab();
    if (typeof window.UIRenderer.renderAnimeTab === 'function') window.UIRenderer.renderAnimeTab();
    // Default to "All" tab on first load
    window.switchTab('all');
    var movieCount = window.allMovies.filter(function(m) { return !m.isTVShow; }).length;
    var tvShowCount = window.allMovies.filter(function(m) { return m.isTVShow; }).length;
    var msg = 'Found ' + window.allMovies.length + ' titles';
    if (tvShowCount > 0) {
        msg += ' (' + movieCount + ' movies, ' + tvShowCount + ' TV shows)';
    }
    window.Utils.showToast(msg, 'success');
    // Show library summary toast with size info
    if (typeof window.showLibrarySummary === 'function') window.showLibrarySummary();
}

// Export for use in other modules
window.FolderOps = { selectFolder, addFolder, resumeSession, startScanning, openManageFolders, closeManageFolders, removeFolder, addFolderFromModal };
