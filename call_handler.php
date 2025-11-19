<?php
require_once 'config.php';

header('Content-Type: application/json');

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Handle POST requests
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'create_call':
            createCall($input);
            break;
        case 'update_call':
            updateCall($input);
            break;
        case 'end_call':
            endCall($input);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} elseif ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get_calls':
            getCalls();
            break;
        case 'get_call':
            getCall($_GET['call_id'] ?? 0);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}

/**
 * Create a new call
 */
function createCall($data) {
    $conn = getDBConnection();
    
    // Get current user ID from session (or from data for demo)
    $caller_id = $_SESSION['user_id'] ?? 1;
    $receiver_id = $data['receiver_id'] ?? null;
    $group_id = $data['group_id'] ?? null;
    $call_type = $data['call_type'] ?? 'audio';
    
    // Validate input
    if (!$receiver_id && !$group_id) {
        echo json_encode(['success' => false, 'message' => 'Receiver or group required']);
        return;
    }
    
    // Insert call record
    $stmt = $conn->prepare("INSERT INTO calls (caller_id, receiver_id, group_id, call_type, status) VALUES (?, ?, ?, ?, 'initiated')");
    $stmt->bind_param("iiis", $caller_id, $receiver_id, $group_id, $call_type);
    
    if ($stmt->execute()) {
        $call_id = $conn->insert_id;
        
        // If it's a group call, add participants
        if ($group_id) {
            $members_stmt = $conn->prepare("SELECT user_id FROM group_members WHERE group_id = ?");
            $members_stmt->bind_param("i", $group_id);
            $members_stmt->execute();
            $members_result = $members_stmt->get_result();
            
            $participant_stmt = $conn->prepare("INSERT INTO call_participants (call_id, user_id) VALUES (?, ?)");
            while ($member = $members_result->fetch_assoc()) {
                $user_id = $member['user_id'];
                $participant_stmt->bind_param("ii", $call_id, $user_id);
                $participant_stmt->execute();
            }
            $participant_stmt->close();
            $members_stmt->close();
        }
        
        echo json_encode([
            'success' => true,
            'call_id' => $call_id,
            'message' => 'Call created successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to create call: ' . $conn->error
        ]);
    }
    
    $stmt->close();
    $conn->close();
}

/**
 * Update call status
 */
function updateCall($data) {
    $conn = getDBConnection();
    
    $call_id = $data['call_id'] ?? 0;
    $status = $data['status'] ?? '';
    
    if (!$call_id || !$status) {
        echo json_encode(['success' => false, 'message' => 'Call ID and status required']);
        return;
    }
    
    // Validate status
    $valid_statuses = ['initiated', 'ringing', 'accepted', 'rejected', 'missed', 'cancelled', 'ended'];
    if (!in_array($status, $valid_statuses)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status']);
        return;
    }
    
    // Update call status
    $stmt = $conn->prepare("UPDATE calls SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $call_id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Call status updated successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update call: ' . $conn->error
        ]);
    }
    
    $stmt->close();
    $conn->close();
}

/**
 * End a call
 */
