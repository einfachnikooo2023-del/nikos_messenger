# Nikos Messenger - System Architecture

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  index.html  │  │  calls.php   │  │  demo.html   │        │
│  │  (Chat UI)   │  │  (Calls UI)  │  │  (Overview)  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         │                  │                                    │
│         └──────────────────┴────────────────────┐             │
│                                                  │             │
│                                    ┌─────────────▼──────────┐ │
│                                    │  webrtc-calls.js       │ │
│                                    │  (WebRTC Client)       │ │
│                                    └────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              │ WebSocket
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                      COMMUNICATION LAYER                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────┐        │
│  │          Socket.IO Server (server.js)            │        │
│  │                 Port: 3000                        │        │
│  │  ┌────────────────────────────────────────────┐ │        │
│  │  │  - WebRTC Signaling                        │ │        │
│  │  │  - User Status Management                  │ │        │
│  │  │  - Active Calls Tracking                   │ │        │
│  │  │  - Real-time Message Relay                 │ │        │
│  │  └────────────────────────────────────────────┘ │        │
│  └──────────────────────────────────────────────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API Calls
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                      APPLICATION LAYER                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  call_handler.php │  │  config.php      │                  │
│  │  ┌──────────────┐ │  │  (DB Config)     │                  │
│  │  │ create_call  │ │  └──────────────────┘                  │
│  │  │ update_call  │ │                                         │
│  │  │ end_call     │ │  ┌──────────────────┐                  │
│  │  │ get_calls    │ │  │  delete_call.php │                  │
│  │  └──────────────┘ │  └──────────────────┘                  │
│  └──────────────────┘                                         │
│                                                                │
│  ┌─────────────────────┐  ┌────────────────────────────┐     │
│  │ delete_all_calls.php │  │ get_missed_calls_count.php │     │
│  └─────────────────────┘  └────────────────────────────┘     │
│                                                                │
│  ┌─────────────────────┐                                      │
│  │ get_unread_counts.php│                                      │
│  └─────────────────────┘                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL Queries
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                       DATABASE LAYER                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│              MySQL/MariaDB (nikos_messenger)                   │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   users     │  │  messages   │  │    calls    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                                │
│  ┌──────────────────┐  ┌────────────┐  ┌─────────────┐      │
│  │ call_participants │  │   groups   │  │group_members│      │
│  └──────────────────┘  └────────────┘  └─────────────┘      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 🔄 Call Flow Diagram

### 1. Initiating a Call

```
User A (Caller)                Server                 User B (Receiver)
     │                            │                           │
     │─────create_call────────────>│                           │
     │                            │                           │
     │<────call_id────────────────│                           │
     │                            │                           │
     │─────call-offer─────────────>│                           │
     │                            │                           │
     │                            │─────call-offer───────────>│
     │                            │                           │
     │                            │                      ┌────▼────┐
     │                            │                      │ Accept? │
     │                            │                      └────┬────┘
     │                            │                           │
     │                            │<────call-answer───────────│
     │                            │                           │
     │<────call-answer────────────│                           │
     │                            │                           │
     │◄─────────────────WebRTC Connection──────────────────►│
     │                   (peer-to-peer)                       │
     │                                                        │
```

### 2. During a Call

```
User A                         Server                    User B
   │                              │                         │
   │────ice-candidate────────────>│────ice-candidate───────>│
   │<───ice-candidate─────────────│<───ice-candidate────────│
   │                              │                         │
   │                    Audio/Video Stream                  │
   │◄─────────────────(Direct P2P)──────────────────────────►│
   │                              │                         │
```

### 3. Ending a Call

```
User A                         Server                    User B
   │                              │                         │
   │─────end-call────────────────>│                         │
   │                              │                         │
   │                              │─────call-ended─────────>│
   │                              │                         │
   │─────update_call──────────────>│                         │
   │     (set duration)           │                         │
   │                              │                         │
```

## 📊 Database Schema

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ username        │
│ email           │
│ password        │
│ profile_picture │
│ status          │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────▼───────────────────────┐
    │                            │
┌───▼──────────┐         ┌───────▼──────┐
│   messages   │         │    calls     │
├──────────────┤         ├──────────────┤
│ id (PK)      │         │ id (PK)      │
│ sender_id(FK)│         │ caller_id(FK)│
│ receiver_id  │         │receiver_id   │
│ group_id     │         │ group_id     │
│ message      │         │ call_type    │
│ type         │         │ status       │
│ status       │         │ duration     │
│ is_read      │         │ started_at   │
│ created_at   │         │ ended_at     │
└──────────────┘         └───────┬──────┘
                                 │
                                 │ 1:N
                                 │
                         ┌───────▼────────────┐
                         │ call_participants  │
                         ├────────────────────┤
                         │ id (PK)            │
                         │ call_id (FK)       │
                         │ user_id (FK)       │
                         │ joined_at          │
                         │ left_at            │
                         └────────────────────┘
