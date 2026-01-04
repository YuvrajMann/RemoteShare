<div align="center">

# 🔗 RemoteShare

<img src="src/public/favicon.png" alt="RemoteShare Logo" width="80" height="80">

**Seamless file sharing across all your devices on the local network**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)](package.json)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#standalone-executable)

[Features](#features) • [Quick Start](#quick-start) • [Executable](#standalone-executable) • [Developer Guide](#developer-guide) • [API](#api-reference) • [Contributing](#contributing)

</div>

---

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation & Setup](#installation-setup)
- [Standalone Executable](#standalone-executable)
- [Developer Guide](#developer-guide)
- [API Reference](#api-reference)
- [Technical Overview](#technical-overview)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

<details>
<summary>📸 <strong>Screenshots Gallery</strong> (click to expand)</summary>

<br>

<img width="1916" alt="Dashboard View" src="https://github.com/user-attachments/assets/91749d00-a856-4bc1-a130-7a8a90339a3b" />
<img width="630" alt="Mobile View" src="https://github.com/user-attachments/assets/077433cc-67fe-468e-ab88-110a7fe8269c" />
<img width="501" alt="File Preview" src="https://github.com/user-attachments/assets/253c5381-a521-4015-b997-10687d96e433" />
<img width="1580" alt="Upload Progress" src="https://github.com/user-attachments/assets/1a39bb74-37eb-4992-aa86-cf0abee494dd" />
<img width="1885" alt="Media Player" src="https://github.com/user-attachments/assets/4b075d0b-7356-448f-a8e9-d3b72f0a0308" />

</details>

---

## ✨ Features

<table>
<tr>
<td width="50%">

**📤 File Management**
- Drag & Drop Upload
- Multi-file Upload with Progress
- Chunked Uploads (>10MB auto-split)
- Real-time Progress Tracking
- Cancel Uploads Anytime

**👁️ Media Preview**
- Video: MP4, WebM, OGG, MOV, MKV, AVI
- Audio: YouTube Music-style Player
- Images: PNG, JPG, GIF, SVG, WebP, BMP
- PDF: Inline Preview
- Code: Syntax-highlighted with Line Numbers
- Text: TXT, MD, JSON, XML, YAML

**🔐 Security**
- 6-digit PIN Protection
- Session-based Authentication
- Configurable PIN via Settings
- Logout Support

</td>
<td width="50%">

**📥 File Operations**
- One-click Download
- Bulk Selection Mode
- Bulk Download as ZIP
- Bulk Delete
- In-browser Preview

**🎨 User Interface**
- Modern Material Design
- Dark/Light Mode Toggle
- Fully Responsive Layout
- Color-coded File Icons
- Compact Modal Dialogs

**📱 Connectivity**
- QR Code Sharing
- LAN Access
- Auto IP Detection

**🖥️ Standalone Mode**
- Single Executable (.exe)
- Auto Browser Launch
- No Installation Required

</td>
</tr>
</table>

---

## 🚀 Quick Start

### 🎯 Choose Your Method

| Method | Best For | Steps |
|--------|----------|-------|
| **Standalone .exe** | End users, no setup | Download → Run → Enter PIN |
| **Node.js Script** | Quick testing | Run `start-server.bat` |
| **Developer Mode** | Development | Clone → Install → Dev |

### For End Users (Standalone Executable)

```bash
# 1. Download RemoteShare.exe from releases
# 2. Double-click to run (browser opens automatically)
# 3. Enter PIN: 123456 (default)
# 4. Share URL via QR code or copy address
```

> **💡 Tip:** The executable requires no installation and bundles everything needed!

### For Users with Node.js

```bash
# Windows: Double-click start-server.bat
# Or manually:
node launcher.js
# Access the shown URL from any device on your network
```

---

## 🛠️ Installation & Setup

**Prerequisites:** Node.js 18+ • npm 9+ • Git

```bash
# Clone and install
git clone https://github.com/yourusername/remoteshare.git
cd remoteshare
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Build executable
npm run build          # Windows only
npm run build:all      # All platforms
```

**Environment Variables:**
- `PORT` - Server port (default: `3000`)

---

## 📦 Standalone Executable

Build RemoteShare as a single executable that runs without Node.js installation.

```bash
npm run build          # Windows: dist/RemoteShare.exe (~50MB)
npm run build:all      # All platforms (Windows, macOS, Linux)
```

**What's Included:**
- Node.js runtime (node18) • Application code • Static assets • View templates • npm dependencies

**Platform Support:**
- 🪟 Windows: `dist/RemoteShare.exe`
- 🍎 macOS: `dist/RemoteShare-macos`
- 🐧 Linux: `dist/RemoteShare-linux`

Uses [`pkg`](https://github.com/vercel/pkg) for packaging.

---

## 👨‍💻 Developer Guide

### Project Structure

<details>
<summary>📁 <strong>File Tree</strong> (click to expand)</summary>

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
├── temp/chunks/            # Temporary chunk storage
├── launcher.js             # Executable entry point
├── config.json             # PIN configuration (auto-created)
├── package.json            # Dependencies and scripts
├── nodemon.json            # Dev server configuration
└── start-server.bat        # Windows quick-start script
```

</details>

### Key Files

- **`src/app.js`** - Express server setup, middleware, static file serving
- **`src/routes/index.js`** - All routes: upload, download, delete, auth, settings
- **`src/views/index.ejs`** - Main UI with file list, modals, and inline styles
- **`src/public/js/main.js`** - Frontend logic: uploads, previews, UI interactions
- **`src/public/css/styles.css`** - All styling including dark mode
- **`launcher.js`** - Standalone executable entry point with browser launch

### NPM Scripts

- `npm start` - Run production server
- `npm run dev` - Run with nodemon (auto-reload)
- `npm run build` - Build Windows executable
- `npm run build:all` - Build for all platforms

---

## 📡 API Reference

### Authentication

- `GET /auth` - Show login page
- `POST /auth` - Verify PIN
- `POST /logout` - End session

### File Operations

- `GET /` - Dashboard with file list
- `POST /upload` - Upload file (single)
- `POST /upload-chunk` - Upload file chunk
- `GET /download/:id` - Download file
- `GET /preview/:id` - Stream file for preview
- `DELETE /file/:id` - Delete file
- `POST /download-bulk` - Prepare bulk download
- `GET /download-bulk-zip` - Download ZIP archive

### Settings

- `GET /api/settings/pin` - Get current PIN
- `POST /api/settings/change-pin` - Update PIN

---

## 🔧 Technical Overview

<details>
<summary><strong>Architecture Diagram</strong> (click to expand)</summary>

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

</details>

### Technology Stack

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js) ![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express) ![EJS](https://img.shields.io/badge/EJS-3.x-B4CA65) ![Materialize](https://img.shields.io/badge/Materialize-CSS-ee6e73)

**Core Technologies:**
- **Runtime:** Node.js 18+ • **Framework:** Express.js 4.x • **Templating:** EJS
- **UI:** Materialize CSS + Material Icons • **Packaging:** pkg

**Dependencies:** `express` `ejs` `multer` `express-session` `cookie-parser` `compression` `archiver` `open`

<details>
<summary><strong>Chunked Upload Flow</strong> (click to expand)</summary>

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

</details>

<details>
<summary><strong>Session & Auth Flow</strong> (click to expand)</summary>

```
1. User visits any route
2. Middleware checks session.authenticated
3. If not authenticated → redirect to /auth
4. User enters 6-digit PIN
5. Server compares with config.json
6. If valid → session.authenticated = true
7. Session persists until logout/expiry
```

</details>

**File Storage:**
- Uploads: `uploads/` • Format: `{timestamp}-{random}-{originalname}`
- No database - filesystem is source of truth

---

## 🛠️ Troubleshooting

<details>
<summary><strong>Common Issues</strong> (click to expand)</summary>

<br>

**Can't access from other devices**
- ✓ Ensure devices are on the same network
- ✓ Check firewall settings
- ✓ Use IP address (not localhost)

**Upload fails**
- ✓ Check file size limits
- ✓ Try wired connection for large files
- ✓ Keep browser tab active during upload

**Executable won't start**
- ✓ Run as administrator
- ✓ Check antivirus software
- ✓ Ensure .exe is not blocked by Windows

**Port already in use**
- ✓ Change PORT environment variable
- ✓ Stop other services on port 3000

**QR code not working**
- ✓ Ensure mobile device is on same network
- ✓ Try manual IP entry

</details>

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Code Style:** ES6+ JavaScript • Existing patterns • Comment complex logic • Test dark/light modes • Mobile responsive

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

[Materialize CSS](https://materializecss.com/) • [Material Icons](https://fonts.google.com/icons) • [QRious](https://github.com/neocotic/qrious) • [pkg](https://github.com/vercel/pkg)

---

<div align="center">

Made with ❤️ for seamless local file sharing

</div>
