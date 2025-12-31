// src/routes/index.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(process.cwd(), 'temp');
const CHUNKS_DIR = path.join(TEMP_DIR, 'chunks');

// Ensure directories exist
[UPLOAD_DIR, TEMP_DIR, CHUNKS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Rate limiting - Add all rate limiters at the top
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for chunk uploads
    skip: (req) => {
        // Skip rate limiting for chunk uploads
        return req.path === '/upload-chunk';
    },
    message: 'Too many uploads from this IP, please try again later.'
});

// Separate rate limiter for chunk uploads (more lenient)
const chunkUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Allow many more chunks
    message: 'Too many chunk uploads, please try again later.'
});

// Rate limiter for downloads
const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // More lenient for downloads
    message: 'Too many downloads from this IP, please try again later.'
});

// Rate limiter for API calls
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: 'Too many requests from this IP, please try again later.'
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
        fileSize: 20 * 1024 * 1024, // Increased to 20MB per chunk
        files: 1
    }
});

// In-memory file storage (replace with database in production)
let files = [];

// Function to sync files array with actual files on disk
async function syncFilesFromDisk() {
    try {
        const diskFiles = await fs.promises.readdir(UPLOAD_DIR);
        const existingFileIds = new Set(files.map(f => f.id));
        
        // Add any files from disk that aren't in memory
        for (const filename of diskFiles) {
            if (!existingFileIds.has(filename)) {
                const filePath = path.join(UPLOAD_DIR, filename);
                try {
                    const stats = await fs.promises.stat(filePath);
                    
                    // Extract original name (remove timestamp prefix if exists)
                    let originalName = filename;
                    const match = filename.match(/^\d+-\d+-(.+)$/);
                    if (match) {
                        originalName = match[1];
                    }
                    
                    const fileInfo = {
                        id: filename,
                        name: originalName,
                        sizeBytes: stats.size,
                        size: formatFileSize(stats.size),
                        uploadDate: stats.birthtime.getTime(),
                        path: filePath
                    };
                    
                    files.push(fileInfo);
                    console.log('✓ Synced file from disk:', originalName);
                } catch (statError) {
                    console.error('Error reading file stats:', filename, statError);
                }
            }
        }
        
        // Remove files from memory that don't exist on disk
        files = files.filter(file => {
            const exists = diskFiles.includes(file.id);
            if (!exists) {
                console.log('✗ Removed missing file from memory:', file.name);
            }
            return exists;
        });
        
        console.log(`✓ Files synced. Total: ${files.length}`);
    } catch (error) {
        console.error('Error syncing files from disk:', error);
    }
}

// Sync files on startup
syncFilesFromDisk();

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

// ============= AUTHENTICATION MIDDLEWARE =============

// Middleware to check authentication
function requireAuth(req, res, next) {
    console.log('=== Auth Check ===');
    console.log('Path:', req.path);
    console.log('Session exists:', !!req.session);
    console.log('Authenticated:', req.session?.authenticated || false);
    
    // Allow access to auth routes without authentication
    if (req.path === '/auth' || req.path === '/verify-pin') {
        return next();
    }

    // Check if authenticated
    if (req.session && req.session.authenticated) {
        console.log('✓ User is authenticated');
        return next();
    }

    // Redirect to auth page
    console.log('❌ User not authenticated, redirecting to /auth');
    res.redirect('/auth');
}

// ============= ROUTES ===================

// Authentication page (PIN entry) - NO AUTH REQUIRED
router.get('/auth', (req, res) => {
    // If already authenticated, redirect to home
    if (req.session && req.session.authenticated) {
        console.log('Already authenticated, redirecting to home');
        return res.redirect('/');
    }
    res.render('auth');
});

