// Movie Library - Utility Functions Module
// Common helper functions used throughout the app

// Constants
var TOAST_DURATION_MS = 4000;

/**
 * Display a toast notification message
 * @param {string} msg - Message to display
 * @param {string} type - Toast type (success, warning, error, info)
 * @param {Object} [options] - Optional settings
 * @param {string} [options.action] - Action button text (e.g., "Resume")
 * @param {Function} [options.onAction] - Callback when action button is clicked
 */
function showToast(msg, type, options) {
    var container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    
    // Add message text
    var msgSpan = document.createElement('span');
    msgSpan.textContent = msg;
    toast.appendChild(msgSpan);
    
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
            toast.remove();
        });
        toast.appendChild(actionBtn);
    }
    
    container.appendChild(toast);
    // Extend duration when action button is present
    var duration = (options && options.action) ? 8000 : TOAST_DURATION_MS;
    setTimeout(function() { if (toast.parentElement) toast.remove(); }, duration);
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
 * @param {string} s - String to escape
 * @returns {string} HTML-escaped string
 */
function escHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// Export for use in other modules
window.Utils = { showToast, formatBytes, escHtml };