```

## 🔐 Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Security Layers                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Transport Security                                │
│  ┌────────────────────────────────────────────────┐        │
│  │ • HTTPS (Production)                            │        │
│  │ • WSS (WebSocket Secure)                        │        │
│  │ • CORS Configuration                            │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  Layer 2: Authentication & Authorization                    │
│  ┌────────────────────────────────────────────────┐        │
│  │ • Session Management (PHP Sessions)             │        │
│  │ • User Authorization Checks                     │        │
│  │ • Socket.IO User Verification                   │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  Layer 3: Input Validation                                  │
│  ┌────────────────────────────────────────────────┐        │
│  │ • Server-side Validation                        │        │
│  │ • Type Checking                                 │        │
│  │ • Sanitization                                  │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  Layer 4: Database Security                                 │
│  ┌────────────────────────────────────────────────┐        │
│  │ • Prepared Statements (SQL Injection Protection)│        │
│  │ • Parameterized Queries                         │        │
│  │ • Foreign Key Constraints                       │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  Layer 5: Application Logic                                 │
│  ┌────────────────────────────────────────────────┐        │
│  │ • Error Handling                                │        │
│  │ • Permission Checks                             │        │
│  │ • Resource Limits                               │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Architecture

### Development Environment
```
┌─────────────────────────────────────────┐
│        Development Server               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │   Apache/   │  │   Node.js       │  │
│  │   Nginx     │  │   Socket.IO     │  │
│  │   (PHP)     │  │   Server        │  │
│  │  Port 80    │  │   Port 3000     │  │
│  └─────────────┘  └─────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   MySQL/MariaDB                 │   │
│  │   Port 3306                     │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Production Environment
```
┌──────────────────────────────────────────────────────────┐
│                   Load Balancer                          │
│                   (SSL/TLS Termination)                  │
└────────────────────┬─────────────────────────────────────┘
                     │
     ┌───────────────┴───────────────┐
     │                               │
┌────▼──────────┐           ┌────────▼──────┐
│  Web Server 1 │           │  Web Server 2 │
│  (PHP App)    │           │  (PHP App)    │
│  Port 443     │           │  Port 443     │
└───────────────┘           └───────────────┘
     │                               │
     └───────────────┬───────────────┘
                     │
           ┌─────────▼──────────┐
           │  Socket.IO Cluster │
           │  (Node.js)         │
           │  Port 3000         │
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │  Database Cluster  │
           │  (MySQL/MariaDB)   │
           │  Master/Slave      │
           └────────────────────┘
```

## 📈 Scalability

### Horizontal Scaling
- **Web Servers**: Add more PHP application servers behind load balancer
- **Socket.IO**: Use Redis adapter for multi-instance Socket.IO
- **Database**: Implement master-slave replication
- **TURN Servers**: Deploy multiple TURN servers for WebRTC

### Vertical Scaling
- **CPU**: More cores for concurrent connections
- **Memory**: More RAM for active socket connections
- **Storage**: SSD for faster database operations

## 🔌 API Endpoints Summary

### Call Management
- `POST /call_handler.php?action=create_call` - Create new call
- `POST /call_handler.php?action=update_call` - Update call status
- `POST /call_handler.php?action=end_call` - End call
- `GET /call_handler.php?action=get_calls` - Get all calls
- `GET /call_handler.php?action=get_call&call_id=X` - Get specific call

### Call Operations
- `POST /delete_call.php` - Delete single call
- `POST /delete_all_calls.php` - Delete all calls

### Statistics
- `GET /get_missed_calls_count.php` - Get missed calls count
- `GET /get_unread_counts.php` - Get unread messages and calls count

### Socket.IO Events
- `call-offer`, `call-answer`, `ice-candidate`
- `call-rejected`, `call-ended`
- `participant-joined`, `participant-left`
- `user-status-changed`

## 📱 Supported Platforms

### Web Browsers
✅ Chrome 80+
✅ Firefox 75+
✅ Safari 13+
✅ Edge 80+
✅ Opera 67+

### Mobile Browsers
✅ Chrome Mobile
✅ Safari iOS
✅ Samsung Internet

### Requirements
- WebRTC support
- MediaDevices API
- Socket.IO client compatibility
- JavaScript ES6+ support

---

**Architecture Version:** 1.0.0
**Last Updated:** 2025-11-19
