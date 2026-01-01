/**
 * RemoteShare Standalone Launcher
 * Opens browser automatically when the app starts
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const os = require('os');
const compression = require('compression');
const session = require('express-session');
const { exec } = require('child_process');

// Load environment variables
require('dotenv').config();

// Helper function to get local network IP address
function getLocalNetworkIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// Cross-platform browser opener
function openBrowser(url) {
    const platform = process.platform;
    let command;
    
    switch (platform) {
        case 'win32':
            command = `start "" "${url}"`;
            break;
        case 'darwin':
            command = `open "${url}"`;
            break;
        default: // Linux and others
            command = `xdg-open "${url}"`;
            break;
    }
    
    exec(command, (error) => {
        if (error) {
            console.log(`\n⚠ Could not auto-open browser. Please manually navigate to: ${url}`);
        }
    });
}

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Increase timeouts for large file transfers
server.timeout = 0;
server.keepAliveTimeout = 300000;
server.headersTimeout = 300000;
server.setMaxListeners(0);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Determine base path for bundled assets
const basePath = process.pkg 
    ? path.dirname(process.execPath)
    : __dirname;

// Static files
app.use(express.static(path.join(basePath, 'src', 'public')));
app.use('/css', express.static(path.join(basePath, 'src', 'public', 'css')));
app.use('/js', express.static(path.join(basePath, 'src', 'public', 'js')));
app.use('/images', express.static(path.join(basePath, 'src', 'public', 'images')));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'remoteshare-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'remoteshare.sid',
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(basePath, 'src', 'views'));

// Routes
const routes = require('./src/routes');
app.use('/', routes);

// Socket.IO
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('media-control', (data) => {
        socket.broadcast.emit('media-control', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const networkIP = getLocalNetworkIP();
    const localUrl = `http://localhost:${PORT}`;
    const networkUrl = `http://${networkIP}:${PORT}`;
    
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ██████╗ ███████╗███╗   ███╗ ██████╗ ████████╗███████╗   ║
║   ██╔══██╗██╔════╝████╗ ████║██╔═══██╗╚══██╔══╝██╔════╝   ║
║   ██████╔╝█████╗  ██╔████╔██║██║   ██║   ██║   █████╗     ║
║   ██╔══██╗██╔══╝  ██║╚██╔╝██║██║   ██║   ██║   ██╔══╝     ║
║   ██║  ██║███████╗██║ ╚═╝ ██║╚██████╔╝   ██║   ███████╗   ║
║   ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝    ╚═╝   ╚══════╝   ║
║                     SHARE                                  ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║   🌐 Local:    ${localUrl.padEnd(40)}║
║   📡 Network:  ${networkUrl.padEnd(40)}║
║                                                            ║
║   Press Ctrl+C to stop the server                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
    
    // Auto-open browser
    console.log('🚀 Opening browser...\n');
    openBrowser(localUrl);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down RemoteShare...');
    server.close(() => {
        console.log('✓ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
});
