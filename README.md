# RemoteShare

RemoteShare is a simple file sharing app for your local network. You can upload, download, and delete files from any device on the same WiFi or LAN.

---

## 📦 Project Structure

```
express-shared-app
├── src
│   ├── app.js
│   ├── routes
│   │   └── index.js
│   ├── controllers
│   │   └── index.js
│   └── middleware
│       └── index.js
├── shared-files
├── package.json
├── start-server.bat
└── README.md
```

---

## 🚀 Quick Start (For Non-Technical Users)

### 1. **Install Node.js**

- Download and install Node.js from [https://nodejs.org/](https://nodejs.org/).
- Choose the "LTS" version.
- After installing, restart your computer.

### 2. **Start the Server**

- Double-click the `start-server.bat` file in the project folder.
- The server will automatically install everything and start.
- The window will show one or more addresses like:  
  `http://192.168.1.5:3000`

### 3. **Access from Other Devices**

- On any device (phone, tablet, laptop) connected to the same WiFi/LAN:
  - Open a web browser.
  - Enter the address shown in the server window (e.g., `http://192.168.1.5:3000`).

### 4. **Upload and Download Files**

- Use the web interface to upload files.
- Download or delete files as needed.

---

## 🛠️ Troubleshooting

- **"Node.js is not installed"**  
  Download and install Node.js from [https://nodejs.org/](https://nodejs.org/).

- **Can't access from other devices?**
  - Make sure all devices are on the same WiFi/LAN.
  - Check your firewall settings (allow Node.js or port 3000).
  - Use the IP address shown in the server window, not `localhost`.

- **Upload is slow or fails?**
  - Use a wired connection if possible.
  - Keep the browser tab active during upload.
  - Try smaller files to test.

---

## 👨‍💻 For Developers

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd express-shared-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   node src/app.js
   ```

---

## 🤝 Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.

---