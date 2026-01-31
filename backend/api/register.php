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
    
    // Check if email already exists
    $stmt = $db->prepare("SELECT id FROM teachers WHERE email = ?");
    $stmt->execute([$input['email']]);
    if ($stmt->fetch()) {
        throw new Exception('Email already registered');
    }
    
    // Check if username already exists
    $stmt = $db->prepare("SELECT id FROM teachers WHERE username = ?");
    $stmt->execute([$input['username']]);
    if ($stmt->fetch()) {
        throw new Exception('Username already taken');
    }
    
    // Generate 6-digit OTP
    $otp = sprintf('%06d', mt_rand(0, 999999));
    $otpExpiry = date('Y-m-d H:i:s', strtotime('+10 minutes')); // OTP valid for 10 minutes
    
    // Store pending registration with OTP
    $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
    
    // Clean up old pending registrations for this email
    $stmt = $db->prepare("DELETE FROM pending_registrations WHERE email = ?");
    $stmt->execute([$input['email']]);
    
    // Insert pending registration
    $stmt = $db->prepare("
        INSERT INTO pending_registrations (username, email, password_hash, otp, otp_expires_at, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$input['username'], $input['email'], $hashedPassword, $otp, $otpExpiry]);
    
    // Send OTP email
    $subject = "Verify Your Email - QUIZAI Registration";
    $message = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0EA5E9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .otp { font-size: 32px; font-weight: bold; color: #0EA5E9; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }
            .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Welcome to QUIZAI!</h1>
            </div>
            <div class='content'>
                <h2>Email Verification Required</h2>
                <p>Thank you for registering with QUIZAI. To complete your registration, please use the verification code below:</p>
                
                <div class='otp'>{$otp}</div>
                
                <p>Enter this code on the verification page to activate your account.</p>
                
                <div class='warning'>
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This code will expire in 10 minutes</li>
                        <li>Do not share this code with anyone</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: QUIZAI <noreply@quizai.com>" . "\r\n";
    
    if (!mail($input['email'], $subject, $message, $headers)) {
        throw new Exception('Failed to send verification email');
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Registration initiated. Please check your email for verification code.',
        'email' => $input['email']
    ]);
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