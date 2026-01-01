/**
 * RemoteShare Standalone Launcher
 * Opens browser automatically when the app starts
 */

const express = require('express');
const https = require('https');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const compression = require('compression');
const session = require('express-session');
const { exec } = require('child_process');
const forge = require('node-forge');

// Load environment variables
require('dotenv').config();

// Generate or load SSL certificates using node-forge (pure JS, works in pkg)
function getSSLCertificates() {
    const certDir = process.pkg ? path.dirname(process.execPath) : __dirname;
    const keyPath = path.join(certDir, 'server.key');
    const certPath = path.join(certDir, 'server.cert');
    
    // Check if certificates already exist
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        console.log('📜 Using existing SSL certificates');
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
    }
    
    // Generate new self-signed certificates using node-forge
    console.log('🔐 Generating self-signed SSL certificates...');
    
    const pki = forge.pki;
    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01' + Date.now().toString(16);
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    const attrs = [
        { name: 'commonName', value: 'RemoteShare' },
        { name: 'organizationName', value: 'RemoteShare Local' },
        { shortName: 'ST', value: 'Local' },
        { name: 'countryName', value: 'US' }
    ];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Add extensions for localhost and local IPs
    const networkIP = getLocalNetworkIP();
    cert.setExtensions([
        { name: 'basicConstraints', cA: true },
        { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true },
        { name: 'extKeyUsage', serverAuth: true },
        {
            name: 'subjectAltName',
            altNames: [
                { type: 2, value: 'localhost' },
                { type: 7, ip: '127.0.0.1' },
                { type: 7, ip: networkIP }
            ]
        }
    ]);
    
    // Self-sign the certificate
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    // Convert to PEM format
    const privateKeyPem = pki.privateKeyToPem(keys.privateKey);
    const certPem = pki.certificateToPem(cert);
    
    // Save certificates for future use
    try {
        fs.writeFileSync(keyPath, privateKeyPem);
        fs.writeFileSync(certPath, certPem);
        console.log('✅ SSL certificates saved');
    } catch (err) {
        console.log('⚠ Could not save certificates (running from read-only location)');
    }
    
    return {
        key: privateKeyPem,
        cert: certPem
    };
}

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

// Get SSL certificates
const sslOptions = getSSLCertificates();

// Create HTTPS server
const server = https.createServer(sslOptions, app);
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

// Static files - Use __dirname to ensure we use the bundled assets in pkg snapshot
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use('/css', express.static(path.join(__dirname, 'src', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'src', 'public', 'js')));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'remoteshare-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'remoteshare.sid',
    cookie: { 
        secure: true,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

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
    const localUrl = `https://localhost:${PORT}`;
    const networkUrl = `https://${networkIP}:${PORT}`;
    
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
║   🔒 HTTPS Enabled (Self-signed certificate)               ║
║                                                            ║
║   🌐 Local:    ${localUrl.padEnd(40)}║
║   📡 Network:  ${networkUrl.padEnd(40)}║
║                                                            ║
║   ⚠ First visit: Accept the security warning in browser    ║
║   Press Ctrl+C to stop the server                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
    
    // Auto-open browser
    console.log('🚀 Opening browser...\n');
    openBrowser(networkUrl);
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
