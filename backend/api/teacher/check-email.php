<?php
// CORS headers - must be first
header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173'));
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    require_once __DIR__ . '/../../config/Database.php';
    
    // Get email from query parameter
    $email = isset($_GET['email']) ? trim($_GET['email']) : '';
    
    if (empty($email)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email is required',
            'available' => null
        ]);
        exit();
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format',
            'available' => null
        ]);
        exit();
    }
    
    // Connect to database
    $database = new Database();
    $db = $database->connect();
    
    // Check if email exists
    $stmt = $db->prepare("SELECT id FROM teachers WHERE email = :email");
    $stmt->execute([':email' => strtolower($email)]);
    
    $exists = $stmt->rowCount() > 0;
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'available' => !$exists,
        'message' => $exists ? 'Email is already registered' : 'Email is available'
    ]);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error',
        'available' => null
    ]);
}
