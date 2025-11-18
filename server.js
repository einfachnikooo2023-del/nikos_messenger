const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database setup
const db = new Database('messenger.db');
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS group_call_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS call_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    socket_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES group_call_sessions(id)
  );
`);

// Prepared statements
const insertSession = db.prepare('INSERT INTO group_call_sessions (group_id) VALUES (?)');
const updateSessionEnd = db.prepare('UPDATE group_call_sessions SET ended_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?');
const insertParticipant = db.prepare('INSERT INTO call_participants (session_id, user_id, socket_id) VALUES (?, ?, ?)');
const updateParticipantLeft = db.prepare('UPDATE call_participants SET left_at = CURRENT_TIMESTAMP WHERE socket_id = ?');

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store active calls
const activeCalls = new Map(); // groupId -> { sessionId, participants: Map(socketId -> {userId, ...}) }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Start a group call
  socket.on('start-group-call', ({ groupId, userId }) => {
    try {
      // Create database session
      const result = insertSession.run(groupId);
      const sessionId = result.lastInsertRowid;

      // Create or get active call
      if (!activeCalls.has(groupId)) {
        activeCalls.set(groupId, {
          sessionId,
          participants: new Map()
        });
      }

      const call = activeCalls.get(groupId);
      
      // Add participant
      call.participants.set(socket.id, { userId, socketId: socket.id });
      insertParticipant.run(sessionId, userId, socket.id);

      // Join room
      socket.join(groupId);

      // Notify client with list of existing participants
      const existingPeers = Array.from(call.participants.values())
        .filter(p => p.socketId !== socket.id)
        .map(p => ({ socketId: p.socketId, userId: p.userId }));

      socket.emit('call-started', {
        sessionId,
        existingPeers
      });

      // Notify other participants about new peer
      socket.to(groupId).emit('peer-joined', {
        socketId: socket.id,
        userId
      });

      console.log(`Call started/joined in group ${groupId} by ${userId}`);
    } catch (error) {
      console.error('Error starting call:', error);
      socket.emit('call-error', { message: 'Failed to start call' });
    }
  });

  // Join existing group call
  socket.on('join-group-call', ({ groupId, userId }) => {
    try {
      const call = activeCalls.get(groupId);
      
      if (!call) {
        socket.emit('call-error', { message: 'Call not found' });
        return;
      }

      // Add participant
      call.participants.set(socket.id, { userId, socketId: socket.id });
      insertParticipant.run(call.sessionId, userId, socket.id);

      // Join room
      socket.join(groupId);

      // Notify client with list of existing participants
      const existingPeers = Array.from(call.participants.values())
        .filter(p => p.socketId !== socket.id)
        .map(p => ({ socketId: p.socketId, userId: p.userId }));

      socket.emit('call-joined', {
        sessionId: call.sessionId,
        existingPeers
      });

      // Notify other participants about new peer
      socket.to(groupId).emit('peer-joined', {
        socketId: socket.id,
        userId
      });

      console.log(`User ${userId} joined call in group ${groupId}`);
    } catch (error) {
      console.error('Error joining call:', error);
      socket.emit('call-error', { message: 'Failed to join call' });
    }
  });

  // Forward peer offer
  socket.on('peer-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('peer-offer', {
      fromSocketId: socket.id,
      offer
    });
  });

  // Forward peer answer
  socket.on('peer-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('peer-answer', {
      fromSocketId: socket.id,
      answer
    });
  });

  // Forward ICE candidate
  socket.on('peer-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('peer-candidate', {
      fromSocketId: socket.id,
      candidate
    });
  });

  // Remove peer from call
  socket.on('leave-call', ({ groupId }) => {
    handlePeerLeave(socket, groupId);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove from all active calls
    for (const [groupId, call] of activeCalls.entries()) {
      if (call.participants.has(socket.id)) {
        handlePeerLeave(socket, groupId);
      }
    }
  });

  function handlePeerLeave(socket, groupId) {
    const call = activeCalls.get(groupId);
    if (!call) return;

    // Update database
    updateParticipantLeft.run(socket.id);

    // Remove from participants
    call.participants.delete(socket.id);

    // Notify others
    socket.to(groupId).emit('peer-left', {
      socketId: socket.id
    });

    // Leave room
    socket.leave(groupId);

    // If no participants left, end the call
    if (call.participants.size === 0) {
      updateSessionEnd.run('completed', call.sessionId);
      activeCalls.delete(groupId);
      console.log(`Call ended in group ${groupId}`);
    }

    console.log(`Peer ${socket.id} left group ${groupId}`);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});
