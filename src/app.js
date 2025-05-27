const express = require('express');
const app = express();
const path = require('path');
const os = require('os');

// Increase payload limits (10GB)
app.use(express.json({limit: '10240mb'}));
app.use(express.urlencoded({
    extended: true, 
    limit: '10240mb',
    parameterLimit: 1000000
}));

// Memory management for large files
const memoryLimit = '12gb'; // Set Node.js memory limit higher than upload size
process.env.NODE_OPTIONS = `--max-old-space-size=${parseInt(memoryLimit)}`;

// Configure EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optimize for large file transfers
app.use((req, res, next) => {
    if (req.url.startsWith('/upload')) {
        req.socket.setNoDelay(true);
        req.socket.setTimeout(30 * 60 * 1000); // 30 minutes timeout
    }
    next();
});

// Routes
const routes = require('./routes');
app.use('/', routes);

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Allow connections from all network interfaces

app.listen(PORT, HOST, () => {
    const networkInterfaces = os.networkInterfaces();
    console.log('\nServer is running on:');
    
    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((interface) => {
            if (interface.family === 'IPv4' && !interface.internal) {
                console.log(`  http://${interface.address}:${PORT}`);
            }
        });
    });
    
    console.log('\nShare these URLs with devices on your network to access RemoteShare');
    console.log('Press Ctrl+C to stop the server');
});

module.exports = app;