const express = require('express');
const cluster = require('cluster');
const os = require('os');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const compression = require('compression');
const session = require('express-session');
require('dotenv').config();

const numCPUs = os.cpus().length;

// Helper function to get local network IP address
function getLocalNetworkIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
}

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    console.log(`Forking ${numCPUs} workers...`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Forking a new one...`);
        cluster.fork();
    });
} else {
    const app = express();
    const server = http.createServer(app);
    const io = socketIO(server);

    // Increase timeouts for large file transfers
    server.timeout = 0; // Disable timeout (or set very high like 3600000 for 1 hour)
    server.keepAliveTimeout = 300000; // 5 minutes
    server.headersTimeout = 300000; // 5 minutes
    
    // Increase max listeners to prevent memory leak warnings
    server.setMaxListeners(0);

    // ============ MIDDLEWARE ORDER IS CRITICAL ============
    
    // 1. Body parsers FIRST
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // 2. Compression
    app.use(compression());

    // 3. Static files BEFORE session (so CSS/JS/images load without auth)
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/css', express.static(path.join(__dirname, 'public/css')));
    app.use('/js', express.static(path.join(__dirname, 'public/js')));
    app.use('/images', express.static(path.join(__dirname, 'public/images')));

    // 4. Session middleware
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

    // 5. Debug middleware
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        if (!req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            console.log('Session ID:', req.sessionID);
            console.log('Authenticated:', req.session?.authenticated || false);
        }
        next();
    });

    // 6. View engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // 7. Routes
    const routes = require('./routes');
    app.use('/', routes);

    // 8. Socket.IO
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        
        socket.on('media-control', (data) => {
            socket.broadcast.emit('media-control', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
        const networkIP = getLocalNetworkIP();
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✓ Worker ${process.pid} is running`);
        console.log(`\n  Local:            http://localhost:${PORT}`);
        console.log(`  Network:          http://${networkIP}:${PORT}`);
        console.log(`\n  Listening on:     0.0.0.0:${PORT}`);
        console.log(`${'='.repeat(60)}\n`);
    });
}