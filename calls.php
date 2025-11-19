<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anrufe - Nikos Messenger</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        :root {
            --bg-dark: #0A0F1A;
            --blue: #0A3D62;
            --light-blue: #4FC3F7;
            --text-light: #EAEAEA;
            --red: #ef4444;
            --green: #10b981;
            --orange: #f59e0b;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: var(--bg-dark);
            color: var(--text-light);
        }

        /* Header */
        .header {
            background: rgba(10, 61, 98, .9);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            color: white;
            z-index: 10;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .header .left {
            font-size: 24px;
            color: white;
            cursor: pointer;
        }

        .header .center {
            flex: 1;
            text-align: center;
            font-weight: bold;
            font-size: 20px;
            color: var(--light-blue);
        }

        .header .right {
            font-size: 24px;
            color: white;
            cursor: pointer;
            display: flex;
            gap: 15px;
        }

        /* Main Content */
        .content {
            position: absolute;
            top: 60px;
            bottom: 0;
            left: 0;
            right: 0;
            overflow-y: auto;
            padding: 10px;
        }

        /* Call List */
        .call-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .call-item {
            background: rgba(30, 41, 59, 0.5);
            padding: 12px 15px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: background 0.2s;
            position: relative;
        }

        .call-item:hover {
            background: rgba(30, 41, 59, 0.8);
        }

        .call-item.missed {
            background: rgba(239, 68, 68, 0.15);
        }

        .call-item.missed .call-icon {
            color: var(--red);
        }

        /* Profile Picture */
        .profile-pic {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
        }

        /* Call Info */
        .call-info {
            flex: 1;
            min-width: 0;
        }

        .call-name {
            font-weight: bold;
            font-size: 16px;
            color: var(--text-light);
            margin-bottom: 4px;
        }

        .call-status {
            font-size: 13px;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .call-icon {
            font-size: 16px;
        }

        .call-icon.incoming {
            color: var(--green);
        }

        .call-icon.outgoing {
            color: var(--light-blue);
        }

        .call-icon.missed {
            color: var(--red);
        }

        /* Call Meta */
        .call-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
        }

        .call-time {
            font-size: 12px;
            color: #94a3b8;
            white-space: nowrap;
        }

        .call-actions {
            display: flex;
            gap: 8px;
        }

        .action-btn {
            background: none;
            border: none;
            color: var(--light-blue);
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
            transition: transform 0.2s;
        }

        .action-btn:hover {
            transform: scale(1.1);
        }

        .action-btn.delete {
            color: var(--red);
        }

        /* Missed Call Badge */
        .missed-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--red);
            color: white;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Empty State */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
            color: #94a3b8;
        }

        .empty-state i {
            font-size: 64px;
            margin-bottom: 20px;
            color: #475569;
        }

        .empty-state p {
            font-size: 18px;
            margin-bottom: 10px;
        }

        .empty-state small {
            font-size: 14px;
        }

        /* Video Call Modal */
        .call-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-dark);
            z-index: 1000;
            flex-direction: column;
        }

        .call-modal.active {
            display: flex;
        }

        .call-modal-header {
            padding: 20px;
            text-align: center;
            background: rgba(10, 61, 98, 0.5);
        }

        .call-modal-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .video-container {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            padding: 5px;
        }

        .video-stream {
            background: #000;
            border-radius: 8px;
            position: relative;
            overflow: hidden;
        }

        .video-stream video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .video-label {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            color: white;
        }

        .local-video {
            width: 150px;
            height: 200px;
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 10;
            border: 2px solid var(--light-blue);
        }

        .call-controls {
            padding: 20px;
            display: flex;
            justify-content: center;
            gap: 20px;
            background: rgba(10, 61, 98, 0.5);
        }

        .control-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: none;
            font-size: 24px;
            cursor: pointer;
            transition: transform 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .control-btn:hover {
            transform: scale(1.1);
        }

        .control-btn.end-call {
            background: var(--red);
            color: white;
        }

        .control-btn.mute {
            background: #475569;
            color: white;
        }

        .control-btn.mute.active {
            background: var(--red);
        }

        .control-btn.video-toggle {
            background: #475569;
            color: white;
        }

        .control-btn.video-toggle.active {
            background: var(--red);
        }

        /* Notification Banner */
        .notification {
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            display: none;
            z-index: 100;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .notification.show {
            display: block;
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="left" onclick="window.location.href='index.html'">
            <i class="fa-solid fa-arrow-left"></i>
        </div>
        <div class="center">
            <i class="fa-solid fa-phone"></i> Anrufe
        </div>
        <div class="right">
            <i class="fa-solid fa-trash-alt" onclick="deleteAllCalls()" title="Alle löschen"></i>
            <i class="fa-solid fa-video" onclick="startVideoCall()" title="Videoanruf starten"></i>
        </div>
    </div>

    <!-- Notification -->
    <div id="notification" class="notification"></div>

    <!-- Main Content -->
    <div class="content">
        <div id="callList" class="call-list">
            <!-- Calls will be loaded here -->
        </div>
        <div id="emptyState" class="empty-state" style="display: none;">
            <i class="fa-solid fa-phone-slash"></i>
            <p>Keine Anrufe</p>
            <small>Ihre Anrufliste ist leer</small>
        </div>
    </div>

    <!-- Video Call Modal -->
    <div id="callModal" class="call-modal">
        <div class="call-modal-header">
            <h2 id="callModalTitle">Anruf wird verbunden...</h2>
        </div>
        <div class="call-modal-body">
            <div id="videoContainer" class="video-container">
                <!-- Video streams will be added here -->
            </div>
            <div id="localVideoContainer" class="local-video video-stream">
                <video id="localVideo" autoplay muted playsinline></video>
                <div class="video-label">Du</div>
            </div>
        </div>
        <div class="call-controls">
            <button class="control-btn mute" id="muteBtn" onclick="toggleMute()" title="Mikrofon">
                <i class="fa-solid fa-microphone"></i>
            </button>
            <button class="control-btn video-toggle" id="videoBtn" onclick="toggleVideo()" title="Kamera">
                <i class="fa-solid fa-video"></i>
            </button>
            <button class="control-btn end-call" onclick="endCall()" title="Anruf beenden">
                <i class="fa-solid fa-phone-slash"></i>
            </button>
        </div>
    </div>

    <!-- Socket.IO Client -->
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <!-- WebRTC Calls Script -->
    <script src="webrtc-calls.js"></script>
    <script>
        // Initialize Socket.IO connection
        const socket = io('http://localhost:3000');
        
        // Current user ID (in production, this would come from session)
        const currentUserId = 1;

        // Load calls on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadCalls();
            setupSocketListeners();
        });

        // Setup Socket.IO listeners
        function setupSocketListeners() {
            socket.on('connect', () => {
                console.log('Connected to Socket.IO server');
                socket.emit('user-online', currentUserId);
            });

            socket.on('incoming-call', (data) => {
                showNotification(`Eingehender Anruf von ${data.callerName}`);
                loadCalls(); // Refresh call list
            });

            socket.on('call-ended', () => {
                loadCalls(); // Refresh call list
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from Socket.IO server');
            });
        }

        // Load calls from server
        function loadCalls() {
            fetch('call_handler.php?action=get_calls')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        displayCalls(data.calls);
                    } else {
                        console.error('Error loading calls:', data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }

        // Display calls in the list
        function displayCalls(calls) {
            const callList = document.getElementById('callList');
            const emptyState = document.getElementById('emptyState');

            if (calls.length === 0) {
                callList.style.display = 'none';
                emptyState.style.display = 'flex';
                return;
            }

            callList.style.display = 'flex';
            emptyState.style.display = 'none';
            callList.innerHTML = '';

            calls.forEach(call => {
                const callItem = createCallItem(call);
                callList.appendChild(callItem);
            });
        }

        // Create a call item element
        function createCallItem(call) {
            const div = document.createElement('div');
            div.className = `call-item ${call.status === 'missed' ? 'missed' : ''}`;
            div.dataset.callId = call.id;

            // Determine call icon and direction
            let iconClass = 'call-icon';
            let iconName = 'fa-phone';
            
            if (call.call_type === 'video') {
                iconName = 'fa-video';
            }
            
            if (call.caller_id == currentUserId) {
                iconClass += ' outgoing';
                iconName = 'fa-phone-arrow-up-right';
            } else {
                iconClass += call.status === 'missed' ? ' missed' : ' incoming';
                iconName = call.status === 'missed' ? 'fa-phone-missed' : 'fa-phone-arrow-down-left';
            }

            // Format status text
            let statusText = '';
            switch(call.status) {
                case 'accepted':
                    statusText = 'Angenommen';
                    break;
                case 'missed':
                    statusText = 'Verpasst';
                    break;
                case 'rejected':
                    statusText = 'Abgelehnt';
                    break;
                case 'cancelled':
                    statusText = 'Abgebrochen';
                    break;
                default:
                    statusText = call.status;
            }

            // Format date and time
            const callDate = new Date(call.created_at);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let dateStr = '';
            if (callDate.toDateString() === today.toDateString()) {
                dateStr = 'Heute';
            } else if (callDate.toDateString() === yesterday.toDateString()) {
                dateStr = 'Gestern';
            } else {
                dateStr = callDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
            
            const timeStr = callDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const fullDateTime = `${dateStr}, ${timeStr}`;

            div.innerHTML = `
                <img src="${call.profile_picture || 'https://i.pravatar.cc/150?img=1'}" alt="${call.name}" class="profile-pic">
                <div class="call-info">
                    <div class="call-name">${call.name}${call.is_group ? ' (Gruppe)' : ''}</div>
                    <div class="call-status">
                        <i class="fa-solid ${iconName} ${iconClass}"></i>
                        <span>${statusText}${call.duration > 0 ? ' - ' + formatDuration(call.duration) : ''}</span>
                    </div>
                </div>
                <div class="call-meta">
                    <div class="call-time">${fullDateTime}</div>
                    <div class="call-actions">
                        <button class="action-btn" onclick="makeCall(${call.caller_id == currentUserId ? call.receiver_id : call.caller_id}, '${call.call_type}')" title="Zurückrufen">
                            <i class="fa-solid fa-${call.call_type === 'video' ? 'video' : 'phone'}"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteCall(${call.id})" title="Löschen">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${call.status === 'missed' ? '<div class="missed-badge"></div>' : ''}
            `;

            return div;
        }

        // Format call duration
        function formatDuration(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                return `${minutes}:${secs.toString().padStart(2, '0')}`;
            }
        }

        // Delete a call
        function deleteCall(callId) {
            if (!confirm('Möchten Sie diesen Anruf wirklich löschen?')) {
                return;
            }

            fetch('delete_call.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ call_id: callId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Anruf gelöscht', 'success');
                    loadCalls();
                } else {
                    showNotification('Fehler beim Löschen: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Fehler beim Löschen', 'error');
            });
        }

        // Delete all calls
        function deleteAllCalls() {
            if (!confirm('Möchten Sie wirklich alle Anrufe löschen?')) {
                return;
            }

            fetch('delete_all_calls.php', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Alle Anrufe gelöscht', 'success');
                    loadCalls();
                } else {
                    showNotification('Fehler beim Löschen: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Fehler beim Löschen', 'error');
            });
        }

        // Make a call
        function makeCall(userId, callType = 'audio') {
            // Initialize WebRTC call
            initializeCall(userId, callType);
        }

        // Start video call
        function startVideoCall() {
            const userId = prompt('Geben Sie die Benutzer-ID ein:');
            if (userId) {
                makeCall(parseInt(userId), 'video');
            }
        }

        // Show notification
        function showNotification(message, type = 'info') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification show ${type}`;
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        // Refresh calls every 30 seconds
        setInterval(loadCalls, 30000);
    </script>
</body>
</html>
