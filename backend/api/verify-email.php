<?php
// CORS headers - must be first
header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173'));
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/Database.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    if (empty($input['email']) || empty($input['otp'])) {
        throw new Exception('Email and OTP are required');
    }
    
    // Database connection
    $database = new Database();
    $db = $database->getConnection();
    
    // Get pending registration
    $stmt = $db->prepare("
        SELECT id, username, email, password_hash, otp, otp_expires_at 
        FROM pending_registrations 
        WHERE email = ? AND otp = ?
    ");
    $stmt->execute([$input['email'], $input['otp']]);
    $pending = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$pending) {
        throw new Exception('Invalid OTP or email');
    }
    
    // Check if OTP has expired
    if (strtotime($pending['otp_expires_at']) < time()) {
        // Clean up expired registration
        $stmt = $db->prepare("DELETE FROM pending_registrations WHERE id = ?");
        $stmt->execute([$pending['id']]);
        throw new Exception('OTP has expired. Please register again.');
    }
    
    // Check if email is already registered (race condition protection)
    $stmt = $db->prepare("SELECT id FROM teachers WHERE email = ?");
    $stmt->execute([$pending['email']]);
    if ($stmt->fetch()) {
        // Clean up pending registration
        $stmt = $db->prepare("DELETE FROM pending_registrations WHERE id = ?");
        $stmt->execute([$pending['id']]);
        throw new Exception('Email already registered');
    }
    
    // Create the teacher account
    $stmt = $db->prepare("
        INSERT INTO teachers (full_name, email, password_hash, created_at) 
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->execute([$pending['username'], $pending['email'], $pending['password_hash']]);
    
    // Clean up pending registration
    $stmt = $db->prepare("DELETE FROM pending_registrations WHERE id = ?");
    $stmt->execute([$pending['id']]);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Email verified successfully! Your account has been created.'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>