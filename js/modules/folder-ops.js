// Movie Library - Folder Operations Module
// Handles folder selection and session management

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
        
        if (handles.length === 0) {
            folderList.innerHTML = '<div class="empty-folders-message">No folders added yet. Click "Add New Folder" to get started.</div>';
        } else {
            var html = '<ul class="folder-list-inner" style="list-style:none;margin:0;padding:0">';
            for (var i = 0; i < handles.length; i++) {
                var handle = handles[i];
                var name = handle.name || 'Folder ' + (i + 1);
                html += '<li class="folder-item">' +
                    '<svg class="folder-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
                    '<span class="folder-item-name">' + window.Utils.escHtml(name) + '</span>' +
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

async function removeFolder(index) {
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
    
    await window.Scanner.scanFolders(dirs);
    
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('appContainer').classList.add('active');
    window.UIRenderer.updateStats();
    window.UIRenderer.filterMovies();
    window.Utils.showToast('Found ' + window.allMovies.length + ' movies', 'success');
}

// Export for use in other modules
window.FolderOps = { selectFolder, addFolder, resumeSession, startScanning, openManageFolders, closeManageFolders, removeFolder, addFolderFromModal };
