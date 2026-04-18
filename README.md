# ⚡ Movie Library

A modern web-based movie collection manager built with vanilla JavaScript and CSS. Organize your local movie files, browse with beautiful posters, play videos directly in the browser, and enjoy multiple theme options.

![Movie Library](https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript)
![CSS](https://img.shields.io/badge/CSS3-Custom_Properties-blue?logo=css3)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **📁 Folder Management**
  - Select folders containing your movie collection using the File System Access API
  - Add multiple folders to your library
  - Resume previous sessions with saved folder handles
  - Support for Chrome and Edge browsers

- **🎬 Movie Organization**
  - Automatic movie detection from folder names (format: "Movie Name (Year)")
  - Poster and fanart image recognition
  - NFO metadata parsing (Kodi-compatible format)
  - Quality detection from filenames (720p, 1080p, 4K, etc.)

- **🎨 Multiple View Modes**
  - **Grid View**: Classic poster grid layout
  - **Detail View**: Expanded cards with more information
  - **List View**: Compact list for quick browsing

- **🎭 Theme Support**
  - Netflix Dark (default)
  - Ocean Blue
  - Cyberpunk
  - Amber Gold
  - Forest Green
  - Light Clean

- **🔍 Search & Filter**
  - Real-time search by title, year, quality, genres, and tags
  - Sort by name, year, rating, or file size
  - Filter count display

- **📊 Rich Metadata Display**
  - Movie ratings and vote counts
  - Runtime, year, and certification
  - Genres and tags
  - Director, writer, and cast information
  - Technical specs (video codec, resolution, audio)
  - File size and filename details
  - IMDb and TMDb links

- **▶️ Professional Video Player**
  - Play movies directly in the browser with HTML5 video player
  - **Multi-Audio Support**: Switch between different audio tracks (languages, commentary)
  - **Multi-Subtitle Support**: Auto-detect external subtitles (.srt, .vtt) from movie folder
  - **25+ Languages**: Automatic language detection from subtitle filenames
  - **SRT to VTT Conversion**: Client-side conversion for browser compatibility
  - **Playback Speed Control**: Adjust speed from 0.5x to 2x
  - **Picture-in-Picture (PiP)**: Watch while browsing other apps
  - **Fullscreen Mode**: Immersive viewing experience
  - **Resume Playback**: Automatically resume from where you left off
  - **Real-time Display**: Current time and duration display
  - Navigate between movies with prev/next controls
  - Keyboard shortcuts (Arrow keys, Escape)

- **💾 Persistent Settings**
  - Theme preference saved locally
  - View mode preference saved
  - Folder handles stored in IndexedDB

## 🚀 Getting Started

### Prerequisites

- **Browser**: Chrome or Edge (required for File System Access API support)
- Modern browser with ES6+ JavaScript support

### Usage

1. **Open the Application**
   - Simply open `index.html` in your browser
   - No installation or build process required

2. **Select Movie Folder**
   - Click "Select Movie Folder" button
   - Choose a folder containing your movie collection
   - Recommended structure: `Movie Name (Year) / [video, poster, fanart, nfo]`

3. **Add More Folders** (Optional)
   - Click "Add Folder" to include additional movie directories
   - All folders are saved for future sessions

4. **Resume Session**
   - If you've previously selected folders, click "Resume Last Session"
   - Your library will load automatically with granted permissions

### Supported File Formats

- **Video**: MP4, MKV, WebM, AVI, MOV, WMV, FLV, M4V, TS, MPG, MPEG
- **Images**: JPG, JPEG, PNG, WEBP, GIF, BMP (for posters and fanart)
- **Metadata**: NFO files (Kodi-compatible XML format)

### Recommended Folder Structure

```
Movies/
├── The Matrix (1999)/
│   ├── matrix.mp4              # Video file
│   ├── poster.jpg              # Movie poster
│   ├── fanart.jpg              # Background image
│   └── The Matrix (1999).nfo   # Metadata file
├── Inception (2010)/
│   ├── inception.mkv
│   ├── poster.png
│   └── fanart.webp
└── Interstellar (2014)/
    ├── interstellar.mp4
    └── cover.jpg
```

### NFO File Format

The application supports Kodi-style NFO files with the following information:
- Title, year, plot outline
- Rating and vote count
- Runtime, certification
- Genres, tags
- Director, writers, cast
- Technical specs (video/audio codecs, resolution)
- IMDb and TMDb IDs

## 🎨 Themes

Switch between 6 beautiful themes using the Theme button in the header:

1. **Netflix Dark** - Classic dark theme with red accents
2. **Ocean Blue** - Cool blue tones for a calming experience
3. **Cyberpunk** - Vibrant pink and purple neon style
4. **Amber Gold** - Warm golden hues
5. **Forest Green** - Natural green palette
6. **Light Clean** - Bright, minimal light theme

Theme preference is automatically saved and restored on next visit.

## 🔧 Keyboard Shortcuts

When viewing movies:
- **Escape**: Close detail page or player
- **Arrow Left**: Previous movie (in player)
- **Arrow Right**: Next movie (in player)

## 🎮 Video Player Controls

The professional video player includes these controls:

### Playback Controls
- **Speed Button (1x)**: Cycle through playback speeds (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- **PiP Button (📺)**: Enable Picture-in-Picture mode to watch while multitasking
- **Fullscreen Button (⛶)**: Toggle fullscreen mode for immersive viewing
- **Time Display**: Shows current position and total duration (MM:SS / MM:SS)

### Audio Menu (🔊 Audio)
- Appears automatically when video has multiple audio tracks
- Click to open dropdown menu
- Select desired audio track (language, commentary, etc.)
- Active track highlighted in accent color

### Subtitle Menu (📝 Subtitles)
- Auto-detects external subtitle files (.srt, .vtt) in movie folder
- "Off" option to disable subtitles
- Lists all detected subtitles with language names
- Supports 25+ languages with automatic detection from filenames
- Example filename patterns: `movie.en.srt`, `movie.eng.vtt`, `movie.spanish.srt`

### Supported Subtitle Languages
English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Thai, Vietnamese, Polish, Dutch, Swedish, Norwegian, Danish, Finnish, Turkish, Czech, Hungarian, Romanian, Ukrainian, Greek, Hebrew, Indonesian, Malay

### Resume Feature
- Automatically saves your position when you pause or close the player
- Resumes from where you left off when you play the movie again
- Position stored in browser's localStorage
- Clears saved position when video completes

## 💡 Usage Examples

### Playing a Movie with Multiple Audio Tracks
1. Click the play button on any movie
2. If the video has multiple audio tracks, the "🔊 Audio" button appears
3. Click the button to see available tracks (e.g., "English", "Spanish", "Director Commentary")
4. Select your preferred audio track

### Loading External Subtitles
1. Place subtitle files in the same folder as your movie
2. Name them appropriately: `Movie Name (Year).en.srt` or `Movie Name (Year).spanish.vtt`
3. Play the movie in the browser
4. Click "📝 Subtitles" button
5. Select your desired subtitle language
6. Use "Off" to disable subtitles

### Using Picture-in-Picture Mode
1. Play a movie
2. Click the "📺" button
3. Video pops out into a floating window
4. Browse other apps or websites while watching
5. Click the PiP window to return to full player

### Changing Playback Speed
1. Click the "1x" button repeatedly to cycle through speeds
2. Speeds available: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
3. Useful for slow-motion analysis or fast-forwarding content

## 📁 Project Structure

```
movie-library/
├── index.html              # Main application HTML file
├── css/
│   └── styles.css          # Application styles with theme support
├── js/
│   ├── app.js              # Main application entry point
│   ├── utils.js            # Utility functions (formatting, escaping, etc.)
│   └── modules/
│       ├── scanner.js      # Folder scanning and movie detection
│       ├── video-player.js # Video playback with subtitles and audio tracks
│       ├── detail-page.js  # Movie detail page display
│       ├── nfo-parser.js   # NFO metadata file parser
│       └── collections.js  # Movie collection/series grouping
└── README.md               # This file
```

### Module Descriptions

- **`scanner.js`**: Scans selected folders for movies using File System Access API. Detects video files, posters, fanart, logos, and NFO metadata files. Builds full file paths by traversing directory trees.

- **`video-player.js`**: Professional HTML5 video player module (v2.0) with advanced features:
  - Multi-audio track detection and switching (for videos with multiple languages/commentary)
  - External subtitle scanning and loading (.srt, .vtt formats)
  - SRT to VTT conversion for browser compatibility
  - Language auto-detection from filenames (25+ languages supported)
  - Playback speed control (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
  - Picture-in-Picture (PiP) mode support
  - Fullscreen toggle functionality
  - Resume playback from saved position (stored in localStorage)
  - Real-time timecode display
  - Clean dropdown UI for audio/subtitle selection
  - Memory management with proper URL cleanup

- **`detail-page.js`**: Displays comprehensive movie information including poster, fanart background, metadata (director, cast, genres), technical specs, and provides actions like play and copy path. Features local actor image loading from `.actors` subfolders with fallback to web images.

- **`nfo-parser.js`**: Parses Kodi-compatible NFO XML files to extract movie metadata including plot, rating, cast, technical specifications, and external database IDs (IMDb, TMDb).

- **`collections.js`**: Groups movies into collections/series based on NFO set information, allowing users to browse related movies together.

- **`utils.js`**: Provides utility functions used throughout the application including HTML escaping, file size formatting, toast notifications, and more.

- **`app.js`**: Main application controller that coordinates all modules, handles user interactions, manages state, and initializes the application.

## 🎯 New Features (Latest Update)

### 📁 Local Actor Images
- Automatically scans for `.actors` subfolder in movie directories
- Loads actor photos from local JPG/PNG files (e.g., `Paul_Walker.jpg`, `Ludacris.jpg`)
- Supports multiple name formats: "Paul_Walker", "PaulWalker", "Walker"
- Falls back to web images from NFO if local images not found
- Larger circular actor avatars (160px) with enhanced styling

### 📋 Absolute Path Copying
- "Copy Path" button now copies full absolute paths (e.g., `D:/Movies/Movie Name (2012)`)
- Builds complete directory tree by traversing parent folders
- Previously only copied relative paths

### 🖼️ Poster Placeholder Management
- Placeholder icon always present in DOM for consistent layout
- Automatically hidden when poster image loads successfully
- Remains visible for movies without posters
- Improved z-index layering for better visual hierarchy

### 🎨 Enhanced Display Modes
All three view modes fully functional and accessible via toggle buttons:
- **Grid View** (default): Classic poster grid with hover effects
- **Detail View**: Expanded cards with ratings, tags, and extended info
- **List View**: Compact horizontal list for quick scanning

## 💡 How It Works

The Movie Library application uses modern web technologies:

- **File System Access API**: Direct access to your local folders (Chrome/Edge only)
- **IndexedDB**: Persistent storage for folder handles and settings
- **CSS Custom Properties**: Theme system with 6 color schemes
- **Vanilla JavaScript**: No frameworks or build tools required

### Key Technologies

1. **Folder Scanning**: Recursively scans selected directories for movie folders
2. **NFO Parsing**: Extracts metadata from Kodi-compatible XML files
3. **Object URLs**: Creates temporary URLs for playing local video files
4. **Lazy Loading**: Loads images on demand for better performance

## ⚠️ Important Notes

- **Browser Security**: The File System Access API requires user permission for each folder
- **Session Persistence**: Folder handles are saved, but permissions may need re-granting
- **Local Files Only**: Videos are played from your local drive, not streamed
- **Full Path Support**: Copy Path now includes full absolute paths with drive letters (e.g., `D:/Movies/...`)
- **Actor Images**: Place actor photos in a `.actors` subfolder within each movie directory for automatic detection

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔒 Privacy & Security

- **No Data Upload**: All data stays on your local machine
- **No Tracking**: No analytics or telemetry
- **No Server**: Everything runs locally in your browser
- **Permission-Based**: Requires explicit permission to access folders

---

**Enjoy Your Movie Collection!** 🎬🍿
