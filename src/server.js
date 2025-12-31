const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIO = require('socket.io');
const archiver = require('archiver');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configuration
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const TEMP_DIR = path.join(__dirname, '../temp');
const CHUNKS_DIR = path.join(TEMP_DIR, 'chunks');

// Ensure directories exist
[UPLOAD_DIR, TEMP_DIR, CHUNKS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Add compression middleware
app.use(compression({
    filter: (req, res) => {
        // Don't compress media files (already compressed)
        if (req.path.includes('/media/stream/')) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Balance between speed and compression ratio
}));

// Rate limiting middleware
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 uploads per windowMs
    message: 'Too many uploads from this IP, please try again later.'
});

const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // More lenient for downloads
    message: 'Too many downloads from this IP, please try again later.'
});

// Multer configuration for regular uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 * 10 // 10GB limit
    }
});

// Multer configuration for chunk uploads
const chunkUpload = multer({ 
    dest: TEMP_DIR,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB per chunk
    }
});

// In-memory file storage (replace with database in production)
let files = [];

// Helper function to get original filename
function getOriginalFileName(fileId) {
    const file = files.find(f => f.id === fileId);
    return file ? file.name : 'download';
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to merge chunks
async function mergeChunks(chunksDir, fileId, fileName, totalChunks) {
    const finalPath = path.join(UPLOAD_DIR, fileId);
    const writeStream = fs.createWriteStream(finalPath);

    return new Promise((resolve, reject) => {
        let chunkIndex = 0;

        const mergeNext = () => {
            if (chunkIndex >= parseInt(totalChunks)) {
                writeStream.end();
                // Clean up chunks directory
                fs.rmSync(chunksDir, { recursive: true, force: true });
                resolve();
                return;
            }

            const chunkPath = path.join(chunksDir, `chunk_${chunkIndex}`);
            
            if (!fs.existsSync(chunkPath)) {
                reject(new Error(`Chunk ${chunkIndex} not found`));
                return;
            }

            const readStream = fs.createReadStream(chunkPath);

            readStream.on('data', (chunk) => {
                writeStream.write(chunk);
            });

            readStream.on('end', () => {
                chunkIndex++;
                mergeNext();
            });

            readStream.on('error', (error) => {
                reject(error);
            });
        };

        writeStream.on('error', (error) => {
            reject(error);
        });

        mergeNext();
    });
}

// Routes

// Home page - list all files
app.get('/', (req, res) => {
    const filesWithMetadata = files.map(file => ({
        ...file,
        size: formatFileSize(file.sizeBytes),
        created: new Date(file.uploadDate).toLocaleString()
    }));
    
    res.render('index', { files: filesWithMetadata });
});

// Regular file upload (for smaller files)
app.post('/upload', uploadLimiter, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileInfo = {
            id: req.file.filename,
            name: req.file.originalname,
            sizeBytes: req.file.size,
            size: formatFileSize(req.file.size),
            uploadDate: Date.now(),
            path: req.file.path
        };

        files.push(fileInfo);

        console.log('File uploaded:', fileInfo.name);

        res.json({ 
            success: true, 
            message: 'File uploaded successfully',
            file: fileInfo 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Add this BEFORE your routes to see all registered routes
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log('Registered route:', r.route.path);
  }
});

// CHUNKED UPLOAD ROUTE - Add this route
app.post('/upload-chunk', uploadLimiter, chunkUpload.single('chunk'), async (req, res) => {
    console.log('✓ Upload chunk endpoint hit!');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    try {
        const { chunkIndex, totalChunks, fileId, fileName, fileSize } = req.body;
        
        if (!req.file) {
            console.error('No chunk file received');
            return res.status(400).json({ error: 'No chunk uploaded' });
        }

        const chunkPath = req.file.path;
        console.log('Chunk path:', chunkPath);
        
        // Create temp directory for chunks if it doesn't exist
        const chunksDir = path.join(CHUNKS_DIR, fileId);
        if (!fs.existsSync(chunksDir)) {
            fs.mkdirSync(chunksDir, { recursive: true });
            console.log('Created chunks directory:', chunksDir);
        }

        // Move chunk to chunks directory
        const chunkFileName = path.join(chunksDir, `chunk_${chunkIndex}`);
        fs.renameSync(chunkPath, chunkFileName);
        console.log('Moved chunk to:', chunkFileName);

        // Check if all chunks are uploaded
        const uploadedChunks = fs.readdirSync(chunksDir).length;
        
        console.log(`Chunk ${parseInt(chunkIndex) + 1}/${totalChunks} uploaded for ${fileName}`);
        console.log(`Total chunks received so far: ${uploadedChunks}`);

        if (uploadedChunks === parseInt(totalChunks)) {
            // All chunks received, merge them
            console.log('✓ All chunks received, merging...');
            await mergeChunks(chunksDir, fileId, fileName, totalChunks);
            
            // Add file to list
            const fileInfo = {
                id: fileId,
                name: fileName,
                sizeBytes: parseInt(fileSize),
                size: formatFileSize(parseInt(fileSize)),
                uploadDate: Date.now(),
                path: path.join(UPLOAD_DIR, fileId)
            };
            
            files.push(fileInfo);
            
            console.log('✓ File upload complete:', fileName);
            
            res.json({ 
                success: true, 
                message: 'Upload complete',
                fileId: fileId,
                file: fileInfo
            });
        } else {
            res.json({ 
                success: true, 
                message: `Chunk ${parseInt(chunkIndex) + 1}/${totalChunks} uploaded`,
                progress: (uploadedChunks / parseInt(totalChunks)) * 100
            });
        }

    } catch (error) {
        console.error('❌ Chunk upload error:', error);
        res.status(500).json({ error: 'Chunk upload failed: ' + error.message });
    }
});

// CANCEL CHUNKED UPLOAD ROUTE - Add this route
app.post('/upload-chunk/cancel', express.json(), async (req, res) => {
    console.log('✓ Upload cancel endpoint hit!');
    console.log('Cancel body:', req.body);
    
    try {
        const { fileId } = req.body;
        const chunksDir = path.join(CHUNKS_DIR, fileId);
        
        if (fs.existsSync(chunksDir)) {
            fs.rmSync(chunksDir, { recursive: true, force: true });
            console.log('✓ Cancelled upload for fileId:', fileId);
        }
        
        res.json({ success: true, message: 'Upload cancelled' });
    } catch (error) {
        console.error('❌ Cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel upload' });
    }
});

