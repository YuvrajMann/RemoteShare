// Global variables for media preview
let mediaPreviewModal;

// File type icon mapping for modal
const fileTypeIcons = {
    video: 'movie',
    audio: 'music_note',
    image: 'image',
    pdf: 'picture_as_pdf',
    code: 'code',
    document: 'description',
    default: 'insert_drive_file'
};

function getMediaTypeIcon(ext) {
    if (['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext)) return fileTypeIcons.video;
    if (['mp3', 'wav', 'm4a', 'aac', 'flac'].includes(ext)) return fileTypeIcons.audio;
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return fileTypeIcons.image;
    if (ext === 'pdf') return fileTypeIcons.pdf;
    if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css', 'json', 'xml'].includes(ext)) return fileTypeIcons.code;
    if (['txt', 'md', 'log', 'doc', 'docx'].includes(ext)) return fileTypeIcons.document;
    return fileTypeIcons.default;
}

// Function to preview media files
function previewMedia(fileId, fileName) {
    try {
        console.log('Opening preview for:', fileId, fileName);
        
        // Initialize modal if not already done
        const modalElem = document.getElementById('mediaPreviewModal');
        if (!mediaPreviewModal) {
            mediaPreviewModal = M.Modal.init(modalElem, {
                dismissible: true,
                opacity: 0.6,
                inDuration: 250,
                outDuration: 200,
                onCloseEnd: function() {
                    // Clean up media elements when modal closes
                    const container = document.getElementById('mediaContainer');
                    container.innerHTML = '';
                }
            });
        }
        
        // Get file extension
        const ext = fileName.split('.').pop().toLowerCase();
        
        // Set title and icon
        document.getElementById('mediaTitle').textContent = fileName;
        const typeIcon = document.querySelector('.media-type-icon');
        if (typeIcon) {
            typeIcon.textContent = getMediaTypeIcon(ext);
        }
        
        // Get container
        const container = document.getElementById('mediaContainer');
        container.innerHTML = '';
        
        // Setup download button
        const downloadBtn = document.getElementById('downloadOriginalBtn');
        downloadBtn.style.display = 'flex';
        downloadBtn.onclick = () => {
            window.location.href = `/download/${fileId}`;
        };
        
        // Determine media type and create appropriate element
        if (['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext)) {
            // Video
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = false;
            video.src = `/preview/${fileId}`;
            video.style.width = '100%';
            video.style.maxHeight = '70vh';
            container.appendChild(video);
            
        } else if (['mp3', 'wav', 'm4a', 'aac', 'flac'].includes(ext)) {
            // Audio - YouTube Music style player with rotating disk
            const playerWrapper = document.createElement('div');
            playerWrapper.className = 'audio-player-wrapper';
            playerWrapper.innerHTML = `
                <div class="audio-disk-container">
                    <div class="audio-disk">
                        <div class="disk-inner">
                            <i class="material-icons disk-icon">music_note</i>
                        </div>
                    </div>
                </div>
                <div class="audio-info">
                    <div class="audio-title">${fileName}</div>
                    <div class="audio-artist">Unknown Artist</div>
                </div>
                <div class="audio-progress-container">
                    <span class="audio-time current">0:00</span>
                    <div class="audio-progress-bar">
                        <div class="audio-progress-fill"></div>
                        <div class="audio-progress-handle"></div>
                    </div>
                    <span class="audio-time duration">0:00</span>
                </div>
                <div class="audio-controls">
                    <button class="audio-btn shuffle" title="Shuffle"><i class="material-icons">shuffle</i></button>
                    <button class="audio-btn prev" title="Previous"><i class="material-icons">skip_previous</i></button>
                    <button class="audio-btn play-pause" title="Play"><i class="material-icons">play_arrow</i></button>
                    <button class="audio-btn next" title="Next"><i class="material-icons">skip_next</i></button>
                    <button class="audio-btn repeat" title="Repeat"><i class="material-icons">repeat</i></button>
                </div>
                <div class="audio-volume-container">
                    <button class="audio-btn volume-btn" title="Volume"><i class="material-icons">volume_up</i></button>
                    <div class="audio-volume-bar">
                        <div class="audio-volume-fill" style="width: 100%"></div>
                    </div>
                </div>
            `;
            container.appendChild(playerWrapper);

            // Create hidden audio element
            const audio = document.createElement('audio');
            audio.src = `/preview/${fileId}`;
            audio.preload = 'metadata';
            container.appendChild(audio);

            // Get elements
            const disk = playerWrapper.querySelector('.audio-disk');
            const playPauseBtn = playerWrapper.querySelector('.play-pause');
            const progressBar = playerWrapper.querySelector('.audio-progress-bar');
            const progressFill = playerWrapper.querySelector('.audio-progress-fill');
            const progressHandle = playerWrapper.querySelector('.audio-progress-handle');
            const currentTimeEl = playerWrapper.querySelector('.audio-time.current');
            const durationEl = playerWrapper.querySelector('.audio-time.duration');
            const volumeBtn = playerWrapper.querySelector('.volume-btn');
            const volumeBar = playerWrapper.querySelector('.audio-volume-bar');
            const volumeFill = playerWrapper.querySelector('.audio-volume-fill');

            // Format time helper
            function formatTime(seconds) {
                if (isNaN(seconds)) return '0:00';
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            }

            // Play/Pause
            playPauseBtn.addEventListener('click', () => {
                if (audio.paused) {
                    audio.play();
                    playPauseBtn.querySelector('i').textContent = 'pause';
                    disk.classList.add('spinning');
                } else {
                    audio.pause();
                    playPauseBtn.querySelector('i').textContent = 'play_arrow';
                    disk.classList.remove('spinning');
                }
            });

            // Update progress
            audio.addEventListener('timeupdate', () => {
                const percent = (audio.currentTime / audio.duration) * 100;
                progressFill.style.width = percent + '%';
                progressHandle.style.left = percent + '%';
                currentTimeEl.textContent = formatTime(audio.currentTime);
            });

            // Duration loaded
            audio.addEventListener('loadedmetadata', () => {
                durationEl.textContent = formatTime(audio.duration);
            });

            // Seek
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audio.currentTime = percent * audio.duration;
            });

            // Volume
            let isMuted = false;
            volumeBtn.addEventListener('click', () => {
                isMuted = !isMuted;
                audio.muted = isMuted;
                volumeBtn.querySelector('i').textContent = isMuted ? 'volume_off' : 'volume_up';
                volumeFill.style.width = isMuted ? '0%' : '100%';
            });

            volumeBar.addEventListener('click', (e) => {
                const rect = volumeBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audio.volume = Math.max(0, Math.min(1, percent));
                volumeFill.style.width = (percent * 100) + '%';
                volumeBtn.querySelector('i').textContent = percent === 0 ? 'volume_off' : percent < 0.5 ? 'volume_down' : 'volume_up';
            });

            // End of track
            audio.addEventListener('ended', () => {
                playPauseBtn.querySelector('i').textContent = 'play_arrow';
                disk.classList.remove('spinning');
                progressFill.style.width = '0%';
                progressHandle.style.left = '0%';
                audio.currentTime = 0;
            });
            
        } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
            // Image
            const img = document.createElement('img');
            img.src = `/preview/${fileId}`;
            img.alt = fileName;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '70vh';
            img.style.objectFit = 'contain';
            container.appendChild(img);
            
        } else if (ext === 'pdf') {
            // PDF - Enhanced viewer with preview endpoint
            const pdfWrapper = document.createElement('div');
            pdfWrapper.style.width = '100%';
            pdfWrapper.style.height = '75vh';
            pdfWrapper.style.position = 'relative';
            pdfWrapper.style.background = '#525659';
            pdfWrapper.style.borderRadius = '10px';
            pdfWrapper.style.overflow = 'hidden';
            
            // Loading indicator
            const loader = document.createElement('div');
            loader.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #fff;">
                    <div class="preloader-wrapper active">
                        <div class="spinner-layer spinner-blue-only">
                            <div class="circle-clipper left"><div class="circle"></div></div>
                            <div class="gap-patch"><div class="circle"></div></div>
                            <div class="circle-clipper right"><div class="circle"></div></div>
                        </div>
                    </div>
                    <p style="margin-top: 20px;">Loading PDF...</p>
                </div>
            `;
            pdfWrapper.appendChild(loader);
            
            // Create iframe for PDF using preview endpoint
            const iframe = document.createElement('iframe');
            iframe.src = `/preview/${fileId}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`;
            iframe.type = 'application/pdf';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.display = 'none';
            
            // Handle iframe load
            iframe.onload = () => {
                loader.style.display = 'none';
                iframe.style.display = 'block';
            };
            
            // Handle iframe error
            iframe.onerror = () => {
                loader.style.display = 'none';
                pdfWrapper.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #fff;">
                        <i class="material-icons" style="font-size: 4rem; opacity: 0.7;">picture_as_pdf</i>
                        <p style="margin-top: 1rem; font-size: 1.1rem;">Unable to display PDF in browser</p>
                        <p style="margin-top: 0.5rem; opacity: 0.8;">Please download the file to view it</p>
                    </div>
                `;
            };
            
            pdfWrapper.appendChild(iframe);
            container.appendChild(pdfWrapper);
            
            // Fallback: try to load after a short delay if not loaded
            setTimeout(() => {
                if (loader.style.display !== 'none') {
                    // Try alternative method with object tag using preview endpoint
                    const object = document.createElement('object');
                    object.data = `/preview/${fileId}`;
                    object.type = 'application/pdf';
                    object.style.width = '100%';
                    object.style.height = '100%';
                    object.innerHTML = `
                        <div style="text-align: center; padding: 3rem; color: #fff;">
                            <i class="material-icons" style="font-size: 4rem; opacity: 0.7;">picture_as_pdf</i>
                            <p style="margin-top: 1rem;">Unable to display PDF in browser</p>
                            <p style="margin-top: 0.5rem; opacity: 0.8;">Your browser may not support inline PDF viewing</p>
                            <button class="btn blue" onclick="window.open('/preview/${fileId}', '_blank')" style="margin-top: 1rem;">
                                <i class="material-icons left">open_in_new</i>Open in New Tab
                            </button>
                        </div>
                    `;
                    pdfWrapper.innerHTML = '';
                    pdfWrapper.appendChild(object);
                }
            }, 3000);
            
        } else if (['txt', 'log', 'md', 'json', 'xml', 'csv', 'html', 'css', 'js', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'php', 'rb', 'go', 'rs', 'ts', 'tsx', 'jsx', 'sh', 'bat', 'yaml', 'yml', 'conf', 'ini', 'env', 'gitignore', 'sql', 'kt', 'swift', 'r', 'scala', 'pl', 'lua', 'dart'].includes(ext)) {
            // Text/Code files - Enhanced viewer with syntax awareness
            const textWrapper = document.createElement('div');
            textWrapper.style.width = '100%';
            textWrapper.style.maxHeight = '70vh';
            textWrapper.style.position = 'relative';
            textWrapper.style.background = '#1e1e1e';
            textWrapper.style.borderRadius = '10px';
            textWrapper.style.overflow = 'hidden';
            textWrapper.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
            
            // Loading indicator
            const loader = document.createElement('div');
            loader.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #fff;">
                    <div class="preloader-wrapper small active">
                        <div class="spinner-layer spinner-blue-only">
                            <div class="circle-clipper left"><div class="circle"></div></div>
                            <div class="gap-patch"><div class="circle"></div></div>
                            <div class="circle-clipper right"><div class="circle"></div></div>
                        </div>
                    </div>
                    <p style="margin-top: 20px;">Loading file...</p>
                </div>
            `;
            textWrapper.appendChild(loader);
            container.appendChild(textWrapper);
            
            fetch(`/preview/${fileId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to load file');
                    return res.text();
                })
                .then(text => {
                    loader.remove();
                    
                    // Create header with file info
                    const header = document.createElement('div');
                    header.style.cssText = `
                        background: #2d2d30;
                        padding: 12px 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid #3e3e42;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    `;
                    
                    const fileInfo = document.createElement('div');
                    fileInfo.style.cssText = 'display: flex; align-items: center; gap: 12px; color: #cccccc;';
                    
                    const iconMap = {
                        'js': '{ }', 'jsx': '{ }', 'ts': 'TS', 'tsx': 'TSX',
                        'py': '🐍', 'java': '☕', 'c': 'C', 'cpp': 'C++', 'h': 'H',
                        'php': '🐘', 'rb': '💎', 'go': 'Go', 'rs': '🦀',
                        'html': '</>', 'css': '🎨', 'json': '{ }', 'xml': '</>',
                        'md': '📝', 'txt': '📄', 'log': '📋', 'sql': '🗃️',
                        'sh': '$', 'bat': '⚙️', 'yaml': '⚙️', 'yml': '⚙️'
                    };
                    
                    const icon = iconMap[ext] || '📄';
                    fileInfo.innerHTML = `
                        <span style="font-size: 18px;">${icon}</span>
                        <span style="font-weight: 500;">${fileName}</span>
                        <span style="font-size: 12px; opacity: 0.7;">${text.split('\n').length} lines</span>
                        <span style="font-size: 12px; opacity: 0.7;">${(new Blob([text]).size / 1024).toFixed(2)} KB</span>
                    `;
                    
                    header.appendChild(fileInfo);
                    textWrapper.appendChild(header);
                    
                    // Create code container with line numbers
                    const codeContainer = document.createElement('div');
                    codeContainer.style.cssText = `
                        display: flex;
                        overflow: auto;
                        max-height: calc(70vh - 45px);
                        background: #1e1e1e;
                    `;
                    
                    // Line numbers
                    const lineNumbers = document.createElement('div');
                    lineNumbers.style.cssText = `
                        background: #1e1e1e;
                        color: #858585;
                        padding: 16px 8px;
                        text-align: right;
                        user-select: none;
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        font-size: 13px;
                        line-height: 1.6;
                        border-right: 1px solid #3e3e42;
                        min-width: 50px;
                    `;
                    
                    const lines = text.split('\n');
                    lineNumbers.innerHTML = lines.map((_, i) => 
                        `<div style="padding: 0 8px;">${i + 1}</div>`
                    ).join('');
                    
                    // Code content
                    const pre = document.createElement('pre');
                    pre.style.cssText = `
                        flex: 1;
                        margin: 0;
                        padding: 16px;
                        background: #1e1e1e;
                        color: #d4d4d4;
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        font-size: 13px;
                        line-height: 1.6;
                        white-space: pre;
                        word-wrap: normal;
                        overflow-x: auto;
                        tab-size: 4;
                    `;
                    
                    // Apply basic syntax highlighting
                    const highlightedText = applySyntaxHighlighting(text, ext);
                    pre.innerHTML = highlightedText;
                    
                    codeContainer.appendChild(lineNumbers);
                    codeContainer.appendChild(pre);
                    textWrapper.appendChild(codeContainer);
                    
                    // Sync scrolling between line numbers and code
                    codeContainer.addEventListener('scroll', () => {
                        lineNumbers.style.transform = `translateY(-${codeContainer.scrollTop}px)`;
                    });
                    
                    if (document.body.classList.contains('dark-mode')) {
                        // Already dark, keep it
                    } else {
                        // Light mode adjustments
                        textWrapper.style.background = '#ffffff';
                        header.style.background = '#f3f3f3';
                        header.style.borderBottom = '1px solid #e0e0e0';
                        lineNumbers.style.background = '#f8f8f8';
                        lineNumbers.style.borderRight = '1px solid #e0e0e0';
                        lineNumbers.style.color = '#6e7781';
                        pre.style.background = '#ffffff';
                        pre.style.color = '#24292f';
                        codeContainer.style.background = '#ffffff';
                    }
                })
                .catch(err => {
                    console.error('Failed to load text file:', err);
                    loader.remove();
                    textWrapper.innerHTML = `
                        <div style="text-align: center; padding: 3rem; color: #fff;">
                            <i class="material-icons" style="font-size: 4rem; opacity: 0.7;">error_outline</i>
                            <p style="margin-top: 1rem;">Failed to load file</p>
                            <p style="margin-top: 0.5rem; opacity: 0.8;">The file might be too large or corrupted</p>
                        </div>
                    `;
                });
                
        } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
            // Microsoft Office files - use Office Online Viewer
            const iframe = document.createElement('iframe');
            iframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + '/download/' + fileId)}`;
            iframe.style.width = '100%';
            iframe.style.height = '75vh';
            iframe.style.border = 'none';
            container.appendChild(iframe);
            
        } else {
            // Unsupported file type
            showUnsupportedMessage(container, fileName);
        }
        
        // Open modal
        mediaPreviewModal.open();
        
    } catch (error) {
        console.error('Error in previewMedia:', error);
        M.toast({html: 'Error opening preview', classes: 'red'});
    }
}

function showUnsupportedMessage(container, fileName) {
    const div = document.createElement('div');
    div.className = 'unsupported-message';
    div.innerHTML = `
        <i class="material-icons">info_outline</i>
        <p><strong>Preview not available</strong></p>
        <p>This file type cannot be previewed directly.</p>
        <p>Please download the file to view it.</p>
        <p style="margin-top: 1rem; color: #999; font-size: 0.9rem;">${fileName}</p>
    `;
    container.appendChild(div);
}

function closeMediaPreview() {
    if (mediaPreviewModal) {
        mediaPreviewModal.close();
    }
}


// Basic syntax highlighting function
function applySyntaxHighlighting(text, ext) {
    try {
        // Escape HTML first
        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Define color schemes
        const colors = {
            keyword: '#569cd6',
            string: '#ce9178',
            comment: '#6a9955',
            number: '#b5cea8',
            property: '#9cdcfe'
        };
        
        // Apply basic syntax highlighting
        if (['js', 'jsx', 'ts', 'tsx', 'java', 'c', 'cpp', 'go', 'php'].includes(ext)) {
            // C-style languages - comments
            text = text.replace(/(\/\/.*$)/gm, '<span style="color: ' + colors.comment + '">$1</span>');
            text = text.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: ' + colors.comment + '">$1</span>');
            
        } else if (['py', 'rb'].includes(ext)) {
            // Python/Ruby - comments
            text = text.replace(/(#.*$)/gm, '<span style="color: ' + colors.comment + '">$1</span>');
        }
        
        return text;
    } catch (e) {
        console.error('Syntax highlighting error:', e);
        return text;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit();

    // Set up file upload handler
    document.getElementById('fileUpload').addEventListener('change', handleFileUpload);

    const dropZone = document.getElementById('dropZone');
    const dropMessage = document.querySelector('.drop-message');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    // Theme toggle logic
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    // Load saved theme
    if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = 'light_mode';
    }
    themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // QR code modal logic
    const qrToggle = document.getElementById('qr-toggle');
    const qrModal = document.getElementById('qr-modal');
    const qrUrlSpan = document.getElementById('qr-url');
    const qrModalClose = document.getElementById('qr-modal-close');
    let qrInstance = null; 

    // Initialize Materialize modal
    const qrModalInstance = M.Modal.init(qrModal, {endingTop: '20%'});

    qrToggle.addEventListener('click', function() {
    let url = window.location.origin;
    qrUrlSpan.textContent = url;
    // Always create a new QRious instance to avoid rendering issues
    const qrDiv = document.getElementById('qrcode');
    qrDiv.innerHTML = '';
    const qrCanvas = document.createElement('canvas');
    qrDiv.appendChild(qrCanvas);
    qrInstance = new QRious({
        element: qrCanvas,
        value: url,
        size: 140
    });
    qrModalInstance.open();
    });
    qrModalClose.addEventListener('click', () => qrModalInstance.close());

    // Initialize file type icons on page load
    initializeFileIcons();
    let isSelectionMode = false;
    const selectedFiles = new Set();

    // Initialize selection handling
    document.querySelector('.files-list').addEventListener('click', (e) => {
    const fileItem = e.target.closest('.file-item');
    if (!fileItem) return;

    if (isSelectionMode) {
        toggleFileSelection(fileItem);
    }
    });

    document.querySelector('.files-list').addEventListener('dblclick', (e) => {
    const fileItem = e.target.closest('.file-item');
    if (!fileItem) return;

    if (!isSelectionMode) {
        enterSelectionMode();
        toggleFileSelection(fileItem);
    }
    });

    function enterSelectionMode() {
    isSelectionMode = true;
    document.querySelector('.selection-mode-indicator').classList.add('active');
    document.querySelector('.bulk-actions').classList.add('active');
    }

    function exitSelectionMode() {
    isSelectionMode = false;
    selectedFiles.clear();
    document.querySelectorAll('.file-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector('.selection-mode-indicator').classList.remove('active');
    document.querySelector('.bulk-actions').classList.remove('active');
    }

    function toggleFileSelection(fileItem) {
    if (!fileItem.dataset.fileId) return;
    
    const fileId = fileItem.dataset.fileId;
    if (selectedFiles.has(fileId)) {
        selectedFiles.delete(fileId);
        fileItem.classList.remove('selected');
    } else {
        selectedFiles.add(fileId);
        fileItem.classList.add('selected');
    }
    
    updateBulkActionsVisibility();
    }

    function updateBulkActionsVisibility() {
    const hasSelection = selectedFiles.size > 0;
    document.getElementById('bulk-download').style.display = hasSelection ? 'block' : 'none';
    document.getElementById('bulk-delete').style.display = hasSelection ? 'block' : 'none';
    }

    // Cancel selection mode
    document.getElementById('bulk-cancel').addEventListener('click', exitSelectionMode);

    // Bulk actions handlers
    document.getElementById('bulk-download').addEventListener('click', async () => {
const fileIds = Array.from(selectedFiles);

const loadingToast = M.toast({
html: `
    <div style="display: flex; align-items: center; gap: 10px;">
    <div class="preloader-wrapper small active" style="width: 20px; height: 20px;">
        <div class="spinner-layer" style="border-color: #ffffff;">
        <div class="circle-clipper left"><div class="circle"></div></div>
        <div class="gap-patch"><div class="circle"></div></div>
        <div class="circle-clipper right"><div class="circle"></div></div>
        </div>
    </div>
    <span style="color: #ffffff;">Zipping ${fileIds.length} files...</span>
    </div>
