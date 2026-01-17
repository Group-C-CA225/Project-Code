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

require_once __DIR__ . '/../../config/Database.php';

// Get Authorization header
$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized - No token provided"]);
    exit;
}

$token = str_replace('Bearer ', '', $headers['Authorization']);

// Connect to database
$database = new Database();
$db = $database->connect();

// Verify token and get teacher ID
$stmt = $db->prepare("SELECT id FROM teachers WHERE api_token = :token");
$stmt->execute([':token' => $token]);
$teacher = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$teacher) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Invalid token"]);
    exit;
}

$teacher_id = $teacher['id'];

// Get request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON input"]);
    exit;
}

// Validate required fields
if (empty($input['quiz_id']) || empty($input['action'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Quiz ID and action are required"]);
    exit;
}

$quiz_id = $input['quiz_id'];
$action = $input['action']; // 'pause', 'resume', 'pause_student', 'resume_student'
$session_id = $input['session_id'] ?? null;

try {
    // Verify quiz belongs to teacher
    $stmt = $db->prepare("SELECT id FROM quizzes WHERE id = :quiz_id AND teacher_id = :teacher_id");
    $stmt->execute([':quiz_id' => $quiz_id, ':teacher_id' => $teacher_id]);
    $quiz = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$quiz) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Quiz not found or access denied"]);
        exit;
    }

    // Validate action
    $valid_actions = ['pause', 'resume', 'pause_student', 'resume_student'];
    if (!in_array($action, $valid_actions)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid action"]);
        exit;
    }

    $affected_rows = 0;
    $message = '';

    switch ($action) {
        case 'pause':
            // Pause all active sessions for this quiz
            $stmt = $db->prepare("UPDATE exam_sessions 
                                 SET status = 'PAUSED', last_activity = NOW() 
                                 WHERE quiz_id = :quiz_id AND status = 'ACTIVE'");
            $stmt->execute([':quiz_id' => $quiz_id]);
            $affected_rows = $stmt->rowCount();
            $message = "Paused {$affected_rows} active sessions";
            break;

        case 'resume':
            // Resume all paused sessions for this quiz
            $stmt = $db->prepare("UPDATE exam_sessions 
                                 SET status = 'ACTIVE', last_activity = NOW() 
                                 WHERE quiz_id = :quiz_id AND status = 'PAUSED'");
            $stmt->execute([':quiz_id' => $quiz_id]);
            $affected_rows = $stmt->rowCount();
            $message = "Resumed {$affected_rows} paused sessions";
            break;

        case 'pause_student':
            // Pause specific student session
            if (!$session_id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Session ID is required for student-specific actions"]);
                exit;
            }
            
            $stmt = $db->prepare("UPDATE exam_sessions 
                                 SET status = 'PAUSED', last_activity = NOW() 
                                 WHERE id = :session_id AND quiz_id = :quiz_id AND status = 'ACTIVE'");
            $stmt->execute([':session_id' => $session_id, ':quiz_id' => $quiz_id]);
            $affected_rows = $stmt->rowCount();
            
            if ($affected_rows > 0) {
                $message = "Student session paused successfully";
            } else {
                $message = "No active session found for this student";
            }
            break;

        case 'resume_student':
            // Resume specific student session
            if (!$session_id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Session ID is required for student-specific actions"]);
                exit;
            }
            
            $stmt = $db->prepare("UPDATE exam_sessions 
                                 SET status = 'ACTIVE', last_activity = NOW() 
                                 WHERE id = :session_id AND quiz_id = :quiz_id AND status = 'PAUSED'");
            $stmt->execute([':session_id' => $session_id, ':quiz_id' => $quiz_id]);
            $affected_rows = $stmt->rowCount();
            
            if ($affected_rows > 0) {
                $message = "Student session resumed successfully";
            } else {
                $message = "No paused session found for this student";
            }
            break;
    }

    echo json_encode([
        'success' => true,
        'message' => $message,
        'affected_sessions' => $affected_rows,
        'action' => $action,
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
