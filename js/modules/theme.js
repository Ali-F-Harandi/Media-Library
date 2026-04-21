// Movie Library - Theme Module
// Handles theme switching (Light/Dark/OLED modes) and custom accent colors

function toggleThemeDropdown() {
    document.getElementById('themeDropdown').classList.toggle('open');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.theme-selector')) {
        document.getElementById('themeDropdown').classList.remove('open');
    }
});

function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-option').forEach(function(o) {
        o.classList.toggle('active', o.dataset.theme === t);
    });
    document.getElementById('themeDropdown').classList.remove('open');
    localStorage.setItem('movieLibTheme', t);
}

// ============================================================================
// CUSTOM ACCENT COLOR
// ============================================================================
var ACCENT_COLOR_KEY = 'movieLibAccentColor';

var presetAccentColors = [
    { name: 'Red', color: '#e50914' },
    { name: 'Blue', color: '#2563eb' },
    { name: 'Purple', color: '#7c3aed' },
    { name: 'Teal', color: '#0d9488' },
    { name: 'Orange', color: '#ea580c' },
    { name: 'Pink', color: '#db2777' },
    { name: 'Green', color: '#16a34a' },
    { name: 'Amber', color: '#d97706' }
];

/**
 * Set a custom accent color and update all CSS custom properties
 * @param {string} color - Hex color string (e.g., '#e50914')
 */
function setAccentColor(color) {
    if (!color) return;
    
    var root = document.documentElement;
    root.style.setProperty('--accent', color);
    
    // Calculate accent glow (with alpha)
    var r = parseInt(color.slice(1, 3), 16);
    var g = parseInt(color.slice(3, 5), 16);
    var b = parseInt(color.slice(5, 7), 16);
    var accentGlow = 'rgba(' + r + ',' + g + ',' + b + ',0.3)';
    var accentGlowLight = 'rgba(' + r + ',' + g + ',' + b + ',0.15)';
    var tagBg = 'rgba(' + r + ',' + g + ',' + b + ',0.15)';
    var tagBgLight = 'rgba(' + r + ',' + g + ',' + b + ',0.08)';
    
    root.style.setProperty('--accent-glow', accentGlow);
    root.style.setProperty('--gradient', 'linear-gradient(135deg, ' + color + ', rgba(' + r + ',' + g + ',' + b + ',0.7))');
    root.style.setProperty('--tag-bg', tagBg);
    root.style.setProperty('--tag-color', color);
    
    // Update theme-color meta tag
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.content = color;
    }
    
    // Save to localStorage
    localStorage.setItem(ACCENT_COLOR_KEY, color);
    
    // Update active swatch
    document.querySelectorAll('.accent-color-swatch').forEach(function(s) {
        s.classList.toggle('active', s.dataset.color === color);
    });
    
    // Close theme dropdown
    document.getElementById('themeDropdown').classList.remove('open');
}

/**
 * Restore saved accent color from localStorage
 */
function restoreAccentColor() {
    var savedColor = localStorage.getItem(ACCENT_COLOR_KEY);
    if (savedColor) {
        setAccentColor(savedColor);
    }
}

// Export for use in other modules
window.ThemeManager = { 
    toggleThemeDropdown: toggleThemeDropdown, 
    setTheme: setTheme,
    setAccentColor: setAccentColor,
    restoreAccentColor: restoreAccentColor,
    presetAccentColors: presetAccentColors
};