`,
displayLength: Infinity,
classes: 'blue darken-3'
});

try {
const response = await fetch('/download-bulk', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileIds })
});

loadingToast.dismiss();

if (response.ok) {
    window.location.href = '/download-bulk-zip';
    M.toast({
    html: 'Download starting...',
    classes: 'green'
    });
} else {
    throw new Error('Failed to prepare files');
}
} catch (error) {
loadingToast.dismiss();
console.error('Download error:', error);
M.toast({
    html: 'Failed to download files',
    classes: 'red'
});
} finally {
exitSelectionMode();
}
});

    document.getElementById('bulk-delete').addEventListener('click', async () => {
    if (confirm(`Delete ${selectedFiles.size} selected files?`)) {
        for (const fileId of selectedFiles) {
        await fetch(`/file/${fileId}`, { method: 'DELETE' });
        }
        window.location.reload();
    }
    });

    function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
    }

    function highlight(e) { 
    dropZone.classList.add('drag-over');
    dropMessage.style.display = 'block';
    }

    function unhighlight(e) {
    dropZone.classList.remove('drag-over');
    dropMessage.style.display = 'none';
    }

    async function handleDrop(e) {
    const files = e.dataTransfer.files;
    unhighlight(e);

    for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
    }
    }
});

async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
    await uploadFile(files[i]);
    }
}

function calculateSpeed(loaded, timeElapsed) {
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

async function downloadFile(button) {
    const fileId = button.closest('.file-item').dataset.fileId;
    window.location.href = `/download/${fileId}`;
}

async function deleteFile(button) {
    const fileId = button.closest('.file-item').dataset.fileId;
    if (confirm('Are you sure you want to delete this file?')) {
    try {
        const response = await fetch(`/file/${fileId}`, {
        method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
        M.toast({
            html: 'File deleted successfully!',
            classes: 'green'
        });
        window.location.reload();
        } else {
        M.toast({
            html: 'Delete failed!',
            classes: 'red'
        });
        }
    } catch (error) {
        M.toast({
        html: 'Delete failed!',
        classes: 'red'
        });
        console.error('Error:', error);
    }
    }
}

async function deletePartialFile(filename) {
    await fetch(`/file/partial/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
    });
}

