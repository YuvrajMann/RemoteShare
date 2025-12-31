// media-session.js
let socket, peerConnection, remoteStream;
let syncOffset = 0; // For drift correction
let controlLock = false;
const syncThreshold = 1.0; // Maximum allowed drift in seconds
const mediaElement = document.getElementById('remoteMedia');

// Initialize the session with WebRTC
function initSession(sessionId, fileId) {
    // Connect to signaling server
    socket = io();
    
    // Join the RTC session
    socket.emit('join-rtc-session', { sessionId });
    
    // WebRTC setup
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });
    
    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('webrtc-ice-candidate', {
                toId: hostId,
                candidate: event.candidate,
                sessionId: sessionId
            });
        }
    };
    
    // Handle incoming tracks
    peerConnection.ontrack = event => {
        console.log('Received remote track:', event.streams[0]);
        remoteStream = event.streams[0];
        mediaElement.srcObject = remoteStream;
        mediaElement.play().catch(e => console.log('Need user interaction for playback'));
    };
    
    // Listen for offer from host
    socket.on('webrtc-offer', async (data) => {
        hostId = data.fromId;
        console.log('Received offer from host:', data.sdp);
        
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            socket.emit('webrtc-answer', {
                toId: data.fromId,
                sdp: peerConnection.localDescription,
                sessionId: sessionId
            });
        } catch (err) {
            console.error('Error handling offer:', err);
        }
    });
    
    // Handle ICE candidates from host
    socket.on('webrtc-ice-candidate', (data) => {
        try {
            peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
            console.error('Error adding ICE candidate:', err);
        }
    });
    
    // Handle playback control messages
    socket.on('mediaAction', ({ action, data }) => {
        if (!mediaElement) return;
        
        if (action === 'play') {
            mediaElement.currentTime = data.currentTime;
            mediaElement.play();
        }
        if (action === 'pause') {
            mediaElement.currentTime = data.currentTime;
            mediaElement.pause();
        }
        if (action === 'seek') {
            mediaElement.currentTime = data.currentTime;
        }
    });
    
    // Get reference to the media element
    const mediaElement = document.getElementById('remoteMedia');

    // Add synchronization controls
    function setupSyncControls() {
      // Listen for control events from other users
      socket.on('media-control', (data) => {
        console.log('Received media control:', data.action, data.position);
        
        // Don't react to your own events
        if (data.senderId === socket.id) return;
        
        // Apply the control action
        if (data.action === 'play') {
          // Set position first, then play
          mediaElement.currentTime = data.position;
          const playPromise = mediaElement.play();
          if (playPromise) {
            playPromise.catch(err => console.log('Auto-play prevented:', err));
          }
        }
        else if (data.action === 'pause') {
          mediaElement.currentTime = data.position;
          mediaElement.pause();
        }
        else if (data.action === 'seek') {
          mediaElement.currentTime = data.position;
        }
      });
      
      // Send control events when user interacts with the media
      mediaElement.onplay = () => {
        socket.emit('media-control', {
          action: 'play',
          position: mediaElement.currentTime,
          sessionId: sessionId
        });
        
        // Update UI
        document.querySelector('.status-indicator span').textContent = 'Playing';
      };
      
      mediaElement.onpause = () => {
        socket.emit('media-control', {
          action: 'pause',
          position: mediaElement.currentTime,
          sessionId: sessionId
        });
        
        // Update UI
        document.querySelector('.status-indicator span').textContent = 'Paused';
      };
      
      mediaElement.onseeking = () => {
        socket.emit('media-control', {
          action: 'seek',
          position: mediaElement.currentTime,
          sessionId: sessionId
        });
      };
      
      // Request initial sync state
      socket.emit('join-session', { sessionId });
      
      // Handle initial sync state
      socket.on('sync-state', (state) => {
        console.log('Received initial sync state:', state);
        
        if (state.action === 'play') {
          mediaElement.currentTime = state.position;
          mediaElement.play().catch(e => console.log('Need user interaction'));
        } else {
          mediaElement.currentTime = state.position;
          mediaElement.pause();
        }
      });
      
      // Add periodic sync check (every 5 seconds)
      setInterval(() => {
        // Only if we're playing, request a sync check
        if (!mediaElement.paused) {
          socket.emit('request-sync', { sessionId });
        }
      }, 5000);
      
      // Handle sync requests
      socket.on('request-sync', () => {
        // If we're the one playing, broadcast our position
        if (!mediaElement.paused) {
          socket.emit('media-control', {
            action: mediaElement.paused ? 'pause' : 'play',
            position: mediaElement.currentTime,
            sessionId: sessionId
          });
        }
      });
    }

    // In the ontrack handler, after setting up the media element:
    mediaElement.onplaying = () => {
      document.querySelector('.status-indicator').classList.remove('connecting');
      document.querySelector('.status-indicator').classList.add('active');
      document.querySelector('.status-indicator i').textContent = 'hearing';
      document.querySelector('.status-indicator span').textContent = 'Connected to stream';
      document.getElementById('mediaTitle').textContent = fileName || 'Shared Media';
      
      // Set up sync controls once we're playing
      setupSyncControls();
    };
    
    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', function() {
        const sessionId = '<%= sessionId %>';
        const fileId = '<%= fileId %>';
        
        // Determine media type
        const fileName = '<%= fileName %>';
        const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(fileName);
        
        // Set up correct player
        if (isVideo) {
            mediaElement = document.getElementById('videoPlayer');
            document.getElementById('audioPlayer').style.display = 'none';
        } else {
            mediaElement = document.getElementById('audioPlayer');
            document.getElementById('videoPlayer').style.display = 'none';
        }
        
        // Set source
        mediaElement.src = `/media/stream/${fileId}`;
        mediaElement.load();
        
        // Connect to Socket.IO
        const socket = io();
        
        // Join the session
        socket.emit('join-session', { sessionId });
        
        // Request initial sync
        socket.emit('request-sync');
        
        // Listen for media control commands from host
        socket.on('media-control', (data) => {
            if (controlLock) return;
            
            console.log('Received media control:', data.action, data.position);
            controlLock = true;
            
            // Calculate network latency compensation
            const latency = data.timestamp ? (Date.now() - data.timestamp) / 1000 : 0;
            const targetPosition = data.position + (data.action === 'play' ? latency : 0);
            
            // Apply commands with drift correction
            if (data.action === 'play' || data.action === 'sync') {
                // Only adjust time if drift is significant
                if (Math.abs(mediaElement.currentTime - targetPosition) > syncThreshold) {
                    mediaElement.currentTime = targetPosition;
                }
                
                // Play with muted error handling
                const playPromise = mediaElement.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.log('Play prevented, waiting for user interaction');
                        // Show play button overlay for user interaction
                        document.getElementById('play-overlay').style.display = 'flex';
                    });
                }
            } 
            else if (data.action === 'pause') {
                mediaElement.currentTime = targetPosition;
                mediaElement.pause();
            }
            else if (data.action === 'seek') {
                mediaElement.currentTime = targetPosition;
            }
            
            setTimeout(() => {
                controlLock = false;
            }, 250);
        });
        
        // Add click handler for play overlay
        document.getElementById('play-overlay').addEventListener('click', () => {
            mediaElement.play()
                .then(() => {
                    document.getElementById('play-overlay').style.display = 'none';
                })
                .catch(err => console.error('Play failed:', err));
        });
        
        // Local controls should notify host
        mediaElement.onpause = () => {
            if (!controlLock) {
                socket.emit('media-control', {
                    action: 'pause',
                    position: mediaElement.currentTime,
                    sessionId: sessionId
                });
            }
        };
        
        mediaElement.onplay = () => {
            if (!controlLock) {
                socket.emit('media-control', {
                    action: 'play',
                    position: mediaElement.currentTime,
                    sessionId: sessionId
                });
            }
        };
        
        mediaElement.onseeking = () => {
            if (!controlLock) {
                socket.emit('media-control', {
                    action: 'seek',
                    position: mediaElement.currentTime,
                    sessionId: sessionId
                });
            }
        };
    });
}

