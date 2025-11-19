// WebRTC Calls - Client-side implementation for 1:1 and group calls
// Supports up to 32 participants

class WebRTCCallManager {
    constructor() {
        this.socket = null;
        this.localStream = null;
        this.peers = {}; // Map of userId -> RTCPeerConnection
        this.currentCallId = null;
        this.isCallActive = false;
        this.isMuted = false;
        this.isVideoEnabled = true;
        this.currentUserId = 1; // Should be set from session
        this.callType = 'audio'; // 'audio' or 'video'
        this.participants = [];
        
        // ICE servers configuration
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
    }

    // Initialize socket connection
    initSocket(socket) {
        this.socket = socket;
        this.setupSocketListeners();
    }

    // Setup Socket.IO event listeners
    setupSocketListeners() {
        // Handle incoming call offer
        this.socket.on('call-offer', async (data) => {
            console.log('Received call offer:', data);
            await this.handleCallOffer(data);
        });

        // Handle call answer
        this.socket.on('call-answer', async (data) => {
            console.log('Received call answer:', data);
            await this.handleCallAnswer(data);
        });

        // Handle ICE candidate
        this.socket.on('ice-candidate', async (data) => {
            console.log('Received ICE candidate:', data);
            await this.handleIceCandidate(data);
        });

        // Handle call rejection
        this.socket.on('call-rejected', (data) => {
            console.log('Call rejected:', data);
            this.endCall();
            showNotification('Anruf wurde abgelehnt', 'error');
        });

        // Handle call ended
        this.socket.on('call-ended', (data) => {
            console.log('Call ended:', data);
            this.endCall();
        });

        // Handle participant joined
        this.socket.on('participant-joined', async (data) => {
            console.log('Participant joined:', data);
            await this.handleParticipantJoined(data);
        });

        // Handle participant left
        this.socket.on('participant-left', (data) => {
            console.log('Participant left:', data);
            this.removeParticipant(data.userId);
        });
    }