const CHUNK_SIZE = 5 * 1024 * 1024;

async function uploadFile(file) {
if (file.size > 10 * 1024 * 1024) {
    return await uploadFileInChunks(file);
}
return await uploadFileNormal(file);
}

async function uploadFileInChunks(file) {
const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
const fileId = `${Date.now()}-${file.name}`;

const progressBar = createProgressBar(file.name, file.name);
const progressContainer = document.getElementById('upload-progress-container');
progressContainer.style.display = 'block';

let uploadedBytes = 0;
const startTime = Date.now();

const abortController = new AbortController();
progressBar.abortController = abortController;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function uploadChunkWithRetry(chunkIndex, chunk, retries = 0) {
    try {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex);
        formData.append('totalChunks', totalChunks);
        formData.append('fileId', fileId);
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size);

        console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks}...`);

        const response = await fetch('/upload-chunk', {
            method: 'POST',
            body: formData,
            signal: abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server returned ${response.status}`);
        }

        const result = await response.json();
        console.log(`✓ Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
        return result;

    } catch (error) {
        if (error.name === 'AbortError') {
            throw error;
        }

        console.error(`❌ Chunk ${chunkIndex + 1} failed:`, error.message);

        if (retries < MAX_RETRIES) {
            console.log(`Retrying chunk ${chunkIndex + 1}... (Attempt ${retries + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
            return uploadChunkWithRetry(chunkIndex, chunk, retries + 1);
        } else {
            throw new Error(`Chunk ${chunkIndex + 1} upload failed after ${MAX_RETRIES} retries: ${error.message}`);
        }
    }
}

