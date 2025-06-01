// src/routes/index.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fileManager = require('../utils/fileManager');
const fs = require('fs');
const archiver = require('archiver'); // Add this line

// Configure multer for optimized uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../shared-files'));
    },
    filename: function (req, file, cb) {
        // Simplified filename to reduce overhead
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10737418240, // 10GB
        fieldSize: 10737418240
    },
    highWaterMark: 64 * 1024 // Increase buffer size to 64KB
}).single('file');

// Routes
router.get('/', async (req, res) => {
    const files = await fileManager.listFiles();
    res.render('index', { files });
});

// Optimized upload route
router.post('/upload', (req, res) => {
    // Set TCP_NODELAY to true for better streaming performance
    req.socket.setNoDelay(true);
    
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'File upload error: ' + err.message });
        } else if (err) {
            return res.status(500).json({ error: 'Server error: ' + err.message });
        }
        res.json({ success: true, file: req.file });
    });
});

router.get('/download/:filename', (req, res) => {
    const filePath = fileManager.getFilePath(req.params.filename);
    res.download(filePath);
});

// Update the delete route handler
router.delete('/file/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const success = await fileManager.deleteFile(filename);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'File not found or could not be deleted' 
            });
        }
    } catch (error) {
        console.error('Delete route error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error while deleting file' 
        });
    }
});

const sharedDir = path.join(__dirname, '../../shared-files');

// Ensure shared-files directory exists
if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
}

// Delete all files that end with -originalname
router.delete('/file/partial/:originalname', async (req, res) => {
    try {
        const original = req.params.originalname;
        const files = await fs.promises.readdir(sharedDir);
        let deleted = false;
        for (const file of files) {
            if (file.endsWith(`-${original}`)) {
                await fs.promises.unlink(path.join(sharedDir, file));
                deleted = true;
            }
        }
        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'No partial file found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Add these right after your existing routes, before module.exports
const TEMP_DIR = path.join(__dirname, '../temp');
// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

function getFilePath(fileId) {
    try {
        console.log('Looking for file with ID:', fileId);
        const files = fs.readdirSync(sharedDir);
        console.log('Available files:', files);
        const file = files.find(f => f.startsWith(fileId));
        console.log('Found file:', file);
        return file ? path.join(sharedDir, file) : null;
    } catch (error) {
        console.error('Error getting file path:', error);
        return null;
    }
}

function getLatestZipPath() {
    try {
        console.log('Searching for zip files in:', TEMP_DIR);
        const files = fs.readdirSync(TEMP_DIR);
        const zipFiles = files.filter(f => f.endsWith('.zip'));
        console.log('Found zip files:', zipFiles);
        if (zipFiles.length === 0) return null;
        
        return path.join(TEMP_DIR, zipFiles
            .map(f => ({name: f, time: fs.statSync(path.join(TEMP_DIR, f)).mtime}))
            .sort((a, b) => b.time - a.time)[0].name);
    } catch (error) {
        console.error('Error getting zip path:', error);
        return null;
    }
}

router.post('/download-bulk', async (req, res) => {
    console.log('Bulk download request received:', req.body);
    try {
        const { fileIds } = req.body;
        if (!fileIds || !Array.isArray(fileIds)) {
            return res.status(400).json({ error: 'Invalid file IDs' });
        }

        const zipPath = path.join(TEMP_DIR, `bulk-${Date.now()}.zip`);
        const output = fs.createWriteStream(zipPath);
        
        // Configure archiver with optimized compression settings
        const archive = archiver('zip', {
            zlib: { 
                level: 9, // Maximum compression
                memLevel: 9, // Maximum memory for compression
                strategy: 0 // Default strategy for best compression
            },
            forceLocalTime: true // Use local time for better compatibility
        });

        // Optimize based on file types
        const compressibleTypes = /\.(txt|html|css|js|json|md|csv|xml|yml|log)$/i;
        const alreadyCompressedTypes = /\.(jpg|jpeg|png|gif|mp3|mp4|avi|mov|zip|rar|7z|gz)$/i;

        output.on('close', () => {
            console.log(`Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
            res.json({ success: true });
        });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            res.status(500).json({ error: 'Failed to create zip file' });
        });

        archive.pipe(output);

        let hasFiles = false;
        for (const fileId of fileIds) {
            const filePath = getFilePath(fileId);
            if (filePath && fs.existsSync(filePath)) {
                hasFiles = true;
                const fileName = path.basename(filePath).replace(/^\d+-/, '');
                
                // Apply different compression settings based on file type
                if (alreadyCompressedTypes.test(fileName)) {
                    // Store already compressed files without recompressing
                    archive.file(filePath, { 
                        name: fileName,
                        store: true // Skip compression
                    });
                } else if (compressibleTypes.test(fileName)) {
                    // Maximum compression for text-based files
                    archive.file(filePath, { 
                        name: fileName,
                        compression: 'DEFLATE',
                        compressionOptions: {
                            level: 9
                        }
                    });
                } else {
                    // Default compression for other files
                    archive.file(filePath, { 
                        name: fileName,
                        compression: 'DEFLATE',
                        compressionOptions: {
                            level: 6
                        }
                    });
                }
            }
        }

        if (!hasFiles) {
            return res.status(404).json({ error: 'No valid files found' });
        }

        await archive.finalize();
    } catch (error) {
        console.error('Bulk download error:', error);
        res.status(500).json({ error: 'Server error processing files' });
    }
});

router.get('/download-bulk-zip', (req, res) => {
    const zipPath = getLatestZipPath();
    if (!zipPath) {
        return res.status(404).json({ error: 'No zip file found' });
    }
    res.download(zipPath, 'downloaded-files.zip', () => {
        fs.unlink(zipPath, (err) => {
            if (err) console.error('Failed to cleanup zip:', err);
        });
    });
});

module.exports = router;