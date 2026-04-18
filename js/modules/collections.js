// Movie Library - Collections Module
// Handles collection browsing and display in a separate tab

(function() {
    // Global state for collections
    window.collectionsData = [];
    window.currentCollection = null;

    // Extract all unique collections from movies
    function extractCollections() {
        var collections = {};
        
        window.allMovies.forEach(function(movie) {
            if (movie.nfoData && movie.nfoData.setName) {
                var setName = movie.nfoData.setName;
                if (!collections[setName]) {
                    collections[setName] = {
                        name: setName,
                        overview: movie.nfoData.setOverview || '',
                        movies: []
                    };
                }
                collections[setName].movies.push(movie);
            }
        });
        
        // Convert to array and sort by name
        window.collectionsData = Object.keys(collections).map(function(key) {
            return collections[key];
        }).sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
        
        return window.collectionsData;
    }

    // Render collections grid
    function renderCollections() {
        console.log('[Collections Debug] renderCollections called');
        console.log('[Collections Debug] window.allMovies length:', window.allMovies ? window.allMovies.length : 0);
        
        var container = document.getElementById('collectionsContainer');
        var emptyState = document.getElementById('collectionsEmptyState');
        var countEl = document.getElementById('collectionsCount');
        
        if (!container) {
            console.error('[Collections Debug] collectionsContainer not found');
            return;
        }
        
        extractCollections();
        
        console.log('[Collections Debug] After extract - collectionsData length:', window.collectionsData.length);
        if (window.collectionsData.length > 0) {
            console.log('[Collections Debug] First collection:', window.collectionsData[0].name, 
                'movies:', window.collectionsData[0].movies.length);
        }
        
        countEl.textContent = window.collectionsData.length + ' collection' + 
            (window.collectionsData.length !== 1 ? 's' : '') + ' found';
        
        if (window.collectionsData.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }
        
        emptyState.style.display = 'none';
        
        var html = window.collectionsData.map(function(collection, idx) {
            var posters = collection.movies.slice(0, 4);
            var posterHtml = '<div class="collection-poster-grid">';
            
            posters.forEach(function(movie, i) {
                if (movie.posterUrl) {
                    posterHtml += '<div class="collection-poster-item">' +
                        '<img src="' + movie.posterUrl + '" alt="' + window.Utils.escHtml(movie.title) + '">' +
                    '</div>';
                } else {
                    posterHtml += '<div class="collection-poster-item">' +
                        '<div class="collection-poster-overlay">' + 
                            window.Utils.escHtml(movie.title.substring(0, 2).toUpperCase()) +
                        '</div>' +
                    '</div>';
                }
            });
            
            // Fill remaining slots if less than 4 movies
            for (var i = posters.length; i < 4; i++) {
                posterHtml += '<div class="collection-poster-item">' +
                    '<div class="collection-poster-overlay" style="background:var(--bg-secondary)">+</div>' +
                '</div>';
            }
            
            posterHtml += '</div>';
            
            return '<div class="collection-card" onclick="showCollectionDetail(' + idx + ')">' +
                posterHtml +
                '<div class="collection-info">' +
                    '<div class="collection-name">' + window.Utils.escHtml(collection.name) + '</div>' +
                    '<div class="collection-movie-count">' + collection.movies.length + ' movie' + 
                        (collection.movies.length !== 1 ? 's' : '') + '</div>' +
                    (collection.overview ? 
                        '<div class="collection-overview">' + window.Utils.escHtml(collection.overview) + '</div>' : '') +
                '</div>' +
            '</div>';
        }).join('');
        
        container.innerHTML = html;
        
        // Load poster images
        setTimeout(loadCollectionPosters, 50);
    }

    // Load collection poster images
    async function loadCollectionPosters() {
        var posters = document.querySelectorAll('.collection-poster-item img');
        
        for (var i = 0; i < posters.length; i++) {
            var img = posters[i];
            if (img.classList.contains('loaded')) continue;
            
            var idx = parseInt(img.dataset.idx);
            var collectionIdx = parseInt(img.dataset.collectionIdx);
            
            if (isNaN(idx) || isNaN(collectionIdx)) continue;
            
            var collection = window.collectionsData[collectionIdx];
            if (!collection || !collection.movies[idx]) continue;
            
            var movie = collection.movies[idx];
            
            if (!movie.posterUrl && movie.posterHandle) {
                try {
                    var file = await movie.posterHandle.getFile();
                    movie.posterUrl = URL.createObjectURL(file);
                    img.src = movie.posterUrl;
                    img.classList.add('loaded');
                } catch(e) {}
            }
        }
    }

    // Show collection detail view
    window.showCollectionDetail = function(collectionIdx) {
        console.log('[Collections Debug] showCollectionDetail called with index:', collectionIdx);
        console.log('[Collections Debug] collectionsData:', window.collectionsData);
        
        var collection = window.collectionsData[collectionIdx];
        if (!collection) {
            console.error('[Collections Debug] Collection not found at index:', collectionIdx);
            return;
        }
        
        console.log('[Collections Debug] Found collection:', collection.name, 'with', collection.movies.length, 'movies');
        
        window.currentCollection = collection;
        
        // Update header info
        document.getElementById('collectionDetailTitle').textContent = collection.name;
        document.getElementById('collectionDetailOverview').textContent = collection.overview || '';
        document.getElementById('collectionDetailCount').textContent = 
            collection.movies.length + ' movie' + (collection.movies.length !== 1 ? 's' : '') + ' in collection';
        
        // Render movie grid
        var grid = document.getElementById('collectionDetailGrid');
        if (!grid) {
            console.error('[Collections Debug] collectionDetailGrid element not found');
            return;
        }
        
        var html = collection.movies.map(function(movie, idx) {
            var realIdx = window.allMovies.indexOf(movie);
            console.log('[Collections Debug] Movie', idx, ':', movie.title, 'realIdx:', realIdx);
            var rating = movie.nfoData && movie.nfoData.rating;
            
            return '<div class="movie-card" style="cursor:pointer" onclick="window.Collections.showMovieFromCollection(' + realIdx + ')">' +
                '<div class="poster-container">' +
                    (movie.posterUrl ? 
                        '<img class="poster-img loaded" src="' + movie.posterUrl + '" alt="' + window.Utils.escHtml(movie.title) + '">' :
                        '<div class="no-poster-placeholder">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                                '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
                                '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                                '<path d="m21 15-5-5L5 21"/>' +
                            '</svg>' +
                        '</div>') +
                    '<div class="card-overlay">' +
                        '<svg viewBox="0 0 24 24" fill="currentColor" style="width:48px;height:48px;opacity:0.9">' +
                            '<polygon points="5,3 19,12 5,21"></polygon>' +
                        '</svg>' +
                    '</div>' +
                    (movie.quality ? '<span class="movie-quality">' + window.Utils.escHtml(movie.quality) + '</span>' : '') +
                    (rating ? '<span class="rating-badge">★ ' + rating.toFixed(1) + '</span>' : '') +
                '</div>' +
                '<div class="card-info">' +
                    '<div class="movie-title">' + window.Utils.escHtml(movie.title) + '</div>' +
                    '<div class="movie-year">' + movie.year + '</div>' +
                    (movie.nfoData && movie.nfoData.genres && movie.nfoData.genres.length ? 
                        '<div class="movie-genre">' + window.Utils.escHtml(movie.nfoData.genres.slice(0, 2).join(', ')) + '</div>' : '') +
                    '<div class="movie-filesize">' + window.Utils.formatBytes(movie.fileSize) + '</div>' +
                '</div>' +
            '</div>';
        }).join('');
        
        console.log('[Collections Debug] Rendering', collection.movies.length, 'movies to grid');
        grid.innerHTML = html;
        
        // Switch to collection detail view
        switchTab('collectionDetail');
    };

    // Show movie detail from collection view
    window.showMovieFromCollection = function(movieIdx) {
        if (typeof window.DetailPage !== 'undefined' && window.DetailPage.showDetailPage) {
            window.filteredMovies = window.allMovies;
            window.DetailPage.showDetailPage(movieIdx);
        }
    };

    // Show collections tab
    window.showCollectionsTab = function() {
        switchTab('collections');
        renderCollections();
    };

    // Tab switching function
    window.switchTab = function(tabName) {
        console.log('[Collections Debug] switchTab called with:', tabName);
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        // Deactivate all nav tabs
        document.querySelectorAll('.nav-tab').forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        // Show selected tab - handle collectionDetailView specially
        var targetTab;
        if (tabName === 'collectionDetail') {
            targetTab = document.getElementById('collectionDetailView');
            console.log('[Collections Debug] Looking for collectionDetailView element:', targetTab);
        } else {
            targetTab = document.getElementById(tabName + 'Tab') || document.getElementById(tabName);
        }
        
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('[Collections Debug] Activated tab:', tabName);
        } else {
            console.error('[Collections Debug] Tab element not found for:', tabName);
        }
        
        // Activate nav tab (only for movies and collections)
        if (tabName === 'movies' || tabName === 'collections') {
            var navTab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
            if (navTab) {
                navTab.classList.add('active');
            }
        }
        
        // Handle search box and view toggle visibility
        var searchBox = document.getElementById('searchBox');
        var viewToggle = document.getElementById('viewToggle');
        
        if (tabName === 'movies') {
            if (searchBox) searchBox.classList.remove('hidden');
            if (viewToggle) viewToggle.classList.remove('hidden');
        } else {
            if (searchBox) searchBox.classList.add('hidden');
            if (viewToggle) viewToggle.classList.add('hidden');
        }
        
        // Refresh collections if switching to collections tab
        if (tabName === 'collections') {
            renderCollections();
        }
    };

    // Export public API
    window.Collections = {
        renderCollections: renderCollections,
        showCollectionDetail: window.showCollectionDetail,
        showMovieFromCollection: window.showMovieFromCollection,
        showCollectionsTab: window.showCollectionsTab,
        switchTab: window.switchTab
    };
})();