try {
    console.log(`Starting chunked upload: ${file.name} (${totalChunks} chunks)`);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (abortController.signal.aborted) {
            throw new Error('Upload cancelled');
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        await uploadChunkWithRetry(chunkIndex, chunk);

        uploadedBytes += (end - start);
        const percentComplete = (uploadedBytes / file.size) * 100;
        const speed = calculateSpeed(uploadedBytes, Date.now() - startTime);
        updateProgressBar(progressBar, percentComplete, speed);
    }

    console.log('✓✓✓ All chunks uploaded successfully!');
    completeProgressBar(progressBar);
    await fetchAndReplaceFilesList();
    M.toast({
        html: `${getDisplayName(file.name)} uploaded successfully!`,
        classes: 'green'
    });

    setTimeout(() => {
        progressBar.remove();
        const progressContainer = document.getElementById('upload-progress-container');
        if (!progressContainer.querySelector('.progress-container')) {
            progressContainer.style.display = 'none';
        }
    }, 2000);

} catch (error) {
    console.error('❌ Upload error:', error);
    
    if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        console.log('Upload cancelled by user');
        await fetch('/upload-chunk/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId })
        });
        M.toast({
            html: `Upload cancelled for ${getDisplayName(file.name)}`,
            classes: 'blue'
        });
    } else {
        errorProgressBar(progressBar);
        M.toast({
            html: `Failed to upload ${getDisplayName(file.name)}: ${error.message}`,
            classes: 'red',
            displayLength: 5000
        });
    }
    
    setTimeout(() => {
        progressBar.remove();
        const progressContainer = document.getElementById('upload-progress-container');
        if (!progressContainer.querySelector('.progress-container')) {
            progressContainer.style.display = 'none';
        }
    }, 3000);
}
}

