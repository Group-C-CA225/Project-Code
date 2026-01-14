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

// Only allow POST requests for registration
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
    $required_fields = ['username', 'email', 'password'];
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Basic validation
    if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    if (strlen($input['password']) < 6) {
        throw new Exception('Password must be at least 6 characters');
    }
    
    // Database connection
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if user already exists
    $check_query = "SELECT id FROM users WHERE email = ? OR username = ?";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->execute([$input['email'], $input['username']]);
    
    if ($check_stmt->fetch()) {
        throw new Exception('User with this email or username already exists');
    }
    
    // Hash password
    $hashed_password = password_hash($input['password'], PASSWORD_DEFAULT);
    
    // Insert new user
    $insert_query = "INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())";
    $insert_stmt = $db->prepare($insert_query);
    
    if ($insert_stmt->execute([$input['username'], $input['email'], $hashed_password])) {
        $user_id = $db->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'User registered successfully',
            'user_id' => $user_id
        ]);
    } else {
        throw new Exception('Failed to create user');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>