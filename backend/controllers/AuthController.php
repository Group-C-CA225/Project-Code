<?php
require_once __DIR__ . '/../config/Database.php';

class AuthController {
    private $db;

    public function __construct() {
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

        if(!isset($data->full_name) || !isset($data->email) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(["message" => "Missing fields"]);
            exit();
        }

        // Check if email exists
        $check = $this->db->prepare("SELECT id FROM teachers WHERE email = :email");
        $check->execute([':email' => $data->email]);
        if($check->rowCount() > 0) {
            http_response_code(409);
            echo json_encode(["message" => "Email already exists"]);
            exit();
        }

        // Hash password & Insert
        $sql = "INSERT INTO teachers (full_name, email, password_hash) VALUES (:name, :email, :pass)";
        $stmt = $this->db->prepare($sql);
        
        $hash = password_hash($data->password, PASSWORD_BCRYPT);
        
        if($stmt->execute([':name' => $data->full_name, ':email' => $data->email, ':pass' => $hash])) {
            http_response_code(201);
            echo json_encode(["message" => "Teacher registered successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "System error"]);
        }
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