<?php
require_once 'config.php';

header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get database connection
$conn = getDBConnection();

// Get current user ID from session
$user_id = $_SESSION['user_id'] ?? 1;

// First, get all call IDs for the current user
$call_ids_stmt = $conn->prepare("SELECT id FROM calls WHERE caller_id = ? OR receiver_id = ?");
$call_ids_stmt->bind_param("ii", $user_id, $user_id);
$call_ids_stmt->execute();
$call_ids_result = $call_ids_stmt->get_result();

$call_ids = [];
while ($row = $call_ids_result->fetch_assoc()) {
    $call_ids[] = $row['id'];
}
$call_ids_stmt->close();

if (empty($call_ids)) {
    echo json_encode([
        'success' => true,
        'message' => 'No calls to delete',
        'deleted_count' => 0
    ]);
    $conn->close();
    exit;
}

// Delete call participants for these calls
$placeholders = implode(',', array_fill(0, count($call_ids), '?'));
$delete_participants = $conn->prepare("DELETE FROM call_participants WHERE call_id IN ($placeholders)");

// Bind parameters dynamically
$types = str_repeat('i', count($call_ids));
$delete_participants->bind_param($types, ...$call_ids);
$delete_participants->execute();
$delete_participants->close();

// Delete all calls for the current user
$delete_stmt = $conn->prepare("DELETE FROM calls WHERE caller_id = ? OR receiver_id = ?");
$delete_stmt->bind_param("ii", $user_id, $user_id);

if ($delete_stmt->execute()) {
    $deleted_count = $delete_stmt->affected_rows;
    
    echo json_encode([
        'success' => true,
        'message' => 'All calls deleted successfully',
        'deleted_count' => $deleted_count
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete calls: ' . $conn->error
    ]);
}

$delete_stmt->close();
$conn->close();
?>