// Enhanced download endpoint with streaming and range support
app.get('/download/:fileId', downloadLimiter, async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const filePath = path.join(UPLOAD_DIR, fileId);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Get original filename
        const originalName = getOriginalFileName(fileId);

        if (range) {
            // Handle range requests for resumable downloads
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            const fileStream = fs.createReadStream(filePath, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${originalName}"`,
                'Cache-Control': 'no-cache'
            });
            
            fileStream.pipe(res);
            
            fileStream.on('error', (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error streaming file' });
                }
            });
        } else {
            // Normal streaming download
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${originalName}"`,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache'
            });
            
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
            fileStream.on('error', (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error streaming file' });
                }
            });
        }

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' });
        }
    }
});

// Media streaming endpoint (for video/audio playback)
app.get('/media/stream/:fileId', (req, res) => {
    try {
        const fileId = req.params.fileId;
        const filePath = path.join(UPLOAD_DIR, fileId);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            const file = fs.createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).send('Stream error');
    }
});

// Delete file
app.delete('/file/:fileId', (req, res) => {
    try {
        const fileId = req.params.fileId;
        const filePath = path.join(UPLOAD_DIR, fileId);

        // Remove from files array
        files = files.filter(f => f.id !== fileId);

        // Delete physical file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('File deleted:', fileId);
        }

        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Delete partial file (for cancelled uploads)
app.delete('/file/partial/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(UPLOAD_DIR, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Partial file deleted:', filename);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete partial file error:', error);
        res.status(500).json({ error: 'Failed to delete partial file' });
    }
});