// Verify PIN endpoint - NO AUTH REQUIRED
router.post('/verify-pin', (req, res) => {
    console.log('=== PIN Verification Debug ===');
    console.log('Request body:', req.body);
    console.log('Session before:', req.session);
    
    const { pin } = req.body;
    
    // Get PIN from environment variable or use default
    const ADMIN_PIN = process.env.ADMIN_PIN || '123456';
    
    console.log('PIN received:', pin);
    console.log('Expected PIN:', ADMIN_PIN);
    console.log('PIN match:', pin === ADMIN_PIN);
    
    if (pin === ADMIN_PIN) {
        // Set session
        if (!req.session) {
            console.error('❌ Session not initialized!');
            return res.status(500).json({ 
                success: false,
                message: 'Session configuration error',
                redirect: '/auth'
            });
        }
        
        req.session.authenticated = true;
        req.session.authenticatedAt = Date.now();
        
        console.log('Session after setting auth:', req.session);
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('❌ Session save error:', err);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to save session',
                    redirect: '/auth'
                });
            }
            
            console.log('✓✓✓ PIN verified and session saved successfully');
            console.log('Session after save:', req.session);
            
            // Send success with redirect URL
            res.json({ 
                success: true,
                message: 'Access granted',
                redirect: '/'
            });
        });
    } else {
        console.log('❌ Invalid PIN attempt');
        
        res.status(401).json({ 
            success: false,
            message: 'Invalid PIN. Please try again.',
            redirect: null
        });
    }
});

// Home page - REQUIRES AUTH
router.get('/', requireAuth, async (req, res) => {
    console.log('✓ Rendering home page');
    
    // Sync with disk before rendering
    await syncFilesFromDisk();
    
    const filesWithMetadata = files.map(file => ({
        ...file,
        size: formatFileSize(file.sizeBytes),
        created: new Date(file.uploadDate).toLocaleString()
    }));
    
    res.render('index', { files: filesWithMetadata });
});

