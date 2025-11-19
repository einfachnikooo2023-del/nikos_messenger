<?php
require_once 'config.php';

header('Content-Type: application/json');

// Get database connection
$conn = getDBConnection();

// Get current user ID from session
$user_id = $_SESSION['user_id'] ?? 1;

// Count missed calls for the current user
// Missed calls are calls where:
// - The user is the receiver
// - Status is 'missed'
$stmt = $conn->prepare("
    SELECT COUNT(*) as missed_count 
    FROM calls 
    WHERE receiver_id = ? 
    AND status = 'missed'
");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'success' => true,
        'missed_count' => (int)$row['missed_count']
    ]);
} else {
    echo json_encode([
        'success' => true,
        'missed_count' => 0
    ]);
}

$stmt->close();
$conn->close();
?>
