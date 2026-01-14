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

// Only allow POST requests for authentication
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
    if (empty($input['email']) || empty($input['password'])) {
        throw new Exception('Email and password are required');
    }
    
    // Database connection
    $database = new Database();
    $db = $database->getConnection();
    
    // Find user by email
    $query = "SELECT id, username, email, password FROM users WHERE email = ?";
    $stmt = $db->prepare($query);
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || !password_verify($input['password'], $user['password'])) {
        throw new Exception('Invalid email or password');
    }
    
    // Generate a simple session token (in production, use JWT or proper session management)
    $token = bin2hex(random_bytes(32));
    
    // Store token in database (you'll need a sessions table)
    // For now, just return user data
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email']
        ],
        'token' => $token
    ]);
    
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>