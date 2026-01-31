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
    if (empty($input['email'])) {
        throw new Exception('Email is required');
    }
    
    // Database connection
    $database = new Database();
    $db = $database->getConnection();
    
    // Get pending registration
    $stmt = $db->prepare("SELECT id, username FROM pending_registrations WHERE email = ?");
    $stmt->execute([$input['email']]);
    $pending = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$pending) {
        throw new Exception('No pending registration found for this email');
    }
    
    // Generate new OTP
    $otp = sprintf('%06d', mt_rand(0, 999999));
    $otpExpiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
    
    // Update pending registration with new OTP
    $stmt = $db->prepare("
        UPDATE pending_registrations 
        SET otp = ?, otp_expires_at = ? 
        WHERE email = ?
    ");
    $stmt->execute([$otp, $otpExpiry, $input['email']]);
    
    // Send OTP email
    $subject = "New Verification Code - QUIZAI Registration";
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
                <h1>New Verification Code</h1>
            </div>
            <div class='content'>
                <p>Here's your new verification code for QUIZAI registration:</p>
                
                <div class='otp'>{$otp}</div>
                
                <p>Enter this code on the verification page to activate your account.</p>
                
                <div class='warning'>
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This code will expire in 10 minutes</li>
                        <li>This code replaces any previous verification codes</li>
                        <li>Do not share this code with anyone</li>
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
        'message' => 'New verification code sent to your email.'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>