const fs = require('fs').promises;
const path = require('path');

class FileManager {
    constructor() {
        this.sharedFolder = path.join(__dirname, '../../shared-files');
        this.initializeFolder();
    }

    async initializeFolder() {
        try {
            await fs.mkdir(this.sharedFolder, { recursive: true });
        } catch (error) {
            console.error('Error creating shared folder:', error);
        }
    }

    async listFiles() {
        try {
            const files = await fs.readdir(this.sharedFolder);
            return Promise.all(files.map(async (filename) => {
                const stats = await fs.stat(path.join(this.sharedFolder, filename));
                return {
                    id: filename,
                    name: this.getDisplayName(filename),
                    size: this.formatFileSize(stats.size),
                    created: `${stats.birthtime.toLocaleDateString()} ${stats.birthtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                };
            }));
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFilePath(filename) {
        return path.join(this.sharedFolder, filename);
    }

    async deleteFile(filename) {
        try {
            const filePath = path.join(this.sharedFolder, filename);
            
            // Check if file exists before attempting to delete
            try {
                await fs.access(filePath);
            } catch {
                return false;
            }

            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    getDisplayName(filename) {
        return filename.replace(/^\d+-/, '');
    }
}

module.exports = new FileManager();