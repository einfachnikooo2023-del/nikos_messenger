const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors());

// Initialize Socket.IO with CORS
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store active users and their socket IDs
const activeUsers = new Map();
const activeCalls = new Map();

// Port configuration
const PORT = process.env.PORT || 3000;

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // User comes online
    socket.on('user-online', (userId) => {
        activeUsers.set(userId, socket.id);
        socket.userId = userId;
        console.log(`User ${userId} is online with socket ${socket.id}`);
        
        // Broadcast user online status
        socket.broadcast.emit('user-status-changed', {
            userId: userId,
            status: 'online'
        });
    });

    // Handle call offer
    socket.on('call-offer', (data) => {
        console.log('Call offer from', data.from, 'to', data.to);
        
        const receiverSocketId = activeUsers.get(data.to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('call-offer', data);
            
            // Store active call
            activeCalls.set(data.callId, {
                callId: data.callId,
                caller: data.from,
                receiver: data.to,
                type: data.callType,
                participants: [data.from, data.to]
            });
        } else {
            // User is offline, send missed call notification
            socket.emit('user-offline', {
                userId: data.to,
                message: 'User is offline'
            });
        }
    });

    // Handle call answer
    socket.on('call-answer', (data) => {
        console.log('Call answer from', data.from, 'to', data.to);
        
        const callerSocketId = activeUsers.get(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call-answer', data);
        }
    });

    // Handle ICE candidate
    socket.on('ice-candidate', (data) => {
        console.log('ICE candidate from', data.from, 'to', data.to);
        
        const targetSocketId = activeUsers.get(data.to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', data);
        }
    });

    // Handle call rejection
    socket.on('call-rejected', (data) => {
        console.log('Call rejected by', data.from);
        
        const callerSocketId = activeUsers.get(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call-rejected', data);
        }
        
        // Remove from active calls
        activeCalls.delete(data.callId);
    });

    // Handle call end
    socket.on('end-call', (data) => {
        console.log('Call ended by user', data.userId);
        
        const call = activeCalls.get(data.callId);
        if (call) {
            // Notify all participants
            call.participants.forEach(userId => {
                if (userId !== data.userId) {
                    const userSocketId = activeUsers.get(userId);
                    if (userSocketId) {
                        io.to(userSocketId).emit('call-ended', {
                            callId: data.callId,
                            endedBy: data.userId
                        });
                    }
                }
            });
            
            // Remove from active calls
            activeCalls.delete(data.callId);
        }
    });

    // Handle participant joining (for group calls)
    socket.on('join-call', (data) => {
        console.log('User', data.userId, 'joining call', data.callId);
        
        const call = activeCalls.get(data.callId);
        if (call) {
            // Add participant if not already in the call
            if (!call.participants.includes(data.userId)) {
                call.participants.push(data.userId);
                
                // Notify all existing participants
                call.participants.forEach(userId => {
                    if (userId !== data.userId) {
                        const userSocketId = activeUsers.get(userId);
                        if (userSocketId) {
                            io.to(userSocketId).emit('participant-joined', {
                                callId: data.callId,
                                userId: data.userId
                            });
                        }
                    }
                });
            }
        }
    });

    // Handle participant leaving (for group calls)
    socket.on('leave-call', (data) => {
        console.log('User', data.userId, 'leaving call', data.callId);
        
        const call = activeCalls.get(data.callId);
        if (call) {
            // Remove participant
            call.participants = call.participants.filter(id => id !== data.userId);
            
            // Notify remaining participants
            call.participants.forEach(userId => {
                const userSocketId = activeUsers.get(userId);
                if (userSocketId) {
                    io.to(userSocketId).emit('participant-left', {
                        callId: data.callId,
                        userId: data.userId
                    });
                }
            });
            
            // If no participants left, remove the call
            if (call.participants.length === 0) {
                activeCalls.delete(data.callId);
            }
        }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
        const receiverSocketId = activeUsers.get(data.to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('user-typing', {
                userId: data.from,
                isTyping: data.isTyping
            });
        }
    });

    // Handle message sending
    socket.on('send-message', (data) => {
        console.log('Message from', data.from, 'to', data.to);
        
        const receiverSocketId = activeUsers.get(data.to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive-message', data);
        }
    });

    // Handle message read status
    socket.on('message-read', (data) => {
        const senderSocketId = activeUsers.get(data.to);
        if (senderSocketId) {
            io.to(senderSocketId).emit('message-status-changed', {
                messageId: data.messageId,
                status: 'read'
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        if (socket.userId) {
            // Remove from active users
            activeUsers.delete(socket.userId);
            
            // Broadcast user offline status
            socket.broadcast.emit('user-status-changed', {
                userId: socket.userId,
                status: 'offline'
            });
            
            // End any active calls the user was in
            activeCalls.forEach((call, callId) => {
                if (call.participants.includes(socket.userId)) {
                    // Remove user from participants
                    call.participants = call.participants.filter(id => id !== socket.userId);
                    
                    // Notify remaining participants
                    call.participants.forEach(userId => {
                        const userSocketId = activeUsers.get(userId);
                        if (userSocketId) {
                            io.to(userSocketId).emit('participant-left', {
                                callId: callId,
                                userId: socket.userId
                            });
                        }
                    });
                    
                    // If no participants left, remove the call
                    if (call.participants.length === 0) {
                        activeCalls.delete(callId);
                    }
                }
            });
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        activeUsers: activeUsers.size,
        activeCalls: activeCalls.size,
        timestamp: new Date().toISOString()
    });
});

// Get active users endpoint
app.get('/active-users', (req, res) => {
    const users = Array.from(activeUsers.entries()).map(([userId, socketId]) => ({
        userId,
        socketId
    }));
    res.json({
        count: users.length,
        users: users
    });
});

// Get active calls endpoint
app.get('/active-calls', (req, res) => {
    const calls = Array.from(activeCalls.entries()).map(([callId, call]) => ({
        callId,
        ...call
    }));
    res.json({
        count: calls.length,
        calls: calls
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
