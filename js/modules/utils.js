// Movie Library - Utility Functions Module
// Common helper functions used throughout the app

// Constants
var TOAST_DURATION_MS = 4000;

// Toast duration by type
var TOAST_DURATIONS = {
    'success': 3000,
    'info': 3000,
    'warning': 5000,
    'error': 7000,
    '': 4000
};

/**
 * Display a toast notification message
 * Enhanced with close button, progress bar, auto-dismiss timer
 * @param {string} msg - Message to display
 * @param {string} type - Toast type (success, warning, error, info)
 * @param {Object} [options] - Optional settings
 * @param {string} [options.action] - Action button text (e.g., "Resume")
 * @param {Function} [options.onAction] - Callback when action button is clicked
 * @param {number} [options.duration] - Custom duration in ms
 */
function showToast(msg, type, options) {
    var container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }
    
    // Limit to 5 toasts max
    var existingToasts = container.querySelectorAll('.toast');
    if (existingToasts.length >= 5) {
        existingToasts[0].remove();
    }
    
    var toastType = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast ' + toastType;
    
    // Add message text
    var msgSpan = document.createElement('span');
    msgSpan.textContent = msg;
    toast.appendChild(msgSpan);
    
    // Add close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dismissToast(toast);
    });
    toast.appendChild(closeBtn);
    
    // Add action button if provided
    if (options && options.action) {
        var actionBtn = document.createElement('button');
        actionBtn.className = 'toast-action-btn';
        actionBtn.textContent = options.action;
        actionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (typeof options.onAction === 'function') {
                options.onAction();
            }
            dismissToast(toast);
        });
        toast.appendChild(actionBtn);
    }
    
    // Add progress bar
    var duration = (options && options.duration) ? options.duration :
        ((options && options.action) ? 8000 : (TOAST_DURATIONS[toastType] || TOAST_DURATION_MS));
    var progress = document.createElement('div');
    progress.className = 'toast-progress';
    progress.style.animationDuration = duration + 'ms';
    toast.appendChild(progress);
    
    container.appendChild(toast);
    
    // Announce to screen readers
    var ariaRegion = document.getElementById('ariaLiveRegion');
    if (ariaRegion) {
        ariaRegion.textContent = msg;
    }
    
    // Auto-dismiss
    var timeoutId = setTimeout(function() { dismissToast(toast); }, duration);
    toast._timeoutId = timeoutId;
    
    // Pause timer on hover
    toast.addEventListener('mouseenter', function() {
        clearTimeout(toast._timeoutId);
        progress.style.animationPlayState = 'paused';
    });
    toast.addEventListener('mouseleave', function() {
        progress.style.animationPlayState = 'running';
        toast._timeoutId = setTimeout(function() { dismissToast(toast); }, 2000);
    });
}

/**
 * Dismiss a toast with exit animation
 * @param {HTMLElement} toast - The toast element to dismiss
 */
function dismissToast(toast) {
    if (!toast || !toast.parentElement) return;
    clearTimeout(toast._timeoutId);
    toast.classList.add('toast-exit');
    setTimeout(function() {
        if (toast.parentElement) toast.remove();
    }, 300);
}

/**
 * Format bytes into human-readable string
 * @param {number} bytes - Number of bytes to format
 * @returns {string} Formatted string (e.g., "1.5 GB")
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + 'BKMGTP'[i] + 'B';
}

/**
 * Escape HTML special characters to prevent XSS
 * Uses string-based replacement for better performance
 * @param {string} s - String to escape
 * @returns {string} HTML-escaped string
 */
function escHtml(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Export for use in other modules
window.Utils = { showToast: showToast, formatBytes: formatBytes, escHtml: escHtml };
