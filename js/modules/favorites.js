/**
 * Movie Library - Favorites Module
 * Handles favorite movies/TV shows with localStorage persistence
 * Also includes Random Pick ("I'm Feeling Lucky") feature
 */

var FAVORITES_KEY = 'movieLibFavorites';

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch(e) {
        return [];
    }
}

function saveFavorites(favs) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

window.isFavorite = function(title) {
    var favs = getFavorites();
    return favs.indexOf(title) !== -1;
};

window.toggleFavorite = function(title) {
    var favs = getFavorites();
    var idx = favs.indexOf(title);
    if (idx === -1) {
        favs.push(title);
        window.Utils.showToast('Added to favorites', 'success');
    } else {
        favs.splice(idx, 1);
        window.Utils.showToast('Removed from favorites', 'warning');
    }
    saveFavorites(favs);
    return idx === -1; // true if now favorite
};

window.getFavorites = getFavorites;

window.renderFavoritesTab = function() {
    var container = document.getElementById('favoritesContainer');
    var emptyState = document.getElementById('favoritesEmptyState');
    var filterCount = document.getElementById('sharedFilterCount');
    if (!container) return;

    var favTitles = getFavorites();
    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var sortSelect = document.getElementById('sharedSortSelect');
    var s = sortSelect ? sortSelect.value : 'name-asc';

    var items = window.allMovies.filter(function(m) {
        return favTitles.indexOf(m.title) !== -1;
    });

    // Apply search filter
    if (q) {
        items = items.filter(function(m) {
            return m.title.toLowerCase().includes(q) || m.year.includes(q);
        });
    }

    // Sort
    if (typeof sortItems === 'function') {
        sortItems(items, s);
    } else {
        items.sort(function(a, b) { return a.title.localeCompare(b.title); });
    }

    if (filterCount) {
        filterCount.textContent = items.length + ' favorite' + (items.length !== 1 ? 's' : '');
    }

    if (items.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    if (typeof buildCardGrid === 'function') {
        container.innerHTML = buildCardGrid(items, 'favorites');
        if (typeof observeImages === 'function') observeImages(container);
    }
    if (typeof populateGenreDropdowns === 'function') {
        populateGenreDropdowns();
    }
};

window.toggleFavoriteCard = function(title) {
    window.toggleFavorite(title);
    var activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        var tab = activeTab.dataset.tab;
        if (tab === 'all' && typeof renderAllTab === 'function') renderAllTab();
        else if (tab === 'movies' && typeof filterMovies === 'function') filterMovies();
        else if (tab === 'tvshows' && typeof renderTVShows === 'function') renderTVShows();
        else if (tab === 'animation' && typeof renderAnimationTab === 'function') renderAnimationTab();
        else if (tab === 'anime' && typeof renderAnimeTab === 'function') renderAnimeTab();
        else if (tab === 'favorites') window.renderFavoritesTab();
    }
};

window.toggleFavoriteFromDetail = function(idx) {
    var m = window.filteredMovies[idx];
    if (!m) return;
    var isNowFav = window.toggleFavorite(m.title);
    var btns = document.querySelectorAll('.detail-fav-btn');
    btns.forEach(function(btn) {
        if (isNowFav) {
            btn.classList.add('favorited');
            var svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', 'currentColor');
            var textNode = btn.childNodes[btn.childNodes.length - 1];
            if (textNode) textNode.textContent = 'Favorited';
        } else {
            btn.classList.remove('favorited');
            var svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', 'none');
            var textNode = btn.childNodes[btn.childNodes.length - 1];
            if (textNode) textNode.textContent = 'Favorite';
        }
    });
};

// ============================================================================
// RANDOM PICK - "I'm Feeling Lucky" Feature
// ============================================================================

window.randomPick = function() {
    if (!window.allMovies || window.allMovies.length === 0) {
        window.Utils.showToast('No movies in library', 'warning');
        return;
    }
    var randomIdx = Math.floor(Math.random() * window.allMovies.length);
    window.filteredMovies = window.allMovies;
    window.DetailPage.showDetailPage(randomIdx);
    window.Utils.showToast('Random pick: ' + window.allMovies[randomIdx].title, 'success');
};

window.Favorites = { toggleFavorite: window.toggleFavorite, isFavorite: window.isFavorite, getFavorites: getFavorites, renderFavoritesTab: window.renderFavoritesTab };
