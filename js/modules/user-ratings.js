/**
 * User Star Rating Module
 * Provides a 5-star user rating system stored in localStorage.
 * Ratings persist across sessions and are displayed on cards and detail pages.
 */

var USER_RATINGS_KEY = 'movieLibUserRatings';

// ============================================================================
// INTERNAL: Load all ratings from localStorage
// ============================================================================
function _loadUserRatings() {
    try {
        var data = localStorage.getItem(USER_RATINGS_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

// ============================================================================
// INTERNAL: Save all ratings to localStorage
// ============================================================================
function _saveUserRatings(ratings) {
    try {
        localStorage.setItem(USER_RATINGS_KEY, JSON.stringify(ratings));
    } catch (e) {
        // localStorage full or unavailable — fail silently
    }
}

// ============================================================================
// GET USER RATING — returns 1-5 or 0 if not rated
// ============================================================================
window.getUserRating = function(title) {
    if (!title) return 0;
    var ratings = _loadUserRatings();
    return ratings[title] || 0;
};

// ============================================================================
// SET USER RATING — saves rating (1-5), updates UI
// ============================================================================
window.setUserRating = function(title, rating) {
    if (!title) return;
    rating = parseInt(rating, 10);
    if (rating < 1 || rating > 5) return;

    var ratings = _loadUserRatings();
    // Toggle off if clicking the same rating
    if (ratings[title] === rating) {
        delete ratings[title];
        _saveUserRatings(ratings);
        _refreshRatingWidgets(title, 0);
        if (typeof window.showToast === 'function') {
            window.showToast('Rating removed for ' + title, 'warning');
        }
        return;
    }

    ratings[title] = rating;
    _saveUserRatings(ratings);
    _refreshRatingWidgets(title, rating);
    if (typeof window.showToast === 'function') {
        window.showToast('Rated ' + title + ': ' + rating + '/5', 'success');
    }
};

// ============================================================================
// REMOVE USER RATING — removes rating for a title
// ============================================================================
window.removeUserRating = function(title) {
    if (!title) return;
    var ratings = _loadUserRatings();
    delete ratings[title];
    _saveUserRatings(ratings);
    _refreshRatingWidgets(title, 0);
};

// ============================================================================
// GET RATING STATS — returns { total, avg, distribution }
// ============================================================================
window.getRatingStats = function() {
    var ratings = _loadUserRatings();
    var keys = Object.keys(ratings);
    var total = keys.length;
    var sum = 0;
    var distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (var i = 0; i < keys.length; i++) {
        var val = ratings[keys[i]];
        sum += val;
        if (distribution[val] !== undefined) {
            distribution[val]++;
        }
    }

    var avg = total > 0 ? (sum / total) : 0;
    return { total: total, avg: Math.round(avg * 10) / 10, distribution: distribution };
};

// ============================================================================
// STAR SVG ICON — returns SVG string for a star
// ============================================================================
function _starSvg() {
    return '<svg viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>';
}

// ============================================================================
// RENDER STAR RATING WIDGET — returns HTML string for interactive 5-star widget
// ============================================================================
window.renderStarRating = function(title, size) {
    if (!title) return '';
    var currentRating = window.getUserRating(title);
    var sizeClass = (size === 'lg') ? 'lg' : 'sm';
    var tooltipText = currentRating > 0 ? 'Click to remove rating' : 'Click to rate';
    var safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    var html = '<div class="user-star-rating ' + sizeClass + '" data-rating-title="' + safeTitle + '" title="' + tooltipText + '">';

    for (var star = 1; star <= 5; star++) {
        var filledClass = (star <= currentRating) ? ' filled' : '';
        html += '<button class="star-btn' + filledClass + '" data-star="' + star + '" ' +
            'onclick="event.stopPropagation();_handleStarClick(\'' + safeTitle + '\',' + star + ')" ' +
            'onmouseenter="_handleStarHover(this,' + star + ')" ' +
            'onmouseleave="_handleStarLeave(this)" ' +
            'title="' + tooltipText + '">' +
            _starSvg() +
        '</button>';
    }

    html += '</div>';
    return html;
};

// ============================================================================
// HANDLE STAR CLICK — set or toggle rating
// ============================================================================
window._handleStarClick = function(title, star) {
    var currentRating = window.getUserRating(title);
    if (currentRating === star) {
        // Toggle off — remove rating
        window.removeUserRating(title);
        if (typeof window.showToast === 'function') {
            window.showToast('Rating removed for ' + title, 'warning');
        }
    } else {
        window.setUserRating(title, star);
    }
};

// ============================================================================
// HANDLE STAR HOVER — preview fill on hover
// ============================================================================
window._handleStarHover = function(btn, starNum) {
    var container = btn.parentElement;
    if (!container) return;
    var buttons = container.querySelectorAll('.star-btn');
    for (var i = 0; i < buttons.length; i++) {
        var s = parseInt(buttons[i].dataset.star, 10);
        if (s <= starNum) {
            buttons[i].classList.add('hover-preview');
        } else {
            buttons[i].classList.remove('hover-preview');
        }
    }
};

// ============================================================================
// HANDLE STAR LEAVE — remove hover preview
// ============================================================================
window._handleStarLeave = function(btn) {
    var container = btn.parentElement;
    if (!container) return;
    var buttons = container.querySelectorAll('.star-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('hover-preview');
    }
};

// ============================================================================
// REFRESH RATING WIDGETS — update all star widgets for a given title
// ============================================================================
function _refreshRatingWidgets(title, newRating) {
    if (!title) return;

    // Find all star rating widgets for this title and update them
    var widgets = document.querySelectorAll('.user-star-rating');
    for (var w = 0; w < widgets.length; w++) {
        var widget = widgets[w];
        if (widget.dataset.ratingTitle !== title) continue;

        var buttons = widget.querySelectorAll('.star-btn');
        for (var b = 0; b < buttons.length; b++) {
            var starVal = parseInt(buttons[b].dataset.star, 10);
            if (starVal <= newRating) {
                buttons[b].classList.add('filled');
            } else {
                buttons[b].classList.remove('filled');
            }
            // Pop animation on the clicked star
            if (starVal === newRating) {
                buttons[b].classList.add('just-clicked');
                (function(btn) {
                    setTimeout(function() {
                        btn.classList.remove('just-clicked');
                    }, 300);
                })(buttons[b]);
            }
        }

        // Update tooltip
        var tooltipText = newRating > 0 ? 'Click to remove rating' : 'Click to rate';
        widget.title = tooltipText;
        buttons.forEach(function(btn) {
            btn.title = tooltipText;
        });
    }
}