function endCall($data) {
    $conn = getDBConnection();
    
    $call_id = $data['call_id'] ?? 0;
    
    if (!$call_id) {
        echo json_encode(['success' => false, 'message' => 'Call ID required']);
        return;
    }
    
    // Get call start time to calculate duration
    $stmt = $conn->prepare("SELECT started_at, status FROM calls WHERE id = ?");
    $stmt->bind_param("i", $call_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $call = $result->fetch_assoc();
    $stmt->close();
    
    if (!$call) {
        echo json_encode(['success' => false, 'message' => 'Call not found']);
        $conn->close();
        return;
    }
    
    // Calculate duration
    $started_at = new DateTime($call['started_at']);
    $ended_at = new DateTime();
    $duration = $ended_at->getTimestamp() - $started_at->getTimestamp();
    
    // Determine final status
    $final_status = 'ended';
    if ($call['status'] === 'initiated' || $call['status'] === 'ringing') {
        $final_status = 'cancelled';
    }
    
    // Update call with end time and duration
    $ended_at_str = $ended_at->format('Y-m-d H:i:s');
    $update_stmt = $conn->prepare("UPDATE calls SET status = ?, duration = ?, ended_at = ? WHERE id = ?");
    $update_stmt->bind_param("sisi", $final_status, $duration, $ended_at_str, $call_id);
    
    if ($update_stmt->execute()) {
        // Update participant left times
        $participant_stmt = $conn->prepare("UPDATE call_participants SET left_at = NOW() WHERE call_id = ? AND left_at IS NULL");
        $participant_stmt->bind_param("i", $call_id);
        $participant_stmt->execute();
        $participant_stmt->close();
        
        echo json_encode([
            'success' => true,
            'message' => 'Call ended successfully',
            'duration' => $duration
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to end call: ' . $conn->error
        ]);
    }
    
    $update_stmt->close();
    $conn->close();
}

/**
 * Get all calls for current user
 */
function getCalls() {
    $conn = getDBConnection();
    
    // Get current user ID from session
    $user_id = $_SESSION['user_id'] ?? 1;
    
    // Get calls where user is caller or receiver
    $query = "
        SELECT 
            c.id,
            c.caller_id,
            c.receiver_id,
            c.group_id,
            c.call_type,
            c.status,
            c.duration,
            c.started_at,
            c.ended_at,
            c.created_at,
            CASE
                WHEN c.caller_id = ? THEN u2.username
                ELSE u1.username
            END as name,
            CASE
                WHEN c.caller_id = ? THEN u2.profile_picture
                ELSE u1.profile_picture
            END as profile_picture,
            CASE
                WHEN c.group_id IS NOT NULL THEN 1
                ELSE 0
            END as is_group
        FROM calls c
        LEFT JOIN users u1 ON c.caller_id = u1.id
        LEFT JOIN users u2 ON c.receiver_id = u2.id
        WHERE c.caller_id = ? OR c.receiver_id = ?
        ORDER BY c.created_at DESC
        LIMIT 100
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iiii", $user_id, $user_id, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $calls = [];
    while ($row = $result->fetch_assoc()) {
        // If it's a group call, get group name
        if ($row['is_group']) {
            $group_stmt = $conn->prepare("SELECT name FROM groups WHERE id = ?");
            $group_stmt->bind_param("i", $row['group_id']);
            $group_stmt->execute();
            $group_result = $group_stmt->get_result();
            if ($group = $group_result->fetch_assoc()) {
                $row['name'] = $group['name'];
            }
            $group_stmt->close();
        }
        
        $calls[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'calls' => $calls
    ]);
    
    $stmt->close();
    $conn->close();
}

/**
 * Get a specific call
 */
function getCall($call_id) {
    $conn = getDBConnection();
    
    if (!$call_id) {
        echo json_encode(['success' => false, 'message' => 'Call ID required']);
        return;
    }
    
    $stmt = $conn->prepare("
        SELECT 
            c.*,
            u1.username as caller_name,
            u1.profile_picture as caller_picture,
            u2.username as receiver_name,
            u2.profile_picture as receiver_picture
        FROM calls c
        LEFT JOIN users u1 ON c.caller_id = u1.id
        LEFT JOIN users u2 ON c.receiver_id = u2.id
        WHERE c.id = ?
    ");
    $stmt->bind_param("i", $call_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($call = $result->fetch_assoc()) {
        // Get participants if it's a group call
        if ($call['group_id']) {
            $participant_stmt = $conn->prepare("
                SELECT 
                    cp.*,
                    u.username,
                    u.profile_picture
                FROM call_participants cp
                LEFT JOIN users u ON cp.user_id = u.id
                WHERE cp.call_id = ?
            ");
            $participant_stmt->bind_param("i", $call_id);
            $participant_stmt->execute();
            $participant_result = $participant_stmt->get_result();
            
            $participants = [];
            while ($participant = $participant_result->fetch_assoc()) {
                $participants[] = $participant;
            }
            $call['participants'] = $participants;
            $participant_stmt->close();
        }
        
        echo json_encode([
            'success' => true,
            'call' => $call
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Call not found'
        ]);
    }
    
    $stmt->close();
    $conn->close();
}
?>
