<?php
// Disable HTML error output
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once '../config/Database.php';
    require_once '../utils/EmailService.php';
    require_once '../utils/SimpleEmailService.php';
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server configuration error']);
    exit;
}

// Load environment variables
function loadEnv() {
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

try {
    loadEnv();
    $database = new Database();
    $db = $database->connect();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection error: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';

// REQUEST PASSWORD RESET
if ($action === 'request' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    
    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit;
    }
    
    // Check if teacher exists
    $stmt = $db->prepare("SELECT id, full_name FROM teachers WHERE email = :email");
    $stmt->execute([':email' => $email]);
    $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$teacher) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No account found with this email address']);
        exit;
    }
    
    // Delete any existing unused tokens for this teacher
    $deleteStmt = $db->prepare("DELETE FROM password_resets WHERE teacher_id = :teacher_id AND used_at IS NULL");
    $deleteStmt->execute([':teacher_id' => $teacher['id']]);
    
    // Generate reset token
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes')); // Reduced from 1 hour to 15 minutes
    
    // Save token to database
    $stmt = $db->prepare("
        INSERT INTO password_resets (teacher_id, token, expires_at) 
        VALUES (:teacher_id, :token, :expires_at)
    ");
    $stmt->execute([
        ':teacher_id' => $teacher['id'],
        ':token' => $token,
        ':expires_at' => $expiresAt
    ]);
    
    // Send email using EmailService
    $appUrl = getenv('APP_URL') ?: 'http://localhost:5173';
    $resetLink = $appUrl . "/reset-password?token=" . $token;
    $subject = "Password Reset Request - Quiz Platform";
    $htmlBody = "
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #0EA5E9;'>Password Reset Request</h2>
                <p>Hello <strong>{$teacher['full_name']}</strong>,</p>
                <p>You requested to reset your password. Click the button below to reset it:</p>
                <p style='text-align: center; margin: 30px 0;'>
                    <a href='{$resetLink}' style='background: #0EA5E9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;'>Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style='background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;'>{$resetLink}</p>
                <p style='color: #666; font-size: 14px;'>This link will expire in 15 minutes.</p>
                <p style='color: #666; font-size: 14px;'>If you didn't request this, please ignore this email.</p>
                <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;'>
                <p style='color: #999; font-size: 12px; text-align: center;'>Quiz Platform - Automated Email</p>
            </div>
        </body>
        </html>
    ";
    
    $emailService = new EmailService();
    $emailSent = $emailService->sendEmail($email, $subject, $htmlBody);
    
    if (!$emailSent) {
        // Try simple email service as fallback
        $simpleEmailService = new SimpleEmailService();
        $emailSent = $simpleEmailService->sendEmail($email, $subject, $htmlBody);
        
        if (!$emailSent) {
            $errorMsg = $simpleEmailService->getLastError();
            error_log("Failed to send password reset email to: " . $email . " - Error: " . $errorMsg);
            http_response_code(500);
            echo json_encode([
                'success' => false, 
                'message' => 'Failed to send email. Please contact administrator.',
                'debug' => $errorMsg // Remove this in production
            ]);
            exit;
        }
    }
    
    echo json_encode([
        'success' => true, 
        'message' => 'Password reset link has been sent to your email'
    ]);
    exit;
}

// VERIFY TOKEN
if ($action === 'verify' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = $_GET['token'] ?? '';
    
    if (empty($token)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Token is required']);
        exit;
    }
    
    $stmt = $db->prepare("
        SELECT pr.*, t.email, t.full_name 
        FROM password_resets pr
        JOIN teachers t ON pr.teacher_id = t.id
        WHERE pr.token = :token 
        AND pr.expires_at > NOW()
    ");
    $stmt->execute([':token' => $token]);
    $reset = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$reset) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit;
    }
    
    // Check if already used
    if ($reset['used_at'] !== null && $reset['used_at'] !== '0000-00-00 00:00:00') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'This reset link has already been used']);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'email' => $reset['email'],
        'name' => $reset['full_name']
    ]);
    exit;
}

// RESET PASSWORD
if ($action === 'reset' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $token = $data['token'] ?? '';
        $newPassword = $data['password'] ?? '';
        
        if (empty($token) || empty($newPassword)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Token and password are required']);
            exit;
        }
        
        // Get token info
        $stmt = $db->prepare("SELECT teacher_id, expires_at, used_at FROM password_resets WHERE token = ?");
        $stmt->execute([$token]);
        $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tokenData) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid token']);
            exit;
        }
        
        // Check if expired
        if (strtotime($tokenData['expires_at']) < time()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Token has expired']);
            exit;
        }
        
        // Check if already used
        if ($tokenData['used_at'] !== null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Token has already been used']);
            exit;
        }
        
        // Update password
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $db->prepare("UPDATE teachers SET password_hash = ? WHERE id = ?");
        $result = $stmt->execute([$hashedPassword, $tokenData['teacher_id']]);
        
        if (!$result) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update password']);
            exit;
        }
        
        // Mark token as used
        $stmt = $db->prepare("UPDATE password_resets SET used_at = NOW() WHERE token = ?");
        $stmt->execute([$token]);
        
        echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
        exit;
        
    } catch (Exception $e) {
        error_log("Password reset error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Invalid request']);

