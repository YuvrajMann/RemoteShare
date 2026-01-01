# 🔗 RemoteShare

<p align="center">
  <img src="src/public/favicon.png" alt="RemoteShare Logo" width="80" height="80">
</p>

<p align="center">
  <strong>Seamless file sharing across all your devices on the local network</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-standalone-executable">Executable</a> •
  <a href="#-developer-guide">Developer Guide</a> •
  <a href="#-technical-overview">Technical Overview</a>
</p>

---

## ✨ Features

### 📤 File Management
- **Drag & Drop Upload** - Simply drag files onto the page to upload
- **Multi-file Upload** - Upload multiple files at once with progress tracking
- **Chunked Uploads** - Large files (>10MB) are automatically split into chunks for reliable uploads
- **Real-time Progress** - See upload speed and percentage in real-time
- **Cancel Uploads** - Cancel ongoing uploads anytime

### 📥 File Operations
- **One-click Download** - Download any file instantly
- **Bulk Selection** - Double-click to enter selection mode, select multiple files
- **Bulk Download** - Download multiple files as a ZIP archive
- **Bulk Delete** - Delete multiple files at once
- **File Preview** - Preview files directly in the browser

### 👁️ Media Preview
- **Video Player** - Preview MP4, WebM, OGG, MOV, MKV, AVI files
- **Audio Player** - YouTube Music-style player with rotating disk animation
- **Image Viewer** - View PNG, JPG, GIF, SVG, WebP, BMP images
- **PDF Viewer** - Inline PDF preview with fallback options
- **Code Viewer** - Syntax-highlighted preview for code files with line numbers
- **Text Files** - Preview TXT, MD, JSON, XML, YAML, and more

### 🎨 User Interface
- **Modern Design** - Clean, Material Design-inspired interface
- **Dark/Light Mode** - Toggle between themes (persisted in browser)
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **File Type Icons** - Color-coded icons for different file types
- **Compact Modals** - Modern, non-intrusive modal dialogs

### 🔐 Security
- **PIN Protection** - 6-digit PIN required to access the application
- **Session-based Auth** - Secure session management
- **Configurable PIN** - Change PIN anytime via Settings
- **Logout Support** - Securely end your session

### 📱 Connectivity
- **QR Code Sharing** - Scan QR code to instantly access from mobile devices
- **LAN Access** - Access from any device on the same network
- **Auto IP Detection** - Automatically shows accessible IP addresses

### 🖥️ Standalone Mode
- **Single Executable** - Run as a standalone .exe without Node.js
- **Auto Browser Launch** - Opens browser automatically on start
- **No Installation** - Just double-click to run

---

## 🚀 Quick Start

### For End Users (Standalone Executable)

1. **Download** `RemoteShare.exe` from the releases
2. **Double-click** to run - browser opens automatically
3. **Enter PIN** - Default PIN is `123456`
4. **Share the URL** - Use the QR code or copy the address for other devices

### For Users with Node.js

1. **Double-click** `start-server.bat`
2. The server will install dependencies and start
3. Access the shown URL from any device on your network

---

## 📦 Standalone Executable

### Building the Executable

RemoteShare can be packaged as a standalone executable that runs without requiring Node.js installation.

```bash
# Install dependencies first
npm install

# Build for Windows
npm run build

# Build for all platforms (Windows, macOS, Linux)
npm run build:all
```

**Output:**
- Windows: `dist/RemoteShare.exe` (~50MB)
- macOS: `dist/RemoteShare-macos`
- Linux: `dist/RemoteShare-linux`

### How It Works

The executable bundles:
- Node.js runtime (node18)
- All application code
- Static assets (CSS, JS, images)
- View templates (EJS)
- All npm dependencies

