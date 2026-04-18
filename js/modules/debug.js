// Movie Library - Debug Module
// Provides centralized debugging utilities for all sections

(function() {
    'use strict';
    
    var Debug = {
        enabled: true,
        prefix: '[MovieLibrary]',
        
        // Log message with optional data
        log: function(section, message, data) {
            if (!this.enabled) return;
            
            var timestamp = new Date().toLocaleTimeString();
            var prefix = this.prefix + '[' + section + ']';
            
            console.log('%c' + timestamp + ' ' + prefix, 'color: #00ff00; font-weight: bold;', message);
            if (data !== undefined) {
                console.log(data);
            }
        },
        
        // Log error with optional data
        error: function(section, message, data) {
            var timestamp = new Date().toLocaleTimeString();
            var prefix = this.prefix + '[' + section + ']';
            
            console.error('%c' + timestamp + ' ' + prefix, 'color: #ff0000; font-weight: bold;', message);
            if (data !== undefined) {
                console.error(data);
            }
        },
        
        // Log warning with optional data
        warn: function(section, message, data) {
            var timestamp = new Date().toLocaleTimeString();
            var prefix = this.prefix + '[' + section + ']';
            
            console.warn('%c' + timestamp + ' ' + prefix, 'color: #ffa500; font-weight: bold;', message);
            if (data !== undefined) {
                console.warn(data);
            }
        },
        
        // Log info with optional data
        info: function(section, message, data) {
            if (!this.enabled) return;
            
            var timestamp = new Date().toLocaleTimeString();
            var prefix = this.prefix + '[' + section + ']';
            
            console.info('%c' + timestamp + ' ' + prefix, 'color: #00ffff; font-weight: bold;', message);
            if (data !== undefined) {
                console.info(data);
            }
        },
        
        // Group logs
        group: function(label) {
            if (!this.enabled) return;
            console.group('%c' + this.prefix + ' ' + label, 'color: #ff00ff; font-weight: bold;');
        },
        
        // End group
        groupEnd: function() {
            if (!this.enabled) return;
            console.groupEnd();
        },
        
        // Table display for arrays/objects
        table: function(section, data) {
            if (!this.enabled) return;
            
            var timestamp = new Date().toLocaleTimeString();
            var prefix = this.prefix + '[' + section + ']';
            
            console.log('%c' + timestamp + ' ' + prefix, 'color: #00ff00; font-weight: bold;');
            console.table(data);
        },
        
        // Performance timing
        time: function(label) {
            if (!this.enabled) return;
            console.time(this.prefix + ' ' + label);
        },
        
        // Performance timing end
        timeEnd: function(label) {
            if (!this.enabled) return;
            console.timeEnd(this.prefix + ' ' + label);
        },
        
        // Enable/disable debugging
        setEnabled: function(enabled) {
            this.enabled = enabled;
            console.log('Debug mode:', enabled ? 'ENABLED' : 'DISABLED');
        },
        
        // Quick state inspection
        inspectState: function() {
            console.group('%c' + this.prefix + ' STATE INSPECTION', 'background: #333; color: #fff; padding: 5px;');
            
            console.log('Collections:', {
                count: window.collectionsData ? window.collectionsData.length : 0,
                current: window.currentCollection ? window.currentCollection.name : null
            });
            
            console.log('Movies:', {
                total: window.allMovies ? window.allMovies.length : 0,
                filtered: window.filteredMovies ? window.filteredMovies.length : 0
            });
            
            console.log('Current View:', {
                tab: document.querySelector('.tab-content.active') ? 
                    document.querySelector('.tab-content.active').id : 'unknown'
            });
            
            console.groupEnd();
        }
    };
    
    // Export to window
    window.Debug = Debug;
    
    // Auto-inspect on load after delay
    setTimeout(function() {
        if (Debug.enabled && window.allMovies) {
            Debug.info('System', 'Application loaded. Type window.Debug.inspectState() for quick state check.');
        }
    }, 2000);
    
})();
