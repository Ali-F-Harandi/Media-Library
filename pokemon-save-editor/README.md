# ⚡ Pokémon Save Editor

A modern web-based Pokémon save file editor built with React, Tailwind CSS, and Vite. Edit your trainer information, manage your Pokémon party, and customize your game saves with ease.

![Pokémon Save Editor](https://img.shields.io/badge/React-18.2.0-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4.0-38B2AC?logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-5.0.8-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **📁 File Operations**
  - Upload existing save files (JSON format)
  - Create new save files from scratch
  - Download modified save files
  
- **👤 Trainer Information**
  - Edit trainer name (up to 12 characters)
  - Modify money amount (₽)
  - Track badge progress

- **🎒 Pokémon Party Management**
  - Add up to 6 Pokémon to your party
  - Edit Pokémon details:
    - Nickname
    - Level (1-100)
    - HP and Max HP
    - Attack, Defense, and Speed stats
    - Experience points
    - Moves (select from available moves)
  - Type-based color coding for all Pokémon types
  - Remove Pokémon from party

- **🎮 Quick Start**
  - Load sample data to try out the editor
  - Pre-populated with popular Pokémon

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pokemon-save-editor.git
   cd pokemon-save-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🌐 Deployment to GitHub Pages

This project includes a GitHub Actions workflow that automatically builds and deploys the application to GitHub Pages after every commit to the main branch.

### Setup Instructions

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/pokemon-save-editor.git
   git push -u origin main
   ```

2. **Configure GitHub Pages**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Build and deployment**:
     - Source: Select **GitHub Actions**
   - The workflow will automatically deploy your site

3. **Manual Deployment** (Optional)
   ```bash
   npm run deploy
   ```

### How the CI/CD Works

The `.github/workflows/build-and-deploy.yml` file contains:
- Automatic triggers on pushes to `main` or `master` branches
- Manual trigger option via GitHub Actions tab
- Build job that installs dependencies and creates production build
- Deploy job that publishes to GitHub Pages
- Concurrent deployment prevention

## 📁 Project Structure

```
pokemon-save-editor/
├── .github/
│   └── workflows/
│       └── build-and-deploy.yml    # CI/CD workflow
├── public/                         # Static assets
├── src/
│   ├── App.jsx                     # Main application component
│   ├── main.jsx                    # Application entry point
│   └── index.css                   # Global styles with Tailwind
├── index.html                      # HTML template
├── package.json                    # Project dependencies
├── postcss.config.js               # PostCSS configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── vite.config.js                  # Vite configuration
└── README.md                       # This file
```

## 🎮 Usage Guide

### Creating a New Save

1. Click the **"📄 New Save"** button
2. Enter your trainer name and starting money
3. Add Pokémon to your party using **"➕ Add Pokémon"**
4. Customize each Pokémon's stats and moves
5. Click **"💾 Download Save"** to save your file

### Editing an Existing Save

1. Click **"📤 Upload Save"** and select your JSON save file
2. Modify trainer information as needed
3. Edit Pokémon in your party
4. Download the modified save file

### Save File Format

The save files use JSON format with the following structure:

```json
{
  "trainer": {
    "name": "Red",
    "money": 3000,
    "badges": []
  },
  "pokemon": [
    {
      "id": 25,
      "name": "Pikachu",
      "nickname": "Sparky",
      "level": 50,
      "hp": 100,
      "maxHp": 120,
      "attack": 110,
      "defense": 80,
      "speed": 180,
      "exp": 50000,
      "type": ["electric"],
      "moves": ["Thunder Shock", "Quick Attack"]
    }
  ],
  "lastModified": "2024-01-01T00:00:00.000Z"
}
```

## 🛠️ Technologies Used

- **React 18.2** - UI library
- **Vite 5.0** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **GitHub Actions** - CI/CD automation
- **gh-pages** - Deployment utility

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This is a fan-made project and is not affiliated with Nintendo, The Pokémon Company, or Game Freak. Pokémon and all related names are trademarks of their respective owners.

## 🙏 Acknowledgments

- Pokémon data inspired by the official Pokémon games
- Type colors based on official Pokémon type badges
- Built with love by fans, for fans

---

**Happy Training!** 🎮⚡
