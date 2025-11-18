// WebRTC Group Call Manager
class GroupCallManager {
  constructor(socket, localStream) {
    this.socket = socket;
    this.localStream = localStream;
    this.peerConnections = new Map(); // socketId -> RTCPeerConnection
    this.remoteStreams = new Map(); // socketId -> MediaStream
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    this.groupId = null;
    this.userId = null;
    this.onRemoteStreamAdded = null;
    this.onRemoteStreamRemoved = null;
    this.maxPeers = 32;

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    // When call is started/joined
    this.socket.on('call-started', ({ sessionId, existingPeers }) => {
      console.log('Call started, existing peers:', existingPeers);
      // Create peer connections for existing peers
      existingPeers.forEach(peer => {
        this.createPeerConnection(peer.socketId, peer.userId, true);
      });
    });

    this.socket.on('call-joined', ({ sessionId, existingPeers }) => {
      console.log('Call joined, existing peers:', existingPeers);
      // Create peer connections for existing peers
      existingPeers.forEach(peer => {
        this.createPeerConnection(peer.socketId, peer.userId, true);
      });
    });

    // When a new peer joins
    this.socket.on('peer-joined', ({ socketId, userId }) => {
      console.log('New peer joined:', socketId, userId);
      if (this.peerConnections.size >= this.maxPeers) {
        console.warn('Maximum peer limit reached');
        return;
      }
      this.createPeerConnection(socketId, userId, false);
    });

    // When receiving an offer
    this.socket.on('peer-offer', async ({ fromSocketId, offer }) => {
      console.log('Received offer from:', fromSocketId);
      const pc = this.peerConnections.get(fromSocketId);
      if (!pc) {
        console.error('No peer connection found for:', fromSocketId);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        this.socket.emit('peer-answer', {
          targetSocketId: fromSocketId,
          answer: pc.localDescription
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // When receiving an answer
    this.socket.on('peer-answer', async ({ fromSocketId, answer }) => {
      console.log('Received answer from:', fromSocketId);
      const pc = this.peerConnections.get(fromSocketId);
      if (!pc) {
        console.error('No peer connection found for:', fromSocketId);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    // When receiving ICE candidate
    this.socket.on('peer-candidate', async ({ fromSocketId, candidate }) => {
      const pc = this.peerConnections.get(fromSocketId);
      if (!pc) {
        console.error('No peer connection found for:', fromSocketId);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    // When a peer leaves
    this.socket.on('peer-left', ({ socketId }) => {
      console.log('Peer left:', socketId);
      this.removePeerConnection(socketId);
    });

    this.socket.on('call-error', ({ message }) => {
      console.error('Call error:', message);
      alert('Call error: ' + message);
    });
  }

  createPeerConnection(socketId, userId, shouldCreateOffer) {
    if (this.peerConnections.has(socketId)) {
      console.log('Peer connection already exists for:', socketId);
      return;
    }

    console.log('Creating peer connection for:', socketId, 'shouldCreateOffer:', shouldCreateOffer);

    const pc = new RTCPeerConnection(this.configuration);

    // Add local stream tracks
    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('peer-candidate', {
          targetSocketId: socketId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', socketId);
      let remoteStream = this.remoteStreams.get(socketId);
      
      if (!remoteStream) {
        remoteStream = new MediaStream();
        this.remoteStreams.set(socketId, remoteStream);
      }

      remoteStream.addTrack(event.track);

      if (this.onRemoteStreamAdded) {
        this.onRemoteStreamAdded(socketId, remoteStream, userId);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state for', socketId, ':', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.removePeerConnection(socketId);
      }
    };

    this.peerConnections.set(socketId, pc);

    // If we should create offer (we're the initiator)
    if (shouldCreateOffer) {
      this.createOffer(socketId);
    }
  }

  async createOffer(socketId) {
    const pc = this.peerConnections.get(socketId);
    if (!pc) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.socket.emit('peer-offer', {
        targetSocketId: socketId,
        offer: pc.localDescription
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  removePeerConnection(socketId) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }

    const stream = this.remoteStreams.get(socketId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.remoteStreams.delete(socketId);
    }

    if (this.onRemoteStreamRemoved) {
      this.onRemoteStreamRemoved(socketId);
    }
  }

  startCall(groupId, userId) {
    this.groupId = groupId;
    this.userId = userId;
    this.socket.emit('start-group-call', { groupId, userId });
  }

  joinCall(groupId, userId) {
    this.groupId = groupId;
    this.userId = userId;
    this.socket.emit('join-group-call', { groupId, userId });
  }

  leaveCall() {
    if (this.groupId) {
      this.socket.emit('leave-call', { groupId: this.groupId });
      
      // Close all peer connections
      for (const socketId of this.peerConnections.keys()) {
        this.removePeerConnection(socketId);
      }

      this.groupId = null;
    }
  }

  toggleAudio(enabled) {
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  toggleVideo(enabled) {
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  }
}
