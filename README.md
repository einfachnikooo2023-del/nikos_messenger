# Nikos Messenger - Call System

Complete call system with WebRTC and Socket.IO integration.

## Features

- ✅ 1:1 Audio/Video calls
- ✅ Group calls (up to 32 participants)
- ✅ Call history with status tracking
- ✅ Missed call indicators
- ✅ Real-time Socket.IO communication
- ✅ WebRTC peer-to-peer connections
- ✅ Call management (delete, delete all)
- ✅ Unread message counters
- ✅ Date & time display for all calls

## Call Status Types

- **accepted** - Call was answered
- **missed** - Call was not answered
- **rejected** - Call was declined
- **cancelled** - Call was cancelled before answer
- **ended** - Call ended normally

## Installation

### 1. Database Setup

Import the database schema:

```bash
mysql -u root -p < database.sql
```

Or manually create the database and tables using the SQL in `database.sql`.

### 2. PHP Configuration

Edit `config.php` to match your database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_NAME', 'nikos_messenger');
```

### 3. Node.js Server Setup

Install dependencies:

```bash
npm install
```

Start the Socket.IO server:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will run on port 3000 by default.

### 4. Configure Client

Make sure the Socket.IO client in `calls.php` points to your server:

```javascript
const socket = io('http://localhost:3000');
```

For production, change this to your server's URL.

## File Structure

```
.
├── config.php                    # Database configuration
├── database.sql                  # Database schema
├── calls.php                     # Call page UI
├── webrtc-calls.js              # WebRTC client logic
├── call_handler.php             # Call management API
├── delete_call.php              # Delete single call
├── delete_all_calls.php         # Delete all calls
├── get_missed_calls_count.php   # Get missed calls count
├── get_unread_counts.php        # Get unread messages count
├── server.js                     # Socket.IO server
└── package.json                  # Node.js dependencies
```

## API Endpoints

### Call Handler (`call_handler.php`)

**POST** - Create/Update/End calls

- `action=create_call` - Create new call
- `action=update_call` - Update call status
- `action=end_call` - End active call

**GET** - Retrieve calls

- `action=get_calls` - Get all calls for current user
- `action=get_call&call_id=X` - Get specific call

### Delete Call (`delete_call.php`)

**POST** - Delete a specific call

```json
{
  "call_id": 123
}
```

### Delete All Calls (`delete_all_calls.php`)

**POST** - Delete all calls for current user

### Get Missed Calls Count (`get_missed_calls_count.php`)

**GET** - Returns count of missed calls

```json
{
  "success": true,
  "missed_count": 5
}
```

### Get Unread Counts (`get_unread_counts.php`)

**GET** - Returns unread messages and missed calls

```json
{
  "success": true,
  "unread_messages": 10,
  "missed_calls": 5,
  "conversations": {
    "2": 3,
    "5": 7
  },
  "total_notifications": 15
}
```

## Socket.IO Events

### Client → Server

- `user-online` - User connected
- `call-offer` - Initiate call
- `call-answer` - Answer call
- `ice-candidate` - WebRTC ICE candidate
- `call-rejected` - Reject call
- `end-call` - End call
- `join-call` - Join group call
- `leave-call` - Leave group call
- `typing` - Typing indicator
- `send-message` - Send message
- `message-read` - Mark message as read

### Server → Client

- `user-status-changed` - User online/offline
- `call-offer` - Incoming call offer
- `call-answer` - Call answered
- `ice-candidate` - WebRTC ICE candidate
- `call-rejected` - Call rejected
- `call-ended` - Call ended
- `participant-joined` - Group call participant joined
- `participant-left` - Group call participant left
- `user-offline` - User is offline
- `user-typing` - User is typing
- `receive-message` - Incoming message
- `message-status-changed` - Message status updated

## Usage

### Start a Call

1. Navigate to `calls.php`
2. Click the video icon in the header or call button next to a contact
3. Wait for the other user to accept

### Answer a Call

1. When a call comes in, a browser confirmation will appear
2. Click OK to accept or Cancel to reject

### End a Call

Click the red phone button in the call modal

### View Call History

Open `calls.php` to see all past calls with status and timestamps

### Delete Calls

- Delete individual call: Click trash icon next to the call
- Delete all calls: Click trash icon in the header

## Browser Requirements

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Opera 67+

All browsers must support:
- WebRTC
- MediaDevices API
- Socket.IO client

## Security Notes

1. **HTTPS Required**: For production, use HTTPS for both web server and Socket.IO
2. **TURN Server**: For production, configure a TURN server for NAT traversal
3. **Authentication**: Implement proper user authentication
4. **Input Validation**: All endpoints validate user input
5. **SQL Injection**: All queries use prepared statements
6. **XSS Protection**: All output is escaped

## Production Deployment

### 1. Use HTTPS

Configure SSL certificates for your web server and Socket.IO server.

### 2. Configure TURN Server

Update `webrtc-calls.js`:

```javascript
this.iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:your-turn-server.com:3478',
            username: 'your-username',
            credential: 'your-password'
        }
    ]
};
```

### 3. Environment Variables

Use environment variables for sensitive data:

```javascript
const PORT = process.env.PORT || 3000;
```

### 4. Process Manager

Use PM2 to manage the Node.js process:

```bash
npm install -g pm2
pm2 start server.js --name nikos-messenger
pm2 save
pm2 startup
```

## Troubleshooting

### Socket.IO Connection Failed

- Check that server.js is running
- Verify port 3000 is not blocked by firewall
- Check CORS configuration

### WebRTC Connection Failed

- Ensure HTTPS is used (required for getUserMedia)
- Check camera/microphone permissions
- Verify STUN/TURN servers are accessible

### Database Errors

- Verify database credentials in config.php
- Check that all tables are created
- Ensure proper permissions

## License

MIT License

## Support

For issues and questions, please open an issue on the repository.