// Get files list (for AJAX refresh)
app.get('/files', (req, res) => {
    const filesWithMetadata = files.map(file => ({
        ...file,
        size: formatFileSize(file.sizeBytes),
        created: new Date(file.uploadDate).toLocaleString()
    }));
    res.json({ files: filesWithMetadata });
});

// Bulk download endpoint
app.post('/download-bulk', (req, res) => {
    try {
        const { fileIds } = req.body;
        
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ error: 'No files selected' });
        }

        // Store the file IDs in session or temp storage for the next request
        const bulkId = Date.now().toString();
        global.bulkDownloads = global.bulkDownloads || {};
        global.bulkDownloads[bulkId] = fileIds;

        console.log('Bulk download prepared for', fileIds.length, 'files');

        res.json({ success: true, bulkId });
    } catch (error) {
        console.error('Bulk download preparation error:', error);
        res.status(500).json({ error: 'Failed to prepare bulk download' });
    }
});

// Serve the bulk download zip
app.get('/download-bulk-zip', downloadLimiter, async (req, res) => {
    try {
        const archive = archiver('zip', { zlib: { level: 5 } });

        res.attachment('files.zip');
        archive.pipe(res);

        // Get the most recent bulk download request
        const bulkDownloads = global.bulkDownloads || {};
        const bulkIds = Object.keys(bulkDownloads);
        
        if (bulkIds.length === 0) {
            return res.status(400).json({ error: 'No bulk download in progress' });
        }

        const latestBulkId = bulkIds[bulkIds.length - 1];
        const fileIds = bulkDownloads[latestBulkId];

        fileIds.forEach(fileId => {
            const file = files.find(f => f.id === fileId);
            if (file && fs.existsSync(file.path)) {
                archive.file(file.path, { name: file.name });
            }
        });

        archive.finalize();

        // Clean up after sending
        archive.on('end', () => {
            delete global.bulkDownloads[latestBulkId];
            console.log('Bulk download completed');
        });

    } catch (error) {
        console.error('Bulk download error:', error);
        res.status(500).json({ error: 'Bulk download failed' });
    }
});

// Session viewing endpoint
app.get('/session/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const fileId = req.query.fileId;
    
    res.render('media-session', { 
        sessionId, 
        fileId,
        streamUrl: `/media/stream/${fileId}`
    });
});

// Socket.IO for collaborative playback
const sessions = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-session', (data) => {
        const { sessionId } = data;
        socket.join(sessionId);
        
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, new Set());
        }
        sessions.get(sessionId).add(socket.id);

        const viewerCount = sessions.get(sessionId).size;
        io.to(sessionId).emit('viewer-count', { sessionId, count: viewerCount });
        
        // Notify others that a new viewer joined
        socket.to(sessionId).emit('viewer-joined', { sessionId, senderId: socket.id });
        
        console.log(`Socket ${socket.id} joined session ${sessionId}. Total viewers: ${viewerCount}`);
    });

    socket.on('media-control', (data) => {
        const { sessionId } = data;
        socket.to(sessionId).emit('media-control', data);
    });

    socket.on('request-sync', (data) => {
        const { sessionId } = data;
        socket.to(sessionId).emit('request-sync', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove from all sessions
        sessions.forEach((viewers, sessionId) => {
            if (viewers.has(socket.id)) {
                viewers.delete(socket.id);
                const viewerCount = viewers.size;
                io.to(sessionId).emit('viewer-count', { sessionId, count: viewerCount });
                
                if (viewerCount === 0) {
                    sessions.delete(sessionId);
                }
            }
        });
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Upload directory: ${UPLOAD_DIR}`);
    console.log(`Temp directory: ${TEMP_DIR}`);
});

// Cleanup temp files on server shutdown
process.on('SIGINT', () => {
    console.log('\nCleaning up temporary files...');
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    console.log('Server shutting down...');
    process.exit();
});
