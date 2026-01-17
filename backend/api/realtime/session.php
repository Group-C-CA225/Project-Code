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

// Connect to database
$database = new Database();
$db = $database->connect();

// Get request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON input"]);
    exit;
}

try {
    // Get action from URL path or POST data
    $action = $_GET['action'] ?? $input['action'] ?? '';

    switch ($action) {
        case 'start':
            handleStartSession($db, $input);
            break;
            
        case 'update':
            handleUpdateSession($db, $input);
            break;
            
        case 'end':
            handleEndSession($db, $input);
            break;
            
        case 'check':
            handleCheckSession($db, $input);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid action"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

function handleStartSession($db, $input) {
    // Validate required fields
    $required = ['student_identifier', 'student_class', 'quiz_id', 'total_questions', 'time_remaining_seconds'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("Field '$field' is required");
        }
    }

    // First, create or get student record
    $stmt = $db->prepare("INSERT INTO students (quiz_id, student_identifier, student_class, status) 
                          VALUES (:quiz_id, :student_identifier, :student_class, 'IN_PROGRESS')
                          ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)");
    $stmt->execute([
        ':quiz_id' => $input['quiz_id'],
        ':student_identifier' => $input['student_identifier'],
        ':student_class' => $input['student_class']
    ]);
    $student_id = $db->lastInsertId();

    // Check if student already has an active session for this quiz
    $stmt = $db->prepare("SELECT session_token FROM exam_sessions 
                          WHERE student_id = :student_id AND quiz_id = :quiz_id 
                          AND status IN ('ACTIVE', 'PAUSED')");
    $stmt->execute([
        ':student_id' => $student_id,
        ':quiz_id' => $input['quiz_id']
    ]);
    $existing_session = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing_session) {
        // Return existing session token instead of creating a new one
        echo json_encode([
            'success' => true,
            'session_token' => $existing_session['session_token'],
            'message' => 'Existing session found'
        ]);
        return;
    }

    // Generate unique session token
    $session_token = bin2hex(random_bytes(32));

    // Create exam session
    $stmt = $db->prepare("INSERT INTO exam_sessions 
                          (student_id, quiz_id, session_token, total_questions, time_remaining_seconds, status) 
                          VALUES (:student_id, :quiz_id, :session_token, :total_questions, :time_remaining_seconds, 'ACTIVE')");
    $stmt->execute([
        ':student_id' => $student_id,
        ':quiz_id' => $input['quiz_id'],
        ':session_token' => $session_token,
        ':total_questions' => $input['total_questions'],
        ':time_remaining_seconds' => $input['time_remaining_seconds']
    ]);

    echo json_encode([
        'success' => true,
        'session_token' => $session_token,
        'message' => 'Session started successfully'
    ]);
}

function handleUpdateSession($db, $input) {
    if (empty($input['session_token'])) {
        throw new Exception("Session token is required");
    }

    // Get session by token
    $stmt = $db->prepare("SELECT * FROM exam_sessions WHERE session_token = :session_token");
    $stmt->execute([':session_token' => $input['session_token']]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$session) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Session not found']);
        return;
    }

    // Check if session is paused
    if ($session['status'] === 'PAUSED') {
        echo json_encode([
            'success' => true,
            'status' => 'PAUSED',
            'message' => 'Session is paused by teacher'
        ]);
        return;
    }

    // Update session data
    $stmt = $db->prepare("UPDATE exam_sessions 
                          SET current_question_index = :current_question_index,
                              questions_answered = :questions_answered,
                              time_remaining_seconds = :time_remaining_seconds,
                              last_activity = NOW(),
                              last_heartbeat = NOW()
                          WHERE session_token = :session_token");
    
    $stmt->execute([
        ':current_question_index' => $input['current_question_index'] ?? $session['current_question_index'],
        ':questions_answered' => $input['questions_answered'] ?? $session['questions_answered'],
        ':time_remaining_seconds' => $input['time_remaining_seconds'] ?? $session['time_remaining_seconds'],
        ':session_token' => $input['session_token']
    ]);

    echo json_encode([
        'success' => true,
        'status' => 'ACTIVE',
        'message' => 'Session updated successfully'
    ]);
}

function handleEndSession($db, $input) {
    if (empty($input['session_token'])) {
        throw new Exception("Session token is required");
    }

    // Get session by token
    $stmt = $db->prepare("SELECT * FROM exam_sessions WHERE session_token = :session_token");
    $stmt->execute([':session_token' => $input['session_token']]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$session) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Session not found']);
        return;
    }

    // Mark session as completed
    $stmt = $db->prepare("UPDATE exam_sessions 
                          SET status = 'COMPLETED', last_activity = NOW() 
                          WHERE session_token = :session_token");
    $stmt->execute([':session_token' => $input['session_token']]);

    echo json_encode([
        'success' => true,
        'message' => 'Session ended successfully'
    ]);
}

function handleCheckSession($db, $input) {
    if (empty($input['session_token'])) {
        throw new Exception("Session token is required");
    }

    // Get session by token
    $stmt = $db->prepare("SELECT status, last_heartbeat FROM exam_sessions WHERE session_token = :session_token");
    $stmt->execute([':session_token' => $input['session_token']]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$session) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Session not found']);
        return;
    }

    echo json_encode([
        'success' => true,
        'status' => $session['status'],
        'last_heartbeat' => $session['last_heartbeat']
    ]);
}
?>