async function uploadFileNormal(file) {
const formData = new FormData();
formData.append('file', file);

const progressBar = createProgressBar(file.name, file.name);
const progressContainer = document.getElementById('upload-progress-container');
progressContainer.style.display = 'block';

try {
    const xhr = new XMLHttpRequest();
    progressBar.xhr = xhr;

    xhr.open('POST', '/upload', true);
    const startTime = Date.now();

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            const speed = calculateSpeed(e.loaded, Date.now() - startTime);
            updateProgressBar(progressBar, percentComplete, speed);
        }
    };

    xhr.onload = async function() {
        if (xhr.status === 200) {
            completeProgressBar(progressBar);
            await fetchAndReplaceFilesList();
            M.toast({
                html: `${getDisplayName(file.name)} uploaded!`,
                classes: 'green'
            });
            setTimeout(() => {
                progressBar.remove();
                if (!progressContainer.children.length) {
                    progressContainer.style.display = 'none';
                }
            }, 2000);
        } else {
            errorProgressBar(progressBar);
            M.toast({
                html: `Failed to upload ${getDisplayName(file.name)}`,
                classes: 'red'
            });
        }
    };

    xhr.onerror = async function() {
        errorProgressBar(progressBar);
        await deletePartialFile(file.name);
        await fetchAndReplaceFilesList();
        M.toast({
            html: `Failed to upload ${getDisplayName(file.name)}`,
            classes: 'red'
        });
    };

    xhr.send(formData);
} catch (error) {
    errorProgressBar(progressBar);
    await deletePartialFile(file.name);
    await fetchAndReplaceFilesList();
    M.toast({
        html: `Error uploading ${getDisplayName(file.name)}: ${error.message}`,
        classes: 'red'
    });
}
}

