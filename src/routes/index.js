// src/routes/index.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fileManager = require('../utils/fileManager');

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

module.exports = router;