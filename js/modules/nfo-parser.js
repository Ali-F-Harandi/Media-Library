// Movie Library - NFO Parser Module
// Parses XML NFO files for movie and TV show metadata

/**
 * Parse XML NFO files for movie and TV show metadata
 * @param {string} xmlText - Raw XML content from NFO file
 * @returns {Object} Parsed metadata object
 */
function parseNFO(xmlText) {
    var res = {
        rating: null, ratingVotes: null, plot: null, runtime: null,
        genres: [], tags: [], directors: [], writers: [], actors: [],
        certification: null, country: null, studio: null, tagline: null,
        imdbId: null, tmdbId: null, premiered: null, title: null,
        originaltitle: null, onlineFanart: null, source: null,
        videoCodec: null, videoResolution: null, videoAspect: null,
        audioCodec: null, audioChannels: null,
        setName: null, setOverview: null,
        // TV Show specific fields
        isTVShow: false, tvdbId: null, status: null, episodeguide: null,
        seasonPlots: {}, seasonPosters: {}, showtitle: null, sorttitle: null
    };
    
    try {
        var doc = new DOMParser().parseFromString(xmlText, 'text/xml');
        
        // Check if this is a TV show NFO
        var tvshowEl = doc.getElementsByTagName('tvshow')[0];
        var movieEl = doc.getElementsByTagName('movie')[0];
        var isTV = !!tvshowEl;
        res.isTVShow = isTV;
        
        var rootEl = isTV ? tvshowEl : movieEl;
        if (!rootEl) {
            return res;
        }
        
        var tag = function(n) {
            var el = rootEl.getElementsByTagName(n);
            return el.length ? el[0].textContent.trim() : null;
        };
        
        var multiTag = function(n) {
            var els = rootEl.getElementsByTagName(n);
            var out = [];
            for (var i = 0; i < els.length; i++) {
                out.push(els[i].textContent.trim());
            }
            return out;
        };
        
        res.title = tag('title');
        res.originaltitle = tag('originaltitle');
        res.year = tag('year');
        res.plot = tag('plot') || tag('outline');
        res.runtime = tag('runtime');
        res.tagline = tag('tagline');
        res.certification = tag('mpaa') || tag('certification');
        res.country = tag('country');
        res.studio = tag('studio');
        res.premiered = tag('premiered');
        res.source = tag('source');
        res.showtitle = tag('showtitle');
        res.sorttitle = tag('sorttitle');
        res.status = tag('status');
        res.genres = multiTag('genre');
        res.tags = multiTag('tag');
        
        // Parse unique IDs
        var uids = rootEl.getElementsByTagName('uniqueid');
        for (var u = 0; u < uids.length; u++) {
            var uidType = uids[u].getAttribute('type');
            var uidValue = uids[u].textContent.trim();
            if (uidType === 'tmdb' && uidValue) {
                res.tmdbId = uidValue;
            }
            if (uidType === 'imdb' && uidValue) {
                res.imdbId = uidValue;
            }
            if (uidType === 'tvdb' && uidValue) {
                res.tvdbId = uidValue;
            }
        }
        
        // Also check for simple id tags
        if (!res.imdbId) res.imdbId = tag('imdbid') || tag('id');
        if (!res.tmdbId) res.tmdbId = tag('tmdbid');
        
        // Parse episodeguide for TV shows
        if (isTV) {
            var eg = tag('episodeguide');
            if (eg) {
                try {
                    res.episodeguide = JSON.parse(eg);
                } catch(e) {}
            }
        }
        
        // Parse rating with proper null checks
        var defaultR = rootEl.querySelector('rating[default="true"]');
        if (defaultR) {
            var vEl = defaultR.querySelector('value');
            var vtEl = defaultR.querySelector('votes');
            if (vEl && vEl.textContent) {
                var ratingVal = parseFloat(vEl.textContent);
                if (!isNaN(ratingVal)) res.rating = ratingVal;
            }
            if (vtEl && vtEl.textContent) {
                var votesVal = parseInt(vtEl.textContent);
                if (!isNaN(votesVal)) res.ratingVotes = votesVal;
            }
        }
        if (res.rating === null) {
            var anyR = rootEl.querySelector('rating');
            if (anyR) {
                var v2 = anyR.querySelector('value');
                var vt2 = anyR.querySelector('votes');
                if (v2 && v2.textContent) {
                    var ratingVal2 = parseFloat(v2.textContent);
                    if (!isNaN(ratingVal2)) res.rating = ratingVal2;
                }
                if (vt2 && vt2.textContent) {
                    var votesVal2 = parseInt(vt2.textContent);
                    if (!isNaN(votesVal2)) res.ratingVotes = votesVal2;
                }
            }
        }
        
        // Fanart
        var fanartEl = rootEl.querySelector('fanart thumb');
        if (fanartEl) res.onlineFanart = fanartEl.textContent.trim();
        
        // Movie set/collection info (only for movies)
        if (!isTV) {
            var setEl = rootEl.querySelector('set');
            if (setEl) {
                var setNameEl = setEl.querySelector('name');
                var setOverviewEl = setEl.querySelector('overview');
                if (setNameEl) res.setName = setNameEl.textContent.trim();
                if (setOverviewEl) res.setOverview = setOverviewEl.textContent.trim();
            }
        }
        
        // TV Show specific: season plots and posters
        if (isTV) {
            // Parse season plots
            var seasonPlots = rootEl.getElementsByTagName('seasonplot');
            for (var sp = 0; sp < seasonPlots.length; sp++) {
                var sNum = seasonPlots[sp].getAttribute('number');
                if (sNum) {
                    res.seasonPlots[sNum] = seasonPlots[sp].textContent.trim();
                }
            }
            
            // Parse season posters from thumb elements with season attribute
            var thumbs = rootEl.getElementsByTagName('thumb');
            for (var t = 0; t < thumbs.length; t++) {
                var thumb = thumbs[t];
                var seasonNum = thumb.getAttribute('season');
                var thumbType = thumb.getAttribute('type');
                var thumbAspect = thumb.getAttribute('aspect');
                if (seasonNum && thumbType === 'season' && thumbAspect === 'poster') {
                    res.seasonPosters[seasonNum] = thumb.textContent.trim();
                }
            }
        }
        
        // Directors & Writers
        var dirs = rootEl.getElementsByTagName('director');
        for (var i = 0; i < dirs.length; i++) {
            res.directors.push(dirs[i].textContent.trim());
        }
        var creds = rootEl.getElementsByTagName('credits');
        for (var j = 0; j < creds.length; j++) {
            res.writers.push(creds[j].textContent.trim());
        }
        res.directors = res.directors.filter(function(v, idx, a) { return a.indexOf(v) === idx; });
        res.writers = res.writers.filter(function(v, idx, a) { return a.indexOf(v) === idx; });
        
        // Actors
        var actors = rootEl.getElementsByTagName('actor');
        for (var k = 0; k < actors.length; k++) {
            var nEl = actors[k].querySelector('name');
            var rEl = actors[k].querySelector('role');
            var tEl = actors[k].querySelector('thumb');
            var name = nEl ? nEl.textContent.trim() : '';
            var role = rEl ? rEl.textContent.trim() : '';
            var thumb = tEl ? tEl.textContent.trim() : '';
            if (name) res.actors.push({ name: name, role: role, thumb: thumb });
        }
        
        // Video/Audio specs (only for movies)
        if (!isTV) {
            var video = rootEl.querySelector('fileinfo streamdetails video');
            if (video) {
                var vc = video.querySelector('codec');
                if (vc) res.videoCodec = vc.textContent.trim().toUpperCase();
                var vr = video.querySelector('resolution');
                if (vr) res.videoResolution = vr.textContent.trim() + 'p';
                var va = video.querySelector('aspect');
                if (va) res.videoAspect = va.textContent.trim();
            }
            
            var audio = rootEl.querySelector('fileinfo streamdetails audio');
            if (audio) {
                var ac = audio.querySelector('codec');
                if (ac) res.audioCodec = ac.textContent.trim().toUpperCase();
                var ach = audio.querySelector('channels');
                if (ach) res.audioChannels = ach.textContent.trim();
            }
        }
    } catch(e) {
        console.error('NFO parse error:', e);
    }
    
    return res;
}

// Export for use in other modules
window.NFOParser = { parseNFO };
