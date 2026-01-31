<?php
require_once __DIR__ . '/../config/Database.php';

class AuthController {
    private $db;

    public function __construct() {
        // Load environment variables
        $envFile = __DIR__ . '/../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                if (!array_key_exists($name, $_ENV)) {
                    putenv("$name=$value");
                    $_ENV[$name] = $value;
                }
            }
        }
        
        try {
            $database = new Database();
            $this->db = $database->connect();
        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Database initialization failed'
            ]);
            exit();
        }
    }

    public function register() {
        $data = json_decode(file_get_contents("php://input"));

        // Check required fields
        if(!isset($data->full_name) || !isset($data->email) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(["message" => "Missing required fields"]);
            exit();
        }

        // Trim and sanitize inputs
        $fullName = trim($data->full_name);
        $email = strtolower(trim($data->email));
        $password = $data->password;

        // ============= Validation =============
        $errors = [];

        // Validate full name
        if (strlen($fullName) < 2) {
            $errors[] = "Full name must be at least 2 characters";
        }
        if (preg_match('/[!@#$%^&*(),.?":{}|<>0-9]/', $fullName)) {
            $errors[] = "Full name cannot contain special characters or numbers";
        }
        if (strlen($fullName) > 100) {
            $errors[] = "Full name cannot exceed 100 characters";
        }

        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = "Invalid email format";
        }
        if (strlen($email) > 255) {
            $errors[] = "Email cannot exceed 255 characters";
        }

        // Validate password strength
        if (strlen($password) < 6) {
            $errors[] = "Password must be at least 6 characters";
        }

        // Return validation errors if any
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode([
                "message" => $errors[0], // Return first error as main message
                "errors" => $errors
            ]);
            exit();
        }

        // Check if email exists in teachers table
        $check = $this->db->prepare("SELECT id FROM teachers WHERE email = :email");
        $check->execute([':email' => $email]);
        if($check->rowCount() > 0) {
            http_response_code(409);
            echo json_encode(["message" => "Email already exists"]);
            exit();
        }

        // Generate 6-digit OTP
        $otp = sprintf('%06d', mt_rand(0, 999999));
        $otpExpiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
        
        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        
        // Clean up old pending registrations for this email
        $stmt = $this->db->prepare("DELETE FROM pending_registrations WHERE email = :email");
        $stmt->execute([':email' => $email]);
        
        // Insert pending registration
        $stmt = $this->db->prepare("
            INSERT INTO pending_registrations (username, email, password_hash, otp, otp_expires_at, created_at) 
            VALUES (:username, :email, :password_hash, :otp, :otp_expires_at, NOW())
        ");
        $stmt->execute([
            ':username' => $fullName,
            ':email' => $email,
            ':password_hash' => $hashedPassword,
            ':otp' => $otp,
            ':otp_expires_at' => $otpExpiry
        ]);
        
        // Send OTP email
        require_once __DIR__ . '/../utils/EmailService.php';
        $emailService = new EmailService();
        
        $subject = "Verify Your Email - QUIZAI Registration";
        $htmlBody = "
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
        
        $emailSent = $emailService->sendEmail($email, $subject, $htmlBody);
        
        if (!$emailSent) {
            // Log error but don't fail registration - user can resend OTP
            error_log("Failed to send verification email to {$email}: " . $emailService->getLastError());
        }
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Registration initiated. Please check your email for verification code.",
            "email" => $email
        ]);
        exit();
    }

    public function verifyEmail() {
        $data = json_decode(file_get_contents("php://input"));

        // Check required fields
        if(!isset($data->email) || !isset($data->otp)) {
            http_response_code(400);
            echo json_encode(["message" => "Email and OTP are required"]);
            exit();
        }

        $email = strtolower(trim($data->email));
        $otp = trim($data->otp);

        // Get pending registration
        $stmt = $this->db->prepare("
            SELECT id, username, email, password_hash, otp, otp_expires_at 
            FROM pending_registrations 
            WHERE email = :email AND otp = :otp
        ");
        $stmt->execute([':email' => $email, ':otp' => $otp]);
        $pending = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pending) {
            http_response_code(400);
            echo json_encode(["message" => "Invalid OTP or email"]);
            exit();
        }

        // Check if OTP has expired
        if (strtotime($pending['otp_expires_at']) < time()) {
            // Clean up expired registration
            $stmt = $this->db->prepare("DELETE FROM pending_registrations WHERE id = :id");
            $stmt->execute([':id' => $pending['id']]);
            http_response_code(400);
            echo json_encode(["message" => "OTP has expired. Please register again."]);
            exit();
        }

        // Check if email is already registered
        $stmt = $this->db->prepare("SELECT id FROM teachers WHERE email = :email");
        $stmt->execute([':email' => $pending['email']]);
        if ($stmt->fetch()) {
            // Clean up pending registration
            $stmt = $this->db->prepare("DELETE FROM pending_registrations WHERE id = :id");
            $stmt->execute([':id' => $pending['id']]);
            http_response_code(409);
            echo json_encode(["message" => "Email already registered"]);
            exit();
        }

        // Create the teacher account
        $stmt = $this->db->prepare("
            INSERT INTO teachers (full_name, email, password_hash, created_at) 
            VALUES (:name, :email, :pass, NOW())
        ");
        $stmt->execute([
            ':name' => $pending['username'],
            ':email' => $pending['email'],
            ':pass' => $pending['password_hash']
        ]);

        // Clean up pending registration
        $stmt = $this->db->prepare("DELETE FROM pending_registrations WHERE id = :id");
        $stmt->execute([':id' => $pending['id']]);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Email verified successfully! Your account has been created."
        ]);
        exit();
    }

    public function login() {
        $data = json_decode(file_get_contents("php://input"));
        
        if(!isset($data->email) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(["message" => "Email and password are required"]);
            exit();
        }
        
        $sql = "SELECT id, full_name, password_hash FROM teachers WHERE email = :email";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':email' => $data->email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if($user && password_verify($data->password, $user['password_hash'])) {
            // Generate a simple token (In real JWT, use a library like firebase/php-jwt)
            $token = bin2hex(random_bytes(32));
            
            // Store token in DB for validation later
            $update = $this->db->prepare("UPDATE teachers SET api_token = :token WHERE id = :id");
            $update->execute([':token' => $token, ':id' => $user['id']]);

            http_response_code(200);
            echo json_encode([
                "message" => "Login successful",
                "token" => $token,
                "user" => ["id" => $user['id'], "name" => $user['full_name']]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Invalid credentials"]);
        }
        exit();
    }

    // GET /api/teacher/profile - Get teacher profile
    public function getProfile() {
        $teacher_id = $this->getAuthTeacherId();
        
        $stmt = $this->db->prepare("SELECT full_name, email FROM teachers WHERE id = :tid");
        $stmt->execute([':tid' => $teacher_id]);
        $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$teacher) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Teacher not found"]);
            exit;
        }
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "full_name" => $teacher['full_name'],
            "email" => $teacher['email']
        ]);
    }
    
    // PUT /api/teacher/profile - Update teacher profile
    public function updateProfile() {
        $teacher_id = $this->getAuthTeacherId();
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->full_name) || !isset($data->email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }
        
        // Check if email is already taken by another teacher
        $checkStmt = $this->db->prepare("SELECT id FROM teachers WHERE email = :email AND id != :tid");
        $checkStmt->execute([':email' => $data->email, ':tid' => $teacher_id]);
        if ($checkStmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Email already in use"]);
            exit;
        }
        
        $stmt = $this->db->prepare("UPDATE teachers SET full_name = :name, email = :email WHERE id = :tid");
        $stmt->execute([
            ':name' => $data->full_name,
            ':email' => $data->email,
            ':tid' => $teacher_id
        ]);
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Profile updated successfully"
        ]);
    }
    
    // POST /api/teacher/change-password - Change password
    public function changePassword() {
        $teacher_id = $this->getAuthTeacherId();
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->current_password) || !isset($data->new_password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }
        
        // Verify current password
        $stmt = $this->db->prepare("SELECT password_hash FROM teachers WHERE id = :tid");
        $stmt->execute([':tid' => $teacher_id]);
        $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$teacher || !password_verify($data->current_password, $teacher['password_hash'])) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Current password is incorrect"]);
            exit;
        }
        
        // Update password
        $newHash = password_hash($data->new_password, PASSWORD_BCRYPT);
        $updateStmt = $this->db->prepare("UPDATE teachers SET password_hash = :hash WHERE id = :tid");
        $updateStmt->execute([':hash' => $newHash, ':tid' => $teacher_id]);
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Password changed successfully"
        ]);
    }
    
    // POST /api/teacher/forgot-password - Request password reset
    public function forgotPassword() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Email is required"]);
            exit;
        }
        
        // Forward to password reset service
        $resetData = json_encode(['action' => 'request', 'email' => $data->email]);
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => $resetData
            ]
        ]);
        
        $result = file_get_contents(__DIR__ . '/../api/password-reset.php', false, $context);
        echo $result;
    }

    private function getAuthTeacherId() {
        $authHeader = null;
        
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $headers = array_change_key_case($headers, CASE_LOWER);
            if (isset($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        }
        
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        if (!$authHeader) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }
        
        $token = preg_replace('/^Bearer\s+/i', '', $authHeader);
        
        $stmt = $this->db->prepare("SELECT id FROM teachers WHERE api_token = :token");
        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Invalid token"]);
            exit;
        }
        
        return $user['id'];
    }
}
?>