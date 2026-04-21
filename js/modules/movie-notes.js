/**
 * Movie Library - Movie Notes Module
 * Allows users to add personal text notes for any movie
 * Stored in localStorage key 'movieLibNotes' as JSON object { "title": "note text" }
 */

var MOVIE_NOTES_KEY = 'movieLibNotes';

/**
 * Get all notes from localStorage
 * @returns {Object} Notes object keyed by movie title
 */
function _getAllNotes() {
    try {
        return JSON.parse(localStorage.getItem(MOVIE_NOTES_KEY)) || {};
    } catch(e) {
        return {};
    }
}

/**
 * Save all notes to localStorage
 * @param {Object} notes - Notes object to save
 */
function _saveAllNotes(notes) {
    try {
        localStorage.setItem(MOVIE_NOTES_KEY, JSON.stringify(notes));
    } catch(e) {
        // localStorage quota exceeded
    }
}

/**
 * Get a note for a specific movie
 * @param {string} title - Movie title
 * @returns {string|null} Note text or null if no note
 */
window.getMovieNote = function(title) {
    if (!title) return null;
    var notes = _getAllNotes();
    return notes[title] || null;
};

/**
 * Set a note for a specific movie
 * @param {string} title - Movie title
 * @param {string} noteText - Note text to save
 */
window.setMovieNote = function(title, noteText) {
    if (!title) return;
    var notes = _getAllNotes();
    if (noteText && noteText.trim()) {
        notes[title] = noteText.trim();
    } else {
        delete notes[title];
    }
    _saveAllNotes(notes);
};

/**
 * Remove a note for a specific movie
 * @param {string} title - Movie title
 */
window.removeMovieNote = function(title) {
    if (!title) return;
    var notes = _getAllNotes();
    delete notes[title];
    _saveAllNotes(notes);
};

/**
 * Render a note indicator icon for a movie card
 * Shows a small notepad icon if the movie has a note, empty string otherwise
 * @param {string} title - Movie title
 * @returns {string} HTML string for the note indicator or empty string
 */
window.renderNoteIndicator = function(title) {
    var note = window.getMovieNote(title);
    if (!note) return '';
    var escapedNote = window.Utils ? window.Utils.escHtml(note) : note.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    // Truncate tooltip for long notes
    var tooltip = escapedNote.length > 100 ? escapedNote.substring(0, 100) + '...' : escapedNote;
    return '<span class="note-indicator" title="' + tooltip + '" onclick="event.stopPropagation();showMovieNoteDialog(\'' + title.replace(/'/g, "\\'") + '\')">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
            '<polyline points="14 2 14 8 20 8"/>' +
            '<line x1="16" y1="13" x2="8" y2="13"/>' +
            '<line x1="16" y1="17" x2="8" y2="17"/>' +
        '</svg>' +
    '</span>';
};

/**
 * Show a dialog to add/edit a note for a movie
 * @param {string} title - Movie title
 */
window.showMovieNoteDialog = function(title) {
    if (!title) return;
    var existingNote = window.getMovieNote(title) || '';

    // Remove any existing note dialog
    var existing = document.getElementById('movieNoteDialog');
    if (existing) existing.remove();

    var dialog = document.createElement('div');
    dialog.id = 'movieNoteDialog';
    dialog.className = 'movie-note-dialog';
    dialog.innerHTML =
        '<div class="movie-note-overlay" onclick="closeMovieNoteDialog()"></div>' +
        '<div class="movie-note-content">' +
            '<div class="movie-note-header">' +
                '<h3>' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    'Note for ' + (window.Utils ? window.Utils.escHtml(title) : title) +
                '</h3>' +
                '<button class="movie-note-close" onclick="closeMovieNoteDialog()">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
            '</div>' +
            '<textarea class="movie-note-textarea" id="movieNoteTextarea" placeholder="Write a personal note about this movie...">' + (window.Utils ? window.Utils.escHtml(existingNote) : existingNote) + '</textarea>' +
            '<div class="movie-note-actions">' +
                (existingNote ? '<button class="movie-note-delete" onclick="removeMovieNote(\'' + title.replace(/'/g, "\\'") + '\');closeMovieNoteDialog();if(typeof showToast===\'function\')showToast(\'Note deleted\',\'success\');else if(window.Utils)window.Utils.showToast(\'Note deleted\',\'success\');">Delete Note</button>' : '') +
                '<button class="movie-note-save" onclick="saveMovieNoteFromDialog(\'' + title.replace(/'/g, "\\'") + '\')">Save Note</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(dialog);
    requestAnimationFrame(function() {
        dialog.classList.add('active');
        var textarea = document.getElementById('movieNoteTextarea');
        if (textarea) textarea.focus();
    });
};

/**
 * Save note from dialog textarea
 * @param {string} title - Movie title
 */
window.saveMovieNoteFromDialog = function(title) {
    var textarea = document.getElementById('movieNoteTextarea');
    if (!textarea) return;
    var noteText = textarea.value;
    window.setMovieNote(title, noteText);
    window.closeMovieNoteDialog();
    if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast('Note saved', 'success');
    }
};

/**
 * Close the movie note dialog
 */
window.closeMovieNoteDialog = function() {
    var dialog = document.getElementById('movieNoteDialog');
    if (dialog) {
        dialog.classList.remove('active');
        setTimeout(function() {
            if (dialog.parentElement) dialog.remove();
        }, 200);
    }
};

/**
 * Render note section for the detail page
 * @param {string} title - Movie title
 * @returns {string} HTML string for note section in detail page
 */
window.renderDetailNoteSection = function(title) {
    if (!title) return '';
    var note = window.getMovieNote(title);
    var safeTitle = title.replace(/'/g, "\\'");
    var html = '<div class="detail-note-section">' +
        '<div class="detail-note-header">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
            '<span>Personal Note</span>' +
            '<button class="detail-note-edit-btn" onclick="showMovieNoteDialog(\'' + safeTitle + '\')">' +
                (note ? 'Edit' : 'Add Note') +
            '</button>' +
        '</div>';
    if (note) {
        var escapedNote = window.Utils ? window.Utils.escHtml(note) : note.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += '<div class="detail-note-text">' + escapedNote.replace(/\n/g, '<br>') + '</div>';
    } else {
        html += '<div class="detail-note-empty">No note yet. Click "Add Note" to write one.</div>';
    }
    html += '</div>';
    return html;
};