// Regular file upload (for smaller files)
router.post('/upload', requireAuth, uploadLimiter, upload.single('file'), (req, res) => {
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
        console.log('✓ File uploaded:', fileInfo.name);

        res.json({ 
            success: true, 
            message: 'File uploaded successfully',
            file: fileInfo 
        });
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// ============= CHUNKED UPLOAD ROUTES =============

// Chunked upload endpoint
router.post('/upload-chunk', requireAuth, chunkUploadLimiter, chunkUpload.single('chunk'), async (req, res) => {
    console.log('✓ Upload chunk endpoint hit!');
    console.log('Chunk Index:', req.body.chunkIndex);
    console.log('Total Chunks:', req.body.totalChunks);
    
    try {
        const { chunkIndex, totalChunks, fileId, fileName, fileSize } = req.body;
        
        if (!req.file) {
            console.error('❌ No chunk file received');
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
        
        // Check if file exists and remove temp file
        if (fs.existsSync(chunkPath)) {
            fs.renameSync(chunkPath, chunkFileName);
            console.log('Moved chunk to:', chunkFileName);
        } else {
            console.error('❌ Chunk file not found:', chunkPath);
            return res.status(500).json({ error: 'Chunk file not found' });
        }

        // Check if all chunks are uploaded
        const uploadedChunks = fs.readdirSync(chunksDir).length;
        
        console.log(`✓ Chunk ${parseInt(chunkIndex) + 1}/${totalChunks} uploaded for ${fileName}`);
        console.log(`Total chunks received: ${uploadedChunks}/${totalChunks}`);

        if (uploadedChunks === parseInt(totalChunks)) {
            // All chunks received, merge them
            console.log('✓ All chunks received, merging...');
            
            try {
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
                
                console.log('✓✓✓ File upload complete:', fileName);
                
                res.json({ 
                    success: true, 
                    message: 'Upload complete',
                    fileId: fileId,
                    file: fileInfo
                });
            } catch (mergeError) {
                console.error('❌ Merge error:', mergeError);
                res.status(500).json({ 
                    error: 'Failed to merge chunks: ' + mergeError.message 
                });
            }
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

// Cancel chunked upload
router.post('/upload-chunk/cancel', requireAuth, async (req, res) => {
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

// ============= END CHUNKED UPLOAD ROUTES =============

// Enhanced download endpoint with streaming and range support
router.get('/download/:fileId', requireAuth, downloadLimiter, async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const filePath = path.join(UPLOAD_DIR, fileId);
        
        console.log('Download request for:', fileId);
        
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return res.status(404).json({ error: 'File not found' });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        const originalName = getOriginalFileName(fileId);

        console.log('File size:', formatFileSize(fileSize));
        console.log('Range request:', range || 'none');

        // Set longer timeout for this specific request
        req.setTimeout(0); // Disable timeout for download
        res.setTimeout(0); // Disable timeout for response

        if (range) {
            // Handle range request for partial content
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            console.log(`Streaming range: ${start}-${end} (${formatFileSize(chunksize)})`);
            
            const fileStream = fs.createReadStream(filePath, { 
                start, 
                end,
                highWaterMark: 64 * 1024 // 64KB chunks for streaming
            });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Connection': 'keep-alive'
            });
            
            fileStream.pipe(res);
            
            fileStream.on('error', (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error streaming file' });
                } else {
                    res.end();
                }
            });

            fileStream.on('end', () => {
                console.log('Range download complete');
            });

            // Handle client disconnect
            req.on('close', () => {
                console.log('Client disconnected, stopping stream');
                fileStream.destroy();
            });

        } else {
            // Full file download
            console.log('Streaming full file:', originalName);
            
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Connection': 'keep-alive'
            });
            
            const fileStream = fs.createReadStream(filePath, {
                highWaterMark: 64 * 1024 // 64KB chunks for better performance
            });

            let bytesStreamed = 0;
            
            fileStream.on('data', (chunk) => {
                bytesStreamed += chunk.length;
                if (bytesStreamed % (1024 * 1024 * 10) === 0) { // Log every 10MB
                    console.log(`Streamed ${formatFileSize(bytesStreamed)} / ${formatFileSize(fileSize)}`);
                }
            });

            fileStream.pipe(res);
            
            fileStream.on('error', (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error streaming file' });
                } else {
                    res.end();
                }
            });

            fileStream.on('end', () => {
                console.log('✓ Download complete:', originalName);
            });

            // Handle client disconnect
            req.on('close', () => {
                console.log('Client disconnected, stopping stream');
                fileStream.destroy();
            });

            // Handle response errors
            res.on('error', (error) => {
                console.error('Response error:', error);
                fileStream.destroy();
            });
        }

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed: ' + error.message });
        }
    }
});

// Delete file
router.delete('/file/:fileId', requireAuth, (req, res) => {
    try {
        const fileId = req.params.fileId;
        const filePath = path.join(UPLOAD_DIR, fileId);

        files = files.filter(f => f.id !== fileId);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('✓ File deleted:', fileId);
        }

        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Delete partial file
router.delete('/file/partial/:filename', requireAuth, (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(UPLOAD_DIR, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('✓ Partial file deleted:', filename);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Delete partial file error:', error);
        res.status(500).json({ error: 'Failed to delete partial file' });
    }
});

// Get files list
router.get('/files', requireAuth, apiLimiter, async (req, res) => {
    try {
        // Sync with disk before returning list
        await syncFilesFromDisk();
        
        const filesWithMetadata = files.map(file => ({
            ...file,
            size: formatFileSize(file.sizeBytes),
            created: new Date(file.uploadDate).toLocaleString()
        }));
        res.json({ files: filesWithMetadata });
    } catch (error) {
        console.error('Error getting files list:', error);
        res.status(500).json({ error: 'Failed to get files list' });
    }
});

// Bulk download
router.post('/download-bulk', requireAuth, apiLimiter, (req, res) => {
    try {
        const { fileIds } = req.body;
        
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ error: 'No files selected' });
        }

        const bulkId = Date.now().toString();
        global.bulkDownloads = global.bulkDownloads || {};
        global.bulkDownloads[bulkId] = fileIds;

        console.log('✓ Bulk download prepared for', fileIds.length, 'files');

        res.json({ success: true, bulkId });
    } catch (error) {
        console.error('❌ Bulk download preparation error:', error);
        res.status(500).json({ error: 'Failed to prepare bulk download' });
    }
});

