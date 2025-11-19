<?php
require_once 'config.php';

header('Content-Type: application/json');

// Get database connection
$conn = getDBConnection();

// Get current user ID from session
$user_id = $_SESSION['user_id'] ?? 1;

// Count unread messages for the current user
// Unread messages are messages where:
// - The user is the receiver
// - is_read = 0
$messages_stmt = $conn->prepare("
    SELECT COUNT(*) as unread_count 
    FROM messages 
    WHERE receiver_id = ? 
    AND is_read = 0
");
$messages_stmt->bind_param("i", $user_id);
$messages_stmt->execute();
$messages_result = $messages_stmt->get_result();
$messages_row = $messages_result->fetch_assoc();
$unread_messages = (int)$messages_row['unread_count'];
$messages_stmt->close();

// Count missed calls for the current user
$calls_stmt = $conn->prepare("
    SELECT COUNT(*) as missed_count 
    FROM calls 
    WHERE receiver_id = ? 
    AND status = 'missed'
");
$calls_stmt->bind_param("i", $user_id);
$calls_stmt->execute();
$calls_result = $calls_stmt->get_result();
$calls_row = $calls_result->fetch_assoc();
$missed_calls = (int)$calls_row['missed_count'];
$calls_stmt->close();

// Get unread count per conversation
$conversations_stmt = $conn->prepare("
    SELECT 
        sender_id,
        COUNT(*) as unread_count
    FROM messages 
    WHERE receiver_id = ? 
    AND is_read = 0
    GROUP BY sender_id
");
$conversations_stmt->bind_param("i", $user_id);
$conversations_stmt->execute();
$conversations_result = $conversations_stmt->get_result();

$conversations = [];
while ($row = $conversations_result->fetch_assoc()) {
    $conversations[$row['sender_id']] = (int)$row['unread_count'];
}
$conversations_stmt->close();

echo json_encode([
    'success' => true,
    'unread_messages' => $unread_messages,
    'missed_calls' => $missed_calls,
    'conversations' => $conversations,
    'total_notifications' => $unread_messages + $missed_calls
]);

$conn->close();
?>