// This code should be in the <script> tag of your VIEWER page (e.g., media-session.ejs)

document.addEventListener('DOMContentLoaded', function() {
    const mediaElement = document.querySelector('video, audio');
    const socket = io({
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling']
    });
    const sessionId = '<%= sessionId %>'; // This would be passed from your server route
    const syncThreshold = 0.75; // Widen threshold slightly for mobile networks

    let clientControlLock = false;

    // 1. Join the session and immediately request the current state
    socket.on('connect', () => {
        console.log('Connected to server. Joining session...');
        socket.emit('join-session', { sessionId });
        
        // Ask the host for the current media state
        socket.emit('request-sync', { sessionId: sessionId, senderId: socket.id });
    });

    // 2. Add a listener for when the tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('Tab is visible again. Requesting sync from host.');
            socket.emit('request-sync', { sessionId: sessionId, senderId: socket.id });
        }
    });

    // 3. The core sync logic for handling messages from the host
    socket.on('media-control', (data) => {
        if (data.senderId === socket.id) return; // Ignore our own messages

        console.log('Sync received:', data.action, `at ${data.position.toFixed(2)}s`);
        clientControlLock = true;

        const latency = (Date.now() - data.timestamp) / 1000.0;
        const hostCurrentTime = data.position + (data.action !== 'pause' ? latency : 0);

        const drift = mediaElement.currentTime - hostCurrentTime;

        // Only correct if drift is significant
        if (Math.abs(drift) > syncThreshold) {
            console.log(`Correcting drift of ${drift.toFixed(2)}s. Jumping to ${hostCurrentTime.toFixed(2)}s.`);
            mediaElement.currentTime = hostCurrentTime;
        }

        // Apply state
        if (data.action === 'play' || data.action === 'sync') {
            if (mediaElement.paused) {
                // iOS requires a user gesture to start playback.
                // If play() fails, we can show an overlay to the user.
                mediaElement.play().catch(e => {
                    console.warn("Playback was blocked. This is expected on mobile until user interaction.");
                    // You could show a "Tap to play" button here.
                });
            }
        } else if (data.action === 'pause') {
            mediaElement.pause();
        }

        setTimeout(() => { clientControlLock = false; }, 300);
    });

    // Inform host if the client manually interacts with controls
    const createControlHandler = (action) => () => {
        if (clientControlLock) return;
        socket.emit('media-control', { 
            action: action, 
            position: mediaElement.currentTime, 
            sessionId: sessionId, 
            senderId: socket.id,
            timestamp: Date.now() 
        });
    };

    mediaElement.onplay = createControlHandler('play');
    mediaElement.onpause = createControlHandler('pause');
    mediaElement.onseeking = createControlHandler('seek');
});