// Utility functions
const Utils = {
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getDisplayName(filename) {
        const match = filename.match(/^\d+-(.+)$/);
        return match ? match[1] : filename;
    },

    calculateSpeed(loaded, timeElapsed) {
        const bytesPerSecond = loaded / (timeElapsed / 1000);
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        let size = bytesPerSecond;
        let unitIndex = 0;
        while (size > 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
};

// Progress Bar Handler
const ProgressBar = {
    create(filename) {
        const template = document.getElementById('progress-bar-template');
        const progressBar = template.content.cloneNode(true).children[0];
        progressBar.querySelector('.filename').textContent = filename;
        document.getElementById('upload-progress-container').appendChild(progressBar);
        return progressBar;
    },

    update(progressBar, percent, speed) {
        progressBar.querySelector('.determinate').style.width = `${percent}%`;
        progressBar.querySelector('.progress-text').textContent = `${Math.round(percent)}%`;
        progressBar.querySelector('.upload-speed').textContent = speed;
    },

    complete(progressBar) {
        progressBar.querySelector('.determinate').style.width = '100%';
        progressBar.querySelector('.progress-text').textContent = 'Complete';
        setTimeout(() => {
            progressBar.querySelector('.determinate').style.backgroundColor = '#4CAF50';
        }, 50);
    },

    error(progressBar) {
        progressBar.querySelector('.determinate').style.backgroundColor = '#F44336';
        progressBar.querySelector('.progress-text').textContent = 'Failed';
    }
};

// File Manager
const FileManager = {
    async downloadFile(button) {
        const fileId = button.closest('.file-item').dataset.fileId;
        window.location.href = `/download/${fileId}`;
    },

    async deleteFile(button) {
        const fileItem = button.closest('.file-item');
        const fileId = fileItem.dataset.fileId;
        
        if (confirm('Are you sure you want to delete this file?')) {
            try {
                fileItem.classList.add('removing');
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const response = await fetch(`/file/${fileId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                
                if (result.success) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    fileItem.remove();
                    
                    const filesList = document.querySelector('.files-list');
                    if (!filesList.children.length) {
                        const emptyState = document.createElement('div');
                        emptyState.className = 'empty-state';
                        emptyState.innerHTML = `
                            <i class="material-icons">folder_open</i>
                            <p>No files uploaded yet</p>
                        `;
                        filesList.appendChild(emptyState);
                    }
                    
                    M.toast({html: 'File deleted successfully!', classes: 'green'});
                } else {
                    fileItem.classList.remove('removing');
                    M.toast({html: 'Delete failed!', classes: 'red'});
                }
            } catch (error) {
                fileItem.classList.remove('removing');
                M.toast({html: 'Delete failed!', classes: 'red'});
                console.error('Error:', error);
            }
        }
    },

    // Add missing fetchAndReplaceFilesList method
    async fetchAndReplaceFilesList() {
        try {
            const response = await fetch(window.location.pathname, {
                cache: "no-store"  // Prevent caching
            });
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newList = doc.querySelector('.files-list');
            if (newList) {
                document.querySelector('.files-list').innerHTML = newList.innerHTML;
            }
        } catch (err) {
            console.error('Failed to refresh file list:', err);
            throw err;  // Propagate error to handle in upload
        }
    }
};

// File Uploader
class FileUploader {
    constructor() {
        // Bind methods to preserve 'this' context
        this.handleFileUpload = this.handleFileUpload.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.preventDefaults = this.preventDefaults.bind(this);
        this.highlight = this.highlight.bind(this);
        this.unhighlight = this.unhighlight.bind(this);
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        const fileUpload = document.getElementById('fileUpload');
        const dropZone = document.getElementById('dropZone');
        const dropMessage = document.querySelector('.drop-message');

        // Remove any existing listeners before adding new ones
        fileUpload.removeEventListener('change', this.handleFileUpload);
        fileUpload.addEventListener('change', this.handleFileUpload);

        // Prevent defaults for drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.removeEventListener(eventName, this.preventDefaults);
            document.body.removeEventListener(eventName, this.preventDefaults);
            dropZone.addEventListener(eventName, this.preventDefaults);
            document.body.addEventListener(eventName, this.preventDefaults);
        });

        // Handle drop zone highlight
        dropZone.removeEventListener('dragenter', () => this.highlight(dropMessage));
        dropZone.removeEventListener('dragover', () => this.highlight(dropMessage));
        dropZone.addEventListener('dragenter', () => this.highlight(dropMessage));
        dropZone.addEventListener('dragover', () => this.highlight(dropMessage));

        // Handle drop zone unhighlight
        dropZone.removeEventListener('dragleave', () => this.unhighlight(dropMessage));
        dropZone.removeEventListener('drop', () => this.unhighlight(dropMessage));
        dropZone.addEventListener('dragleave', () => this.unhighlight(dropMessage));
        dropZone.addEventListener('drop', () => this.unhighlight(dropMessage));

        // Handle file drop
        dropZone.removeEventListener('drop', this.handleDrop);
        dropZone.addEventListener('drop', this.handleDrop);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(dropMessage) {
        document.getElementById('dropZone').classList.add('drag-over');
        dropMessage.style.display = 'block';
    }

    unhighlight(dropMessage) {
        document.getElementById('dropZone').classList.remove('drag-over');
        dropMessage.style.display = 'none';
    }

    async handleDrop(e) {
        const files = e.dataTransfer.files;
        this.unhighlight(document.querySelector('.drop-message'));
        
        for (const file of files) {
            await this.uploadFile(file);
        }
    }

    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        for (const file of files) {
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const progressBar = ProgressBar.create(file.name);
        const progressContainer = document.getElementById('upload-progress-container');
        progressContainer.style.display = 'block';
        
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload', true);
            const startTime = Date.now();

            // Add cancel button handler
            const cancelBtn = progressBar.querySelector('.cancel-upload');
            cancelBtn.addEventListener('click', () => {
                xhr.abort();
                progressBar.remove();
                M.toast({html: `Upload cancelled for ${file.name}`, classes: 'blue'});
                
                // Hide container if no uploads
                if (!progressContainer.children.length) {
                    progressContainer.style.display = 'none';
                }
            });

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    const speed = Utils.calculateSpeed(e.loaded, Date.now() - startTime);
                    ProgressBar.update(progressBar, percentComplete, speed);
                }
            };

            xhr.onabort = () => {
                M.toast({html: `Upload cancelled for ${file.name}`, classes: 'blue'});
                progressBar.remove();
            };

            xhr.onload = async function() {
                if (xhr.status === 200) {
                    try {
                        ProgressBar.complete(progressBar);
                        const now = new Date();
                        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                        await FileManager.fetchAndReplaceFilesList();
                        M.toast({html: `${file.name} uploaded at ${time}!`, classes: 'green'});
                    } catch (error) {
                        ProgressBar.error(progressBar);
                        M.toast({html: `Failed to process upload for ${file.name}`, classes: 'red'});
                    }
                } else {
                    ProgressBar.error(progressBar);
                    M.toast({html: `Failed to upload ${file.name}`, classes: 'red'});
                }
            };

            xhr.onerror = function() {
                ProgressBar.error(progressBar);
                M.toast({html: `Failed to upload ${file.name}`, classes: 'red'});
            };

            xhr.send(formData);
        } catch (error) {
            ProgressBar.error(progressBar);
            M.toast({html: `Error uploading ${file.name}: ${error.message}`, classes: 'red'});
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit();
    new FileUploader();
});

// Make objects globally available
window.Utils = Utils;
window.ProgressBar = ProgressBar;
window.FileManager = FileManager;