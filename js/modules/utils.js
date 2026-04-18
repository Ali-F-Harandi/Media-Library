// Movie Library - Utility Functions Module
// Common helper functions used throughout the app

// Constants
var TOAST_DURATION_MS = 4000;

/**
 * Display a toast notification message
 * @param {string} msg - Message to display
 * @param {string} type - Toast type (success, warning, error, info)
 */
function showToast(msg, type) {
    var container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, TOAST_DURATION_MS);
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