Uses [`pkg`](https://github.com/vercel/pkg) for packaging.

---

## 👨‍💻 Developer Guide

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/remoteshare.git
cd remoteshare

# Install dependencies
npm install
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Build executable
npm run build
```

### Project Structure

```
express-shared-app/
├── src/
│   ├── app.js              # Express server entry point
│   ├── routes/
│   │   └── index.js        # All API routes and logic
│   ├── views/
│   │   ├── index.ejs       # Main dashboard view
│   │   └── auth.ejs        # PIN authentication view
│   └── public/
│       ├── css/
│       │   └── styles.css  # All application styles
│       ├── js/
│       │   └── main.js     # Frontend JavaScript
│       └── favicon.png     # Application icon
├── uploads/                # Uploaded files storage
├── temp/
│   └── chunks/            # Temporary chunk storage
├── launcher.js            # Executable entry point
├── config.json            # PIN configuration (auto-created)
├── package.json           # Dependencies and scripts
├── nodemon.json           # Dev server configuration
└── start-server.bat       # Windows quick-start script
```

### Key Files

| File | Purpose |
|------|---------|
| `src/app.js` | Express server setup, middleware, static file serving |
| `src/routes/index.js` | All routes: upload, download, delete, auth, settings |
| `src/views/index.ejs` | Main UI with file list, modals, and inline styles |
| `src/public/js/main.js` | Frontend logic: uploads, previews, UI interactions |
| `src/public/css/styles.css` | All styling including dark mode |
| `launcher.js` | Standalone executable entry point with browser launch |

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `npm start` | Run the production server |
| `dev` | `npm run dev` | Run with nodemon (auto-reload) |
| `build` | `npm run build` | Build Windows executable |
| `build:all` | `npm run build:all` | Build for all platforms |

---

## 🔧 Technical Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   index.ejs │  │   main.js   │  │     styles.css      │  │
│  │  (UI/HTML)  │  │ (Frontend)  │  │     (Styling)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/XHR
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express.js Server                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Middleware Stack                      │ │
│  │  compression → session → cookie-parser → body-parser    │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                      Routes (index.js)                   │ │
│  │  /auth  /upload  /download  /file  /api/settings  ...   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ File I/O
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      File System                             │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │    uploads/   │  │  temp/chunks/ │  │   config.json   │  │
│  │ (stored files)│  │(upload chunks)│  │  (PIN storage)  │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js 18+ | JavaScript server environment |
| **Framework** | Express.js 4.x | Web server and routing |
| **Templating** | EJS | Server-side HTML rendering |
| **UI Framework** | Materialize CSS | Material Design components |
| **Icons** | Material Icons | Google's icon font |
| **Packaging** | pkg | Standalone executable builder |

### Core Dependencies

```json
{
  "express": "Web framework",
  "ejs": "Template engine",
  "multer": "File upload handling",
  "express-session": "Session management",
  "cookie-parser": "Cookie handling",
  "compression": "Response compression",
  "archiver": "ZIP file creation",
  "open": "Browser launching"
}
```

### API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth` | Show login page |
| `POST` | `/auth` | Verify PIN |
| `POST` | `/logout` | End session |

#### File Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Dashboard with file list |
| `POST` | `/upload` | Upload file (single) |
| `POST` | `/upload-chunk` | Upload file chunk |
| `GET` | `/download/:id` | Download file |
| `GET` | `/preview/:id` | Stream file for preview |
| `DELETE` | `/file/:id` | Delete file |
| `POST` | `/download-bulk` | Prepare bulk download |
| `GET` | `/download-bulk-zip` | Download ZIP archive |

#### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings/pin` | Get current PIN |
| `POST` | `/api/settings/change-pin` | Update PIN |

### Chunked Upload Flow

```
1. Client detects file > 10MB
2. File split into 5MB chunks
3. Each chunk uploaded sequentially:
   POST /upload-chunk
   {
     chunk: Blob,
     chunkIndex: 0,
     totalChunks: 10,
     fileId: "timestamp-filename",
     fileName: "video.mp4"
   }
4. Server stores chunks in temp/chunks/
5. On final chunk, server assembles file
6. Chunks are deleted, file moved to uploads/
```

### Session & Auth Flow

```
1. User visits any route
2. Middleware checks session.authenticated
3. If not authenticated → redirect to /auth
4. User enters 6-digit PIN
5. Server compares with config.json
6. If valid → session.authenticated = true
7. Session persists until logout/expiry
```

### File Storage

- **Uploads Directory**: `uploads/`
- **Filename Format**: `{timestamp}-{random}-{originalname}`
- **Metadata**: Extracted from filename on listing
- **No Database**: File system is the source of truth

---

## 🛠️ Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| Can't access from other devices | Ensure same network, check firewall, use IP (not localhost) |
| Upload fails | Check file size, try wired connection, keep tab active |
| Executable won't start | Run as administrator, check antivirus |
| Port already in use | Change PORT in environment or stop other servers |
| QR code not working | Ensure device is on same network |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- Use ES6+ JavaScript
- Follow existing code patterns
- Add comments for complex logic
- Test on both light and dark modes
- Ensure mobile responsiveness

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Materialize CSS](https://materializecss.com/) - UI Framework
- [Material Icons](https://fonts.google.com/icons) - Icon set
- [QRious](https://github.com/neocotic/qrious) - QR code generation
- [pkg](https://github.com/vercel/pkg) - Executable packaging

---

<p align="center">
  Made with ❤️ for seamless local file sharing
</p>