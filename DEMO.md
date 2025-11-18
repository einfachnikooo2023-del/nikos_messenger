# Demo & Testing Guide

## Quick Start

### 1. Start the Server
```bash
npm install
npm start
```

The server will start on http://localhost:3000

### 2. Test with Multiple Participants

#### Option A: Multiple Browser Windows
1. Open http://localhost:3000 in Chrome
2. Open http://localhost:3000 in another Chrome window (or incognito)
3. Open http://localhost:3000 in Firefox (optional)

#### Option B: Multiple Tabs (simpler)
1. Open http://localhost:3000 in a tab
2. Click settings → "Videoanruf starten"
3. Allow camera/microphone
4. Open a new tab with the same URL
5. Join the call from the second tab

### 3. Testing the Features

**Test Mesh Topology:**
- Open 3-4 tabs/windows
- Join the same call from each
- Verify each participant can see all others
- Check grid layout adapts automatically

**Test Call Controls:**
- Click microphone icon to mute/unmute
- Click video icon to turn camera off/on
- Click red phone icon to leave call
- Verify UI updates reflect the changes

**Test Dynamic Join/Leave:**
- Start with 2 participants
- Add a 3rd participant mid-call
- Have one participant leave
- Verify remaining participants stay connected

### 4. Run Integration Tests
```bash
npm test
```

Expected output:
```
Starting integration tests...

Test 1: Server connectivity
✓ Server responds with HTTP 200

Test 2: Socket.IO connection
✓ Socket.IO client can connect

Test 3: Start group call
✓ Call started with session ID
✓ Existing peers list is returned
✓ No existing peers for new call

Test 4: Second user joins call
✓ Second user receives session ID
✓ Second user sees first user as existing peer
✓ First user notified of new peer
✓ Peer user ID matches

Test 5: Peer signaling
✓ Offer received from correct peer
✓ Offer has correct type
✓ Answer received from correct peer
✓ Answer has correct type
✓ ICE candidate received from correct peer
✓ Candidate data is correct

Test 6: Leave call
✓ First user notified when peer leaves

==================================================
Test Results:
Passed: 16
Failed: 0
==================================================
```

### 5. Check Database

After running some calls, check the database:

```bash
sqlite3 messenger.db

# List all call sessions
SELECT * FROM group_call_sessions;

# List all participants
SELECT * FROM call_participants;

# Get active calls
SELECT * FROM group_call_sessions WHERE status = 'active';

# Get call statistics
SELECT 
  group_id, 
  COUNT(*) as total_calls,
  AVG((julianday(ended_at) - julianday(started_at)) * 24 * 60) as avg_duration_minutes
FROM group_call_sessions 
WHERE ended_at IS NOT NULL
GROUP BY group_id;
```

## Troubleshooting

### Camera/Microphone Not Working
- **Browser Permissions**: Check browser settings and allow camera/microphone access
- **HTTPS Required**: For production, use HTTPS (localhost works with HTTP)
- **Device in Use**: Close other apps using camera/microphone

### Cannot Connect to Peers
- **Firewall**: Check firewall settings
- **NAT/Router**: May need TURN server for restrictive networks
- **Browser Console**: Check for WebRTC errors in browser console (F12)

### Server Won't Start
- **Port in Use**: Change PORT in server.js or kill process on port 3000
  ```bash
  # Find process using port 3000
  lsof -ti:3000
  
  # Kill the process
  kill -9 $(lsof -ti:3000)
  ```

### Database Locked
- **Multiple Instances**: Only run one server instance at a time
- **Zombie Processes**: Kill any hung server processes
  ```bash
  pkill -f "node server.js"
  ```

## Advanced Testing

### Load Testing (Multiple Participants)
```javascript
// Create load-test.js
const io = require('socket.io-client');

const NUM_CLIENTS = 10;
const GROUP_ID = 'load-test-group';

for (let i = 0; i < NUM_CLIENTS; i++) {
  const socket = io('http://localhost:3000');
  const userId = `load-test-user-${i}`;
  
  socket.on('connect', () => {
    console.log(`User ${i} connected`);
    socket.emit('start-group-call', { groupId: GROUP_ID, userId });
  });
  
  socket.on('peer-joined', ({ socketId }) => {
    console.log(`User ${i} sees peer joined: ${socketId}`);
  });
}
```

Run with:
```bash
node load-test.js
```

### Simulating Network Issues
Use Chrome DevTools to simulate:
1. Open DevTools (F12)
2. Go to Network tab
3. Select "Slow 3G" or "Offline" to test reconnection

### Testing Different Grid Layouts
Navigate to call.html with different participant counts:
```
http://localhost:3000/call.html?groupId=test&userId=user1
```

Open multiple windows and observe grid changes at:
- 2, 3, 4 participants (2x2)
- 5, 6 participants (3x2)
- 7, 8, 9 participants (3x3)
- 10-16 participants (4x4)
- 17-32 participants (4x8)

## Production Deployment

For production use, consider:

1. **TURN Server**: For NAT traversal
   ```javascript
   // Add to webrtc-manager.js configuration
   {
     urls: 'turn:your-turn-server.com:3478',
     username: 'user',
     credential: 'pass'
   }
   ```

2. **HTTPS**: Required for camera/microphone in production
   ```javascript
   // Use Express with HTTPS
   const https = require('https');
   const fs = require('fs');
   
   const server = https.createServer({
     key: fs.readFileSync('key.pem'),
     cert: fs.readFileSync('cert.pem')
   }, app);
   ```

3. **Database**: Consider PostgreSQL for production
4. **Scaling**: For >32 users, implement SFU (Selective Forwarding Unit)
5. **Monitoring**: Add logging and metrics
6. **Rate Limiting**: Prevent abuse