function createProgressBar(filename, originalFileName) {
const template = document.getElementById('progress-bar-template');
const progressBar = template.content.cloneNode(true).children[0];
progressBar.querySelector('.filename').textContent = getDisplayName(filename);

const cancelBtn = progressBar.querySelector('.cancel-upload');
cancelBtn.addEventListener('click', async () => {
    if (progressBar.xhr) {
        progressBar.xhr.abort();
        await deletePartialFile(originalFileName);
        progressBar.remove();
        await fetchAndReplaceFilesList();
        M.toast({
            html: `Upload cancelled for ${getDisplayName(originalFileName)}`,
            classes: 'blue'
        });
    } else if (progressBar.abortController) {
        progressBar.abortController.abort();
        progressBar.remove();
        M.toast({
            html: `Upload cancelled for ${getDisplayName(originalFileName)}`,
            classes: 'blue'
        });
    }
});

document.getElementById('upload-progress-container').appendChild(progressBar);
return progressBar;
}

function updateProgressBar(progressBar, percentComplete, speed) {
const progressBarElem = progressBar.querySelector('.determinate');
const progressText = progressBar.querySelector('.progress-text');
const speedText = progressBar.querySelector('.upload-speed');

if (progressBarElem) progressBarElem.style.width = percentComplete + '%';
if (progressText) progressText.textContent = Math.round(percentComplete) + '%';
if (speedText) speedText.textContent = speed;
}

function completeProgressBar(progressBar) {
const progressBarElem = progressBar.querySelector('.determinate');
const progressText = progressBar.querySelector('.progress-text');
const speedText = progressBar.querySelector('.upload-speed');

if (progressBarElem) {
    progressBarElem.style.width = '100%';
    progressBarElem.classList.add('green');
}
if (progressText) progressText.textContent = '✓ Complete';
if (speedText) speedText.textContent = '';

const cancelBtn = progressBar.querySelector('.cancel-upload');
if (cancelBtn) cancelBtn.style.display = 'none';
}

