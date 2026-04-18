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

- **▶️ Built-in Video Player**
  - Play movies directly in the browser
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

- **`video-player.js`**: Handles video playback in the browser with advanced features including subtitle support (auto-detection from folder), audio track switching, and keyboard navigation.

- **`detail-page.js`**: Displays comprehensive movie information including poster, fanart background, metadata (director, cast, genres), technical specs, and provides actions like play and copy path.

- **`nfo-parser.js`**: Parses Kodi-compatible NFO XML files to extract movie metadata including plot, rating, cast, technical specifications, and external database IDs (IMDb, TMDb).

- **`collections.js`**: Groups movies into collections/series based on NFO set information, allowing users to browse related movies together.

- **`utils.js`**: Provides utility functions used throughout the application including HTML escaping, file size formatting, toast notifications, and more.

- **`app.js`**: Main application controller that coordinates all modules, handles user interactions, manages state, and initializes the application.

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
- **Drive Letters**: Browser security hides actual drive letters in copied paths

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