    // Initialize a call
    async initiateCall(receiverId, callType = 'audio') {
        try {
            this.callType = callType;
            
            // Get user media
            await this.getUserMedia();
            
            // Show call modal
            this.showCallModal();
            
            // Create call in database
            const response = await fetch('call_handler.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_call',
                    receiver_id: receiverId,
                    call_type: callType
                })
            });
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message);
            }
            
            this.currentCallId = data.call_id;
            this.isCallActive = true;
            
            // Create peer connection for receiver
            await this.createPeerConnection(receiverId);
            
            // Create and send offer
            const offer = await this.peers[receiverId].createOffer();
            await this.peers[receiverId].setLocalDescription(offer);
            
            // Send offer via Socket.IO
            this.socket.emit('call-offer', {
                callId: this.currentCallId,
                from: this.currentUserId,
                to: receiverId,
                offer: offer,
                callType: callType
            });
            
            document.getElementById('callModalTitle').textContent = 'Anruf wird verbunden...';
            
        } catch (error) {
            console.error('Error initiating call:', error);
            showNotification('Fehler beim Starten des Anrufs: ' + error.message, 'error');
            this.endCall();
        }
    }

    // Get user media (camera and microphone)
    async getUserMedia() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: this.callType === 'video' ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Display local video
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
            
            return this.localStream;
            
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw new Error('Kamera/Mikrofon-Zugriff verweigert');
        }
    }

    // Create peer connection
    async createPeerConnection(userId) {
        try {
            const pc = new RTCPeerConnection(this.iceServers);
            
            // Add local stream tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    pc.addTrack(track, this.localStream);
                });
            }
            
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('ice-candidate', {
                        callId: this.currentCallId,
                        from: this.currentUserId,
                        to: userId,
                        candidate: event.candidate
                    });
                }
            };
            
            // Handle remote stream
            pc.ontrack = (event) => {
                console.log('Received remote track:', event);
                this.addRemoteStream(userId, event.streams[0]);
            };
            
            // Handle connection state changes
            pc.onconnectionstatechange = () => {
                console.log('Connection state:', pc.connectionState);
                if (pc.connectionState === 'connected') {
                    document.getElementById('callModalTitle').textContent = 'Verbunden';
                } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    this.removeParticipant(userId);
                }
            };
            
            this.peers[userId] = pc;
            
        } catch (error) {
            console.error('Error creating peer connection:', error);
            throw error;
        }
    }

    // Handle incoming call offer
    async handleCallOffer(data) {
        try {
            // Show incoming call UI
            const accept = confirm(`Eingehender ${data.callType === 'video' ? 'Video' : 'Audio'}-Anruf. Annehmen?`);
            
            if (!accept) {
                // Reject call
                this.socket.emit('call-rejected', {
                    callId: data.callId,
                    from: this.currentUserId,
                    to: data.from
                });
                
                // Update call status in database
                await fetch('call_handler.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_call',
                        call_id: data.callId,
                        status: 'rejected'
                    })
                });
                
                return;
            }
            
            this.currentCallId = data.callId;
            this.callType = data.callType;
            this.isCallActive = true;
            
            // Get user media
            await this.getUserMedia();
            
            // Show call modal
            this.showCallModal();
            
            // Create peer connection
            await this.createPeerConnection(data.from);
            
            // Set remote description
            await this.peers[data.from].setRemoteDescription(new RTCSessionDescription(data.offer));
            
            // Create answer
            const answer = await this.peers[data.from].createAnswer();
            await this.peers[data.from].setLocalDescription(answer);
            
            // Send answer
            this.socket.emit('call-answer', {
                callId: this.currentCallId,
                from: this.currentUserId,
                to: data.from,
                answer: answer
            });
            
            // Update call status
            await fetch('call_handler.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_call',
                    call_id: this.currentCallId,
                    status: 'accepted'
                })
            });
            
            document.getElementById('callModalTitle').textContent = 'Verbunden';
            
        } catch (error) {
            console.error('Error handling call offer:', error);
            showNotification('Fehler beim Annehmen des Anrufs', 'error');
            this.endCall();
        }
    }

    // Handle call answer
    async handleCallAnswer(data) {
        try {
            const pc = this.peers[data.from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                
                // Update call status
                await fetch('call_handler.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_call',
                        call_id: this.currentCallId,
                        status: 'accepted'
                    })
                });
                
                document.getElementById('callModalTitle').textContent = 'Verbunden';
            }
        } catch (error) {
            console.error('Error handling call answer:', error);
        }
    }

    // Handle ICE candidate
    async handleIceCandidate(data) {
        try {
            const pc = this.peers[data.from];
            if (pc && data.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    // Handle participant joined (for group calls)
    async handleParticipantJoined(data) {
        try {
            if (!this.participants.includes(data.userId)) {
                this.participants.push(data.userId);
                await this.createPeerConnection(data.userId);
                
                // Create and send offer to new participant
                const offer = await this.peers[data.userId].createOffer();
                await this.peers[data.userId].setLocalDescription(offer);
                
                this.socket.emit('call-offer', {
                    callId: this.currentCallId,
                    from: this.currentUserId,
                    to: data.userId,
                    offer: offer,
                    callType: this.callType
                });
            }
        } catch (error) {
            console.error('Error handling participant joined:', error);
        }
    }

    // Add remote stream to UI
    addRemoteStream(userId, stream) {
        const container = document.getElementById('videoContainer');
        let videoElement = document.getElementById(`remote-video-${userId}`);
        
        if (!videoElement) {
            const videoDiv = document.createElement('div');
            videoDiv.className = 'video-stream';
            videoDiv.id = `video-container-${userId}`;
            
            // Calculate video size based on number of participants
            const totalParticipants = Object.keys(this.peers).length + 1; // +1 for local
            videoDiv.style.width = this.calculateVideoWidth(totalParticipants);
            videoDiv.style.height = this.calculateVideoHeight(totalParticipants);
            
            videoDiv.innerHTML = `
                <video id="remote-video-${userId}" autoplay playsinline></video>
                <div class="video-label">Teilnehmer ${userId}</div>
            `;
            
            container.appendChild(videoDiv);
            videoElement = document.getElementById(`remote-video-${userId}`);
        }
        
        videoElement.srcObject = stream;
    }

    // Calculate video dimensions based on participant count
    calculateVideoWidth(count) {
        if (count <= 2) return '100%';
        if (count <= 4) return '50%';
        if (count <= 9) return '33.33%';
        if (count <= 16) return '25%';
        return '20%';
    }

    calculateVideoHeight(count) {
        if (count <= 2) return '100%';
        if (count <= 4) return '50%';
        if (count <= 9) return '33.33%';
        if (count <= 16) return '25%';
        return '20%';
    }

    // Remove participant
    removeParticipant(userId) {
        // Close peer connection
        if (this.peers[userId]) {
            this.peers[userId].close();
            delete this.peers[userId];
        }
        
        // Remove video element
        const videoContainer = document.getElementById(`video-container-${userId}`);
        if (videoContainer) {
            videoContainer.remove();
        }
        
        // Remove from participants list
        this.participants = this.participants.filter(id => id !== userId);
        
        // Recalculate video sizes
        const totalParticipants = Object.keys(this.peers).length + 1;
        document.querySelectorAll('.video-stream').forEach(element => {
            if (element.id !== 'localVideoContainer') {
                element.style.width = this.calculateVideoWidth(totalParticipants);
                element.style.height = this.calculateVideoHeight(totalParticipants);
            }
        });
    }

    // Toggle mute
    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted = !audioTrack.enabled;
                
                const muteBtn = document.getElementById('muteBtn');
                if (this.isMuted) {
                    muteBtn.classList.add('active');
                    muteBtn.querySelector('i').className = 'fa-solid fa-microphone-slash';
                } else {
                    muteBtn.classList.remove('active');
                    muteBtn.querySelector('i').className = 'fa-solid fa-microphone';
                }
            }
        }
    }

    // Toggle video
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.isVideoEnabled = videoTrack.enabled;
                
                const videoBtn = document.getElementById('videoBtn');
                if (!this.isVideoEnabled) {
                    videoBtn.classList.add('active');
                    videoBtn.querySelector('i').className = 'fa-solid fa-video-slash';
                } else {
                    videoBtn.classList.remove('active');
                    videoBtn.querySelector('i').className = 'fa-solid fa-video';
                }
            }
        }
    }

    // End call
    async endCall() {
        try {
            // Notify server
            if (this.currentCallId) {
                this.socket.emit('end-call', {
                    callId: this.currentCallId,
                    userId: this.currentUserId
                });
                
                // Update call status in database
                await fetch('call_handler.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'end_call',
                        call_id: this.currentCallId
                    })
                });
            }
            
            // Close all peer connections
            Object.keys(this.peers).forEach(userId => {
                this.peers[userId].close();
            });
            this.peers = {};
            
            // Stop local stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            // Hide call modal
            this.hideCallModal();
            
            // Reset state
            this.isCallActive = false;
            this.currentCallId = null;
            this.participants = [];
            this.isMuted = false;
            this.isVideoEnabled = true;
            
            // Reload calls list
            if (typeof loadCalls === 'function') {
                loadCalls();
            }
            
        } catch (error) {
            console.error('Error ending call:', error);
        }
    }

    // Show call modal
    showCallModal() {
        const modal = document.getElementById('callModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    // Hide call modal
    hideCallModal() {
        const modal = document.getElementById('callModal');
        if (modal) {
            modal.classList.remove('active');
            
            // Clear video container
            const container = document.getElementById('videoContainer');
            if (container) {
                container.innerHTML = '';
            }
            
            // Reset local video
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = null;
            }
        }
    }
}

// Create global instance
const callManager = new WebRTCCallManager();

// Initialize when socket is available
if (typeof socket !== 'undefined') {
    callManager.initSocket(socket);
}

// Global functions for UI
function initializeCall(userId, callType = 'audio') {
    callManager.initiateCall(userId, callType);
}

function toggleMute() {
    callManager.toggleMute();
}

function toggleVideo() {
    callManager.toggleVideo();
}

function endCall() {
    callManager.endCall();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCCallManager;
}