function errorProgressBar(progressBar) {
const progressBarElem = progressBar.querySelector('.determinate');
const progressText = progressBar.querySelector('.progress-text');
const speedText = progressBar.querySelector('.upload-speed');

if (progressBarElem) {
    progressBarElem.classList.add('red');
}
if (progressText) progressText.textContent = '✗ Failed';
if (speedText) speedText.textContent = '';
}

function getDisplayName(filename) {
if (filename.length > 40) {
    const ext = filename.split('.').pop();
    return filename.substring(0, 35) + '...' + ext;
}
return filename;
}

async function fetchAndReplaceFilesList() {
try {
    const response = await fetch('/files');
    const data = await response.json();
    window.location.reload();
} catch (error) {
    console.error('Failed to refresh file list:', error);
}
}

// Function to get file type icon and color based on file extension
function getFileTypeIcon(fileName) {
const ext = fileName.split('.').pop().toLowerCase();

const fileTypeMap = {
    // Documents
    'pdf': { icon: 'picture_as_pdf', color: '#f44336' },
    'doc': { icon: 'description', color: '#2196f3' },
    'docx': { icon: 'description', color: '#2196f3' },
    'txt': { icon: 'article', color: '#9e9e9e' },
    'md': { icon: 'article', color: '#333333' },
    'xls': { icon: 'table_chart', color: '#4caf50' },
    'xlsx': { icon: 'table_chart', color: '#4caf50' },
    'csv': { icon: 'table_chart', color: '#4caf50' },
    'ppt': { icon: 'slideshow', color: '#ff9800' },
    'pptx': { icon: 'slideshow', color: '#ff9800' },
    
    // Images
    'jpg': { icon: 'image', color: '#9c27b0' },
    'jpeg': { icon: 'image', color: '#9c27b0' },
    'png': { icon: 'image', color: '#9c27b0' },
    'gif': { icon: 'image', color: '#9c27b0' },
    'svg': { icon: 'image', color: '#9c27b0' },
    'webp': { icon: 'image', color: '#9c27b0' },
    'bmp': { icon: 'image', color: '#9c27b0' },
    
    // Video
    'mp4': { icon: 'movie', color: '#e91e63' },
    'webm': { icon: 'movie', color: '#e91e63' },
    'ogg': { icon: 'movie', color: '#e91e63' },
    'mov': { icon: 'movie', color: '#e91e63' },
    'avi': { icon: 'movie', color: '#e91e63' },
    'mkv': { icon: 'movie', color: '#e91e63' },
    
    // Audio
    'mp3': { icon: 'music_note', color: '#00bcd4' },
    'wav': { icon: 'music_note', color: '#00bcd4' },
    'm4a': { icon: 'music_note', color: '#00bcd4' },
    'aac': { icon: 'music_note', color: '#00bcd4' },
    'flac': { icon: 'music_note', color: '#00bcd4' },
    
    // Code
    'js': { icon: 'code', color: '#f7df1e' },
    'jsx': { icon: 'code', color: '#61dafb' },
    'ts': { icon: 'code', color: '#3178c6' },
    'tsx': { icon: 'code', color: '#3178c6' },
    'py': { icon: 'code', color: '#3776ab' },
    'java': { icon: 'code', color: '#f89820' },
    'c': { icon: 'code', color: '#a8b9cc' },
    'cpp': { icon: 'code', color: '#00599c' },
    'h': { icon: 'code', color: '#a8b9cc' },
    'hpp': { icon: 'code', color: '#00599c' },
    'php': { icon: 'code', color: '#777bb4' },
    'rb': { icon: 'code', color: '#cc342d' },
    'go': { icon: 'code', color: '#00add8' },
    'rs': { icon: 'code', color: '#ce422b' },
    'html': { icon: 'language', color: '#e34c26' },
    'css': { icon: 'style', color: '#563d7c' },
    'json': { icon: 'data_object', color: '#f1e05a' },
    'xml': { icon: 'data_object', color: '#f89820' },
    'yaml': { icon: 'settings', color: '#cb171e' },
    'yml': { icon: 'settings', color: '#cb171e' },
    'sql': { icon: 'storage', color: '#336791' },
    'sh': { icon: 'terminal', color: '#4eaa25' },
    'bat': { icon: 'terminal', color: '#00a4ef' },
    'log': { icon: 'description', color: '#757575' },
    'conf': { icon: 'settings', color: '#666666' },
    'ini': { icon: 'settings', color: '#666666' },
    
    // Archives
    'zip': { icon: 'folder_zip', color: '#f57c00' },
    'rar': { icon: 'folder_zip', color: '#f57c00' },
    '7z': { icon: 'folder_zip', color: '#f57c00' },
    'tar': { icon: 'folder_zip', color: '#f57c00' },
    'gz': { icon: 'folder_zip', color: '#f57c00' },
    
    // Default
    'default': { icon: 'insert_drive_file', color: '#90a4ae' }
};

return fileTypeMap[ext] || fileTypeMap['default'];
}