// Serve bulk download zip
router.get('/download-bulk-zip', requireAuth, downloadLimiter, async (req, res) => {
    try {
        const archive = archiver('zip', { zlib: { level: 5 } });

        res.attachment('files.zip');
        archive.pipe(res);

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

        archive.on('end', () => {
            delete global.bulkDownloads[latestBulkId];
            console.log('✓ Bulk download completed');
        });

    } catch (error) {
        console.error('❌ Bulk download error:', error);
        res.status(500).json({ error: 'Bulk download failed' });
    }
});

// Preview route for inline viewing (PDFs, images, videos, text files, etc.)
router.get('/preview/:fileId', requireAuth, downloadLimiter, async (req, res) => {
    try {
        // Get fileId from params (no need to decode as Express already does)
        const fileId = req.params.fileId;
        const filePath = path.join(UPLOAD_DIR, fileId);
        
        console.log('Preview request for:', fileId);
        console.log('Preview file path:', filePath);
        console.log('File exists:', fs.existsSync(filePath));
        
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>File Not Found</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h1 { color: #f44336; }
                    </style>
                </head>
                <body>
                    <h1>File Not Found</h1>
                    <p>The requested file could not be found.</p>
                    <p><small>File ID: ${fileId}</small></p>
                </body>
                </html>
            `);
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const originalName = getOriginalFileName(fileId);
        const ext = path.extname(originalName).toLowerCase();
        
        // Determine content type
        const contentTypes = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.bmp': 'image/bmp',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.mov': 'video/quicktime',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.flac': 'audio/flac',
            '.txt': 'text/plain; charset=utf-8',
            '.log': 'text/plain; charset=utf-8',
            '.md': 'text/plain; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.xml': 'text/xml; charset=utf-8',
            '.csv': 'text/csv; charset=utf-8',
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.ts': 'text/typescript; charset=utf-8',
            '.jsx': 'text/javascript; charset=utf-8',
            '.tsx': 'text/typescript; charset=utf-8',
            '.py': 'text/x-python; charset=utf-8',
            '.java': 'text/x-java; charset=utf-8',
            '.c': 'text/x-c; charset=utf-8',
            '.cpp': 'text/x-c++; charset=utf-8',
            '.h': 'text/x-c; charset=utf-8',
            '.hpp': 'text/x-c++; charset=utf-8',
            '.php': 'text/x-php; charset=utf-8',
            '.rb': 'text/x-ruby; charset=utf-8',
            '.go': 'text/x-go; charset=utf-8',
            '.rs': 'text/x-rust; charset=utf-8',
            '.sh': 'text/x-sh; charset=utf-8',
            '.bat': 'text/plain; charset=utf-8',
            '.yaml': 'text/yaml; charset=utf-8',
            '.yml': 'text/yaml; charset=utf-8',
            '.conf': 'text/plain; charset=utf-8',
            '.ini': 'text/plain; charset=utf-8',
            '.sql': 'text/x-sql; charset=utf-8',
            '.kt': 'text/x-kotlin; charset=utf-8',
            '.swift': 'text/x-swift; charset=utf-8',
            '.mkv': 'video/x-matroska',
            '.avi': 'video/x-msvideo'
        };
        
        const contentType = contentTypes[ext] || 'application/octet-stream';
        
        console.log('Preview file:', originalName, 'Type:', contentType);
        
        // Set headers for inline viewing
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff'
        });
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
            console.error('Preview stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            } else {
                res.end();
            }
        });
        
        fileStream.on('end', () => {
            console.log('Preview stream complete');
        });
        
    } catch (error) {
        console.error('Error in preview:', error);
        res.status(500).json({ error: 'Failed to preview file' });
    }
});

module.exports = router;