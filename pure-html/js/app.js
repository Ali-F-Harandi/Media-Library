/**
 * Main Application Logic for BilKo's PC
 * Pure JavaScript implementation (no React/Node.js required)
 */

// Global state
let saveData = null;
let fileName = '';
let error = null;
let gen1Data = null;

// DOM Elements
let landingPage;
let mainApp;
let dropZone;
let fileInput;
let changeFileInput;
let fileNameDisplay;
let downloadBtn;
let backBtn;
let errorMessage;
let appError;
let gen1InfoContainer;

/**
 * Initialize the application
 */
function init() {
    // Get DOM elements
    landingPage = document.getElementById('landing-page');
    mainApp = document.getElementById('main-app');
    dropZone = document.getElementById('drop-zone');
    fileInput = document.getElementById('file-input');
    changeFileInput = document.getElementById('change-file-input');
    fileNameDisplay = document.getElementById('file-name-display');
    downloadBtn = document.getElementById('download-btn');
    backBtn = document.getElementById('back-btn');
    errorMessage = document.getElementById('error-message');
    appError = document.getElementById('app-error');
    gen1InfoContainer = document.getElementById('gen1-info-container');

    // Setup event listeners
    setupEventListeners();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Drop zone click
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    changeFileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // Download button
    downloadBtn.addEventListener('click', downloadSaveFile);

    // Back button
    backBtn.addEventListener('click', goBackToLanding);
}

/**
 * Handle file selection from input
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    loadFile(file);
}

/**
 * Handle drag over event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('ring-4', 'ring-green-500', 'scale-105');
    
    document.getElementById('drop-message').classList.add('hidden');
    document.getElementById('drag-message').classList.remove('hidden');
}

/**
 * Handle drag leave event
 */
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('ring-4', 'ring-green-500', 'scale-105');
    
    document.getElementById('drop-message').classList.remove('hidden');
    document.getElementById('drag-message').classList.add('hidden');
}

/**
 * Handle drop event
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('ring-4', 'ring-green-500', 'scale-105');
    
    document.getElementById('drop-message').classList.remove('hidden');
    document.getElementById('drag-message').classList.add('hidden');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        loadFile(files[0]);
    }
}

/**
 * Load and parse a file
 */
async function loadFile(file) {
    fileName = file.name;
    error = null;
    hideError();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await detectAndParseSave(file);

        if (!result.success) {
            showError(result.error || 'Failed to parse save file');
            return;
        }

        // Success - show main app with Gen 1 data
        gen1Data = result.data;
        saveData = { gen1: true, ...gen1Data };
        
        showMainApp();
        renderGen1SaveInfo();
        
    } catch (err) {
        console.error('Error loading file:', err);
        showError('Critical error during file analysis.');
    }
}

/**
 * Show error message on landing page
 */
function showError(message) {
    error = message;
    document.getElementById('error-text').textContent = message;
    errorMessage.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.classList.add('hidden');
}

/**
 * Show app error
 */
function showAppError(message) {
    appError.textContent = message;
    appError.classList.remove('hidden');
}

/**
 * Hide app error
 */
function hideAppError() {
    appError.classList.add('hidden');
}

/**
 * Show main application
 */
function showMainApp() {
    landingPage.classList.add('hidden');
    mainApp.classList.remove('hidden');
    
    fileNameDisplay.textContent = fileName;
}

/**
 * Go back to landing page
 */
function goBackToLanding() {
    saveData = null;
    gen1Data = null;
    fileName = '';
    
    mainApp.classList.add('hidden');
    landingPage.classList.remove('hidden');
    
    // Reset file inputs
    fileInput.value = '';
    changeFileInput.value = '';
}

/**
 * Render Gen 1 save information
 */
function renderGen1SaveInfo() {
    if (!gen1Data) return;
    
    const html = createGen1SaveInfo(gen1Data);
    gen1InfoContainer.innerHTML = html;
}

/**
 * Download save file
 */
function downloadSaveFile() {
    if (!saveData || !gen1Data) {
        showAppError('No save data to download!');
        return;
    }

    // For Gen 1 saves, we would need to reconstruct the binary
    // For now, show a message that editing is not yet supported
    showAppError('Binary save editing is not yet implemented. You can view your save data but cannot modify and re-download it yet.');
}

/**
 * Handle file load callback (for compatibility)
 */
function handleFileLoad(arrayBuffer, name) {
    fileName = name;
    error = null;
    hideError();

    // Create a File-like object for the parser
    const file = new File([arrayBuffer], name, { type: 'application/octet-stream' });
    loadFile(file);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Make available globally
window.handleFileLoad = handleFileLoad;