// Initialize file type icons
function initializeFileIcons() {
const fileIcons = document.querySelectorAll('.file-type-icon');
fileIcons.forEach(icon => {
    const fileName = icon.getAttribute('data-filename');
    const fileTypeData = getFileTypeIcon(fileName);
    icon.textContent = fileTypeData.icon;
    icon.style.color = fileTypeData.color;
    icon.style.fontSize = '32px';
    icon.style.transition = 'all 0.3s ease';
});
}

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', async () => {
try {
// Show logging out toast
M.toast({
    html: '<i class="material-icons left">logout</i>Logging out...',
    classes: 'blue darken-1',
    displayLength: 1500
});

const response = await fetch('/logout', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json'
    }
});

const result = await response.json();

if (result.success) {
    M.toast({
    html: '<i class="material-icons left">check_circle</i>Logged out successfully!',
    classes: 'green'
    });
    
    // Redirect to auth page
    setTimeout(() => {
    window.location.href = result.redirect || '/auth';
    }, 800);
} else {
    M.toast({
    html: `<i class="material-icons left">error</i>${result.message || 'Logout failed'}`,
    classes: 'red'
});
}
} catch (error) {
console.error('Logout error:', error);
M.toast({
    html: '<i class="material-icons left">error</i>Failed to logout. Please try again.',
    classXXzzes: 'red'
});
}
});

// ============= SETTINGS MODAL =============
const settingsToggle = document.getElementById('settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const settingsModalClose = document.getElementById('settings-modal-close');
const currentPinValue = document.getElementById('current-pin-value');
const togglePinVisibility = document.getElementById('toggle-pin-visibility');
const changePinForm = document.getElementById('change-pin-form');

let settingsModalInstance = null;
let isPinVisible = false;
let actualPin = '';

// Initialize settings modal
document.addEventListener('DOMContentLoaded', function() {
    if (settingsModal) {
        // Destroy any existing instance from M.AutoInit()
        const existingInstance = M.Modal.getInstance(settingsModal);
        if (existingInstance) {
            existingInstance.destroy();
        }
        // Re-initialize with our settings
        settingsModalInstance = M.Modal.init(settingsModal, { 
            endingTop: '20%',
            dismissible: true,
            opacity: 0.5
        });
    }
});

// Load current PIN when opening settings
async function loadCurrentPin() {
    try {
        const response = await fetch('/api/settings/pin');
        const data = await response.json();
        
        if (data.success) {
            actualPin = data.pin;
            updatePinDisplay();
        }
    } catch (error) {
        console.error('Error loading PIN:', error);
        M.toast({
            html: '<i class="material-icons left">error</i>Failed to load current PIN',
            classes: 'red'
        });
    }
}

function updatePinDisplay() {
    if (isPinVisible) {
        currentPinValue.textContent = actualPin;
        togglePinVisibility.querySelector('i').textContent = 'visibility_off';
    } else {
        currentPinValue.textContent = '••••••';
        togglePinVisibility.querySelector('i').textContent = 'visibility';
    }
}

// Settings toggle click handler
if (settingsToggle) {
    settingsToggle.addEventListener('click', async () => {
        isPinVisible = false;
        await loadCurrentPin();
        settingsModalInstance.open();
        M.updateTextFields();
    });
}

// Close button handler
if (settingsModalClose) {
    settingsModalClose.addEventListener('click', () => {
        settingsModalInstance.close();
    });
}

// Toggle PIN visibility
if (togglePinVisibility) {
    togglePinVisibility.addEventListener('click', () => {
        isPinVisible = !isPinVisible;
        updatePinDisplay();
    });
}

// Change PIN form submission
if (changePinForm) {
    changePinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const oldPin = document.getElementById('old-pin').value;
        const newPin = document.getElementById('new-pin').value;
        const confirmPin = document.getElementById('confirm-pin').value;
        
        // Validate inputs
        if (!/^\d{6}$/.test(newPin)) {
            M.toast({
                html: '<i class="material-icons left">error</i>New PIN must be exactly 6 digits',
                classes: 'red'
            });
            return;
        }
        
        if (newPin !== confirmPin) {
            M.toast({
                html: '<i class="material-icons left">error</i>New PINs do not match',
                classes: 'red'
            });
            return;
        }
        
        if (oldPin === newPin) {
            M.toast({
                html: '<i class="material-icons left">warning</i>New PIN must be different from current PIN',
                classes: 'orange'
            });
            return;
        }
        
        try {
            const response = await fetch('/api/settings/change-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ oldPin, newPin })
            });
            
            const result = await response.json();
            
            if (result.success) {
                M.toast({
                    html: '<i class="material-icons left">check_circle</i>PIN changed successfully!',
                    classes: 'green'
                });
                
                // Clear form
                changePinForm.reset();
                M.updateTextFields();
                
                // Update displayed PIN
                actualPin = newPin;
                updatePinDisplay();
            } else {
                M.toast({
                    html: `<i class="material-icons left">error</i>${result.message}`,
                    classes: 'red'
                });
            }
        } catch (error) {
            console.error('Error changing PIN:', error);
            M.toast({
                html: '<i class="material-icons left">error</i>Failed to change PIN',
                classes: 'red'
            });
        }
    });
    
    // Only allow digits in PIN inputs
    ['old-pin', 'new-pin', 'confirm-pin'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            });
        }
    });
}
