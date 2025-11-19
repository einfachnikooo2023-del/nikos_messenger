<?php
require_once 'config.php';

header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get input data
$input = json_decode(file_get_contents('php://input'), true);
$call_id = $input['call_id'] ?? 0;

// Validate input
if (!$call_id) {
    echo json_encode(['success' => false, 'message' => 'Call ID required']);
    exit;
}

// Get database connection
$conn = getDBConnection();

// Get current user ID from session
$user_id = $_SESSION['user_id'] ?? 1;

// Verify that the user is authorized to delete this call
$check_stmt = $conn->prepare("SELECT id FROM calls WHERE id = ? AND (caller_id = ? OR receiver_id = ?)");
$check_stmt->bind_param("iii", $call_id, $user_id, $user_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();

if ($check_result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Call not found or unauthorized']);
    $check_stmt->close();
    $conn->close();
    exit;
}
$check_stmt->close();

// Delete call participants first (foreign key constraint)
$delete_participants = $conn->prepare("DELETE FROM call_participants WHERE call_id = ?");
$delete_participants->bind_param("i", $call_id);
$delete_participants->execute();
$delete_participants->close();

// Delete the call
$delete_stmt = $conn->prepare("DELETE FROM calls WHERE id = ?");
$delete_stmt->bind_param("i", $call_id);

if ($delete_stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Call deleted successfully'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete call: ' . $conn->error
    ]);
}

$delete_stmt->close();
$conn->close();
?>
